/**
 * User-facing copy for the assessment API's error codes.
 *
 * The API returns `code` plus a `params` bag and no message string — by
 * design, so one error can render in any of the twelve languages assessments
 * are generated in. This table is the only place that turns those codes into
 * sentences; nothing else should compose an error message from a response.
 *
 * `detail` on the response is the primary code (sometimes suffixed
 * "(+N more)") and is for logs, not for users.
 */

import type { ApiFieldError } from "./assessment-api";

type Params = Record<string, unknown>;

const list = (v: unknown): string =>
  Array.isArray(v) ? v.join(", ") : String(v ?? "");

/**
 * Keyed by the `code` the API sends. Each entry reads its values out of
 * `params` — see the params table in the integration guide.
 */
const MESSAGES: Record<string, (p: Params) => string> = {
  // Options
  option_count_invalid: (p) =>
    p.maximum == null
      ? `A question needs at least ${p.minimum} options — this one has ${p.found}.`
      : `A question needs between ${p.minimum} and ${p.maximum} options — this one has ${p.found}.`,
  option_text_required: (p) => `Option ${p.option_position} has no text.`,
  option_malformed: (p) =>
    `Option ${p.option_position} is not in the expected format.`,
  option_index_invalid: (p) => `Option ${p.option_position} has an invalid index.`,

  // Answers
  correct_option_index_out_of_range: (p) =>
    `The correct answer points at option ${p.found}, which does not exist.`,
  correct_option_index_invalid: (p) =>
    String(p.expects) === "index_array"
      ? "Select at least one correct answer."
      : "Select exactly one correct answer.",
  correct_option_index_required: (p) =>
    String(p.expects) === "index_array"
      ? "Select at least one correct answer."
      : "Select a correct answer.",
  correct_answer_invalid: (p) => `The answer must be one of: ${list(p.allowed)}.`,

  // Match the following
  pair_count_invalid: (p) =>
    `Match the following needs at least ${p.minimum} pairs — this one has ${p.found}.`,
  pair_left_required: (p) => `Pair ${p.pair_position} is missing its left item.`,
  pair_right_required: (p) => `Pair ${p.pair_position} is missing its right item.`,
  pair_malformed: (p) => `Pair ${p.pair_position} is not in the expected format.`,

  // Mapping and quality
  blooms_level_invalid: (p) =>
    `"${p.found}" is not a Bloom's level. Choose one of: ${list(p.allowed)}.`,
  relevance_invalid: (p) =>
    `Relevance must be between ${p.minimum} and ${p.maximum} — this one is ${p.found}.`,
  competency_mapping_incomplete: (p) =>
    `The competency mapping needs area, theme and sub-theme together. Missing: ${list(p.missing)}.`,
  provenance_invalid: (p) => `"${p.found}" is not a valid provenance.`,

  // Request shape
  field_not_editable: (p) =>
    `That field cannot be edited on this question type. Editable here: ${list(p.editable_fields)}.`,
  question_type_invalid: (p) =>
    `Expected a ${list(p.expected)} question but found ${p.found}.`,
  question_order_invalid: () =>
    "The question order is out of date. Reload the assessment and try again.",
  question_order_required: () => "The new question order was missing.",
  question_id_required: () =>
    "The question could not be identified. Reload and try again.",
  question_id_invalid: () =>
    "The question could not be identified. Reload and try again.",
  request_required: () => "The request was malformed.",

  // State
  version_conflict: () =>
    "Someone else changed this assessment while you were editing it.",
  assessment_not_editable: (p) =>
    `This assessment cannot be edited while its status is ${p.status}.`,
  last_question_cannot_be_deleted: () =>
    "An assessment must keep at least one question.",
  question_not_found: () =>
    "That question is no longer part of this assessment. Reload and try again.",
};

const FALLBACK = "The change could not be saved. Please try again.";

/** Copy for a single error. Unknown codes fall back rather than leaking one. */
export const messageForError = (error: ApiFieldError): string => {
  const render = MESSAGES[error.code];
  if (!render) return FALLBACK;
  try {
    return render(error.params ?? {});
  } catch {
    return FALLBACK;
  }
};

/**
 * Copy for a whole rejected save. Validation can reject on several counts at
 * once; the first two are shown and the rest counted, because a toast that
 * lists nine problems is read as noise rather than as instructions.
 */
export const describeErrors = (errors: ApiFieldError[] | undefined): string => {
  if (!errors?.length) return FALLBACK;
  const messages = errors.slice(0, 2).map(messageForError);
  const remaining = errors.length - messages.length;
  return remaining > 0
    ? `${messages.join(" ")} And ${remaining} more problem${remaining === 1 ? "" : "s"}.`
    : messages.join(" ");
};
