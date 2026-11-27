import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListChecks } from "lucide-react";
import ConfigurationStep from "./ConfigurationStep";

const renderStep = (extra: Partial<Parameters<typeof ConfigurationStep>[0]> = {}) => {
  const props = {
    questionTypes: [{ id: "mcq", name: "MCQ", icon: ListChecks, enabled: true, count: 5 }],
    assessmentLevel: "beginner",
    bloomValues: { remember: 25, understand: 30, apply: 25, analyze: 10, evaluate: 5, create: 5 },
    bloomEnabled: true,
    timeLimit: 30,
    onQuestionTypesChange: vi.fn(),
    onAssessmentLevelChange: vi.fn(),
    onBloomChange: vi.fn(),
    onBloomToggle: vi.fn(),
    onTimeLimitChange: vi.fn(),
    onBack: vi.fn(),
    onGenerate: vi.fn(),
    isGenerating: false,
    ...extra,
  };
  render(<ConfigurationStep {...props} />);
  return props;
};

const level = (name: string) => screen.getByRole("button", { name });

describe("ConfigurationStep — assessment level", () => {
  it("stays single-select for the existing types", () => {
    const props = renderStep();
    expect(screen.queryByText(/select one or more/)).not.toBeInTheDocument();
    expect(level("Beginner")).not.toHaveAttribute("aria-pressed");

    fireEvent.click(level("Advanced"));
    expect(props.onAssessmentLevelChange).toHaveBeenCalledWith("advanced");
  });

  it("is multi-select for scenario, keeping display order", () => {
    const onSelectedLevelsChange = vi.fn();
    const props = renderStep({ selectedLevels: ["advanced"], onSelectedLevelsChange });
    expect(screen.getByText(/select one or more/)).toBeInTheDocument();
    expect(level("Advanced")).toHaveAttribute("aria-pressed", "true");
    expect(level("Beginner")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(level("Beginner"));
    expect(onSelectedLevelsChange).toHaveBeenLastCalledWith(["beginner", "advanced"]);
    expect(props.onAssessmentLevelChange).not.toHaveBeenCalled();
  });

  it("removes a selected level, but never the last one", () => {
    const onSelectedLevelsChange = vi.fn();
    renderStep({ selectedLevels: ["beginner", "intermediate"], onSelectedLevelsChange });
    fireEvent.click(level("Beginner"));
    expect(onSelectedLevelsChange).toHaveBeenLastCalledWith(["intermediate"]);
  });

  it("keeps the only selected level", () => {
    const onSelectedLevelsChange = vi.fn();
    renderStep({ selectedLevels: ["intermediate"], onSelectedLevelsChange });
    fireEvent.click(level("Intermediate"));
    expect(onSelectedLevelsChange).not.toHaveBeenCalled();
  });
});
