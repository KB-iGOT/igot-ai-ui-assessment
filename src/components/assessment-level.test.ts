import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_LEVELS,
  DEFAULT_ASSESSMENT_LEVEL,
  bloomDefaultsFor,
  defaultLevelForAssessmentType,
  toAssessmentLevel,
} from "./assessment-level";

describe("defaultLevelForAssessmentType", () => {
  it("starts types without a single course at beginner", () => {
    expect(defaultLevelForAssessmentType("comprehensive")).toBe("beginner");
    expect(defaultLevelForAssessmentType("standalone")).toBe("beginner");
    // The selector's id is capitalised.
    expect(defaultLevelForAssessmentType("Competency")).toBe("beginner");
  });

  it("starts single-course types at the default level until a course sets it", () => {
    expect(defaultLevelForAssessmentType("practice")).toBe(DEFAULT_ASSESSMENT_LEVEL);
    expect(defaultLevelForAssessmentType("final")).toBe(DEFAULT_ASSESSMENT_LEVEL);
  });
});

const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

describe("bloomDefaultsFor", () => {
  it("gives each level its own distribution", () => {
    expect(bloomDefaultsFor("beginner")).toEqual({
      remember: 25, understand: 30, apply: 25, analyze: 10, evaluate: 5, create: 5,
    });
    expect(bloomDefaultsFor("intermediate")).toEqual({
      remember: 10, understand: 20, apply: 25, analyze: 20, evaluate: 15, create: 10,
    });
    expect(bloomDefaultsFor("advanced")).toEqual({
      remember: 5, understand: 10, apply: 20, analyze: 25, evaluate: 20, create: 20,
    });
  });

  it("covers every Bloom's level and totals 100% for every assessment level", () => {
    for (const { id } of ASSESSMENT_LEVELS) {
      const preset = bloomDefaultsFor(id);
      expect(Object.keys(preset).sort()).toEqual([...BLOOM_KEYS].sort());
      expect(Object.values(preset).reduce((sum, v) => sum + v, 0)).toBe(100);
    }
  });

  it("falls back to the default level's distribution for an unknown level", () => {
    expect(bloomDefaultsFor("expert")).toEqual(bloomDefaultsFor(DEFAULT_ASSESSMENT_LEVEL));
  });

  it("returns a copy, so editing it cannot change the preset", () => {
    bloomDefaultsFor("beginner").remember = 0;
    expect(bloomDefaultsFor("beginner").remember).toBe(25);
  });
});

describe("toAssessmentLevel", () => {
  it("maps a course difficultyLevel to its assessment level id", () => {
    expect(toAssessmentLevel("Beginner")).toBe("beginner");
    expect(toAssessmentLevel("Intermediate")).toBe("intermediate");
    expect(toAssessmentLevel(" ADVANCED ")).toBe("advanced");
  });

  it("falls back to the default when the course has no recognised level", () => {
    expect(toAssessmentLevel(undefined)).toBe(DEFAULT_ASSESSMENT_LEVEL);
    expect(toAssessmentLevel("")).toBe(DEFAULT_ASSESSMENT_LEVEL);
    expect(toAssessmentLevel("Expert")).toBe(DEFAULT_ASSESSMENT_LEVEL);
    expect(toAssessmentLevel(3)).toBe(DEFAULT_ASSESSMENT_LEVEL);
  });
});
