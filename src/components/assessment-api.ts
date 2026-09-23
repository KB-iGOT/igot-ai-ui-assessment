/**
 * Client for the assessment editing workspace.
 *
 * Path shape is dictated by the Kong API entity in front of the service: it
 * can only prefix-match, so every route is a static verb prefix with `job_id`
 * as the single trailing segment, and everything else — including
 * `questionId` — travels in the body. That is why delete and reorder are
 * POSTs rather than DELETE and PUT.
 *
 * Requests use the Sunbird `{ request: ... }` envelope with camelCase fields.
 * Responses are NOT enveloped.
 */

/** Same proxy base the rest of the app uses; the session cookie is the auth. */
const BASE = "/apis/proxies/v8/ai/assessments/v1";

export interface ApiFieldError {
  code: string;
  field?: string | null;
  question_id?: string | null;
  params?: Record<string, unknown>;
}

/** The error envelope every rejected call returns. */
export interface ApiErrorBody {
  /** The primary error's code, sometimes suffixed "(+N more)". For logs only. */
  detail?: string;
  errors?: ApiFieldError[];
  current_version?: number;
}

/**
 * A rejected call. Carries the machine-readable `errors` array rather than a
 * sentence — see ./assessment-errors for the copy.
 */
export class AssessmentApiError extends Error {
  readonly httpStatus: number;
  readonly errors: ApiFieldError[];
  /** Present on 409, so a caller can resync without reading `errors`. */
  readonly currentVersion?: number;

  constructor(httpStatus: number, body: ApiErrorBody | undefined) {
    const errors: ApiFieldError[] = Array.isArray(body?.errors) ? body.errors : [];
    super(String(body?.detail ?? `request_failed_${httpStatus}`));
    this.name = "AssessmentApiError";
    this.httpStatus = httpStatus;
    this.errors = errors;

    const conflictParam = errors.find((e) => e.code === "version_conflict")?.params
      ?.current_version;
    this.currentVersion =
      typeof body?.current_version === "number"
        ? body.current_version
        : typeof conflictParam === "number"
        ? conflictParam
        : undefined;

    // Required for `instanceof` to survive the ES5 downlevel of extended Error.
    Object.setPrototypeOf(this, AssessmentApiError.prototype);
  }

  get code(): string {
    return this.errors[0]?.code ?? this.message;
  }

  /**
   * The assessment moved on under us. Nothing was written, so the fix is
   * always reload-and-reapply rather than retry.
   */
  get isVersionConflict(): boolean {
    return this.httpStatus === 409 || this.code === "version_conflict";
  }

  /** The named question is gone — also a reload, not a retry. */
  get isStale(): boolean {
    return this.isVersionConflict || this.httpStatus === 404;
  }
}

/** Shape shared by every successful editing response. */
export interface SaveResult {
  /** "saved", "no_changes" or "order_unchanged" — the last two do not bump the version. */
  code: string;
  status: string;
  job_id: string;
  version: number;
  question_order: string[];
  total_questions: number;
  /** The saved question, on create and update. */
  question?: Record<string, unknown>;
  /** Server-assigned, on create. */
  question_id?: string;
}

const send = async (
  path: string,
  request: Record<string, unknown>
): Promise<SaveResult> => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new AssessmentApiError(res.status, body);
  return body as SaveResult;
};

/**
 * `updates` is keyed by dotted path, so only what changed is sent.
 * `version` is optional but always supplied by this app: it is what turns a
 * double-submitted save into a 409 instead of a second write.
 */
export const updateQuestion = (
  jobId: string,
  args: { questionId: string; version?: number; updates: Record<string, unknown> }
) => send(`/questions/update/${jobId}`, args);

/** 201. The server assigns `question_id` and marks the question human_authored. */
export const createQuestion = (
  jobId: string,
  args: {
    questionType: string;
    question: Record<string, unknown>;
    /** 1-based. Omit to append. */
    position?: number;
    version?: number;
  }
) => send(`/questions/create/${jobId}`, args);

export const deleteQuestion = (
  jobId: string,
  args: { questionId: string; version?: number }
) => send(`/questions/delete/${jobId}`, args);

/** `questionOrder` must name every question exactly once. */
export const reorderQuestions = (
  jobId: string,
  args: { questionOrder: string[]; version?: number }
) => send(`/questions/order/${jobId}`, args);

/** Re-reads the assessment. Used to recover from a 409 or a stale question. */
export const fetchAssessmentStatus = async (jobId: string) => {
  const res = await fetch(`${BASE}/status/${jobId}`);
  if (!res.ok) throw new AssessmentApiError(res.status, await res.json().catch(() => ({})));
  return res.json();
};
