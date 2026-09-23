/**
 * Contextual documents and video captions attached to a course.
 *
 * Everything that touches the API shape lives in this file. The UI consumes
 * only the normalised types below, so confirming or changing the backend
 * contract means editing `extractResources` / `findEnglishVttUrl` and nothing
 * else.
 */

import { fetchMockCourseDocuments } from "./contextual-documents.mock";

/**
 * TEMPORARY: serve the panel from dummy data instead of the API.
 *
 * The live request in `fetchCourseDocuments` below is complete and unchanged.
 * To go live, set this to false — or set VITE_USE_MOCK_COURSE_DOCUMENTS=false
 * in the environment — and delete ./contextual-documents.mock. No component
 * or call site needs to change.
 */
export const USE_MOCK_COURSE_DOCUMENTS =
  import.meta.env.VITE_USE_MOCK_COURSE_DOCUMENTS === "true";

export type CourseFileKind = "document" | "video" | "vtt";

export interface CourseFile {
  /** Stable within a course; used as a React key. */
  id: string;
  name: string;
  kind: CourseFileKind;
  /** Raw mime type when the API supplies one — shown as a hint only. */
  mimeType?: string;
  /** Absolute or proxied URL. Undefined means the file cannot be downloaded. */
  url?: string;
  sizeBytes?: number;
}

/**
 * Availability is three-valued, not boolean. "unavailable" means the course
 * genuinely has no files; "error" means we could not find out. Collapsing the
 * two would report "no documents" for a failed request, which is the failure
 * AC-57 exists to prevent.
 */
export type DocumentsStatus = "loading" | "available" | "unavailable" | "error";

export interface CourseDocuments {
  courseId: string;
  courseName: string;
  provider?: string;
  status: DocumentsStatus;
  files: CourseFile[];
  /** Present only when status is "error". */
  error?: string;
}

/** A resource node as it arrives nested inside the course hierarchy. */
interface ContentNode {
  identifier?: string;
  name?: string;
  mimeType?: string;
  resourceType?: string;
  artifactUrl?: string;
  downloadUrl?: string;
  size?: number | string;
  children?: ContentNode[];
  referenceNodes?: ContentNode[];
}

/** Human label for the Type column. */
export const fileKindLabel = (kind: CourseFileKind) =>
  kind === "vtt" ? "VTT" : kind === "video" ? "Video" : "Contextual Document";

/** "2.4 MB" — omitted entirely when the API gives no size. */
export const formatSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0 || !Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
};

const VIDEO_MIME = /^video\//i;

type ResourceKind = "pdf" | "video";

const classifyResource = (mimeType?: string, resourceType?: string): ResourceKind | null => {
  const mt = (mimeType || "").toLowerCase();
  const rt = (resourceType || "").toLowerCase();
  if (mt === "application/pdf" || rt === "pdf") return "pdf";
  if (VIDEO_MIME.test(mt) || rt === "mp4") return "video";
  return null;
};

interface CourseResource {
  id: string;
  name: string;
  mimeType: string;
  kind: ResourceKind;
  url?: string;
  sizeBytes?: number;
}

/**
 * Walks every nested child of the course, however deep, collecting the PDF
 * and video leaves. A resource can also arrive flattened into the course's
 * own `referenceNodes` array rather than under `children` — both places are
 * checked, since the extended content-read endpoint uses either depending on
 * where the resource is attached.
 */
const collectResourceNodes = (node: unknown, out: ContentNode[] = []): ContentNode[] => {
  if (!node || typeof node !== "object") return out;
  const n = node as ContentNode;

  if (Array.isArray(n.children)) {
    for (const child of n.children) collectResourceNodes(child, out);
  }
  if (Array.isArray(n.referenceNodes)) {
    for (const ref of n.referenceNodes) collectResourceNodes(ref, out);
  }
  if (classifyResource(n.mimeType, n.resourceType)) out.push(n);

  return out;
};

/**
 * Pulls every PDF and video resource out of a course hierarchy response,
 * deduplicated by identifier. Structure nodes (course units, question sets)
 * and non-downloadable media (e.g. embedded YouTube links) are excluded by
 * construction — they never match the PDF/video mime check.
 */
const extractResources = (content: unknown): CourseResource[] => {
  const c = (content ?? {}) as ContentNode;
  const nested = collectResourceNodes(c);
  const rootRefs = Array.isArray(c.referenceNodes) ? c.referenceNodes : [];

  const seen = new Set<string>();
  const resources: CourseResource[] = [];

  for (const n of [...nested, ...rootRefs]) {
    const kind = classifyResource(n.mimeType, n.resourceType);
    if (!kind) continue;

    const id = n.identifier || `${n.name}-${n.mimeType}`;
    if (seen.has(id)) continue;

    const url = n.artifactUrl || n.downloadUrl || undefined;
    // A video with no URL is not something the front end can ever offer for
    // download, so it is dropped rather than listed as "Unavailable".
    if (kind === "video" && !url) continue;

    seen.add(id);
    resources.push({
      id,
      name: n.name || id,
      mimeType: n.mimeType || "",
      kind,
      url,
      sizeBytes: Number(n.size) || undefined,
    });
  }

  return resources;
};

interface TranscriptionUrl {
  type?: string;
  language?: string;
  label?: string;
  uri?: string;
}

interface TranscoderStatsResponse {
  data?: { transcription_urls?: TranscriptionUrl[] }[];
}

/** Picks the English VTT track out of a transcoder stats response. */
const findEnglishVttUrl = (data: unknown): string | undefined => {
  const transcripts = (data as TranscoderStatsResponse)?.data?.[0]?.transcription_urls;
  const englishVtt = transcripts?.find(
    (t) =>
      t.type?.toLowerCase() === "vtt" &&
      (t.language?.toLowerCase() === "english" || t.label?.toLowerCase() === "en")
  );
  return englishVtt?.uri || undefined;
};

/**
 * Looks up the English VTT caption track for one video resource. Never
 * throws (except AbortError) — a caption lookup failure should not take the
 * video's own download link down with it.
 */
const fetchVideoVttUrl = async (
  resourceId: string,
  signal?: AbortSignal
): Promise<string | undefined> => {
  try {
    const res = await fetch(
      `/apis/proxies/v8/chatbot/v3/transcoder/stats?resource_id=${resourceId}`,
      {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        signal,
      }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return findEnglishVttUrl(data);
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    console.error("Transcoder stats fetch error:", err);
    return undefined;
  }
};

/**
 * Turns the extracted PDF/video resources into the flat file list the panel
 * renders. Videos are looked up for an English caption track in parallel;
 * a video's caption entry is only added when that lookup returns a URL, so a
 * caption-less video still lists its own download link on its own.
 */
const buildFiles = async (
  resources: CourseResource[],
  signal?: AbortSignal
): Promise<CourseFile[]> => {
  const videos = resources.filter((r) => r.kind === "video");
  const vttUrlById = new Map<string, string | undefined>();

  await Promise.all(
    videos.map(async (v) => {
      vttUrlById.set(v.id, await fetchVideoVttUrl(v.id, signal));
    })
  );

  const files: CourseFile[] = [];
  for (const r of resources) {
    if (r.kind === "pdf") {
      files.push({
        id: r.id,
        name: r.name,
        kind: "document",
        mimeType: r.mimeType,
        url: r.url,
        sizeBytes: r.sizeBytes,
      });
      continue;
    }

    files.push({
      id: r.id,
      name: r.name,
      kind: "video",
      mimeType: r.mimeType,
      url: r.url,
      sizeBytes: r.sizeBytes,
    });

    const vttUrl = vttUrlById.get(r.id);
    if (vttUrl) {
      files.push({
        id: `${r.id}-vtt`,
        name: `${r.name} (English captions)`,
        kind: "vtt",
        mimeType: "text/vtt",
        url: vttUrl,
      });
    }
  }

  // Documents first, then videos, then captions — stable ordering so the
  // list does not reshuffle between fetches.
  const order: Record<CourseFileKind, number> = { document: 0, video: 1, vtt: 2 };
  return files.sort((a, b) =>
    order[a.kind] === order[b.kind]
      ? a.name.localeCompare(b.name)
      : order[a.kind] - order[b.kind]
  );
};

/**
 * Fetches document metadata for one course. Never throws — a failure is
 * returned as an "error" record so the caller can distinguish it from a
 * course that genuinely has nothing (AC-57).
 */
export const fetchCourseDocuments = async (
  courseId: string,
  courseName: string,
  signal?: AbortSignal
): Promise<CourseDocuments> => {
  // TEMPORARY: remove this block together with USE_MOCK_COURSE_DOCUMENTS
  // when the hierarchy endpoint is available.
  if (USE_MOCK_COURSE_DOCUMENTS) {
    return fetchMockCourseDocuments(courseId, courseName, signal);
  }

  try {
    const res = await fetch(
      `/apis/proxies/v8/extended/content/v1/read/${courseId}`,
      {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        signal,
      }
    );

    if (!res.ok) {
      return {
        courseId,
        courseName,
        status: "error",
        files: [],
        error: `Could not load documents (${res.status}).`,
      };
    }

    const data = await res.json();
    const content = data?.result?.content;
    const resources = extractResources(content);
    const files = await buildFiles(resources, signal);

    return {
      courseId,
      courseName: content?.name || courseName,
      provider: content?.source || content?.orgDetails?.orgName || content?.channel,
      status: files.length ? "available" : "unavailable",
      files,
    };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return {
      courseId,
      courseName,
      status: "error",
      files: [],
      error: "Could not load documents. Check your connection and try again.",
    };
  }
};
