/**
 * Shared question model.
 *
 * The mapping/quality fields below used to be re-derived on every render by
 * matching raw API records against the question text. That broke as soon as a
 * question was edited (the lookup fell back to the first raw record, showing
 * another question's metadata). They now live on the question itself so edits
 * stay consistent.
 */

import type { RubricCriterion } from "./scenario";
import {
  SCENARIO_QUESTION_TYPE_LABELS,
  blankScenarioFields,
  hasExpectedComponents,
  hasRubric,
  isRankingType,
  rankingOrder,
} from "./scenario";

export interface QuestionOption {
  label: string;
  text: string;
  /** Right-hand side of a match pair. MTF only. */
  right?: string;
  /**
   * The option's own `index` as the API stores it — NOT its position in this
   * array. `correct_option_index` is matched against this value, and
   * assessments generated before prompt v4.3 carry one-based indexes, so
   * resolving the answer by position is off by one on those. Undefined for an
   * option the reviewer has just added; the payload builder allocates one.
   */
  index?: number;
}

export interface Question {
  id: number;
  questionId?: string;
  type: string;
  bloomLevel: string;
  /** Bloom weightage, 0-100. */
  bloomPercent: number;
  question: string;
  options: QuestionOption[];
  /**
   * Letter(s) for MCQ/MULTICHOICE/FTB, free text for TRUEFALSE and for
   * legacy FTB questions saved before FTB carried options.
   */
  correctAnswer: string | string[];
  rationale: string;

  // Mapping & quality
  /** Relevance to selected content, 0-100. */
  relevance?: number;
  learningOutcome?: string;
  /** KCM competency theme. */
  competency?: string;
  /**
   * The other two thirds of the KCM triple, all edited together in
   * CompetencyPicker: the API validates area, theme and sub-theme as
   * all-or-nothing and rejects a request that moves only one.
   */
  competencyArea?: string;
  competencySubTheme?: string;
  courseName?: string;
  question_type_rationale?: string;

  // Scenario assessments only (see ./scenario). Absent on every other type,
  // so none of the existing types' behaviour depends on them.
  /** True for every question in a scenario assessment: no Bloom's, scenario context shown. */
  isScenario?: boolean;
  scenarioTitle?: string;
  scenarioDescription?: string;
  /** Optional, one per entry; often empty. */
  constraints?: string[];
  /** Which of the assessment's scenario domains the question covers. */
  scenarioDomain?: string;
  /** beginner / intermediate / advanced (`difficulty_level`). Editable; required on save. */
  difficultyLevel?: string;
  /** Open text (`reference_answer`) and short answer (`expected_answer`). */
  referenceAnswer?: string;
  /** Action planning only: what a good plan includes. */
  expectedComponents?: string[];
  /** Open text, action planning and short answer. */
  rubrics?: RubricCriterion[];
}

export const BLOOM_LEVELS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
] as const;

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "MCQ",
  MULTICHOICE: "Multi select",
  TRUEFALSE: "True/False",
  FTB: "Fill in the blank",
  MTF: "Match the following",
};

/** Display label for a question type, falling back to the raw value. */
export const typeLabel = (type: string) =>
  QUESTION_TYPE_LABELS[type] ?? SCENARIO_QUESTION_TYPE_LABELS[type] ?? type;

/** 0 -> "A", 1 -> "B", … */
export const letterFor = (index: number) => String.fromCharCode(65 + index);

/**
 * `id` is a stable identity, not a display position — questions can be added,
 * deleted and reordered, so the number shown to the user is derived from array
 * index instead. This returns an id no existing question is using.
 */
export const nextQuestionId = (questions: Question[]) =>
  questions.reduce((max, q) => Math.max(max, q.id), 0) + 1;

/**
 * True when the answer is free text rather than an option letter: True/False,
 * and FTB questions generated before FTB answers became four options.
 */
export const isTextAnswer = (q: Pick<Question, "type" | "options">) =>
  q.type === "TRUEFALSE" || (q.type === "FTB" && !q.options?.length);

/** What each type needs before a creator starts filling it in. */
const blankOptionsFor = (type: string): QuestionOption[] => {
  // Free-text answers carry no options at all.
  if (type === "TRUEFALSE") return [];
  // Match-the-following needs both sides of each pair.
  if (type === "MTF") {
    return Array.from({ length: 4 }, (_, i) => ({
      label: letterFor(i),
      text: "",
      right: "",
    }));
  }
  return Array.from({ length: 4 }, (_, i) => ({ label: letterFor(i), text: "" }));
};

/**
 * A blank question scaffolded for the chosen type. The type is picked before
 * the form is shown, so the answer shape is correct from the outset rather
 * than being converted afterwards.
 *
 * `scenario` adds the scenario fields, and the answer shape of the scenario
 * types, for a question in a scenario assessment.
 */
export const createBlankQuestion = (
  id: number,
  type = "MCQ",
  { scenario = false }: { scenario?: boolean } = {}
): Question => {
  const question = blankQuestionFor(id, type);
  return scenario ? { ...question, ...blankScenarioFields(type) } : question;
};

const blankQuestionFor = (id: number, type: string): Question => ({
  id,
  type,
  bloomLevel: "Remember",
  bloomPercent: 0,
  question: "",
  options: blankOptionsFor(type),
  // Multi-select tracks a set of letters; everything else a single value.
  correctAnswer: type === "MULTICHOICE" ? [] : "",
  rationale: "",
  relevance: 0,
  learningOutcome: "",
  competency: "",
  competencyArea: "",
  competencySubTheme: "",
  courseName: "",
});

/** Short guidance shown beside each type in the picker. */
export const QUESTION_TYPE_HINTS: Record<string, string> = {
  MCQ: "One correct answer from several options",
  MULTICHOICE: "Several correct answers from several options",
  TRUEFALSE: "A statement the learner marks true or false",
  FTB: "The learner picks the missing word or phrase from several options",
  MTF: "The learner pairs items from two columns",
};

/** Resolves the human-readable correct answer for display. */
export const correctAnswerText = (q: Question): string => {
  // Scenario-only types. Neither can occur outside a scenario assessment.
  if (isRankingType(q.type)) {
    return rankingOrder(q)
      .map((l, i) => `${i + 1}. ${q.options.find((o) => o.label === l)?.text ?? l}`)
      .join("  ");
  }
  if (hasRubric(q.type)) {
    return hasExpectedComponents(q.type)
      ? (q.expectedComponents ?? []).map((c, i) => `${i + 1}. ${c}`).join("  ")
      : q.referenceAnswer ?? "";
  }

  if (q.type === "MTF") {
    return q.options.map((o) => `${o.text} → ${o.right ?? ""}`).join(", ");
  }
  const labels = Array.isArray(q.correctAnswer)
    ? q.correctAnswer
    : q.correctAnswer
    ? [String(q.correctAnswer)]
    : [];

  if (isTextAnswer(q)) {
    return String(q.correctAnswer ?? "");
  }

  return labels
    .map((l) => {
      const opt = q.options.find((o) => o.label === l);
      return opt ? `${l}. ${opt.text}` : l;
    })
    .join(", ");
};
