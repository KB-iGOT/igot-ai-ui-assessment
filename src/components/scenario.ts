/**
 * Scenario assessment — the sixth assessment type.
 *
 * Everything specific to it lives here so the five existing types stay on
 * their current code paths: every branch elsewhere is gated on
 * `isScenarioAssessment(type)` or on a question's `isScenario` flag, and the
 * scenario question types can never occur in an existing assessment.
 *
 * Field names follow the generate request and response shared by the AI team
 * (sample job `scenario_0705fc1f…`). The question create/update endpoints are
 * not confirmed for scenario questions yet; their payloads (question-payload.ts)
 * mirror the stored question shape.
 */

import { BookCheck, ListChecks, ListOrdered, MessagesSquare, Route, SquareCheckBig } from "lucide-react";
import { ASSESSMENT_LEVELS, defaultLevelForAssessmentType } from "./assessment-level";
import type { QuestionTypeConfig } from "./ConfigurationStep";
import type { Question, QuestionOption } from "./question-types";

// ---------------------------------------------------------------------------
// Assessment type
// ---------------------------------------------------------------------------

/** Selector id and the `assessment_type` sent to the API. */
export const SCENARIO_ASSESSMENT_TYPE = "scenario";

export const isScenarioAssessment = (type?: string | null) =>
  (type ?? "").trim().toLowerCase() === SCENARIO_ASSESSMENT_TYPE;

/**
 * Generate-request fields for the three new inputs, also read back from a
 * saved job's config. `scenario_domains` is appended once per entry, like
 * `topic_names`. `target_audience` is one string — the model takes the whole
 * phrase, commas and all.
 */
export const SCENARIO_REQUEST_FIELDS = {
  topic: "assessment_topic",
  domains: "scenario_domains",
  audience: "target_audience",
  /** Sent instead of `difficulty`: a scenario assessment can span several levels. */
  levels: "difficulty_levels",
} as const;

/** Starts at the same single level a scenario assessment had before levels became multi-select. */
export const defaultScenarioLevels = () => [defaultLevelForAssessmentType(SCENARIO_ASSESSMENT_TYPE)];

/** Known level ids from a saved list, in display order (beginner first), without repeats. */
export const scenarioLevelsFrom = (levels: string[]) => {
  const wanted = new Set(levels.map((level) => level.trim().toLowerCase()));
  return ASSESSMENT_LEVELS.map((level) => level.id).filter((id) => wanted.has(id));
};

// ---------------------------------------------------------------------------
// Question types
// ---------------------------------------------------------------------------

/** UI type ids. The API `question_type` is the same, except for the two below. */
export const OPEN_TEXT = "OPEN_TEXT";
export const SJT_RANKING = "SJT_RANKING";
export const ACTION_PLANNING = "ACTION_PLANNING";
export const SHORT_ANSWER = "SHORT_ANSWER";

/**
 * The API's scenario MCQ and multi-select, and the existing UI type each is
 * shown and edited as — the options and answer key work exactly the same.
 */
const API_TO_UI_TYPE = new Map([
  ["SCENARIO_MCQ", "MCQ"],
  ["SCENARIO_MULTISELECT", "MULTICHOICE"],
]);

/** UI type for an upper-cased API `question_type`. Every other type passes through. */
export const uiQuestionType = (apiType?: string) => API_TO_UI_TYPE.get(apiType ?? "") ?? apiType;

/** Upper-cased API `question_type` for a scenario question's UI type. */
export const scenarioApiQuestionType = (type: string) =>
  [...API_TO_UI_TYPE].find(([, ui]) => ui === type)?.[0] ?? type;

/** The six types a scenario assessment offers, in display order. */
export const SCENARIO_QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "MCQ",
  MULTICHOICE: "Multi select",
  [OPEN_TEXT]: "Open text",
  [SJT_RANKING]: "Situational judgement ranking",
  [ACTION_PLANNING]: "Action & decision planning",
  [SHORT_ANSWER]: "Scenario short answer",
};

export const SCENARIO_QUESTION_TYPE_HINTS: Record<string, string> = {
  MCQ: "One correct answer from several options",
  MULTICHOICE: "Several correct answers from several options",
  [OPEN_TEXT]:
    "The learner writes a free-text response, marked against a reference answer and a rubric",
  [SJT_RANKING]: "The learner ranks possible actions from most to least effective",
  [ACTION_PLANNING]:
    "The learner writes a step-by-step plan, marked against expected components and a rubric",
  [SHORT_ANSWER]:
    "The learner answers in a few sentences, marked against an expected answer and a rubric",
};

const upper = (type?: string) => (type ?? "").toUpperCase();

/** Types where the learner writes the answer — marked against a model answer and a rubric. */
const RUBRIC_TYPES = new Set([OPEN_TEXT, ACTION_PLANNING, SHORT_ANSWER]);

export const hasRubric = (type?: string) => RUBRIC_TYPES.has(upper(type));
export const isRankingType = (type?: string) => upper(type) === SJT_RANKING;
/** Action planning is marked against a list of expected components, not a written answer. */
export const hasExpectedComponents = (type?: string) => upper(type) === ACTION_PLANNING;

/** The four types with no options-and-answer-key. None can appear outside a scenario assessment. */
export const isScenarioOnlyType = (type?: string) => hasRubric(type) || isRankingType(type);

/** True for an API `question_type` that only a scenario assessment produces. */
export const isScenarioApiType = (apiType?: string) =>
  API_TO_UI_TYPE.has(upper(apiType)) || isScenarioOnlyType(apiType);

/** Where a rubric type's written model answer is stored: open text and short answer differ. */
export const modelAnswerField = (type?: string) =>
  upper(type) === SHORT_ANSWER ? "expected_answer" : "reference_answer";

export const modelAnswerLabel = (type?: string) =>
  upper(type) === SHORT_ANSWER ? "Expected answer" : "Reference answer";

/** Configuration-step defaults. The ids are the keys of `question_type_counts`. */
export const scenarioDefaultQuestionTypes: QuestionTypeConfig[] = [
  { id: "scenario_mcq", name: "Single selection MCQs", icon: ListChecks, enabled: true, count: 5 },
  { id: "scenario_multiselect", name: "Multiple selection MCQs", icon: SquareCheckBig, enabled: false, count: 1 },
  { id: "open_text", name: "Open text", icon: MessagesSquare, enabled: true, count: 5 },
  { id: "sjt_ranking", name: "Situational judgement ranking", icon: ListOrdered, enabled: false, count: 1 },
  { id: "action_planning", name: "Action & decision planning", icon: Route, enabled: false, count: 1 },
  { id: "short_answer", name: "Scenario short answer", icon: BookCheck, enabled: false, count: 1 },
];

/** "advanced" -> "Advanced". */
export const difficultyLabel = (level?: string) =>
  level ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase() : "";

/** Neutral accent for scenario questions, which have no Bloom's level to colour by. */
export const SCENARIO_COLORS = {
  bg: "bg-primary",
  text: "text-primary",
  border: "border-primary/20",
  light: "bg-primary/5",
};

// ---------------------------------------------------------------------------
// Rubrics
// ---------------------------------------------------------------------------

export interface RubricCriterion {
  criterion: string;
  /** What the criterion judges. */
  description: string;
  /** Percent, 0-100. NaN while the field is cleared mid-edit. */
  weight: number;
  /** Score anchors: level 0 is the weakest answer, level 3 the strongest. */
  level0: string;
  level1: string;
  level2: string;
  level3: string;
  /** Evidence indicators — what to look for in the answer, one per entry. */
  evidence: string[];
}

export const RUBRIC_LEVEL_KEYS = ["level0", "level1", "level2", "level3"] as const;

export const blankRubric = (): RubricCriterion => ({
  criterion: "",
  description: "",
  weight: 0,
  level0: "",
  level1: "",
  level2: "",
  level3: "",
  evidence: [],
});

export const rubricWeightTotal = (rubrics?: RubricCriterion[]) =>
  (rubrics ?? []).reduce((sum, r) => sum + (Number.isFinite(r.weight) ? r.weight : 0), 0);

// ---------------------------------------------------------------------------
// Reading API questions
// ---------------------------------------------------------------------------

/** A question as the API returns it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRecord = Record<string, any>;

const letter = (i: number) => String.fromCharCode(65 + i);

const isRecord = (value: unknown): value is RawRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

/** A list of strings, trimmed, with blanks dropped. */
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => text(v).trim()).filter(Boolean) : [];

/**
 * `rubric: [{ criterion, description, score_anchors: { "0".."3" },
 * weight_percent, evidence_indicators: [] }]`
 */
export const parseRubrics = (value: unknown): RubricCriterion[] =>
  (Array.isArray(value) ? value : []).filter(isRecord).map((r) => {
    const anchors: RawRecord = isRecord(r.score_anchors) ? r.score_anchors : {};
    const weight = Number(r.weight_percent);
    return {
      criterion: text(r.criterion),
      description: text(r.description),
      weight: Number.isFinite(weight) ? weight : 0,
      level0: text(anchors["0"]),
      level1: text(anchors["1"]),
      level2: text(anchors["2"]),
      level3: text(anchors["3"]),
      evidence: textList(r.evidence_indicators),
    };
  });

/**
 * The actions to rank (`options`) and the correct order as display letters,
 * best first. `correct_ranking` names each action by its own `index`.
 */
export const parseRanking = (
  raw: RawRecord | undefined
): { options: QuestionOption[]; correctAnswer: string[] } => {
  const options: QuestionOption[] = (Array.isArray(raw?.options) ? raw.options : []).map(
    (o: unknown, i: number) => {
      const index = isRecord(o) && o.index != null ? Number(o.index) : NaN;
      return {
        label: letter(i),
        text: text(isRecord(o) ? o.text : o),
        index: Number.isFinite(index) ? index : i,
      };
    }
  );

  const order = (Array.isArray(raw?.correct_ranking) ? raw.correct_ranking : [])
    .map((value: unknown) => options.findIndex((o) => o.index === Number(value)))
    .filter((position: number) => position >= 0)
    .map(letter);

  return { options, correctAnswer: [...new Set<string>(order)] };
};

/**
 * The scenario part of a normalised question, merged over what
 * normalizeQuestions builds for the existing types. MCQ and multi-select keep
 * the base options, answer and rationale; the four new types replace the
 * options and answer with their own shapes.
 */
export const normalizeScenarioQuestion = (
  raw: RawRecord | undefined,
  type: string
): Partial<Question> => {
  const scenario: RawRecord = isRecord(raw?.scenario) ? raw.scenario : {};

  const extra: Partial<Question> = {
    isScenario: true,
    scenarioTitle: text(scenario.title),
    scenarioDescription: text(scenario.description),
    constraints: textList(scenario.constraints),
    scenarioDomain: text(raw?.scenario_domain),
    difficultyLevel: text(raw?.difficulty_level).trim().toLowerCase(),
  };

  if (hasRubric(type)) {
    extra.options = [];
    extra.correctAnswer = "";
    if (hasExpectedComponents(type)) {
      extra.expectedComponents = textList(raw?.expected_components);
    } else {
      extra.referenceAnswer = text(raw?.[modelAnswerField(type)]);
    }
    extra.rubrics = parseRubrics(raw?.rubric);
  }

  if (isRankingType(type)) Object.assign(extra, parseRanking(raw));

  return extra;
};

// ---------------------------------------------------------------------------
// Authoring
// ---------------------------------------------------------------------------

/** Scenario fields for a blank question, by type. */
export const blankScenarioFields = (type: string): Partial<Question> => {
  const fields: Partial<Question> = {
    isScenario: true,
    scenarioTitle: "",
    scenarioDescription: "",
    constraints: [],
    scenarioDomain: "",
    // Picked by the reviewer; every generated question carries one.
    difficultyLevel: "",
  };
  if (hasRubric(type)) {
    fields.options = [];
    fields.correctAnswer = "";
    if (hasExpectedComponents(type)) fields.expectedComponents = [""];
    else fields.referenceAnswer = "";
    fields.rubrics = [blankRubric()];
  }
  if (isRankingType(type)) {
    fields.options = Array.from({ length: 4 }, (_, i) => ({ label: letter(i), text: "" }));
    fields.correctAnswer = [];
  }
  return fields;
};

const tidyList = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);

/** Drops the blank rows a reviewer left in list fields, so they are never saved. */
export const tidyScenarioQuestion = (q: Question): Question => ({
  ...q,
  constraints: tidyList(q.constraints ?? []),
  ...(q.expectedComponents ? { expectedComponents: tidyList(q.expectedComponents) } : {}),
  ...(q.rubrics ? { rubrics: q.rubrics.map((r) => ({ ...r, evidence: tidyList(r.evidence) })) } : {}),
});

/**
 * The complete best-to-worst order: the saved order first, then any action it
 * does not name yet (a newly added one) at the bottom.
 */
export const rankingOrder = (q: Pick<Question, "options" | "correctAnswer">): string[] => {
  const labels = q.options.map((o) => o.label);
  const saved = (Array.isArray(q.correctAnswer) ? q.correctAnswer : []).filter((l) =>
    labels.includes(l)
  );
  const unique = [...new Set(saved)];
  return [...unique, ...labels.filter((l) => !unique.includes(l))];
};

/** Scenario-specific save checks. Returns the first problem, or null. */
export const validateScenarioQuestion = (q: Question): string | null => {
  if (!q.scenarioTitle?.trim()) return "Scenario title cannot be empty.";
  if (!q.scenarioDescription?.trim()) return "Scenario description cannot be empty.";
  if (!q.difficultyLevel) return "Select a difficulty level.";

  if (isRankingType(q.type)) {
    if (q.options.length < 2) return "Add at least two actions to rank.";
    if (q.options.some((o) => !o.text.trim())) return "Every action needs text.";
  }

  if (hasRubric(q.type)) {
    if (hasExpectedComponents(q.type)) {
      if (!(q.expectedComponents ?? []).some((c) => c.trim()))
        return "Add at least one expected component.";
    } else if (!q.referenceAnswer?.trim()) {
      return `${modelAnswerLabel(q.type)} cannot be empty.`;
    }
    const rubrics = q.rubrics ?? [];
    if (!rubrics.length) return "Add at least one rubric criterion.";
    if (rubrics.some((r) => !r.criterion.trim())) return "Every rubric criterion needs a name.";
    if (rubrics.some((r) => !Number.isFinite(r.weight) || r.weight < 0 || r.weight > 100))
      return "Rubric weights must be between 0 and 100.";
  }

  // Every scenario type is generated with a rationale, and it stays mandatory.
  if (!q.rationale?.trim()) return "Rationale cannot be empty.";

  return null;
};
