/**
 * Shared question model.
 *
 * The mapping/quality fields below used to be re-derived on every render by
 * matching raw API records against the question text. That broke as soon as a
 * question was edited (the lookup fell back to the first raw record, showing
 * another question's metadata). They now live on the question itself so edits
 * stay consistent.
 */

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
  /** Letter(s) for MCQ/MULTICHOICE, free text for FTB/TRUEFALSE. */
  correctAnswer: string | string[];
  rationale: string;

  // Mapping & quality
  /** Relevance to selected content, 0-100. */
  relevance?: number;
  learningOutcome?: string;
  /** KCM competency theme — the only third of the triple the editor exposes. */
  competency?: string;
  /**
   * The other two thirds. Not editable in the UI, but carried so an edit to
   * the theme can send the whole triple: the API validates area, theme and
   * sub-theme as all-or-nothing and rejects a request that moves only one.
   */
  competencyArea?: string;
  competencySubTheme?: string;
  courseName?: string;
  question_type_rationale?: string;
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
export const typeLabel = (type: string) => QUESTION_TYPE_LABELS[type] ?? type;

/** 0 -> "A", 1 -> "B", … */
export const letterFor = (index: number) => String.fromCharCode(65 + index);

/**
 * `id` is a stable identity, not a display position — questions can be added,
 * deleted and reordered, so the number shown to the user is derived from array
 * index instead. This returns an id no existing question is using.
 */
export const nextQuestionId = (questions: Question[]) =>
  questions.reduce((max, q) => Math.max(max, q.id), 0) + 1;

/** What each type needs before a creator starts filling it in. */
const blankOptionsFor = (type: string): QuestionOption[] => {
  // Free-text answers carry no options at all.
  if (type === "TRUEFALSE" || type === "FTB") return [];
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
 */
export const createBlankQuestion = (id: number, type = "MCQ"): Question => ({
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
  FTB: "The learner types the missing word or phrase",
  MTF: "The learner pairs items from two columns",
};

/** Resolves the human-readable correct answer for display. */
export const correctAnswerText = (q: Question): string => {
  if (q.type === "MTF") {
    return q.options.map((o) => `${o.text} → ${o.right ?? ""}`).join(", ");
  }
  const labels = Array.isArray(q.correctAnswer)
    ? q.correctAnswer
    : q.correctAnswer
    ? [String(q.correctAnswer)]
    : [];

  if (q.type === "FTB" || q.type === "TRUEFALSE") {
    return String(q.correctAnswer ?? "");
  }

  return labels
    .map((l) => {
      const opt = q.options.find((o) => o.label === l);
      return opt ? `${l}. ${opt.text}` : l;
    })
    .join(", ");
};
