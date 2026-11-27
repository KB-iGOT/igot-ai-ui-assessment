/** The assessment levels offered on the Configuration step, in display order. */
export const ASSESSMENT_LEVELS = [
  { id: "beginner", name: "Beginner" },
  { id: "intermediate", name: "Intermediate" },
  { id: "advanced", name: "Advanced" },
];

export const DEFAULT_ASSESSMENT_LEVEL = "intermediate";

/**
 * Assessment types whose level cannot come from a course — several courses
 * (comprehensive) or none at all (standalone, competency, scenario) — so they
 * start at beginner. Practice and final take the level from their one course.
 */
const BEGINNER_BY_DEFAULT_TYPES = ["comprehensive", "standalone", "competency", "scenario"];

/** The level an assessment type starts at, before any course is picked. */
export const defaultLevelForAssessmentType = (assessmentType: string): string =>
  BEGINNER_BY_DEFAULT_TYPES.includes(assessmentType.trim().toLowerCase())
    ? "beginner"
    : DEFAULT_ASSESSMENT_LEVEL;

/** Default Bloom's Taxonomy distribution (percent) for each assessment level. */
const BLOOM_PRESETS: Record<string, Record<string, number>> = {
  beginner: { remember: 25, understand: 30, apply: 25, analyze: 10, evaluate: 5, create: 5 },
  intermediate: { remember: 10, understand: 20, apply: 25, analyze: 20, evaluate: 15, create: 10 },
  advanced: { remember: 5, understand: 10, apply: 20, analyze: 25, evaluate: 20, create: 20 },
};

/**
 * The default Bloom's distribution for a level, as a fresh copy the caller
 * may change. An unknown level gets the default level's distribution.
 */
export const bloomDefaultsFor = (level: string): Record<string, number> => ({
  ...(BLOOM_PRESETS[level] ?? BLOOM_PRESETS[DEFAULT_ASSESSMENT_LEVEL]),
});

/**
 * Maps a course's `difficultyLevel` (e.g. "Beginner") to an assessment level
 * id. Anything missing or unrecognised falls back to the default level, so a
 * course without one never inherits the previous course's level.
 */
export const toAssessmentLevel = (difficultyLevel: unknown): string => {
  const normalized = typeof difficultyLevel === "string" ? difficultyLevel.trim().toLowerCase() : "";
  return ASSESSMENT_LEVELS.some((level) => level.id === normalized)
    ? normalized
    : DEFAULT_ASSESSMENT_LEVEL;
};
