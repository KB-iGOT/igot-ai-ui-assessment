import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Captions,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Video,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import {
  fetchCourseDocuments,
  fileKindLabel,
  formatSize,
  type CourseDocuments,
  type CourseFile,
} from "./contextual-documents";

/**
 * Forces a real download instead of a navigation. The `download` attribute
 * on an `<a>` is ignored by browsers for cross-origin URLs — and every file
 * here is cross-origin (GCS storage, content-store) — so the file is fetched
 * as a blob and saved from an object URL instead. Falls back to opening the
 * file in a new tab when the source does not allow a cross-origin fetch.
 */
const downloadFile = async (file: Pick<CourseFile, "url" | "name">) => {
  if (!file.url) return;
  try {
    const response = await fetch(file.url);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(file.url, "_blank", "noopener,noreferrer");
  }
};

interface ContextualDocumentsProps {
  courseIds: string[];
  /** Course id → display name, for labelling before metadata arrives. */
  courseNameMap?: Record<string, string>;
}

/**
 * Per-course availability of contextual documents and VTT transcripts, shown
 * on the configuration screen before generation.
 *
 * One record per selected course, refreshed whenever the selection changes.
 * Availability is three-valued — a failed lookup is reported as such rather
 * than as "no documents", so a fetch failure is never mistaken for absence.
 */
const ContextualDocuments = ({
  courseIds,
  courseNameMap = {},
}: ContextualDocumentsProps) => {
  const [docs, setDocs] = useState<Record<string, CourseDocuments>>({});
  const [reloadToken, setReloadToken] = useState(0);

  // Ignore ordering and the "NA" placeholder the course picker uses.
  const selected = courseIds.filter((id) => id && id !== "NA");
  const key = [...selected].sort().join(",");

  useEffect(() => {
    if (!selected.length) {
      setDocs({});
      return;
    }

    const controller = new AbortController();

    // Drop records for courses no longer selected, keep the rest so already
    // loaded lists do not flicker when one course is added.
    setDocs((prev) => {
      const next: Record<string, CourseDocuments> = {};
      for (const id of selected) {
        next[id] =
          prev[id] ?? {
            courseId: id,
            courseName: courseNameMap[id] || id,
            status: "loading",
            files: [],
          };
      }
      return next;
    });

    (async () => {
      await Promise.all(
        selected.map(async (id) => {
          try {
            const result = await fetchCourseDocuments(
              id,
              courseNameMap[id] || id,
              controller.signal
            );
            if (controller.signal.aborted) return;
            setDocs((prev) => ({ ...prev, [id]: result }));
          } catch {
            /* aborted — a newer selection is in flight */
          }
        })
      );
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadToken]);

  if (!selected.length) return null;

  const retry = (id: string) => {
    setDocs((prev) => ({ ...prev, [id]: { ...prev[id], status: "loading" } }));
    setReloadToken((n) => n + 1);
  };

  return (
    <div className="card-elevated p-4" data-testid="contextual-documents">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Contextual documents
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reference material and transcripts attached to the selected
            course{selected.length > 1 ? "s" : ""}. These inform the generated
            questions.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {selected.map((id) => {
          const d = docs[id];
          if (!d) return null;
          const documents = d.files.filter((f) => f.kind === "document");
          // const videos = d.files.filter((f) => f.kind === "video");
          const transcripts = d.files.filter((f) => f.kind === "vtt");

          // Videos are fetched (for their captions) but not shown, so a
          // course whose only resource is a caption-less video must not
          // read as "available" when nothing is actually listed below.
          const status =
            d.status === "available" && documents.length + transcripts.length === 0
              ? "unavailable"
              : d.status;

          return (
            <div
              key={id}
              data-testid={`course-docs-${id}`}
              className="border border-border rounded-lg overflow-hidden bg-white/60"
            >
              {/* Course header */}
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {d.courseName}
                  </div>
                  {d.provider && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Provider: {d.provider}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {status === "loading" && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking…
                    </span>
                  )}
                  {status === "available" && (
                    <Badge className="bg-accent/15 text-accent border border-accent/30 text-xs">
                      Available
                    </Badge>
                  )}
                  {status === "unavailable" && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Not available
                    </Badge>
                  )}
                  {status === "error" && (
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">
                      Could not check
                    </Badge>
                  )}
                </div>
              </div>

              {/* Body */}
              {status === "loading" && (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  Checking for contextual documents…
                </div>
              )}

              {status === "unavailable" && (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  No contextual documents or VTT files are available for this
                  course.
                </div>
              )}

              {status === "error" && (
                <div className="px-4 py-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground">
                      {d.error ?? "Could not load documents."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Availability is unknown — this course may still have
                      documents. You can continue generating the assessment.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retry(id)}
                      className="h-7 mt-2 gap-1.5 text-xs"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try again
                    </Button>
                  </div>
                </div>
              )}

              {status === "available" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-xs text-muted-foreground px-4 py-2">
                          File name
                        </th>
                        <th className="text-left font-medium text-xs text-muted-foreground px-3 py-2 whitespace-nowrap">
                          Type
                        </th>
                        <th className="text-right font-medium text-xs text-muted-foreground px-4 py-2 whitespace-nowrap">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...documents, /* ...videos, */ ...transcripts].map((f) => (
                        <tr key={f.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {f.kind === "vtt" ? (
                                <Captions className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              ) : f.kind === "video" ? (
                                <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate text-foreground">{f.name}</span>
                              {formatSize(f.sizeBytes) && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatSize(f.sizeBytes)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-normal",
                                f.kind === "vtt"
                                  ? "border-sky-300 text-sky-700 bg-sky-50"
                                  : f.kind === "video"
                                  ? "border-violet-300 text-violet-700 bg-violet-50"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {fileKindLabel(f.kind)}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            {f.url ? (
                              <button
                                type="button"
                                onClick={() => downloadFile(f)}
                                aria-label={`Download ${f.name}`}
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            ) : (
                              <span
                                className="text-xs text-muted-foreground"
                                title="No download link is available for this file"
                              >
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground">
                    {documents.length} contextual document
                    {documents.length === 1 ? "" : "s"} · {transcripts.length} VTT
                    file{transcripts.length === 1 ? "" : "s"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContextualDocuments;
