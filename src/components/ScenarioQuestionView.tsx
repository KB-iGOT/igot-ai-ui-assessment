import { AlertTriangle, BookOpen, CheckCircle, ListOrdered, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question } from "./question-types";
import {
  RUBRIC_LEVEL_KEYS,
  hasExpectedComponents,
  modelAnswerLabel,
  rankingOrder,
  rubricWeightTotal,
} from "./scenario";

/**
 * Read-only blocks for scenario questions on the Results step. The layout is a
 * first pass, to be reviewed with design once it is visible in the UI.
 */

/** Title, description and (optional) constraints — shown on every scenario question. */
export const ScenarioContext = ({ question }: { question: Question }) => {
  const constraints = question.constraints ?? [];
  if (!question.scenarioTitle && !question.scenarioDescription && !constraints.length) return null;

  return (
    <div className="bg-white/80 border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Scenario
        </span>
      </div>
      {question.scenarioTitle && (
        <h5 className="text-sm font-semibold text-foreground">{question.scenarioTitle}</h5>
      )}
      {question.scenarioDescription && (
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {question.scenarioDescription}
        </p>
      )}
      {constraints.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-amber-700 font-medium mb-0.5">
              Constraints
            </div>
            <ul className="text-sm text-amber-900 list-disc pl-4 space-y-0.5 break-words">
              {constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

/** The actions in their correct order, most effective first. */
export const RankingAnswer = ({ question }: { question: Question }) => {
  const order = rankingOrder(question);

  return (
    <div className="bg-white/80 border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListOrdered className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Correct ranking — most to least effective
        </span>
      </div>
      <ol className="space-y-2">
        {order.map((label, i) => {
          const option = question.options.find((o) => o.label === label);
          return (
            <li
              key={label}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-white"
            >
              <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-foreground flex-1 break-words">{option?.text}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                Action {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/** Reference answer, expected answer, or expected components — what the answer is marked against. */
const ModelAnswer = ({ question }: { question: Question }) => {
  const components = hasExpectedComponents(question.type);
  const items = question.expectedComponents ?? [];

  return (
    <div className="bg-blue-50/80 rounded-lg p-4 border border-blue-200">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <CheckCircle className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-blue-700 mb-1">
            {components ? "Expected components" : modelAnswerLabel(question.type)}
          </div>
          {components ? (
            items.length ? (
              <ol className="text-sm text-blue-900 list-decimal pl-4 space-y-0.5 break-words">
                {items.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-blue-900">—</p>
            )
          ) : (
            <p className="text-sm text-blue-900 whitespace-pre-wrap break-words">
              {question.referenceAnswer || "—"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const LEVEL_HEADINGS = ["Level 0", "Level 1", "Level 2", "Level 3"];

/** Model answer and rubric for open text, action planning and short answer. */
export const RubricView = ({ question }: { question: Question }) => {
  const rubrics = question.rubrics ?? [];
  const total = rubricWeightTotal(rubrics);

  return (
    <div className="space-y-4">
      <ModelAnswer question={question} />

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Rubric
            </span>
          </div>
          {rubrics.length > 0 && (
            <span
              className={cn(
                "text-xs font-medium",
                total === 100 ? "text-accent" : "text-muted-foreground"
              )}
            >
              Total weight {total}%
            </span>
          )}
        </div>

        {rubrics.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No rubric returned for this question.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium p-2.5 min-w-[160px]">Criterion</th>
                  <th className="text-right font-medium p-2.5">Weight</th>
                  {LEVEL_HEADINGS.map((h) => (
                    <th key={h} className="text-left font-medium p-2.5 min-w-[120px]">
                      {h}
                    </th>
                  ))}
                  <th className="text-left font-medium p-2.5 min-w-[140px]">Evidence indicators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rubrics.map((r, i) => (
                  <tr key={i} className="align-top">
                    <td className="p-2.5 break-words">
                      <div className="font-medium text-foreground">{r.criterion}</div>
                      {r.description && (
                        <div className="text-muted-foreground mt-1">{r.description}</div>
                      )}
                    </td>
                    <td className="p-2.5 text-right text-foreground">{r.weight}%</td>
                    {RUBRIC_LEVEL_KEYS.map((key) => (
                      <td key={key} className="p-2.5 text-muted-foreground break-words whitespace-pre-wrap">
                        {r[key] || "—"}
                      </td>
                    ))}
                    <td className="p-2.5 text-muted-foreground break-words">
                      {r.evidence.length ? (
                        <ul className="list-disc pl-4 space-y-0.5">
                          {r.evidence.map((e, j) => (
                            <li key={j}>{e}</li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
