import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EditQuestionDialog, { countBlanks } from "./EditQuestionDialog";
import type { KcmFramework } from "./kcm-framework";
import type { Question } from "./question-types";

const framework: KcmFramework = {
  areas: [
    {
      identifier: "area_behavioural",
      name: "Behavioural",
      themes: [{ identifier: "theme_collab", name: "Collaboration" }],
    },
    {
      identifier: "area_functional",
      name: "Functional",
      themes: [{ identifier: "theme_budget", name: "Budgeting" }],
    },
  ],
  subThemesByTheme: {
    theme_collab: [{ identifier: "sub_know", name: "Knowledge Sharing" }],
    theme_budget: [{ identifier: "sub_forecast", name: "Forecasting" }],
  },
};

vi.mock("./kcm-framework", async (importActual) => ({
  ...(await importActual<typeof import("./kcm-framework")>()),
  useKcmFramework: () => ({ framework, loading: false, error: false }),
}));

const toastMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ toast: toastMock }));

const baseQuestion: Question = {
  id: 1,
  type: "MCQ",
  bloomLevel: "Remember",
  bloomPercent: 50,
  question: "What is 2 + 2?",
  options: [
    { label: "A", text: "3", index: 0 },
    { label: "B", text: "4", index: 1 },
  ],
  correctAnswer: "B",
  rationale: "Basic arithmetic.",
  relevance: 50,
  learningOutcome: "",
  competency: "",
  competencyArea: "",
  competencySubTheme: "",
  courseName: "",
};

const renderDialog = (question: Partial<Question> = {}) => {
  const onSave = vi.fn();
  render(
    <EditQuestionDialog
      question={{ ...baseQuestion, ...question }}
      open
      onClose={() => {}}
      onSave={onSave}
    />
  );
  return onSave;
};

const save = () => fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
const blockedWith = (description: string) =>
  expect(toastMock).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Cannot save", description })
  );
const INCOMPLETE = "Select a competency area, theme and sub-theme, or reset all three.";

describe("EditQuestionDialog competency mapping", () => {
  beforeEach(() => toastMock.mockClear());

  it("replaces the old free-text competency field with the picker", () => {
    renderDialog();
    expect(screen.getByText("Competencies (KCM)")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("e.g. Data Management")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Behavioural" })).toBeInTheDocument();
  });

  it("saves the full triple picked from the framework", () => {
    const onSave = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Behavioural" }));
    fireEvent.click(screen.getByRole("button", { name: "Collaboration" }));
    fireEvent.click(screen.getByRole("button", { name: "Knowledge Sharing" }));
    save();

    expect(toastMock).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        competencyArea: "Behavioural",
        competency: "Collaboration",
        competencySubTheme: "Knowledge Sharing",
      })
    );
  });

  it("saves a typed Domain mapping", () => {
    const onSave = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Domain" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Data Management"), {
      target: { value: "Taxation" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Data Governance"), {
      target: { value: "GST" },
    });
    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        competencyArea: "Domain",
        competency: "Taxation",
        competencySubTheme: "GST",
      })
    );
  });

  it("blocks saving an area without a theme and sub-theme", () => {
    const onSave = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Functional" }));
    save();

    blockedWith(INCOMPLETE);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks saving a theme without a sub-theme", () => {
    const onSave = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Functional" }));
    fireEvent.click(screen.getByRole("button", { name: "Budgeting" }));
    save();

    blockedWith(INCOMPLETE);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks saving a Domain mapping with only the theme typed", () => {
    const onSave = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Domain" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Data Management"), {
      target: { value: "Taxation" },
    });
    save();

    blockedWith(INCOMPLETE);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("allows saving with no mapping at all", () => {
    const onSave = renderDialog();
    save();
    expect(toastMock).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("blocks saving when a complete mapping is reset down to only an area", () => {
    const onSave = renderDialog({
      competencyArea: "Behavioural",
      competency: "Collaboration",
      competencySubTheme: "Knowledge Sharing",
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset competency theme" }));
    save();
    blockedWith(INCOMPLETE);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not block unrelated edits on an untouched partial mapping", () => {
    const onSave = renderDialog({
      competencyArea: "Behavioural",
      competency: "Collaboration",
      competencySubTheme: "",
    });
    fireEvent.change(screen.getByPlaceholderText("Enter the question"), {
      target: { value: "What is 3 + 3?" },
    });
    save();

    expect(toastMock).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ question: "What is 3 + 3?", competencySubTheme: "" })
    );
  });
});

describe("EditQuestionDialog fill in the blank", () => {
  const FTB: Partial<Question> = {
    type: "FTB",
    options: [],
    correctAnswer: "Delhi",
    question: "The capital of India is",
  };
  const questionBox = () =>
    screen.getByPlaceholderText(/Enter the question/) as HTMLTextAreaElement;
  const addBlank = () => fireEvent.click(screen.getByRole("button", { name: /Add blank/ }));

  beforeEach(() => toastMock.mockClear());

  it("counts runs of three or more underscores as blanks", () => {
    expect(countBlanks("no blanks here")).toBe(0);
    expect(countBlanks("a __ b")).toBe(0);
    expect(countBlanks("___ and _____ and ________")).toBe(3);
  });

  it("shows the Add blank button and count only for FTB questions", () => {
    renderDialog();
    expect(screen.queryByRole("button", { name: /Add blank/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/No. of blanks added/)).not.toBeInTheDocument();
  });

  it("appends a blank, spaced from the text, when there's no cursor position", () => {
    renderDialog(FTB);
    expect(screen.getByText("No. of blanks added = 0")).toBeInTheDocument();
    addBlank();
    expect(questionBox()).toHaveValue("The capital of India is _____");
    expect(screen.getByText("No. of blanks added = 1")).toBeInTheDocument();
  });

  it("inserts the blank at the cursor", () => {
    renderDialog({ ...FTB, question: "The capital is Delhi." });
    const box = questionBox();
    box.setSelectionRange(15, 15); // before "Delhi"
    fireEvent.select(box);
    addBlank();
    expect(box).toHaveValue("The capital is _____ Delhi.");
  });

  it("replaces selected text with the blank", () => {
    renderDialog({ ...FTB, question: "The capital is Delhi." });
    const box = questionBox();
    box.setSelectionRange(15, 20); // "Delhi"
    fireEvent.select(box);
    addBlank();
    expect(box).toHaveValue("The capital is _____.");
  });

  it("stops at two blanks", () => {
    renderDialog(FTB);
    addBlank();
    addBlank();
    addBlank();
    expect(countBlanks(questionBox().value)).toBe(2);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Maximum blanks reached" })
    );
  });

  it("saves the question with its blank", () => {
    const onSave = renderDialog(FTB);
    addBlank();
    save();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ question: "The capital of India is _____" })
    );
  });
});
