/**
 * Translation between the editor's question model and the API's shape.
 *
 * Two things this file exists to get right:
 *
 *  1. `correct_option_index` refers to an option's own `index` value, never
 *     its position in the array. Older assessments carry one-based indexes,
 *     so the two differ.
 *  2. The KCM competency triple is validated all-or-nothing. Touching the
 *     theme means sending area and sub-theme in the same request, at whatever
 *     values they already hold.
 */

import type { Question, QuestionOption } from "./question-types";
import { isTextAnswer } from "./question-types";
import type { RubricCriterion } from "./scenario";
import {
  hasExpectedComponents,
  hasRubric,
  isRankingType,
  isScenarioOnlyType,
  modelAnswerField,
  rankingOrder,
  scenarioApiQuestionType,
} from "./scenario";

/**
 * UI type -> the `questionType` the create endpoint expects. A scenario MCQ or
 * multi-select is its own API type (`scenario_mcq`, `scenario_multiselect`).
 */
export const apiQuestionType = (type: string, scenario = false): string =>
  (scenario ? scenarioApiQuestionType(type || "MCQ") : type || "MCQ").toLowerCase();

const isMTF = (q: Question) => q.type === "MTF";
const isMulti = (q: Question) => q.type === "MULTICHOICE";
// Ranking and the rubric types carry their own shapes, below.
const hasOptions = (q: Question) =>
  !isMTF(q) && !isTextAnswer(q) && !isScenarioOnlyType(q.type);

const asLabels = (correctAnswer: Question["correctAnswer"]): string[] =>
  Array.isArray(correctAnswer)
    ? correctAnswer
    : correctAnswer
    ? [String(correctAnswer)]
    : [];

/**
 * Assigns every option a stable API index and reports which index each
 * display label maps to.
 *
 * Options the reviewer just added have no index yet. They get fresh values
 * above the highest in use rather than their array position, because on a
 * one-based question the position of a new last option collides with an
 * existing option's index — which would silently move the answer key.
 */
export const resolveOptions = (q: Question) => {
  const existing = q.options
    .map((o) => Number(o.index))
    .filter((n) => Number.isFinite(n));
  let nextIndex = existing.length ? Math.max(...existing) + 1 : 0;

  const indexByLabel = new Map<string, number>();
  const apiOptions = q.options.map((o) => {
    const index = Number.isFinite(Number(o.index)) ? Number(o.index) : nextIndex++;
    indexByLabel.set(o.label, index);
    return { text: o.text, index };
  });

  return { apiOptions, indexByLabel };
};

/** The answer as the API stores it: one index for MCQ, an array for multi. */
const correctIndexFor = (q: Question, indexByLabel: Map<string, number>) => {
  const indexes = asLabels(q.correctAnswer)
    .map((label) => indexByLabel.get(label))
    .filter((n): n is number => Number.isFinite(n));
  return isMulti(q) ? indexes : indexes[0];
};

const kcmTriple = (q: Question) => ({
  competency_area: q.competencyArea ?? "",
  competency_theme: q.competency ?? "",
  competency_sub_theme: q.competencySubTheme ?? "",
});

const hasAnyCompetency = (q: Question) =>
  Boolean(q.competencyArea || q.competency || q.competencySubTheme);

/**
 * A complete question body, for the create endpoint. Fields the reviewer left
 * empty are omitted rather than sent blank — an empty string is a value, and
 * the server would validate it as one.
 */
export const toCreateBody = (q: Question): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    blooms_level: q.bloomLevel,
    relevance_percentage: q.relevance ?? 0,
  };

  if (isMTF(q)) {
    body.matching_context = q.question;
    body.pairs = q.options.map((o) => ({ left: o.text, right: o.right ?? "" }));
  } else {
    body.question_text = q.question;
  }

  if (hasOptions(q)) {
    const { apiOptions, indexByLabel } = resolveOptions(q);
    body.options = apiOptions;
    body.correct_option_index = correctIndexFor(q, indexByLabel);
  }

  if (isTextAnswer(q)) body.correct_answer = String(q.correctAnswer ?? "");

  if (q.rationale) {
    body.answer_rationale = { correct_answer_explanation: q.rationale };
  }

  const reasoning: Record<string, unknown> = {};
  if (q.learningOutcome) reasoning.learning_objective_alignment = q.learningOutcome;
  if (hasAnyCompetency(q)) reasoning.competency_alignment = { kcm: kcmTriple(q) };
  if (Object.keys(reasoning).length) body.reasoning = reasoning;

  if (q.courseName) body.course_name = q.courseName;

  if (q.isScenario) {
    // A scenario question has no Bloom's level, relevance, reasoning or course.
    for (const key of ["blooms_level", "relevance_percentage", "reasoning", "course_name"]) {
      delete body[key];
    }
    Object.assign(body, scenarioCreateFields(q));
  }

  return body;
};

// ---------------------------------------------------------------------------
// Scenario questions — the same shape the generate response stores.
// ---------------------------------------------------------------------------

export const toApiRubric = (r: RubricCriterion) => ({
  criterion: r.criterion,
  description: r.description,
  score_anchors: { "0": r.level0, "1": r.level1, "2": r.level2, "3": r.level3 },
  weight_percent: Number.isFinite(r.weight) ? r.weight : 0,
  evidence_indicators: r.evidence,
});

/** Actions with stable indexes, and the correct order (best first) as those indexes. */
const rankingBody = (q: Question) => {
  const { apiOptions, indexByLabel } = resolveOptions(q);
  return {
    options: apiOptions,
    correct_ranking: rankingOrder(q)
      .map((label) => indexByLabel.get(label))
      .filter((n): n is number => Number.isFinite(n)),
  };
};

/** Open text and short answer store a written answer; action planning a list. */
const modelAnswerBody = (q: Question): Record<string, unknown> =>
  hasExpectedComponents(q.type)
    ? { expected_components: q.expectedComponents ?? [] }
    : { [modelAnswerField(q.type)]: q.referenceAnswer ?? "" };

const scenarioCreateFields = (q: Question): Record<string, unknown> => {
  const fields: Record<string, unknown> = {
    scenario: {
      title: q.scenarioTitle ?? "",
      description: q.scenarioDescription ?? "",
      constraints: q.constraints ?? [],
    },
  };
  if (q.scenarioDomain) fields.scenario_domain = q.scenarioDomain;
  if (q.difficultyLevel) fields.difficulty_level = q.difficultyLevel;
  if (hasRubric(q.type)) {
    Object.assign(fields, modelAnswerBody(q));
    fields.rubric = (q.rubrics ?? []).map(toApiRubric);
  }
  if (isRankingType(q.type)) Object.assign(fields, rankingBody(q));
  return fields;
};

const scenarioUpdates = (before: Question, after: Question): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};
  const changed = (a: unknown, b: unknown) => JSON.stringify(a ?? "") !== JSON.stringify(b ?? "");

  if (changed(before.scenarioTitle, after.scenarioTitle))
    updates["scenario.title"] = after.scenarioTitle ?? "";
  if (changed(before.scenarioDescription, after.scenarioDescription))
    updates["scenario.description"] = after.scenarioDescription ?? "";
  if (changed(before.constraints ?? [], after.constraints ?? []))
    updates["scenario.constraints"] = after.constraints ?? [];
  if (changed(before.scenarioDomain, after.scenarioDomain))
    updates.scenario_domain = after.scenarioDomain ?? "";
  if (changed(before.difficultyLevel, after.difficultyLevel))
    updates.difficulty_level = after.difficultyLevel ?? "";

  if (hasRubric(after.type)) {
    if (
      changed(before.referenceAnswer, after.referenceAnswer) ||
      changed(before.expectedComponents, after.expectedComponents)
    ) {
      Object.assign(updates, modelAnswerBody(after));
    }
    if (changed(before.rubrics ?? [], after.rubrics ?? []))
      updates.rubric = (after.rubrics ?? []).map(toApiRubric);
  }

  // Actions and their order move together, like options and the answer key.
  if (
    isRankingType(after.type) &&
    (!sameOptions(before.options, after.options) ||
      JSON.stringify(rankingOrder(before)) !== JSON.stringify(rankingOrder(after)))
  ) {
    Object.assign(updates, rankingBody(after));
  }

  return updates;
};

const sameOptions = (a: QuestionOption[], b: QuestionOption[]) =>
  JSON.stringify(a.map((o) => [o.text, o.right ?? ""])) ===
  JSON.stringify(b.map((o) => [o.text, o.right ?? ""]));

const sameAnswer = (a: Question, b: Question) =>
  JSON.stringify(asLabels(a.correctAnswer)) ===
  JSON.stringify(asLabels(b.correctAnswer));

/**
 * The dotted-path diff for the update endpoint — only what the reviewer
 * actually changed.
 *
 * Options and the answer key move together even when only one of them
 * changed, because the answer is expressed in terms of option indexes: saving
 * a rewritten option list without its answer, or the reverse, can leave the
 * two disagreeing.
 */
export const toUpdates = (
  before: Question,
  after: Question
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};

  if (before.question !== after.question) {
    updates[isMTF(after) ? "matching_context" : "question_text"] = after.question;
  }

  if (isMTF(after) && !sameOptions(before.options, after.options)) {
    updates.pairs = after.options.map((o) => ({
      left: o.text,
      right: o.right ?? "",
    }));
  }

  if (
    hasOptions(after) &&
    (!sameOptions(before.options, after.options) || !sameAnswer(before, after))
  ) {
    const { apiOptions, indexByLabel } = resolveOptions(after);
    updates.options = apiOptions;
    updates.correct_option_index = correctIndexFor(after, indexByLabel);
  }

  if (isTextAnswer(after) && !sameAnswer(before, after)) {
    updates.correct_answer = String(after.correctAnswer ?? "");
  }

  if (before.bloomLevel !== after.bloomLevel) {
    updates.blooms_level = after.bloomLevel;
  }

  if ((before.relevance ?? 0) !== (after.relevance ?? 0)) {
    updates.relevance_percentage = after.relevance ?? 0;
  }

  if (before.rationale !== after.rationale) {
    updates["answer_rationale.correct_answer_explanation"] = after.rationale;
  }

  if ((before.learningOutcome ?? "") !== (after.learningOutcome ?? "")) {
    updates["reasoning.learning_objective_alignment"] = after.learningOutcome ?? "";
  }

  // All three, or none — see the file header.
  const competencyChanged =
    (before.competency ?? "") !== (after.competency ?? "") ||
    (before.competencyArea ?? "") !== (after.competencyArea ?? "") ||
    (before.competencySubTheme ?? "") !== (after.competencySubTheme ?? "");

  if (competencyChanged) {
    const kcm = kcmTriple(after);
    updates["reasoning.competency_alignment.kcm.competency_area"] =
      kcm.competency_area;
    updates["reasoning.competency_alignment.kcm.competency_theme"] =
      kcm.competency_theme;
    updates["reasoning.competency_alignment.kcm.competency_sub_theme"] =
      kcm.competency_sub_theme;
  }

  if ((before.courseName ?? "") !== (after.courseName ?? "")) {
    updates.course_name = after.courseName ?? "";
  }

  if (after.isScenario) {
    delete updates.blooms_level;
    Object.assign(updates, scenarioUpdates(before, after));
  }

  return updates;
};
