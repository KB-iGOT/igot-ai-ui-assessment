import { describe, expect, it } from "vitest";
import type { Question } from "./question-types";
import { correctAnswerText, createBlankQuestion, typeLabel } from "./question-types";
import { apiQuestionType, toApiRubric, toCreateBody, toUpdates } from "./question-payload";
import {
  defaultScenarioLevels,
  isScenarioApiType,
  isScenarioAssessment,
  scenarioLevelsFrom,
  isScenarioOnlyType,
  normalizeScenarioQuestion,
  parseRubrics,
  rankingOrder,
  scenarioDefaultQuestionTypes,
  tidyScenarioQuestion,
  uiQuestionType,
  validateScenarioQuestion,
} from "./scenario";
import { rawScenarioQuestion, scenarioFixtureQuestions } from "@/test/scenario-fixture";

const API_TYPES = [
  "SCENARIO_MCQ",
  "SCENARIO_MULTISELECT",
  "OPEN_TEXT",
  "SJT_RANKING",
  "ACTION_PLANNING",
  "SHORT_ANSWER",
];

/** A fixture question as the editor holds it (the scenario part only — no base options). */
const fromFixture = (apiType: string): Question => {
  const raw = rawScenarioQuestion(apiType);
  const type = uiQuestionType(apiType) ?? apiType;
  return {
    id: 1,
    questionId: raw.question_id,
    type,
    bloomLevel: "Remember",
    bloomPercent: 0,
    question: raw.question_text,
    options: [],
    correctAnswer: "",
    rationale: raw.answer_rationale.correct_answer_explanation,
    relevance: 0,
    learningOutcome: "",
    competency: "",
    competencyArea: "",
    competencySubTheme: "",
    courseName: "",
    ...normalizeScenarioQuestion(raw, type),
  };
};

describe("scenario assessment type", () => {
  it("is recognised case-insensitively and nothing else matches", () => {
    expect(isScenarioAssessment("scenario")).toBe(true);
    expect(isScenarioAssessment(" Scenario ")).toBe(true);
    for (const t of ["practice", "final", "comprehensive", "standalone", "Competency", "", undefined]) {
      expect(isScenarioAssessment(t)).toBe(false);
    }
  });
});

describe("scenario levels", () => {
  it("starts at the scenario's default single level", () => {
    expect(defaultScenarioLevels()).toEqual(["beginner"]);
  });

  it("restores a saved list in display order, dropping unknown and repeated levels", () => {
    expect(scenarioLevelsFrom(["Advanced", "beginner", "expert", "advanced"])).toEqual([
      "beginner",
      "advanced",
    ]);
    expect(scenarioLevelsFrom([])).toEqual([]);
  });
});

describe("scenario question types", () => {
  it("uses the request's question_type_counts keys as config ids", () => {
    expect(scenarioDefaultQuestionTypes.map((t) => t.id).sort()).toEqual(
      ["open_text", "sjt_ranking", "scenario_mcq", "short_answer", "action_planning", "scenario_multiselect"].sort()
    );
  });

  it("reads SCENARIO_MCQ / SCENARIO_MULTISELECT as MCQ / multi-select and leaves other types alone", () => {
    expect(uiQuestionType("SCENARIO_MCQ")).toBe("MCQ");
    expect(uiQuestionType("SCENARIO_MULTISELECT")).toBe("MULTICHOICE");
    for (const t of ["MCQ", "MULTICHOICE", "FTB", "MTF", "TRUEFALSE", "OPEN_TEXT", "SHORT_ANSWER"]) {
      expect(uiQuestionType(t)).toBe(t);
    }
    expect(uiQuestionType(undefined)).toBeUndefined();
  });

  it("recognises every scenario API type, and no existing type", () => {
    expect(API_TYPES.every(isScenarioApiType)).toBe(true);
    expect(["MCQ", "MULTICHOICE", "FTB", "MTF", "TRUEFALSE", undefined].some(isScenarioApiType)).toBe(false);
    expect(["OPEN_TEXT", "SJT_RANKING", "ACTION_PLANNING", "SHORT_ANSWER"].every(isScenarioOnlyType)).toBe(true);
    expect(["MCQ", "MULTICHOICE"].some(isScenarioOnlyType)).toBe(false);
  });

  it("names the create endpoint's question type", () => {
    expect(apiQuestionType("MCQ")).toBe("mcq");
    expect(apiQuestionType("MULTICHOICE")).toBe("multichoice");
    expect(apiQuestionType("MCQ", true)).toBe("scenario_mcq");
    expect(apiQuestionType("MULTICHOICE", true)).toBe("scenario_multiselect");
    expect(apiQuestionType("SHORT_ANSWER", true)).toBe("short_answer");
    expect(typeLabel("SJT_RANKING")).toBe("Situational judgement ranking");
    expect(typeLabel("MCQ")).toBe("MCQ");
  });
});

describe("normalizeScenarioQuestion — the real response", () => {
  it("reads the scenario context of every question", () => {
    for (const raw of scenarioFixtureQuestions) {
      const q = normalizeScenarioQuestion(raw, uiQuestionType(raw.question_type) ?? "");
      expect(q).toMatchObject({
        isScenario: true,
        scenarioTitle: raw.scenario.title,
        scenarioDescription: raw.scenario.description,
        constraints: raw.scenario.constraints,
        scenarioDomain: raw.scenario_domain,
        difficultyLevel: "advanced",
      });
    }
  });

  it("reads the difficulty level in lower case", () => {
    const raw = { ...rawScenarioQuestion("SCENARIO_MCQ"), difficulty_level: " Intermediate " };
    expect(normalizeScenarioQuestion(raw, "MCQ").difficultyLevel).toBe("intermediate");
  });

  it("leaves an MCQ's options, answer and rationale to the base normaliser", () => {
    const q = normalizeScenarioQuestion(rawScenarioQuestion("SCENARIO_MCQ"), "MCQ");
    expect(q).not.toHaveProperty("options");
    expect(q).not.toHaveProperty("correctAnswer");
    expect(q).not.toHaveProperty("rationale");
  });

  it("reads open text: reference answer and the full rubric", () => {
    const q = fromFixture("OPEN_TEXT");
    expect(q.options).toEqual([]);
    expect(q.referenceAnswer).toMatch(/^Move the lead developer/);
    expect(q.rubrics?.map((r) => r.weight)).toEqual([40, 35, 25]);
    expect(q.rubrics?.[0]).toEqual({
      criterion: "Resource Prioritization and Alignment",
      description: "Prioritises the regulatory commitment.",
      weight: 40,
      level0: "No prioritisation.",
      level1: "Basic prioritisation.",
      level2: "Sound prioritisation.",
      level3: "Thorough prioritisation.",
      evidence: ["Prioritizes Project A", "Reallocates the right capability"],
    });
  });

  it("reads short answer's expected_answer as its model answer", () => {
    expect(fromFixture("SHORT_ANSWER").referenceAnswer).toMatch(/^Assess the obstacle/);
  });

  it("reads action planning's expected components, trimming evidence", () => {
    const q = fromFixture("ACTION_PLANNING");
    expect(q.expectedComponents).toHaveLength(2);
    expect(q.referenceAnswer).toBeUndefined();
    expect(q.rubrics?.[0].evidence[1]).toBe("Gathers specific requirements for risk visibility");
  });

  it("reads a ranking's options and correct order", () => {
    const q = fromFixture("SJT_RANKING");
    expect(q.options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(q.correctAnswer).toEqual(["A", "B", "D", "C"]);
    expect(correctAnswerText(q)).toMatch(/^1\. Analyse the root cause\. {2}2\./);
  });

  it("returns no rubric for a missing or malformed one", () => {
    expect(parseRubrics(undefined)).toEqual([]);
    expect(parseRubrics("not a rubric")).toEqual([]);
  });
});

describe("blank scenario questions", () => {
  it("leaves non-scenario blanks exactly as before", () => {
    expect(createBlankQuestion(3, "MCQ")).toEqual(createBlankQuestion(3, "MCQ", { scenario: false }));
    expect(createBlankQuestion(3, "MCQ")).not.toHaveProperty("isScenario");
  });

  it("scaffolds each scenario shape", () => {
    expect(createBlankQuestion(1, "OPEN_TEXT", { scenario: true })).toMatchObject({
      isScenario: true,
      options: [],
      referenceAnswer: "",
      constraints: [],
      difficultyLevel: "",
    });
    expect(createBlankQuestion(1, "ACTION_PLANNING", { scenario: true }).expectedComponents).toEqual([""]);
    const ranking = createBlankQuestion(1, "SJT_RANKING", { scenario: true });
    expect(ranking.options).toHaveLength(4);
    expect(ranking.correctAnswer).toEqual([]);
    const mcq = createBlankQuestion(1, "MCQ", { scenario: true });
    expect(mcq.options).toHaveLength(4);
    expect(mcq.isScenario).toBe(true);
  });
});

describe("rankingOrder", () => {
  it("completes a partial order with unranked actions at the bottom", () => {
    const options = ["A", "B", "C"].map((label) => ({ label, text: label }));
    expect(rankingOrder({ options, correctAnswer: ["C"] })).toEqual(["C", "A", "B"]);
    expect(rankingOrder({ options, correctAnswer: [] })).toEqual(["A", "B", "C"]);
    expect(rankingOrder({ options, correctAnswer: ["Z", "B"] })).toEqual(["B", "A", "C"]);
  });
});

describe("scenario payloads", () => {
  it("writes a rubric back exactly as the API returned it", () => {
    const raw = rawScenarioQuestion("OPEN_TEXT");
    expect(parseRubrics(raw.rubric).map(toApiRubric)).toEqual(raw.rubric);
  });

  it("builds a create body in the stored shape, without Bloom's, relevance, reasoning or course", () => {
    const q = { ...fromFixture("OPEN_TEXT"), learningOutcome: "x", courseName: "y" };
    const body = toCreateBody(q);
    for (const key of ["blooms_level", "relevance_percentage", "reasoning", "course_name", "options"]) {
      expect(body).not.toHaveProperty(key);
    }
    const raw = rawScenarioQuestion("OPEN_TEXT");
    expect(body).toMatchObject({
      question_text: raw.question_text,
      scenario: raw.scenario,
      scenario_domain: "resource allocation",
      difficulty_level: "advanced",
      reference_answer: raw.reference_answer,
      rubric: raw.rubric,
      answer_rationale: raw.answer_rationale,
    });
  });

  it("stores each type's model answer under its own field", () => {
    const short = toCreateBody(fromFixture("SHORT_ANSWER"));
    expect(short.expected_answer).toMatch(/^Assess the obstacle/);
    expect(short).not.toHaveProperty("reference_answer");

    const plan = toCreateBody(fromFixture("ACTION_PLANNING"));
    expect(plan.expected_components).toEqual(rawScenarioQuestion("ACTION_PLANNING").expected_components);
    expect(plan).not.toHaveProperty("reference_answer");
  });

  it("sends a ranking's options and correct_ranking back unchanged", () => {
    const raw = rawScenarioQuestion("SJT_RANKING");
    const body = toCreateBody(fromFixture("SJT_RANKING"));
    expect(body.options).toEqual(raw.options);
    expect(body.correct_ranking).toEqual(raw.correct_ranking);
    expect(body).not.toHaveProperty("correct_option_index");
  });

  it("sends a scenario MCQ's options and answer key as for any MCQ", () => {
    const raw = rawScenarioQuestion("SCENARIO_MCQ");
    const q: Question = {
      ...fromFixture("SCENARIO_MCQ"),
      options: raw.options.map((o, i) => ({ label: String.fromCharCode(65 + i), ...o })),
      correctAnswer: "C",
    };
    expect(toCreateBody(q)).toMatchObject({
      options: raw.options,
      correct_option_index: 2,
      scenario: raw.scenario,
    });
  });

  it("diffs only the scenario fields that changed, as dotted paths", () => {
    const before = fromFixture("OPEN_TEXT");
    const after: Question = {
      ...before,
      constraints: [...(before.constraints ?? []), "No extra budget"],
      rubrics: before.rubrics?.map((r, i) => (i === 0 ? { ...r, weight: 50 } : r)),
    };
    const updates = toUpdates(before, after);
    expect(Object.keys(updates).sort()).toEqual(["rubric", "scenario.constraints"]);
    expect(updates["scenario.constraints"]).toHaveLength(2);
    expect((updates.rubric as { weight_percent: number }[])[0].weight_percent).toBe(50);
  });

  it("sends nothing when nothing changed", () => {
    const q = fromFixture("ACTION_PLANNING");
    expect(toUpdates(q, { ...q })).toEqual({});
  });

  it("updates a question's difficulty level", () => {
    const before = fromFixture("SCENARIO_MCQ");
    expect(toUpdates(before, { ...before, difficultyLevel: "beginner" })).toEqual({
      difficulty_level: "beginner",
    });
  });

  it("updates a short answer's expected_answer", () => {
    const before = fromFixture("SHORT_ANSWER");
    expect(toUpdates(before, { ...before, referenceAnswer: "New" })).toEqual({ expected_answer: "New" });
  });

  it("sends the new order when a ranking is reordered", () => {
    const before = fromFixture("SJT_RANKING");
    const updates = toUpdates(before, { ...before, correctAnswer: ["D", "A", "B", "C"] });
    expect(updates.correct_ranking).toEqual([3, 0, 1, 2]);
  });

  it("leaves a non-scenario create body unchanged", () => {
    const mcq = createBlankQuestion(1, "MCQ");
    const body = toCreateBody({
      ...mcq,
      question: "Q",
      options: mcq.options.map((o, i) => ({ ...o, text: `o${i}` })),
      correctAnswer: "A",
    });
    expect(body.blooms_level).toBe("Remember");
    expect(body.relevance_percentage).toBe(0);
    expect(Object.keys(body).some((k) => k.startsWith("scenario") || k === "rubric")).toBe(false);
  });
});

describe("tidyScenarioQuestion", () => {
  it("drops blank list rows before saving", () => {
    const q = fromFixture("ACTION_PLANNING");
    const tidy = tidyScenarioQuestion({
      ...q,
      constraints: ["  ", "Keep scope"],
      expectedComponents: ["Step one ", ""],
      rubrics: q.rubrics?.map((r) => ({ ...r, evidence: ["", "Shows it"] })),
    });
    expect(tidy.constraints).toEqual(["Keep scope"]);
    expect(tidy.expectedComponents).toEqual(["Step one"]);
    expect(tidy.rubrics?.[0].evidence).toEqual(["Shows it"]);
  });
});

describe("validateScenarioQuestion", () => {
  it("passes every question in the real response", () => {
    for (const apiType of API_TYPES) {
      expect(validateScenarioQuestion(fromFixture(apiType))).toBeNull();
    }
  });

  it("requires the scenario context and a difficulty level", () => {
    const q = fromFixture("OPEN_TEXT");
    expect(validateScenarioQuestion({ ...q, scenarioTitle: " " })).toMatch(/title/);
    expect(validateScenarioQuestion({ ...q, scenarioDescription: "" })).toMatch(/description/);
    expect(validateScenarioQuestion({ ...q, difficultyLevel: "" })).toBe("Select a difficulty level.");
  });

  it("requires each type's model answer", () => {
    expect(validateScenarioQuestion({ ...fromFixture("OPEN_TEXT"), referenceAnswer: "" })).toBe(
      "Reference answer cannot be empty."
    );
    expect(validateScenarioQuestion({ ...fromFixture("SHORT_ANSWER"), referenceAnswer: "" })).toBe(
      "Expected answer cannot be empty."
    );
    expect(
      validateScenarioQuestion({ ...fromFixture("ACTION_PLANNING"), expectedComponents: [" "] })
    ).toBe("Add at least one expected component.");
  });

  it("requires named, weighted rubric criteria", () => {
    const q = fromFixture("OPEN_TEXT");
    const first = q.rubrics![0];
    expect(validateScenarioQuestion({ ...q, rubrics: [] })).toMatch(/at least one/);
    expect(validateScenarioQuestion({ ...q, rubrics: [{ ...first, criterion: "" }] })).toMatch(/needs a name/);
    expect(validateScenarioQuestion({ ...q, rubrics: [{ ...first, weight: NaN }] })).toMatch(
      /between 0 and 100/
    );
  });

  it("requires a rationale on every type", () => {
    for (const apiType of ["OPEN_TEXT", "SJT_RANKING", "ACTION_PLANNING", "SHORT_ANSWER"]) {
      expect(validateScenarioQuestion({ ...fromFixture(apiType), rationale: "" })).toMatch(/Rationale/);
    }
  });

  it("requires at least two ranked actions, each with text", () => {
    const q = fromFixture("SJT_RANKING");
    expect(validateScenarioQuestion({ ...q, options: [q.options[0]] })).toMatch(/two actions/);
    expect(
      validateScenarioQuestion({ ...q, options: q.options.map((o, i) => (i ? o : { ...o, text: "" })) })
    ).toMatch(/needs text/);
  });
});
