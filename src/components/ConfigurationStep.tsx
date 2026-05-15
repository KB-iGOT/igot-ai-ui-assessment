import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Clock,
  Sparkles,
  ChevronLeft,
  Brain,
  LucideIcon,
  ListChecks,
  Minus,
  Plus,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import Tooltip from "@mui/material/Tooltip";

export interface QuestionTypeConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  enabled: boolean;
  count: number;
}

interface ConfigurationStepProps {
  questionTypes: QuestionTypeConfig[];
  assessmentLevel: string;
  bloomValues: Record<string, number>;
  timeLimit: number;
  onQuestionTypesChange: (types: QuestionTypeConfig[]) => void;
  onAssessmentLevelChange: (level: string) => void;
  onBloomChange: (id: string, value: number) => void;
  onTimeLimitChange: (time: number) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  courseIds: any
}

const assessmentLevels = [
  { id: "beginner", name: "Beginner" },
  { id: "intermediate", name: "Intermediate" },
  { id: "advanced", name: "Advanced" },
];

const bloomLevels = [
  { id: "Remember", name: "Remember", description: "Recall facts", color: "bg-sky-100 border-sky-200 text-sky-700" },
  { id: "Understand", name: "Understand", description: "Explain concepts", color: "bg-teal-100 border-teal-200 text-teal-700" },
  { id: "Apply", name: "Apply", description: "Use in new situations", color: "bg-emerald-100 border-emerald-200 text-emerald-700" },
  { id: "Analyze", name: "Analyze", description: "Draw connections", color: "bg-amber-100 border-amber-200 text-amber-700" },
  { id: "Evaluate", name: "Evaluate", description: "Justify decisions", color: "bg-orange-100 border-orange-200 text-orange-700" },
  { id: "Create", name: "Create", description: "Produce new work", color: "bg-rose-100 border-rose-200 text-rose-700" },
];

const ConfigurationStep = ({
  questionTypes,
  assessmentLevel,
  bloomValues,
  timeLimit,
  onQuestionTypesChange,
  onAssessmentLevelChange,
  onBloomChange,
  onTimeLimitChange,
  onBack,
  onGenerate,
  isGenerating,
  courseIds
}: ConfigurationStepProps) => {

  const [isBloomOpen, setIsBloomOpen] = useState(true);
  const [timeError, setTimeError] = useState(false);


  const toggleQuestionType = (id: string) => {
    onQuestionTypesChange(
      questionTypes.map((qt) =>
        qt.id === id ? { ...qt, enabled: !qt.enabled } : qt
      )
    );
  };

  const updateQuestionCount = (id: string, count: number) => {
    onQuestionTypesChange(
      questionTypes.map((qt) =>
        qt.id === id ? { ...qt, count: Math.max(0, count) } : qt
      )
    );
  };

  const adjustBloomValue = (id: string, delta: number) => {
    const currentValue = bloomValues[id] || 0;
    const newValue = Math.max(0, Math.min(100, currentValue + delta));
    onBloomChange(id, newValue);
  };

  const totalQuestions = questionTypes
    .filter((qt) => qt.enabled)
    .reduce((sum, qt) => sum + qt.count, 0);

  const bloomTotal = Object.values(bloomValues).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-4 stagger-children">
      {/* Question Types & Level Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Question Types */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium">Question Types</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{totalQuestions} total</Badge>
          </div>

          <div className="space-y-2">
            {questionTypes.map((qt) => {
              const Icon = qt.icon;
              return (
                <div
                  key={qt.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                    qt.enabled
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => toggleQuestionType(qt.id)}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative",
                        qt.enabled ? "bg-primary" : "bg-muted-foreground/25"
                      )}
                    >
                      <div
                        className={cn(
                          "w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-all",
                          qt.enabled ? "left-[18px]" : "left-[3px]"
                        )}
                      />
                    </button>
                    <Icon className={cn("w-4 h-4", qt.enabled ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm", qt.enabled ? "text-foreground" : "text-muted-foreground")}>
                      {qt.name}
                    </span>
                  </div>
                  {qt.enabled && (
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={qt.count}
                      onChange={(e) => updateQuestionCount(qt.id, parseInt(e.target.value) || 0)}
                      className="w-14 h-8 text-center text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Level & Time */}
        <div className="space-y-4">
          <div className="card-elevated p-4">
            <h3 className="text-sm font-medium mb-3">Assessment Level</h3>
            <div className="flex gap-2">
              {assessmentLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => onAssessmentLevelChange(level.id)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                    assessmentLevel === level.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium">Time Limit</h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="number"
                  min="5"
                  max="90"
                  value={timeLimit}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;

                    if (value > 90) {
                      setTimeError(true);
                    } else {
                      setTimeError(false);
                      onTimeLimitChange(value);
                    }
                  }}
                  className={cn(
                    "w-full h-10 text-center font-medium text-lg",
                    timeError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
              </div>

              <div className="flex gap-1">
                {[15, 30, 60].map((mins) => (
                  <Button
                    key={mins}
                    variant={timeLimit === mins ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => onTimeLimitChange(mins)}
                  >
                    {mins}
                  </Button>
                ))}
              </div>
            </div>
            {timeError && (
              <p className="text-xs text-red-500 mt-1">
                Max 90 minutes are allowed
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bloom's Taxonomy - Card Grid */}
      <div className="card-elevated p-4">
        <div
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">Bloom's Taxonomy Distribution</h3>
            <Tooltip
              title="Distribute questions across cognitive levels. `Create` involves original production of work and cannot be reliably measured through objective question types available in this tool. Total must equal 100%."
              arrow
              placement="top"
              componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "#fff",
                    color: "#000",
                    fontSize: "14px",
                    padding: "8px 12px",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.15)"
                  }
                },
                arrow: {
                  sx: {
                    color: "#fff"
                  }
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-3"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </Tooltip>
          </div>

          <div className="flex items-center gap-4">
            {isBloomOpen &&
              (<div className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                bloomTotal === 100
                  ? "bg-accent/15 text-accent"
                  : "bg-destructive/15 text-destructive"
              )}>
                {bloomTotal}% / 100%
              </div>
              )}
            {/* Toggle Switch */}
            <button
              onClick={() => setIsBloomOpen(!isBloomOpen)}
              className={cn(
                "w-10 h-5 rounded-full transition-colors relative",
                isBloomOpen ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 bg-white rounded-full absolute top-[2px] transition-all shadow",
                  isBloomOpen ? "left-[22px]" : "left-[2px]"
                )}
              />
            </button>
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div
          className={cn(
            "transition-all duration-500 ease-in-out overflow-hidden",
            isBloomOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
          <div className="mb-4">
            <div className="h-6 rounded-full overflow-hidden flex bg-muted/50">
              {bloomLevels.map((level) => {
                const value = bloomValues[level.id] || 0;
                if (value === 0) return null;
                return (
                  <div
                    key={level.id}
                    className={cn(
                      "h-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                      level.color.split(' ')[0],
                      level.color.split(' ')[2]
                    )}
                    style={{ width: `${value}%` }}
                    title={`${level.name}: ${value}%`}
                  >
                    {value >= 10 && <span>{value}%</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>Lower Order Thinking</span>
              <span>Higher Order Thinking</span>
            </div>
          </div>


          <div className="grid grid-cols-3 gap-3">
            {bloomLevels.map((level) => (
              <div
                key={level.id}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  level.color
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm">{level.name}</div>
                    <div className="text-xs opacity-75">{level.description}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => adjustBloomValue(level.id, -5)}
                    className="w-7 h-7 rounded-md bg-white/60 hover:bg-white flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-xl font-bold">{bloomValues[level.id] || 0}%</div>
                  <button
                    onClick={() => adjustBloomValue(level.id, 5)}
                    className="w-7 h-7 rounded-md bg-white/60 hover:bg-white flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isBloomOpen && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Bloom's Taxonomy distribution is disabled. Questions will be generated without cognitive level targeting.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-11"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating || totalQuestions === 0 || bloomTotal !== 100}
          className="flex-[2] h-11"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generate Assessment
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ConfigurationStep;