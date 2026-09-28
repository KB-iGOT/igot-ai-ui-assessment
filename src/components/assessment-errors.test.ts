import { describe, expect, it } from "vitest";
import { describeErrors, messageForError } from "./assessment-errors";

describe("assessment error copy", () => {
  it("explains a missing rationale instead of the generic fallback", () => {
    // Shape the API returns when a question is added or edited without one.
    const errors = [
      {
        code: "rationale_required",
        field: "answer_rationale.correct_answer_explanation",
        question_id: "q_1bb266b27176",
      },
    ];
    expect(describeErrors(errors as any)).toBe("Rationale field is required.");
  });

  it("still falls back for codes it doesn't know", () => {
    expect(messageForError({ code: "something_new" } as any)).toBe(
      "The change could not be saved. Please try again."
    );
  });
});
