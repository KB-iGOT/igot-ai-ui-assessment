import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CompetencyPicker, { type CompetencyValue } from "./CompetencyPicker";
import type { KcmFramework } from "./kcm-framework";

const framework: KcmFramework = {
  areas: [
    {
      identifier: "area_behavioural",
      name: "Behavioural",
      themes: [
        { identifier: "theme_collab", name: "Collaboration" },
        { identifier: "theme_comm", name: "Communication" },
        { identifier: "theme_team", name: "Team Leadership" },
      ],
    },
    {
      identifier: "area_functional",
      name: "Functional",
      themes: [
        { identifier: "theme_budget", name: "Budgeting" },
        { identifier: "theme_data", name: "Data Analytics" },
      ],
    },
  ],
  subThemesByTheme: {
    theme_collab: [
      { identifier: "sub_div", name: "Diversity & Inclusion" },
      { identifier: "sub_know", name: "Knowledge Sharing" },
    ],
    theme_comm: [{ identifier: "sub_listen", name: "Active Listening" }],
    theme_team: [],
    theme_budget: [{ identifier: "sub_forecast", name: "Forecasting" }],
  },
};

const hookState = vi.hoisted(() => ({
  current: { framework: null as unknown, loading: false, error: false },
}));

vi.mock("./kcm-framework", async (importActual) => ({
  ...(await importActual<typeof import("./kcm-framework")>()),
  useKcmFramework: () => hookState.current,
}));

const EMPTY: CompetencyValue = { area: "", theme: "", subTheme: "" };

/** Holds the value like the dialog does, and records every onChange. */
const renderPicker = (initial: CompetencyValue = EMPTY) => {
  const onChange = vi.fn();
  const Harness = () => {
    const [value, setValue] = useState(initial);
    return (
      <CompetencyPicker
        value={value}
        onChange={(v) => {
          onChange(v);
          setValue(v);
        }}
      />
    );
  };
  render(<Harness />);
  return { onChange, last: () => onChange.mock.calls.at(-1)?.[0] as CompetencyValue };
};

const chip = (name: string) => screen.getByRole("button", { name });
const searchBoxes = () => screen.getAllByPlaceholderText("Search");
const resetButton = (label: string) => screen.getByRole("button", { name: `Reset ${label}` });

describe("CompetencyPicker", () => {
  beforeEach(() => {
    hookState.current = { framework, loading: false, error: false };
  });

  it("shows a loading state while the framework loads", () => {
    hookState.current = { framework: null, loading: true, error: false };
    renderPicker();
    expect(screen.getByText("Loading competencies…")).toBeInTheDocument();
  });

  it("shows an error when the framework can't be loaded", () => {
    hookState.current = { framework: null, loading: false, error: true };
    renderPicker();
    expect(screen.getByText(/Couldn't load the competency framework/)).toBeInTheDocument();
  });

  it("offers Behavioural, Functional and Domain as areas", () => {
    renderPicker();
    const radios = within(screen.getByRole("radiogroup")).getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["Behavioural", "Functional", "Domain"]);
    radios.forEach((r) => expect(r).toHaveAttribute("aria-checked", "false"));
  });

  it("asks for an area before showing themes", () => {
    renderPicker();
    expect(screen.getByText("Select a competency area to see its themes.")).toBeInTheDocument();
    expect(screen.getByText("Select a theme to see its sub-themes.")).toBeInTheDocument();
  });

  it("shows the selected area's themes as chips", () => {
    const { last } = renderPicker();
    fireEvent.click(screen.getByRole("radio", { name: "Behavioural" }));

    expect(last()).toEqual({ area: "Behavioural", theme: "", subTheme: "" });
    expect(screen.getByRole("radio", { name: "Behavioural" })).toHaveAttribute("aria-checked", "true");
    expect(chip("Collaboration")).toBeInTheDocument();
    expect(chip("Team Leadership")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Budgeting" })).not.toBeInTheDocument();
  });

  it("shows the selected theme's sub-themes and records the full mapping", () => {
    const { last } = renderPicker({ area: "Behavioural", theme: "", subTheme: "" });
    fireEvent.click(chip("Collaboration"));

    expect(chip("Collaboration")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip("Knowledge Sharing"));

    expect(last()).toEqual({
      area: "Behavioural",
      theme: "Collaboration",
      subTheme: "Knowledge Sharing",
    });
    expect(chip("Knowledge Sharing")).toHaveAttribute("aria-pressed", "true");
  });

  it("clears the sub-theme when the theme changes", () => {
    const { last } = renderPicker({
      area: "Behavioural",
      theme: "Collaboration",
      subTheme: "Knowledge Sharing",
    });
    fireEvent.click(chip("Communication"));

    expect(last()).toEqual({ area: "Behavioural", theme: "Communication", subTheme: "" });
    expect(chip("Active Listening")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Knowledge Sharing" })).not.toBeInTheDocument();
  });

  it("clears theme and sub-theme when the area changes", () => {
    const { last } = renderPicker({
      area: "Behavioural",
      theme: "Collaboration",
      subTheme: "Knowledge Sharing",
    });
    fireEvent.click(screen.getByRole("radio", { name: "Functional" }));

    expect(last()).toEqual({ area: "Functional", theme: "", subTheme: "" });
    expect(chip("Budgeting")).toBeInTheDocument();
  });

  it("does not fire onChange when the selected area or theme is clicked again", () => {
    const { onChange } = renderPicker({
      area: "Behavioural",
      theme: "Collaboration",
      subTheme: "Knowledge Sharing",
    });
    fireEvent.click(screen.getByRole("radio", { name: "Behavioural" }));
    fireEvent.click(chip("Collaboration"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("matches saved names regardless of case and spacing", () => {
    renderPicker({
      area: "behavioural",
      theme: " collaboration ",
      subTheme: "KNOWLEDGE SHARING",
    });
    expect(screen.getByRole("radio", { name: "Behavioural" })).toHaveAttribute("aria-checked", "true");
    expect(chip("Collaboration")).toHaveAttribute("aria-pressed", "true");
    expect(chip("Knowledge Sharing")).toHaveAttribute("aria-pressed", "true");
  });

  it("filters theme chips by search text", () => {
    renderPicker({ area: "Behavioural", theme: "", subTheme: "" });
    fireEvent.change(searchBoxes()[0], { target: { value: "comm" } });

    expect(chip("Communication")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collaboration" })).not.toBeInTheDocument();
  });

  it("says so when the search matches nothing", () => {
    renderPicker({ area: "Behavioural", theme: "", subTheme: "" });
    fireEvent.change(searchBoxes()[0], { target: { value: "zzz" } });
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });

  it("reset on the theme clears theme, sub-theme and the search", () => {
    const { last } = renderPicker({
      area: "Behavioural",
      theme: "Collaboration",
      subTheme: "Knowledge Sharing",
    });
    fireEvent.change(searchBoxes()[0], { target: { value: "coll" } });
    fireEvent.click(resetButton("competency theme"));

    expect(last()).toEqual({ area: "Behavioural", theme: "", subTheme: "" });
    expect(searchBoxes()[0]).toHaveValue("");
    expect(chip("Team Leadership")).toBeInTheDocument();
  });

  it("reset on the sub-theme clears only the sub-theme", () => {
    const { last } = renderPicker({
      area: "Behavioural",
      theme: "Collaboration",
      subTheme: "Knowledge Sharing",
    });
    fireEvent.click(resetButton("competency sub theme"));
    expect(last()).toEqual({ area: "Behavioural", theme: "Collaboration", subTheme: "" });
  });

  it("tells the reviewer when a theme has no sub-themes", () => {
    renderPicker({ area: "Behavioural", theme: "Team Leadership", subTheme: "" });
    expect(screen.getByText("This theme has no sub-themes.")).toBeInTheDocument();
  });

  describe("Domain", () => {
    it("shows text inputs instead of chips", () => {
      renderPicker();
      fireEvent.click(screen.getByRole("radio", { name: "Domain" }));

      expect(screen.getByPlaceholderText("e.g. Data Management")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g. Data Governance")).toBeInTheDocument();
      expect(screen.queryAllByPlaceholderText("Search")).toHaveLength(0);
    });

    it("records typed theme and sub-theme", () => {
      const { last } = renderPicker({ area: "Domain", theme: "", subTheme: "" });
      fireEvent.change(screen.getByPlaceholderText("e.g. Data Management"), {
        target: { value: "Railway Signalling" },
      });
      fireEvent.change(screen.getByPlaceholderText("e.g. Data Governance"), {
        target: { value: "Interlocking" },
      });
      expect(last()).toEqual({
        area: "Domain",
        theme: "Railway Signalling",
        subTheme: "Interlocking",
      });
    });

    it("shows saved Domain values in the inputs", () => {
      renderPicker({ area: "Domain", theme: "Taxation", subTheme: "GST" });
      expect(screen.getByPlaceholderText("e.g. Data Management")).toHaveValue("Taxation");
      expect(screen.getByPlaceholderText("e.g. Data Governance")).toHaveValue("GST");
    });

    it("clears typed values when switching back to a framework area", () => {
      const { last } = renderPicker({ area: "Domain", theme: "Taxation", subTheme: "GST" });
      fireEvent.click(screen.getByRole("radio", { name: "Functional" }));
      expect(last()).toEqual({ area: "Functional", theme: "", subTheme: "" });
    });
  });
});
