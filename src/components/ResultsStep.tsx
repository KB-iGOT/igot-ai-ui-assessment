import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronUp,
  FileJson,
  FileType,
  Lightbulb,
  Target,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ACCESS_TOKEN_2 } from "./ConstantAPI";
import EditQuestionDialog from "./EditQuestionDialog";
import type { Question } from "./question-types";
import {
  correctAnswerText as getCorrectAnswerText,
  createBlankQuestion,
  nextQuestionId,
} from "./question-types";
import {
  AssessmentApiError,
  createQuestion,
  deleteQuestion,
  reorderQuestions,
  updateQuestion,
} from "./assessment-api";
import { describeErrors } from "./assessment-errors";
import { apiQuestionType, toCreateBody, toUpdates } from "./question-payload";

interface ResultsStepProps {
  isGenerated: boolean;
  totalQuestions: number;
  assessmentLevel: string;
  timeLimit: number;
  topics: string[];
  onStartOver: () => void;
  courseIds?: string[];
  specificCourseId?: string;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  onRegenerate: () => void;
  isGenerating: any
  assessmentData: any,
  viewJobData: any;
  /** Assessment job id. Without it nothing can be persisted. */
  jobId?: string;
  /** Current assessment version, sent with every save to detect conflicts. */
  version?: number;
  onVersionChange?: (version: number) => void;
  /** Re-reads the assessment after a conflict or a vanished question. */
  onReload?: () => Promise<void>;
}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const checklist = [
  { label: "Assessment Items assess the LO they are tagged to", status: "ok" },
  { label: "Assessment covers all LOs comprehensively.", status: "ok" },
  { label: "Assessment Items contains stem all the information needed to answer the question, i.e. the test-taker is able to answer the question based on the stem alone", status: "ok" },
  { label: "The Assessment Item's statements avoid double negatives (e.g., Which of the following is NOT incorrect?)", status: "ok" },
  { label: "The Assessment Items consistent terms for related concepts are used, avoiding variations that may confuse the test-taker.", status: "ok" },
  { label: "The Assessment Items have extreme options like ‘all’, ‘always’, ‘never’ are avoided. ‘All of the above’ is used only when necessary", status: "ok" },
  { label: "Assessment Items avoid vague options containing ‘usually,’ ‘typically,’ and ‘maybe.’ ‘None of the above’ is used in a limited way.", status: "ok" },
  { label: "None of the distractors in Assessment Items mean the same thing as the correct answer key(s). All options are mutually exclusive.", status: "ok" },
  { label: "No more than two blanks are included within the sentence in any Assessment Item.", status: "ok" },
  { label: "Assessment Items based on case studies include a clearly defined problem or challenge.", status: "ok" },
  { label: "The length of the case study in Assessment Items is appropriate to its level of complexity of action verbs in Bloom's taxanomy", status: "ok" },
  { label: "The number of options in Assessment Items is between 2 to 5.", status: "ok" },
  { label: "All Assessment Items and options are grammatically correct, with proper sentence structure and punctuation.", status: "ok" },
  { label: "Assessment Items and options are free from stereotypes, biases, and content that may offend any group.", status: "ok" },
  { label: "Cultural and gender-inclusive language is used in all Assessment Items.", status: "ok" },
  { label: "The time allocated per Assessment Item is appropriate for its difficulty level.", status: "ok" },
  { label: "The total assessment time is reasonable based on the number and complexity of Assessment Items.", status: "ok" },
  { label: "A clear answer key is available for Assessment Items, with explanations and justification for distractors.", status: "ok" },
  { label: "The test administration process for Assessment Items is well-defined.", status: "ok" },
  { label: "Passing criteria are clearly stated for the overall Assessment.", status: "ok" },
];

// Sample generated questions data
const sampleQuestions = [
  {
    id: 1,
    type: "MCQ",
    bloomLevel: "Remember",
    bloomPercent: 10,
    question: "What is the primary function of a database index?",
    options: [
      { label: "A", text: "To store backup copies of data" },
      { label: "B", text: "To speed up data retrieval operations" },
      { label: "C", text: "To encrypt sensitive information" },
      { label: "D", text: "To compress data storage" },
    ],
    correctAnswer: "B",
    rationale: "Database indexes create a data structure that allows the database engine to find rows faster without scanning the entire table. This is fundamental to database performance optimization."
  },
  {
    id: 2,
    type: "MCQ",
    bloomLevel: "Understand",
    bloomPercent: 20,
    question: "Which statement best explains the concept of normalization in databases?",
    options: [
      { label: "A", text: "Combining multiple tables into one for faster access" },
      { label: "B", text: "Organizing data to reduce redundancy and improve integrity" },
      { label: "C", text: "Converting data types to a standard format" },
      { label: "D", text: "Encrypting data for security purposes" },
    ],
    correctAnswer: "B",
    rationale: "Normalization is a systematic approach to decomposing tables to eliminate data redundancy and undesirable characteristics like insertion, update, and deletion anomalies."
  },
  {
    id: 3,
    type: "MCQ",
    bloomLevel: "Apply",
    bloomPercent: 25,
    question: "Given a users table with columns (id, name, email), which SQL query correctly retrieves all users with email ending in '@company.com'?",
    options: [
      { label: "A", text: "SELECT * FROM users WHERE email = '@company.com'" },
      { label: "B", text: "SELECT * FROM users WHERE email LIKE '%@company.com'" },
      { label: "C", text: "SELECT * FROM users WHERE email CONTAINS '@company.com'" },
      { label: "D", text: "SELECT * FROM users WHERE email ENDS '@company.com'" },
    ],
    correctAnswer: "B",
    rationale: "The LIKE operator with '%' wildcard matches any sequence of characters. '%@company.com' matches any email ending with '@company.com'."
  },
  {
    id: 4,
    type: "True/False",
    bloomLevel: "Analyze",
    bloomPercent: 20,
    question: "A composite primary key consisting of two foreign keys is always required when implementing a many-to-many relationship between two tables.",
    options: [
      { label: "T", text: "True" },
      { label: "F", text: "False" },
    ],
    correctAnswer: "F",
    rationale: "While a junction table is needed for many-to-many relationships, using a composite primary key is a design choice. An auto-incrementing surrogate key can also be used as the primary key."
  },
  {
    id: 5,
    type: "MCQ",
    bloomLevel: "Evaluate",
    bloomPercent: 15,
    question: "Which database design approach would be most appropriate for a real-time analytics dashboard requiring sub-second query response times on billions of records?",
    options: [
      { label: "A", text: "Fully normalized relational database (3NF)" },
      { label: "B", text: "Columnar database with denormalized schema" },
      { label: "C", text: "Document-based NoSQL database" },
      { label: "D", text: "Graph database" },
    ],
    correctAnswer: "B",
    rationale: "Columnar databases excel at analytical queries on large datasets because they read only relevant columns, enable better compression, and are optimized for aggregation operations."
  }
];

const bloomColors: Record<string, { bg: string; text: string; border: string; light: string }> = {
  "Remember": { bg: "bg-sky-500", text: "text-sky-700", border: "border-sky-200", light: "bg-sky-50" },
  "Understand": { bg: "bg-teal-500", text: "text-teal-700", border: "border-teal-200", light: "bg-teal-50" },
  "Apply": { bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200", light: "bg-emerald-50" },
  "Analyze": { bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-200", light: "bg-amber-50" },
  "Evaluate": { bg: "bg-orange-500", text: "text-orange-700", border: "border-orange-200", light: "bg-orange-50" },
  "Create": { bg: "bg-rose-500", text: "text-rose-700", border: "border-rose-200", light: "bg-rose-50" },
};

const exportFormats = [
  { id: "pdf", name: "PDF", icon: FileText, description: "Print-ready document" },
  { id: "word", name: "Word", icon: FileType, description: "Editable .docx file" },
  { id: "csv", name: "CSV", icon: FileJson, description: "CSV file" },
];

const ResultsStep = ({
  isGenerated,
  totalQuestions,
  assessmentLevel,
  timeLimit,
  topics,
  onStartOver,
  courseIds,
  specificCourseId,
  questions,
  setQuestions,
  isGenerating,
  onRegenerate,
  assessmentData,
  viewJobData,
  jobId,
  version,
  onVersionChange,
  onReload,
}: ResultsStepProps) => {
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<Question | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Read inside the debounced order save, which would otherwise close over
  // the version from the render that scheduled it.
  const versionRef = useRef(version);
  versionRef.current = version;

  const orderSaveTimer = useRef<number | null>(null);
  // The sequence a scheduled save will send, kept so it can be flushed early.
  const pendingOrder = useRef<Question[] | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvVariant, setCsvVariant] = useState<"basic" | "advance">("basic");

  // A draft (new question) takes precedence — it has no place in `questions` yet.
  const editingQuestion =
    draftQuestion ?? questions.find(q => q.id === editingQuestionId) ?? null;
  const isCreating = draftQuestion !== null;

  const toggleQuestion = (id: number) => {
    setExpandedQuestions(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const startEditing = (question: Question) => {
    setEditingQuestionId(question.id);
    if (!expandedQuestions.includes(question.id)) {
      setExpandedQuestions(prev => [...prev, question.id]);
    }
  };

  /**
   * Identity allocation is monotonic for the session. Taking max+1 of the
   * current questions would recycle the id of a deleted highest question,
   * handing a new question an identity that previously belonged to a different
   * one — harmless for rendering, but a hazard for audit trails and anything
   * keyed on it. The mark tracks the highest id ever seen, including ids since
   * deleted, so it must be updated on render rather than only on allocation.
   */
  const idHighWater = useRef(0);
  idHighWater.current = Math.max(
    idHighWater.current,
    ...questions.map(q => q.id),
    0
  );

  const allocateQuestionId = () => {
    idHighWater.current = Math.max(idHighWater.current, nextQuestionId(questions) - 1) + 1;
    return idHighWater.current;
  };

  const startCreating = () => setDraftQuestion(createBlankQuestion(allocateQuestionId()));

  const cancelEditing = () => {
    setEditingQuestionId(null);
    setDraftQuestion(null);
  };

  /**
   * Turns a rejected call into something the reviewer can act on.
   *
   * A stale local copy — a 409, or a question that no longer exists — is not a
   * retry. Nothing was written and the screen is behind, so the assessment is
   * reloaded and the reviewer re-applies; retrying would only conflict again.
   * Everything else is a validation failure, whose wording comes from the
   * error code because the API deliberately sends no message string.
   */
  const handleApiError = async (err: unknown, title: string) => {
    if (err instanceof AssessmentApiError && err.isStale) {
      toast({
        title: err.isVersionConflict ? "This assessment changed" : "Question not found",
        description: `${describeErrors(err.errors)} Reloading the latest version.`,
        variant: "destructive",
      });
      try {
        await onReload?.();
      } catch {
        /* the reload failed too — a page refresh is the reviewer's way out */
      }
      return;
    }

    toast({
      title,
      description:
        err instanceof AssessmentApiError
          ? describeErrors(err.errors)
          : "Could not reach the server. Check your connection and try again.",
      variant: "destructive",
    });
  };

  const cancelPendingOrderSave = () => {
    if (orderSaveTimer.current !== null) {
      window.clearTimeout(orderSaveTimer.current);
      orderSaveTimer.current = null;
    }
  };

  const notSavable = () => {
    toast({
      title: "Not saved",
      description: "This assessment has no job id, so changes cannot be saved.",
      variant: "destructive",
    });
  };

  /**
   * Saves an edited or newly authored question.
   *
   * The dialog is closed by clearing the editing state, and that only happens
   * on success — a rejected save leaves the reviewer's work on screen to fix
   * rather than discarding it behind a toast.
   */
  const saveEditing = async (updated: Question) => {
    if (!jobId) return notSavable();

    setIsSaving(true);
    try {
      if (isCreating) {
        // Settle any pending reorder first: an add lands at the end of the
        // sequence the SERVER holds, not the one on screen.
        await flushPendingOrderSave();

        const result = await createQuestion(jobId, {
          version: versionRef.current,
          questionType: apiQuestionType(updated.type),
          question: toCreateBody(updated),
          // No position: appended, which matches where it lands locally.
        });
        onVersionChange?.(result.version);

        // Identity and provenance are the server's to assign.
        const saved: Question = {
          ...updated,
          questionId: result.question_id ?? (result.question?.question_id as string),
        };
        setQuestions(prev => [...prev, saved]);
        setExpandedQuestions(prev => [...prev, saved.id]);
        setDraftQuestion(null);
        toast({
          title: "Question added",
          description: `Added as question ${questions.length + 1} of this assessment.`,
        });
        // Reconciles the optimistic add against what the server actually
        // stored — the local patch above is applied instantly for a
        // responsive dialog close, this catches anything it got wrong
        // without waiting on it.
        onReload?.().catch(() => {});
        return;
      }

      const before = questions.find(q => q.id === updated.id);
      if (!before?.questionId) {
        await handleApiError(
          new AssessmentApiError(404, { errors: [{ code: "question_not_found" }] }),
          "Could not save the question"
        );
        return;
      }

      const updates = toUpdates(before, updated);
      if (!Object.keys(updates).length) {
        // Nothing moved — no round trip, and no version bump to explain.
        setEditingQuestionId(null);
        return;
      }

      const result = await updateQuestion(jobId, {
        questionId: before.questionId,
        version: versionRef.current,
        updates,
      });
      onVersionChange?.(result.version);

      setQuestions(prev => prev.map(q => (q.id === updated.id ? updated : q)));
      setEditingQuestionId(null);
      toast({
        title: result.code === "no_changes" ? "No changes to save" : "Question updated",
        description:
          result.code === "no_changes"
            ? "This question already matches what is saved."
            : "Your changes have been saved to this assessment.",
      });
      // Reconciles the optimistic patch above against what the server
      // actually stored, so a field the diff logic silently dropped shows up
      // right away instead of only on the next full reload.
      onReload?.().catch(() => {});
    } catch (err) {
      await handleApiError(err, "Could not save the question");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (!jobId) return notSavable();

    const target = pendingDelete;
    const position = questions.findIndex(q => q.id === target.id) + 1;

    if (!target.questionId) {
      await handleApiError(
        new AssessmentApiError(404, { errors: [{ code: "question_not_found" }] }),
        "Could not delete the question"
      );
      return;
    }

    setIsSaving(true);
    try {
      // Settle any pending reorder first, so the server is renumbering the
      // same sequence the reviewer is looking at.
      await flushPendingOrderSave();

      const result = await deleteQuestion(jobId, {
        questionId: target.questionId,
        version: versionRef.current,
      });
      onVersionChange?.(result.version);

      setQuestions(prev => prev.filter(q => q.id !== target.id));
      setExpandedQuestions(prev => prev.filter(id => id !== target.id));
      setPendingDelete(null);
      toast({
        title: "Question deleted",
        description: `Question ${position} was removed. Remaining questions have been renumbered.`,
      });
      // Reconciles the optimistic removal — and the renumbering it implies
      // for everything after it — against the server's own count and order.
      onReload?.().catch(() => {});
    } catch (err) {
      await handleApiError(err, "Could not delete the question");
    } finally {
      setIsSaving(false);
    }
  };

  /** How long to wait for the reviewer to settle before saving the order. */
  const ORDER_SAVE_DELAY_MS = 1200;

  const persistOrder = async (ordered: Question[]) => {
    if (!jobId) return;

    const questionOrder = ordered
      .map(q => q.questionId)
      .filter((id): id is string => Boolean(id));

    // The call names every question or it is rejected wholesale — that check
    // is the guard against a stale client silently dropping one, so there is
    // no point sending a list we already know is short.
    if (questionOrder.length !== ordered.length) return;

    try {
      const result = await reorderQuestions(jobId, {
        questionOrder,
        version: versionRef.current,
      });
      onVersionChange?.(result.version);
    } catch (err) {
      await handleApiError(err, "Could not save the new order");
    }
  };

  /**
   * Persists the sequence once the reviewer stops moving things.
   *
   * One call per drag session, not one per move: each call is a version bump
   * and a round trip. Moves apply locally at once and the settled order is
   * sent after a pause. This is the one part of the editor that genuinely
   * cannot stay client-side — `question_order` is what every download reads.
   */
  const scheduleOrderSave = (ordered: Question[]) => {
    if (!jobId) return;
    cancelPendingOrderSave();
    pendingOrder.current = ordered;

    orderSaveTimer.current = window.setTimeout(() => {
      orderSaveTimer.current = null;
      const ordering = pendingOrder.current;
      pendingOrder.current = null;
      if (ordering) void persistOrder(ordering);
    }, ORDER_SAVE_DELAY_MS);
  };

  /**
   * Sends a still-pending reorder before some other change goes out.
   *
   * Dropping it instead would leave the server on the old sequence while the
   * screen shows the new one, and the next add would land in the wrong place.
   * Adds and deletes both rewrite `question_order` server-side, so the reorder
   * has to be settled first rather than after.
   */
  const flushPendingOrderSave = async () => {
    cancelPendingOrderSave();
    const ordering = pendingOrder.current;
    pendingOrder.current = null;
    if (ordering) await persistOrder(ordering);
  };

  // Drop a scheduled save if the view goes away before it fires.
  useEffect(() => cancelPendingOrderSave, []);

  /**
   * Moves a question from one position to another, shifting the rest — not a
   * swap, so dragging across several positions behaves as the user expects.
   */
  const reorderQuestion = (from: number, to: number) => {
    if (from === to || to < 0 || to >= questions.length) return;

    const next = [...questions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setQuestions(next);
    setReorderAnnouncement(
      `Question moved from position ${from + 1} to position ${to + 1} of ${questions.length}.`
    );
    scheduleOrderSave(next);
  };

  const handleDragStart = (index: number) => setDraggingIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== dragOverIndex) setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex !== null) reorderQuestion(draggingIndex, index);
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  /** Arrow keys move a question while its grip handle has focus. */
  const handleGripKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const to = e.key === "ArrowUp" ? index - 1 : index + 1;
    if (to < 0 || to >= questions.length) return;
    reorderQuestion(index, to);
    // Keep focus on the handle that moved so it can be moved again.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-grip-index="${to}"]`);
      el?.focus();
    });
  };






  const handleExport = async () => {
    console.log('csvVariant', csvVariant)
    try {

      let url = "";
      let fileName = "";
      let mimeType = "";
      if (selectedFormat === "json") {
        url = `/apis/proxies/v8/ai/assessments/v1/download/${specificCourseId ||
          (courseIds?.length ? courseIds : viewJobData?.course_id)
          }?format=json`;
        fileName = "assessment.json";
        mimeType = "application/json";
      }

      if (selectedFormat === "pdf") {
        // example – update when PDF API is ready
        url = `/apis/proxies/v8/ai/assessments/v1/download/${specificCourseId ||
          (courseIds?.length ? courseIds : viewJobData?.course_id)
          }?format=pdf`;
        fileName = "assessment.pdf";
        mimeType = "application/pdf";
      }
      if (selectedFormat === "csv") {
        // example – update when CSV API is ready
        if (csvVariant === 'basic') {
          url = `/apis/proxies/v8/ai/assessments/v1/download/${specificCourseId ||
          (courseIds?.length ? courseIds : viewJobData?.course_id)
          }?format=csv_basic`;
        }
        else {
  url = `/apis/proxies/v8/ai/assessments/v1/download/${specificCourseId ||
          (courseIds?.length ? courseIds : viewJobData?.course_id)
          }?format=csv`;
        }
        fileName = "assessment.csv";
        mimeType = "application/csv";
      }
      if (selectedFormat === "word") {
        // example – update when Word API is ready
        url = `/apis/proxies/v8/ai/assessments/v1/download/${specificCourseId ||
          (courseIds?.length ? courseIds : viewJobData?.course_id)
          }?format=docx`;
        fileName = "assessment.docx";
        mimeType = "application/docx";
      }

      if (!url) return;
      const token = ACCESS_TOKEN_2;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: mimeType,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download started",
        description: `Your ${selectedFormat.toUpperCase()} file is downloading.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Download failed",
        description: "Unable to download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadClick = () => {
    if (selectedFormat === "csv") {
      setShowCsvModal(true);
    } else {
      handleExport();
    }
  };

  const handleCsvDownload = () => {
    setShowCsvModal(false);
    handleExport();
  };

  if (!isGenerated) {
    return (
      <div className="card-elevated rounded-xl p-8 text-center">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          Complete the configuration to generate your assessment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 stagger-children">
      {/* Success Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 border border-accent/20 rounded-xl p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Assessment Generated Successfully</h3>
              <p className="text-sm text-muted-foreground">Your {totalQuestions}-question assessment is ready for review and export.</p>
            </div>
          </div>
          <button onClick={onRegenerate} className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 border border-input bg-background hover:bg-primary/90 hover:text-accent-foreground h-9 rounded-md px-3 shrink-0 gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-rotate-ccw w-4 h-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>Regenerate</button>
        </div>
      </div>

      {/* <Button
        variant="outline"
        onClick={onRegenerate}
        disabled={isGenerating}
        className="h-9 w-[100%]"
      >
        <Sparkles className="w-4 h-4 mr-1.5 " />
        Regenerate with Same Settings
      </Button> */}
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: FileText, value: totalQuestions, label: "Questions", color: "text-primary" },
          { icon: BarChart3, value: assessmentLevel, label: "Level", color: "text-accent" },
          { icon: Clock, value: `${timeLimit}m`, label: "Duration", color: "text-soft-amber" },
          { icon: Target, value: topics.length, label: "Topics", color: "text-soft-rose" },
        ].map((stat, index) => (
          <div key={index} className="card-elevated p-4 text-center hover-lift">
            <stat.icon className={cn("w-5 h-5 mx-auto mb-2", stat.color)} />
            <div className="text-xl font-semibold text-foreground capitalize">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Topics */}
      <div className="card-elevated p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Topics Covered</h4>
        <div className="flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="text-xs">
              {topic}
            </Badge>
          ))}
        </div>
      </div>

      {/* Questions Preview */}
      <div className="card-elevated overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Edit questions</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update any question, its options, answer and mapping — changes are saved to this assessment.
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 shrink-0" />
                  Drag the handle to change question order, or focus it and use the arrow keys.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedQuestions(questions.map(q => q.id))}
                  className="text-xs text-primary hover:underline"
                >
                  Expand all
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={() => setExpandedQuestions([])}
                  className="text-xs text-primary hover:underline"
                >
                  Collapse all
                </button>
              </div>
              <Button size="sm" onClick={startCreating} className="h-8 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add question
              </Button>
            </div>
          </div>
        </div>



        {/* Announces reorder results to screen readers */}
        <div aria-live="polite" className="sr-only">{reorderAnnouncement}</div>

        <div className="divide-y divide-border">
          {questions?.map((q, qIndex) => {
            // Display position is derived from array order — `q.id` is a stable
            // identity that survives adding, deleting and reordering.
            const position = qIndex + 1;
            const typeMap: Record<string, string> = {
              "MCQ": "Multiple Choice Question",
              "FTB": "FTB Question",
              "MTF": "MTF Question",
              "MULTICHOICE": "Multi-Choice Question",
              "TRUEFALSE": "True/False Question"
            };
            // Raw record is matched by the stable question_id and used only as a
            // fallback for assessments generated before mapping fields were
            // stored on the question. Text matching is deliberately avoided —
            // it broke as soon as a question was edited.
            const rawType = typeMap[q.type] || Object.keys(assessmentData?.questions || {}).find(k => k.toUpperCase().includes(q.type));
            const rawList = assessmentData?.questions?.[rawType] || [];
            const raw = q.questionId
              ? rawList.find((item: any) => item.question_id === q.questionId)
              : undefined;

            // All display values prefer the question's own (editable) fields.
            const correctAnswerText = getCorrectAnswerText(q);
            const rationale = q.rationale ?? raw?.answer_rationale?.correct_answer_explanation ?? "—";
            const bloomsLevel = q.bloomLevel ?? raw?.blooms_level;
            const learningObjective = q.learningOutcome || raw?.reasoning?.learning_objective_alignment || "—";
            const courseName = q.courseName || raw?.course_name || "—";
            const kcmTheme = q.competency || raw?.reasoning?.competency_alignment?.kcm?.competency_theme || "—";
            const relevance = q.relevance ?? q.bloomPercent ?? 0;
            const colors = bloomColors[q.bloomLevel] ?? bloomColors["Remember"];
            const isExpanded = expandedQuestions.includes(q.id);
            const currentData = q;
            const isMTF = currentData.type === "MTF";
            const isDragging = draggingIndex === qIndex;
            const isDropTarget = dragOverIndex === qIndex && draggingIndex !== qIndex;
            const dropFromAbove = isDropTarget && draggingIndex !== null && draggingIndex < qIndex;

            return (
              <div
                key={q.id}
                className={cn(
                  "group transition-opacity",
                  isDragging && "opacity-40",
                  isDropTarget && (dropFromAbove
                    ? "border-b-2 border-b-primary"
                    : "border-t-2 border-t-primary")
                )}
                onDragOver={(e) => handleDragOver(e, qIndex)}
                onDrop={(e) => handleDrop(e, qIndex)}
              >
                {/* Question Header */}
                <div
                  className={cn(
                    "w-full flex items-center gap-3 p-4 text-left transition-colors",
                    isExpanded ? colors.light : "hover:bg-muted/30"
                  )}
                >
                  {/* Drag handle — also keyboard-operable with arrow keys */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(qIndex)}
                    onDragEnd={handleDragEnd}
                    className="shrink-0 self-stretch flex items-center"
                  >
                    <button
                      data-grip-index={qIndex}
                      onKeyDown={(e) => handleGripKeyDown(e, qIndex)}
                      aria-label={`Reorder question ${position} of ${questions.length}. Use arrow keys to move.`}
                      title="Drag to reorder, or focus and use ↑ ↓"
                      className="w-7 h-9 flex items-center justify-center rounded-md border border-border bg-white/70 text-muted-foreground cursor-grab active:cursor-grabbing hover:border-primary hover:text-primary transition-colors"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => toggleQuestion(q.id)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0",
                      colors?.bg
                    )}
                  >
                    {position}
                  </button>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col">
                      <div className="flex-1 min-w-0" onClick={() => toggleQuestion(q.id)}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            {q.type === "TRUEFALSE"
                              ? "TRUE/FALSE"
                              : q.type === "MULTICHOICE"
                                ? "MULTI SELECT QUESTION"
                                : q.type}
                          </Badge>

                          <Badge className={cn("text-xs", colors.light, colors.text, colors.border, "border")}>
                            {q.bloomLevel} • {q.bloomPercent}%
                          </Badge>

                          <span className="text-xs text-muted-foreground">
                            Relevance {relevance}%
                          </span>
                        </div>
                        <p className={cn(
                          "text-sm text-foreground cursor-pointer",
                          !isExpanded && "line-clamp-1"
                        )}>{q.question}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); startEditing(q); }}
                        className="h-8 gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>

                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(q); }}
                        disabled={questions.length <= 1}
                        aria-label={`Delete question ${position}`}
                        title={questions.length <= 1
                          ? "An assessment must keep at least one question"
                          : "Delete question"}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleQuestion(q.id)}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                          isExpanded ? colors?.bg + " text-white" : "bg-muted"
                        )}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className={cn("px-4 pb-4 pt-0", colors.light)}>
                    <div className="ml-12 space-y-4">
                      {/* Options */}
                      {/* OPTIONS */}
                      {isMTF ? (
                        /* ================= MTF : MATCHED ROW LAYOUT ================= */
                        <div className="bg-white/80 border border-border rounded-lg p-4">
                          <div className="space-y-2">
                            {currentData.options.map((option, i) => (
                              <div
                                key={i}
                                className="grid grid-cols-2 gap-4 items-stretch"
                              >
                                {/* LEFT CELL */}
                                <div className="p-2 rounded-md bg-muted text-sm text-foreground flex items-center">
                                  {option.text}
                                </div>

                                {/* RIGHT CELL */}
                                <div className="p-2 rounded-md bg-muted text-sm text-foreground flex items-center">
                                  {option.right}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* ================= MCQ / MULTI CHOICE ================= */
                        <div className="grid grid-cols-2 gap-2">
                          {currentData.options.map((option, optIndex) => {
                            const isCorrect = Array.isArray(currentData.correctAnswer)
                              ? currentData.correctAnswer.includes(option.label)
                              : option.label === currentData.correctAnswer;

                            return (
                              <div
                                key={option.label}
                                className={cn(
                                  "relative flex items-start gap-3 p-3 rounded-lg border transition-all",
                                  isCorrect
                                    ? "bg-accent/10 border-accent/30 shadow-sm"
                                    : "bg-white/80 border-border"
                                )}
                              >
                                {/* OPTION LABEL */}
                                <div
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                    isCorrect ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {option.label}
                                </div>

                                {/* OPTION TEXT */}
                                <span
                                  className={cn(
                                    "text-sm flex-1",
                                    isCorrect ? "text-foreground font-medium" : "text-muted-foreground"
                                  )}
                                >
                                  {option.text}
                                </span>

                                {isCorrect && (
                                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* correct answer */}
                      {(currentData?.type == 'FTB' || currentData?.type == 'TRUEFALSE') &&
                        <div className="bg-blue-50/80 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            </div>

                            <div className="flex-1">
                              <div className="text-xs font-medium text-blue-700 mb-1">
                                Correct Answer
                              </div>

                              <p className="text-sm text-blue-900">
                                {currentData.correctAnswer}
                              </p>
                            </div>
                          </div>
                        </div>
                      }


                      {/* justification section */}
                      <div className="bg-white rounded-2xl border border-border overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-shield-check w-4 h-4 text-primary">
                              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                              <path d="m9 12 2 2 4-4"></path></svg>
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Justification</span>
                          </div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-circle-check-big w-4 h-4 text-accent"><path d="M21.801 10A10 10 0 1 1 17 3.335"></path><path d="m9 11 3 3L22 4"></path></svg>
                            <span className="text-sm font-semibold text-foreground">
                              Correct Answer:{" "}
                              <span className="font-bold">
                                {correctAnswerText}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-lightbulb w-3.5 h-3.5 text-amber-600"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg></div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Rationale</div>
                              <div className="text-sm text-foreground break-words max-w-full">{rationale}</div>
                            </div>
                          </div>
                          <hr className="my-4 border-border" />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-chart-column w-4 h-4 text-muted-foreground"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Bloom Level</div>
                                <div className="text-sm font-medium">
                                  <span className={cn("text-xs font-medium break-words max-w-full", colors.text)}>{bloomsLevel}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 w-full">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-target h-4 text-muted-foreground w-[12%]"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Learning Outcome</div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium break-all whitespace-pre-wrap leading-relaxed">
                                    {learningObjective}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-graduation-cap w-3.5 h-3.5 text-muted-foreground shrink-0"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path></svg>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Competency (KCM)</div>
                                <div className="text-xs font-medium  break-words max-w-full">{kcmTheme}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-book-open w-3.5 h-3.5 text-muted-foreground shrink-0"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Course</div>
                                <div className="text-xs font-medium break-words max-w-full">{courseName}</div>
                              </div>
                            </div>
                          </div>

                          {/* Relevance to selected content */}
                          <div className="pt-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                Relevance to selected content
                              </span>
                              <span className="text-xs font-semibold text-accent">{relevance}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, relevance))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-center gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {questions.length} {questions.length === 1 ? "question" : "questions"}
          </p>
          <span className="text-muted-foreground text-xs">·</span>
          <button
            onClick={startCreating}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add question
          </button>
        </div>
      </div>

      {/* AI Disclaimer */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          These are AI generated results, please verify the same.
        </p>
      </div>

      {/* AI Quality Checklist */}
      {/* <div className="card-elevated">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-shield-check w-4 h-4 text-accent"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
            <h4 className="font-medium text-foreground">AI Quality Checklist</h4></div>
          <div className="text-xs text-muted-foreground mt-1">
            Automated validation checks performed on generated assessment
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {checklist.map((item, idx) => (
            <div key={item.label} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
              {item.status === "ok" ? (
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-accent/15 text-accent"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-circle-check-big w-3.5 h-3.5"><path d="M21.801 10A10 10 0 1 1 17 3.335"></path><path d="m9 11 3 3L22 4"></path></svg></div>
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-amber-100 text-amber-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-clock w-3.5 h-3.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
              )}
              <span
                className={cn(
                  "text-sm text-foreground",
                  item.status === "warn" ? "text-amber-700" : "text-foreground"
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div> */}

      {/* Export Options */}
      <div className="card-elevated p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Export Format</h4>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {exportFormats.map((format) => {
            const Icon = format.icon;
            const isSelected = selectedFormat === format.id;
            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className={cn(
                    "font-medium text-sm",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>{format.name}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onStartOver} className="flex-1 h-11">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Create New
          </Button>
          <Button onClick={handleDownloadClick} className="flex-1 h-11">
            <Download className="w-4 h-4 mr-1.5" />
            Download {exportFormats.find(f => f.id === selectedFormat)?.name}
          </Button>
        </div>
      </div>

      {/* CSV Format Modal */}
      <EditQuestionDialog
        question={editingQuestion}
        index={isCreating
          ? questions.length + 1
          : questions.findIndex(q => q.id === editingQuestionId) + 1}
        mode={isCreating ? "create" : "edit"}
        open={editingQuestionId !== null || isCreating}
        onClose={cancelEditing}
        onSave={saveEditing}
        saving={isSaving}
        onTypeChosen={(type) =>
          setDraftQuestion(prev =>
            prev ? createBlankQuestion(prev.id, type) : prev
          )
        }
      />

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPendingDelete(null)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-q-title"
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <h2 id="delete-q-title" className="text-lg font-semibold leading-none tracking-tight">
              Delete question {questions.findIndex(q => q.id === pendingDelete.id) + 1}?
            </h2>
            <p className="text-sm text-muted-foreground mt-3">
              This removes the question from the assessment and renumbers the ones after
              it. The assessment will have {questions.length - 1}{" "}
              {questions.length - 1 === 1 ? "question" : "questions"}.
            </p>
            {pendingDelete.question && (
              <p className="text-sm text-foreground mt-3 p-3 bg-muted/50 rounded-lg border border-border line-clamp-3">
                {pendingDelete.question}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={isSaving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isSaving ? "Deleting…" : "Delete question"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCsvModal && (
        <div className="fixed inset-[-16px] bg-black/50 z-50 flex items-center justify-center ">
          <div className="absolute inset-0 bg-black/50 " onClick={() => setShowCsvModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 w-[448px] h-[413px]">
            <button
              onClick={() => setShowCsvModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-semibold leading-none tracking-tight">Choose CSV format</h2>
            <p className="text-sm text-muted-foreground mb-5 mt-2">
              Select the CSV variant you want to download for this assessment.
            </p>

            <div className="space-y-3 mb-6">
              {/* Basic format */}
              <label
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  csvVariant === "basic"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <input
                  type="radio"
                  name="csvVariant"
                  value="basic"
                  checked={csvVariant === "basic"}
                  onChange={() => setCsvVariant("basic")}
                  className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Basic format</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Minimal columns only — question, options, correct answer and question type.
                    Best for quick imports into LMS or spreadsheets.
                  </div>
                </div>
              </label>

              {/* Advance Assessment format */}
              <label
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  csvVariant === "advance"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <input
                  type="radio"
                  name="csvVariant"
                  value="advance"
                  checked={csvVariant === "advance"}
                  onChange={() => setCsvVariant("advance")}
                  className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">Advance Assessment format</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Full metadata — includes Bloom's level, difficulty, competency, course,
                    learning outcome, rationale and analytics fields. Best for review, moderation
                    and reporting.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCsvModal(false)} className="px-6">
                Cancel
              </Button>
              <Button onClick={handleCsvDownload} className="px-6">
                <Download className="w-4 h-4 mr-1.5" />
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsStep;
