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

/** UI type -> the `questionType` the create endpoint expects. */
export const apiQuestionType = (type: string): string =>
  (type || "MCQ").toLowerCase();

const isMTF = (q: Question) => q.type === "MTF";
const isMulti = (q: Question) => q.type === "MULTICHOICE";
const isTextAnswer = (q: Question) =>
  q.type === "FTB" || q.type === "TRUEFALSE";
const hasOptions = (q: Question) => !isMTF(q) && !isTextAnswer(q);

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

  return body;
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

  return updates;
};
