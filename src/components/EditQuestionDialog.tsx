import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ArrowLeft, ArrowRight, Loader2, Pencil, Plus, Save, Target, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Question, QuestionOption } from "./question-types";
import {
  BLOOM_LEVELS,
  QUESTION_TYPE_HINTS,
  QUESTION_TYPE_LABELS,
  letterFor,
  typeLabel,
} from "./question-types";

interface EditQuestionDialogProps {
  question: Question | null;
  /** 1-based position shown in the title. Falls back to question.id. */
  index?: number;
  /** "create" retitles the dialog and its confirm button. */
  mode?: "edit" | "create";
  open: boolean;
  onClose: () => void;
  /** May be async. The dialog stays open until the parent clears `open`, so
   *  a rejected save keeps the reviewer's work on screen. */
  onSave: (updated: Question) => void | Promise<unknown>;
  /** Disables the confirm button while a save is in flight. */
  saving?: boolean;
  /** Create mode: rebuilds the draft when the creator picks a type. */
  onTypeChosen?: (type: string) => void;
}

/**
 * Full-question editor used from both the post-generation results view and the
 * past-assessments view, for editing an existing question and for adding a new
 * one. Edits a local draft and only calls onSave on confirm, so Cancel always
 * discards cleanly.
 */
const EditQuestionDialog = ({
  question,
  index,
  mode = "edit",
  open,
  onClose,
  onSave,
  saving = false,
  onTypeChosen,
}: EditQuestionDialogProps) => {
  const [draft, setDraft] = useState<Question | null>(null);
  // Create mode opens on the type picker; editing goes straight to the form.
  const [typeChosen, setTypeChosen] = useState(false);

  // Reset the draft whenever a different question is opened.
  useEffect(() => {
    if (open && question) {
      setDraft({
        ...question,
        options: question.options.map((o) => ({ ...o })),
        correctAnswer: Array.isArray(question.correctAnswer)
          ? [...question.correctAnswer]
          : question.correctAnswer,
      });
    }
    if (!open) {
      setDraft(null);
      setTypeChosen(false);
    }
  }, [open, question]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isMTF = draft?.type === "MTF";
  const isMulti = draft?.type === "MULTICHOICE";
  const isTextAnswer = draft?.type === "FTB" || draft?.type === "TRUEFALSE";
  const hasOptions = !isTextAnswer && !!draft;

  const correctLabels = useMemo(() => {
    if (!draft) return [] as string[];
    return Array.isArray(draft.correctAnswer)
      ? draft.correctAnswer
      : draft.correctAnswer
      ? [String(draft.correctAnswer)]
      : [];
  }, [draft]);

  if (!open || !draft) return null;

  const set = <K extends keyof Question>(field: K, value: Question[K]) =>
    setDraft((d) => (d ? { ...d, [field]: value } : d));

  /**
   * Bloom weightage and relevance are two dialog controls over the same
   * underlying API field (`relevance_percentage`) — only `relevance` is ever
   * sent back to the server (see toUpdates/toCreateBody). Without mirroring,
   * editing the weightage field alone looks saved locally but is silently
   * dropped on the next real reload. Kept in sync here so either control
   * captures the same value the save path already reads.
   */
  const setBloomPercent = (value: number) =>
    setDraft((d) => {
      if (!d) return d;
      // NaN is the transient "field cleared while typing" state — don't let
      // it clobber the relevance slider, which can't render NaN.
      const relevance = Number.isFinite(value) ? value : d.relevance;
      return { ...d, bloomPercent: value, relevance };
    });

  const setRelevance = (value: number) =>
    setDraft((d) => (d ? { ...d, relevance: value, bloomPercent: value } : d));

  const setOption = (i: number, patch: Partial<QuestionOption>) =>
    setDraft((d) => {
      if (!d) return d;
      const options = d.options.map((o, idx) =>
        idx === i ? { ...o, ...patch } : o
      );
      return { ...d, options };
    });

  const addOption = () => {
    setDraft((d) => {
      if (!d) return d;
      // The five-option ceiling applies only to authoring a NEW question.
      // Editing an existing one has no ceiling, deliberately, so a generated
      // question that already carries more options stays editable.
      if (mode === "create" && d.options.length >= 5) {
        toast({
          title: "Maximum options reached",
          description: "A new question can have at most 5 options.",
          variant: "destructive",
        });
        return d; 
      }
      const options = [
        ...d.options,
        { label: letterFor(d.options.length), text: "", ...(isMTF ? { right: "" } : {}) },
      ];
      return { ...d, options };
    });
  };

  const removeOption = (i: number) => {
    setDraft((d) => {
      if (!d) return d;
      if (d.options.length <= 2) {
        toast({
          title: "At least two options required",
          description: "A question must keep a minimum of 2 options.",
          variant: "destructive",
        });
        return d;
      }
      const removedLabel = d.options[i].label;
      // Re-letter so labels stay contiguous (A, B, C…) after a removal.
      const options = d.options
        .filter((_, idx) => idx !== i)
        .map((o, idx) => ({ ...o, label: letterFor(idx) }));

      // Remap the answer to the new lettering, dropping the removed option.
      const remap = (label: string) => {
        const oldIdx = d.options.findIndex((o) => o.label === label);
        if (oldIdx === -1 || oldIdx === i) return null;
        return letterFor(oldIdx > i ? oldIdx - 1 : oldIdx);
      };

      let correctAnswer: string | string[];
      if (Array.isArray(d.correctAnswer)) {
        correctAnswer = d.correctAnswer.map(remap).filter(Boolean) as string[];
      } else {
        correctAnswer = d.correctAnswer === removedLabel ? "" : remap(String(d.correctAnswer)) ?? "";
      }

      return { ...d, options, correctAnswer };
    });
  };

  const toggleCorrect = (label: string) => {
    setDraft((d) => {
      if (!d) return d;
      if (Array.isArray(d.correctAnswer)) {
        const exists = d.correctAnswer.includes(label);
        return {
          ...d,
          correctAnswer: exists
            ? d.correctAnswer.filter((l) => l !== label)
            : [...d.correctAnswer, label].sort(),
        };
      }
      return { ...d, correctAnswer: label };
    });
  };

  /** Blocks save on the states that would produce an unusable question. */
  const validate = (): string | null => {
    if (!draft.question.trim()) return "Question text cannot be empty.";
    if (hasOptions) {
      if (draft.options.some((o) => !o.text.trim()))
        return "Every option needs text.";
      if (isMTF && draft.options.some((o) => !o.right?.trim()))
        return "Every match pair needs a right-hand value.";
      if (!isMTF && correctLabels.length === 0)
        return "Select a correct answer.";
    }
    if (isTextAnswer && !String(draft.correctAnswer).trim())
      return "Correct answer cannot be empty.";
    const weight = Number(draft.bloomPercent);
    if (Number.isNaN(weight) || weight < 0 || weight > 100)
      return "Bloom weightage must be between 0 and 100.";
    return null;
  };

  const handleSave = () => {
    const error = validate();
    if (error) {
      toast({ title: "Cannot save", description: error, variant: "destructive" });
      return;
    }
    onSave({ ...draft, question: draft.question.trim() });
  };

  const isCreate = mode === "create";
  // In create mode the type is picked before anything else, so the answer
  // shape is right from the start instead of being converted later.
  const choosingType = isCreate && !typeChosen;

  // Picking a radio selects and rebuilds the scaffold; Continue advances. Kept
  // separate so the choice is visible and reviewable before committing to it.
  const chooseType = (type: string) => {
    if (type === draft.type) return;
    onTypeChosen?.(type);
  };

  const title = isCreate
    ? `Add question ${index ?? ""}`.trim()
    : `Edit question ${index ?? draft.id}`;
  const subtitle = choosingType
    ? "Choose what kind of question this is. The fields you fill in next depend on this choice."
    : isCreate
    ? "Write the question, its options, answer and mapping. It will be added to the end of this assessment."
    : "Update the question, its options, answer and mapping. Changes are saved to this assessment.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            {isCreate
              ? <Plus className="w-4 h-4 text-primary" />
              : <Pencil className="w-4 h-4 text-primary" />}
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>

          {/* Once a type is chosen, show it and offer a way back. */}
          {isCreate && !choosingType && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Question type:</span>
              <span className="text-xs font-semibold text-foreground">
                {typeLabel(draft.type)}
              </span>
              <button
                onClick={() => setTypeChosen(false)}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Change type
              </button>
            </div>
          )}
        </div>

        {/* Step 1 — type picker (create only) */}
        {choosingType ? (
          <div className="px-6 pb-2 overflow-y-auto flex-1">
            <div
              role="radiogroup"
              aria-label="Question type"
              className="grid grid-cols-2 gap-2"
            >
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => {
                const selected = draft.type === value;
                return (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => chooseType(value)}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                    )}
                  >
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {QUESTION_TYPE_HINTS[value]}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              You can change this before adding the question, but doing so clears
              anything already filled in.
            </p>
          </div>
        ) : (

        /* Step 2 — the question itself */
        <div className="px-6 pb-2 overflow-y-auto flex-1 space-y-5">
          {/* Question text */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Question text
            </label>
            <Textarea
              value={draft.question}
              onChange={(e) => set("question", e.target.value)}
              className="mt-2 min-h-[90px] text-sm"
              placeholder="Enter the question"
            />
          </div>

          {/* Options */}
          {hasOptions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Options{" "}
                  {!isMTF && (
                    <span className="font-normal text-muted-foreground">
                      — click a letter to mark the correct answer
                      {isMulti && " (multiple allowed)"}
                    </span>
                  )}
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add option
                </Button>
              </div>

              <div className={cn("grid gap-2", isMTF ? "grid-cols-1" : "grid-cols-2")}>
                {draft.options.map((option, i) => {
                  const isCorrect = correctLabels.includes(option.label);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                        isCorrect
                          ? "bg-accent/10 border-accent/30"
                          : "bg-white border-border"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => !isMTF && toggleCorrect(option.label)}
                        disabled={isMTF}
                        title={isMTF ? undefined : "Mark as correct answer"}
                        className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                          isCorrect
                            ? "bg-accent text-white"
                            : "bg-muted text-muted-foreground",
                          !isMTF && "cursor-pointer hover:bg-primary hover:text-white"
                        )}
                      >
                        {option.label}
                      </button>

                      <Input
                        value={option.text}
                        onChange={(e) => setOption(i, { text: e.target.value })}
                        className="h-8 text-sm flex-1"
                        placeholder={isMTF ? "Left item" : `Option ${option.label}`}
                      />

                      {isMTF && (
                        <>
                          <span className="text-muted-foreground text-sm shrink-0">→</span>
                          <Input
                            value={option.right ?? ""}
                            onChange={(e) => setOption(i, { right: e.target.value })}
                            className="h-8 text-sm flex-1"
                            placeholder="Right item"
                          />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        aria-label={`Delete option ${option.label}`}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {!isMTF && (
                <p className="text-xs text-muted-foreground mt-2">
                  Correct answer:{" "}
                  <span className="font-semibold text-foreground">
                    {correctLabels.length ? correctLabels.join(", ") : "not set"}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Free-text answer (FTB / TRUEFALSE) */}
          {isTextAnswer && (
            <div>
              <label className="text-sm font-medium text-foreground">
                Correct answer
              </label>
              {draft.type === "TRUEFALSE" ? (
                <Select
                  value={String(draft.correctAnswer)}
                  onValueChange={(v) => set("correctAnswer", v)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="True">True</SelectItem>
                    <SelectItem value="False">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={String(draft.correctAnswer)}
                  onChange={(e) => set("correctAnswer", e.target.value)}
                  className="mt-2 text-sm"
                  placeholder="Enter the correct answer"
                />
              )}
            </div>
          )}

          {/* Rationale */}
          <div>
            <label className="text-sm font-medium text-foreground">Rationale</label>
            <span className="text-destructive">*</span>
            <Textarea
              value={draft.rationale ?? ""}
              onChange={(e) => set("rationale", e.target.value)}
              className="mt-2 min-h-[80px] text-sm"
              placeholder="Explain why the correct answer is correct"
            />
          </div>

          {/* Mapping & quality */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Mapping &amp; Quality
              </span>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-foreground">Question type</label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => set("type", v)}
                  // While creating, type is owned by the picker — changing it
                  // here would leave the answer shape inconsistent.
                  disabled
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCreate && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Use “Change type” above to pick a different one.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-foreground">Bloom's level</label>
                <Select
                  value={draft.bloomLevel}
                  onValueChange={(v) => set("bloomLevel", v)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOM_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-foreground">Bloom weightage (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  // An empty field becomes NaN, not 0 — Number("") is 0, which
                  // would silently zero the weightage instead of failing
                  // validation. NaN renders as an empty input and VR-06 blocks
                  // the save with an explicit message.
                  value={Number.isFinite(draft.bloomPercent) ? draft.bloomPercent : ""}
                  onChange={(e) =>
                    setBloomPercent(e.target.value === "" ? NaN : Number(e.target.value))
                  }
                  className="mt-2 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">
                    Relevance to content
                  </label>
                  <span className="text-sm font-semibold text-accent">
                    {draft.relevance ?? 0}%
                  </span>
                </div>
                <Slider
                  value={[draft.relevance ?? 0]}
                  onValueChange={([v]) => setRelevance(v)}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-4"
                />
              </div>

              <div>
                <label className="text-sm text-foreground">Learning outcome</label>
                <Input
                  value={draft.learningOutcome ?? ""}
                  onChange={(e) => set("learningOutcome", e.target.value)}
                  className="mt-2 text-sm"
                  placeholder="e.g. Understand database indexing fundamentals"
                />
              </div>

              <div>
                <label className="text-sm text-foreground">Competency (KCM)</label>
                <Input
                  value={draft.competency ?? ""}
                  onChange={(e) => set("competency", e.target.value)}
                  className="mt-2 text-sm"
                  placeholder="e.g. Data Management"
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm text-foreground">Course</label>
                <Input
                  value={draft.courseName ?? ""}
                  onChange={(e) => set("courseName", e.target.value)}
                  className="mt-2 text-sm"
                  placeholder="Course this question belongs to"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-2 shrink-0 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {choosingType ? (
            <Button onClick={() => setTypeChosen(true)} className="gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCreate ? (
                <Plus className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving…" : isCreate ? "Add question" : "Save changes"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuestionDialog;
