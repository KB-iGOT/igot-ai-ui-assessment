import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EditQuestionDialog from "./EditQuestionDialog";
import type { KcmFramework } from "./kcm-framework";
import type { Question } from "./question-types";

const framework: KcmFramework = { areas: [], subThemesByTheme: {} };

vi.mock("./kcm-framework", async (importActual) => ({
  ...(await importActual<typeof import("./kcm-framework")>()),
  useKcmFramework: () => ({ framework, loading: false, error: false }),
}));

const toastMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ toast: toastMock }));

const base: Question = {
  id: 1,
  type: "MCQ",
  bloomLevel: "Remember",
  bloomPercent: 50,
  question: "What would you do first?",
  options: [
    { label: "A", text: "Escalate", index: 0 },
    { label: "B", text: "Wait", index: 1 },
  ],
  correctAnswer: "A",
  rationale: "Escalating early limits the impact.",
  relevance: 50,
  learningOutcome: "",
  competency: "",
  competencyArea: "",
  competencySubTheme: "",
  courseName: "",
};

const scenario: Partial<Question> = {
  isScenario: true,
  scenarioTitle: "Budget overrun",
  scenarioDescription: "The project is 20% over budget.",
  constraints: [],
  scenarioDomain: "budget overruns",
  difficultyLevel: "advanced",
};

// Radix Select calls these, which jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.hasPointerCapture ??= vi.fn(() => false);
  Element.prototype.releasePointerCapture ??= vi.fn();
});

const criterion = {
  criterion: "Scope",
  description: "",
  weight: 100,
  level0: "",
  level1: "",
  level2: "",
  level3: "",
  evidence: [] as string[],
};

const renderDialog = (question: Partial<Question>) => {
  const onSave = vi.fn();
  render(
    <EditQuestionDialog question={{ ...base, ...question }} open onClose={() => {}} onSave={onSave} />
  );
  return onSave;
};

const save = () => fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
const blockedWith = (description: string) =>
  expect(toastMock).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Cannot save", description })
  );

describe("EditQuestionDialog — non-scenario questions are unchanged", () => {
  beforeEach(() => toastMock.mockClear());

  it("still shows Bloom's fields and no scenario fields", () => {
    renderDialog({});
    expect(screen.getByText("Bloom's level")).toBeInTheDocument();
    expect(screen.getByText("Bloom weightage (%)")).toBeInTheDocument();
    expect(screen.queryByText("Scenario title")).not.toBeInTheDocument();
    expect(screen.queryByText("Difficulty level")).not.toBeInTheDocument();
  });
});

describe("EditQuestionDialog — scenario questions", () => {
  beforeEach(() => toastMock.mockClear());

  it("shows the scenario context and hides Bloom's and the mapping fields", () => {
    renderDialog(scenario);
    expect(screen.getByText("Scenario title")).toBeInTheDocument();
    expect(screen.getByText("Scenario description")).toBeInTheDocument();
    expect(screen.getByText("Constraints")).toBeInTheDocument();
    expect(screen.getByText("Scenario domain")).toBeInTheDocument();
    for (const label of ["Bloom's level", "Bloom weightage (%)", "Relevance to content", "Learning outcome", "Course"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("shows the question's difficulty level, and saves a changed one", () => {
    const onSave = renderDialog(scenario);
    const trigger = screen.getByRole("combobox", { name: "Difficulty level" });
    expect(trigger).toHaveTextContent("Advanced");

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Intermediate" }));
    expect(trigger).toHaveTextContent("Intermediate");

    save();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ difficultyLevel: "intermediate" }));
  });

  it("requires a difficulty level", () => {
    const onSave = renderDialog({ ...scenario, difficultyLevel: "" });
    expect(screen.getByRole("combobox", { name: "Difficulty level" })).toHaveTextContent("Select level");
    save();
    blockedWith("Select a difficulty level.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("drops blank constraint rows on save", () => {
    const onSave = renderDialog({ ...scenario, constraints: ["Fixed budget"] });
    fireEvent.click(screen.getByRole("button", { name: /Add constraint/ }));
    expect(screen.getAllByRole("textbox", { name: /^Constraint \d$/ })).toHaveLength(2);
    save();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ constraints: ["Fixed budget"] }));
  });

  it("blocks saving without a scenario description", () => {
    const onSave = renderDialog({ ...scenario, scenarioDescription: "" });
    save();
    blockedWith("Scenario description cannot be empty.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("requires a rationale on a scenario MCQ", () => {
    const onSave = renderDialog({ ...scenario, rationale: "" });
    save();
    blockedWith("Rationale cannot be empty.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("edits a rubric question without options, and requires a reference answer", () => {
    const onSave = renderDialog({
      ...scenario,
      type: "OPEN_TEXT",
      options: [],
      correctAnswer: "",
      referenceAnswer: "",
      rubrics: [criterion],
    });
    expect(screen.queryByRole("button", { name: /Add option/ })).not.toBeInTheDocument();
    expect(screen.getByText("Reference answer")).toBeInTheDocument();
    expect(screen.getByText("Total weight 100%")).toBeInTheDocument();

    save();
    blockedWith("Reference answer cannot be empty.");

    fireEvent.change(
      screen.getByPlaceholderText("A model answer the learner's response is compared against"),
      { target: { value: "Re-baseline with the sponsor." } }
    );
    save();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ referenceAnswer: "Re-baseline with the sponsor." })
    );
  });

  it("labels short answer's model answer as the expected answer", () => {
    renderDialog({ ...scenario, type: "SHORT_ANSWER", options: [], correctAnswer: "", referenceAnswer: "x", rubrics: [criterion] });
    expect(screen.getByText("Expected answer")).toBeInTheDocument();
    expect(screen.queryByText("Reference answer")).not.toBeInTheDocument();
  });

  it("edits action planning's expected components instead of a written answer", () => {
    const onSave = renderDialog({
      ...scenario,
      type: "ACTION_PLANNING",
      options: [],
      correctAnswer: "",
      expectedComponents: [""],
      rubrics: [criterion],
    });
    expect(screen.queryByText("Reference answer")).not.toBeInTheDocument();
    save();
    blockedWith("Add at least one expected component.");

    fireEvent.change(screen.getByRole("textbox", { name: "Expected component 1" }), {
      target: { value: "Meet the executive" },
    });
    save();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ expectedComponents: ["Meet the executive"] })
    );
  });

  it("requires a rationale on a rubric question", () => {
    const onSave = renderDialog({
      ...scenario,
      type: "OPEN_TEXT",
      options: [],
      correctAnswer: "",
      rationale: "",
      referenceAnswer: "A model answer",
      rubrics: [criterion],
    });
    save();
    blockedWith("Rationale cannot be empty.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reorders ranking actions and saves the full order", () => {
    const onSave = renderDialog({
      ...scenario,
      type: "SJT_RANKING",
      options: [
        { label: "A", text: "Escalate", index: 0 },
        { label: "B", text: "Wait", index: 1 },
        { label: "C", text: "Consult", index: 2 },
      ],
      correctAnswer: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Move action C up" }));
    save();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ correctAnswer: ["A", "C", "B"] }));
  });
});
