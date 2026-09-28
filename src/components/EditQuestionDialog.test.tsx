import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EditQuestionDialog from "./EditQuestionDialog";
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
