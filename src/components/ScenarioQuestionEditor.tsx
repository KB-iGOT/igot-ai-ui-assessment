import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import type { Question } from "./question-types";
import type { RubricCriterion } from "./scenario";
import {
  RUBRIC_LEVEL_KEYS,
  blankRubric,
  hasExpectedComponents,
  modelAnswerLabel,
  rankingOrder,
  rubricWeightTotal,
} from "./scenario";

/**
 * Edit-dialog fields for scenario questions. Each takes the dialog's current
 * draft and reports changes as a patch, so the dialog keeps owning the draft
 * and Cancel still discards everything.
 */
interface FieldProps {
  question: Question;
  onChange: (patch: Partial<Question>) => void;
}

const Required = () => <span className="text-destructive">*</span>;
const Optional = () => (
  <span className="text-muted-foreground text-xs font-normal"> (optional)</span>
);

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * An editable list of short entries. Blank rows are allowed while editing and
 * dropped on save (tidyScenarioQuestion).
 */
const ListField = ({
  label,
  items,
  onChange,
  placeholder,
  addLabel,
  marker,
  small = false,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  /** "number" shows 1, 2, 3…; omit for no marker. */
  marker?: "number";
  small?: boolean;
}) => (
  <div className="space-y-1.5">
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        {marker === "number" && (
          <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{i + 1}.</span>
        )}
        <Input
          value={item}
          onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
          className={cn("flex-1", small ? "h-7 text-xs" : "h-8 text-sm")}
          placeholder={placeholder}
          aria-label={`${label} ${i + 1}`}
        />
        <button
          type="button"
          onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          aria-label={`Delete ${label.toLowerCase()} ${i + 1}`}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange([...items, ""])}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <Plus className="w-3 h-3" />
      {addLabel}
    </button>
  </div>
);

/** Title, description, constraints and domain — on every scenario question type. */
export const ScenarioContextFields = ({ question, onChange }: FieldProps) => (
  <div className="space-y-4">
    <div>
      <label className="text-sm font-medium text-foreground">Scenario title</label>
      <Required />
      <Input
        value={question.scenarioTitle ?? ""}
        onChange={(e) => onChange({ scenarioTitle: e.target.value })}
        className="mt-2 text-sm"
        placeholder="A short name for the scenario"
      />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground">Scenario description</label>
      <Required />
      <Textarea
        value={question.scenarioDescription ?? ""}
        onChange={(e) => onChange({ scenarioDescription: e.target.value })}
        className="mt-2 min-h-[90px] text-sm"
        placeholder="Describe the situation the question is set in"
      />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground">Constraints</label>
      <Optional />
      <div className="mt-2">
        <ListField
          label="Constraint"
          items={question.constraints ?? []}
          onChange={(constraints) => onChange({ constraints })}
          placeholder="A limit the learner must work within, e.g. budget, time, policy"
          addLabel="Add constraint"
        />
      </div>
    </div>
    <div>
      <label className="text-sm font-medium text-foreground">Scenario domain</label>
      <Optional />
      <Input
        value={question.scenarioDomain ?? ""}
        onChange={(e) => onChange({ scenarioDomain: e.target.value })}
        className="mt-2 text-sm"
        placeholder="e.g. Project delays"
      />
    </div>
  </div>
);

const MAX_ACTIONS = 6;

/**
 * Rows are listed in the correct order, best first — reordering a row is
 * changing the answer. Each action keeps its letter, which is how it is
 * identified when the learner sees them.
 */
export const RankingEditor = ({ question, onChange }: FieldProps) => {
  const order = rankingOrder(question);

  const setText = (label: string, text: string) =>
    onChange({
      options: question.options.map((o) => (o.label === label ? { ...o, text } : o)),
      correctAnswer: order,
    });

  const move = (position: number, delta: number) => {
    const to = position + delta;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[position], next[to]] = [next[to], next[position]];
    onChange({ correctAnswer: next });
  };

  const add = () => {
    if (question.options.length >= MAX_ACTIONS) {
      toast({
        title: "Maximum actions reached",
        description: `A ranking question can have at most ${MAX_ACTIONS} actions.`,
        variant: "destructive",
      });
      return;
    }
    const label = letter(question.options.length);
    onChange({
      options: [...question.options, { label, text: "" }],
      correctAnswer: [...order, label],
    });
  };

  const remove = (label: string) => {
    if (question.options.length <= 2) {
      toast({
        title: "At least two actions required",
        description: "A ranking question must keep a minimum of 2 actions.",
        variant: "destructive",
      });
      return;
    }
    // Re-letter so labels stay contiguous, and carry the order across.
    const kept = question.options.filter((o) => o.label !== label);
    const relabel = new Map(kept.map((o, i) => [o.label, letter(i)]));
    onChange({
      options: kept.map((o, i) => ({ ...o, label: letter(i) })),
      correctAnswer: order.filter((l) => l !== label).map((l) => relabel.get(l) ?? l),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-foreground">
          Actions <Required />
          <span className="font-normal text-muted-foreground">
            {" "}— in the correct order, most effective first. Use the arrows to reorder.
          </span>
        </label>
        <Button variant="outline" size="sm" onClick={add} className="h-8 gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add action
        </Button>
      </div>

      <div className="space-y-2">
        {order.map((label, position) => {
          const option = question.options.find((o) => o.label === label);
          return (
            <div
              key={label}
              className="flex items-center gap-2 p-2 rounded-lg border border-border bg-white"
            >
              <span
                className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0"
                title={`Rank ${position + 1}`}
              >
                {position + 1}
              </span>
              <span className="text-[10px] text-muted-foreground w-12 shrink-0">Action {label}</span>
              <Input
                value={option?.text ?? ""}
                onChange={(e) => setText(label, e.target.value)}
                className="h-8 text-sm flex-1"
                placeholder={`Action ${label}`}
                aria-label={`Action ${label} text`}
              />
              <button
                type="button"
                onClick={() => move(position, -1)}
                disabled={position === 0}
                aria-label={`Move action ${label} up`}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:pointer-events-none shrink-0"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(position, 1)}
                disabled={position === order.length - 1}
                aria-label={`Move action ${label} down`}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:pointer-events-none shrink-0"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(label)}
                aria-label={`Delete action ${label}`}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LEVEL_LABELS: Record<(typeof RUBRIC_LEVEL_KEYS)[number], string> = {
  level0: "Level 0 — weakest",
  level1: "Level 1",
  level2: "Level 2",
  level3: "Level 3 — strongest",
};

/**
 * What the answer is marked against, then the rubric — for open text (reference
 * answer), short answer (expected answer) and action planning (expected
 * components).
 */
export const RubricEditor = ({ question, onChange }: FieldProps) => {
  const rubrics = question.rubrics ?? [];
  const total = rubricWeightTotal(rubrics);
  const components = hasExpectedComponents(question.type);

  const setRubric = (i: number, patch: Partial<RubricCriterion>) =>
    onChange({ rubrics: rubrics.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });

  const removeRubric = (i: number) => {
    if (rubrics.length <= 1) {
      toast({
        title: "At least one criterion required",
        description: "A rubric must keep a minimum of 1 criterion.",
        variant: "destructive",
      });
      return;
    }
    onChange({ rubrics: rubrics.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-5">
      {components ? (
        <div>
          <label className="text-sm font-medium text-foreground">Expected components</label>
          <Required />
          <div className="mt-2">
            <ListField
              label="Expected component"
              items={question.expectedComponents ?? []}
              onChange={(expectedComponents) => onChange({ expectedComponents })}
              placeholder="A step a strong plan includes"
              addLabel="Add component"
              marker="number"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium text-foreground">
            {modelAnswerLabel(question.type)}
          </label>
          <Required />
          <Textarea
            value={question.referenceAnswer ?? ""}
            onChange={(e) => onChange({ referenceAnswer: e.target.value })}
            className="mt-2 min-h-[90px] text-sm"
            placeholder="A model answer the learner's response is compared against"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            Rubric <Required />
          </label>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                total === 100 ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
              )}
            >
              Total weight {total}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange({ rubrics: [...rubrics, blankRubric()] })}
              className="h-8 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add criterion
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {rubrics.map((r, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-3 bg-muted/10">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Criterion {i + 1}</label>
                  <Input
                    value={r.criterion}
                    onChange={(e) => setRubric(i, { criterion: e.target.value })}
                    className="mt-1 h-8 text-sm"
                    placeholder="What is being assessed"
                    aria-label={`Criterion ${i + 1}`}
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-muted-foreground">Weight %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    // Cleared field is NaN, not 0, so validation catches it.
                    value={Number.isFinite(r.weight) ? r.weight : ""}
                    onChange={(e) =>
                      setRubric(i, { weight: e.target.value === "" ? NaN : Number(e.target.value) })
                    }
                    className="mt-1 h-8 text-sm text-center"
                    aria-label={`Criterion ${i + 1} weight`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRubric(i)}
                  aria-label={`Delete criterion ${i + 1}`}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea
                  value={r.description}
                  onChange={(e) => setRubric(i, { description: e.target.value })}
                  className="mt-1 min-h-[48px] text-xs"
                  placeholder="What this criterion judges"
                  aria-label={`Criterion ${i + 1} description`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {RUBRIC_LEVEL_KEYS.map((key) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">{LEVEL_LABELS[key]}</label>
                    <Textarea
                      value={r[key]}
                      onChange={(e) => setRubric(i, { [key]: e.target.value })}
                      className="mt-1 min-h-[56px] text-xs"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Evidence indicators</label>
                <div className="mt-1">
                  <ListField
                    label={`Criterion ${i + 1} evidence`}
                    items={r.evidence}
                    onChange={(evidence) => setRubric(i, { evidence })}
                    placeholder="Something in the answer that shows this criterion is met"
                    addLabel="Add indicator"
                    small
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
