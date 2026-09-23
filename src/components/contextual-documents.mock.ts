/**
 * Dummy data for the contextual documents panel.
 *
 * TEMPORARY — stands in until the course hierarchy API is wired up. Nothing
 * outside this file knows the data is fake: `fetchCourseDocuments` in
 * ./contextual-documents returns the same `CourseDocuments` shape either way,
 * so switching to the live API means setting USE_MOCK_COURSE_DOCUMENTS there
 * to false and deleting this file.
 *
 * Imports from ./contextual-documents are type-only on purpose — that module
 * imports this one, and a value import would close the cycle.
 */

import type {
  CourseDocuments,
  CourseFile,
  CourseFileKind,
} from "./contextual-documents";

/** Round-trip a real request would take, so the loading state is visible. */
const MOCK_LATENCY_MS = 600;

/**
 * Forces a particular outcome for a given course id. Leave a course out and
 * it gets the default "available" set below. Useful for eyeballing the
 * unavailable and error states without touching the component.
 */
const MOCK_STATUS_BY_COURSE_ID: Record<
  string,
  "available" | "unavailable" | "error"
> = {
  // "do_11414...": "unavailable",
  // "do_11415...": "error",
};

interface MockFileSeed {
  name: string;
  kind: CourseFileKind;
  mimeType: string;
  sizeBytes?: number;
  /** Omitted for files the API knows about but cannot serve. */
  url?: string;
}

const MOCK_FILE_SEEDS: MockFileSeed[] = [
  {
    name: "Course handbook.pdf",
    kind: "document",
    mimeType: "application/pdf",
    sizeBytes: 2517200,
    url: "https://example.org/mock/course-handbook.pdf",
  },
  {
    name: "Module 1 - Reference notes.docx",
    kind: "document",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: 486300,
    url: "https://example.org/mock/module-1-reference-notes.docx",
  },
  {
    name: "Policy framework summary.pdf",
    kind: "document",
    mimeType: "application/pdf",
    sizeBytes: 1204000,
    // No url — exercises the "Unavailable" download cell.
  },
  {
    name: "Module 1 - Introduction.vtt",
    kind: "vtt",
    mimeType: "text/vtt",
    sizeBytes: 34800,
    url: "https://example.org/mock/module-1-introduction.vtt",
  },
  {
    name: "Module 2 - Case study walkthrough.vtt",
    kind: "vtt",
    mimeType: "text/vtt",
    sizeBytes: 51400,
    url: "https://example.org/mock/module-2-case-study.vtt",
  },
];

const buildMockFiles = (courseId: string): CourseFile[] =>
  MOCK_FILE_SEEDS.map((seed, i) => ({
    id: `${courseId}-mock-${i}`,
    name: seed.name,
    kind: seed.kind,
    mimeType: seed.mimeType,
    url: seed.url,
    sizeBytes: seed.sizeBytes,
  }));

/**
 * Mock counterpart of `fetchCourseDocuments`. Same contract: resolves to a
 * record rather than throwing on failure, so a failed lookup stays
 * distinguishable from a course that genuinely has nothing. Abort is the one
 * exception, matching fetch().
 */
export const fetchMockCourseDocuments = async (
  courseId: string,
  courseName: string,
  signal?: AbortSignal
): Promise<CourseDocuments> => {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, MOCK_LATENCY_MS);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    });
  });

  const status = MOCK_STATUS_BY_COURSE_ID[courseId] ?? "available";
  const base = { courseId, courseName, provider: "iGOT Karmayogi" };

  if (status === "error") {
    return {
      ...base,
      status: "error",
      files: [],
      error: "Could not load documents (404).",
    };
  }

  if (status === "unavailable") {
    return { ...base, status: "unavailable", files: [] };
  }

  return { ...base, status: "available", files: buildMockFiles(courseId) };
};
