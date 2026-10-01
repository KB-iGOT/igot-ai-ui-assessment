import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface AssessmentTypeSelectorProps {
  selected: string;
  onSelect: (type: string) => void;
  currentStep?: string
}

const assessmentTypes = [

  {
    id: "practice",
    name: "Practice",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-clipboard-check w-5 h-5"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="m9 14 2 2 4-4"></path></svg>,
    description: "Basic Assessment",
    title: 'Low-stakes practice and revision',
  },
  {
    id: "final",
    name: "Final Assessment",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-graduation-cap w-5 h-5"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path></svg>,
    description: "End of the course assessment",
    title: 'Generate questions from course content'
  },
  {
    id: "comprehensive",
    name: "Comprehensive",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-book-open w-5 h-5"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>,
    description: "Multi-course evaluation",
    title: 'Combine multiple courses with weightage'
  },
  {
    id: "standalone",
    name: "Standalone",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-file-text w-5 h-5"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>,
    description: "Standalone assessment",
    title: 'Independent assessment without course linkage'
  },
  {
    id: "Competency",
    name: "Competency",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-target w-5 h-5"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
    description: "Competency assessment",
    title: 'Map questions to specific competencies'
  }
];

/**
 * Maps a saved assessment type onto the selector's id. The API stores types
 * lowercased ("competency"), but the ids aren't all lowercase ("Competency"),
 * and every type check compares against the id.
 */
export const toAssessmentTypeId = (type: string) =>
  assessmentTypes.find((t) => t.id.toLowerCase() === type.trim().toLowerCase())?.id ?? type;

const AssessmentTypeSelector = ({ selected, onSelect, currentStep }: AssessmentTypeSelectorProps) => {
  return (
    <div className="flex gap-3">
      {assessmentTypes.map((type) => {
        const isSelected = selected === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            disabled={currentStep == 'configuration'}
            className={cn(
              "relative flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <span>{type.icon}</span>
            </div>
            <div className="text-center flex-1 flex flex-col gap-[2px]">
              <span className="font-medium text-sm text-foreground leading-tight">{type.name}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{type.description}</span>
              <span className="text-[10px] text-muted-foreground/70 leading-tight italic">{type.title}</span>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AssessmentTypeSelector;