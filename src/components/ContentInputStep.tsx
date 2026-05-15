import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import {
  Upload,
  X,
  File,
  ChevronRight,
  Check,
  ChevronsUpDown,
  FileText
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Tooltip from "@mui/material/Tooltip";
import { COMPETENCY_OPTIONS, SUB_THEME_MAP, SUB_THEME_OPTIONS, THEME_OPTIONS } from "./Constant";
import { ACCESS_TOKEN_2 } from "./ConstantAPI";

interface ContentInputStepProps {
  assessmentType: string;
  courseIds: string[];
  topics: string[];
  notes: string;
  transcriptFiles: File[];
  materialFiles: File[];
  language: string;
  setLanguage: (language: string) => void;
  onCourseIdsChange: (ids: string[]) => void;
  onTopicsChange: (topics: string[]) => void;
  onNotesChange: (notes: string) => void;
  onTranscriptFilesChange: (files: File[]) => void;
  onMaterialFilesChange: (files: File[]) => void;
  onNext: () => void;
}
interface CourseOption {
  value: string; // identifier
  label: string; // name
}


const ContentInputStep = ({
  assessmentType,
  courseIds,
  topics,
  notes,
  transcriptFiles,
  materialFiles,
  language,
  setLanguage,
  onCourseIdsChange,
  onTopicsChange,
  onNotesChange,
  onTranscriptFilesChange,
  onMaterialFilesChange,
  onNext,
}: ContentInputStepProps) => {
  const [newTopic, setNewTopic] = useState("");
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const PAGE_LIMIT = 100;
  const [courseQuery, setCourseQuery] = useState("");
  const [availableCourseIds, setAvailableCourseIds] = useState<CourseOption[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);
  const [courseOffset, setCourseOffset] = useState(0);
  const [hasMoreCourses, setHasMoreCourses] = useState(true);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [openTheme, setOpenTheme] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [searchTheme, setSearchTheme] = useState("");
  const [openSubTheme, setOpenSubTheme] = useState(false);
  const [selectedSubThemes, setSelectedSubThemes] = useState<string[]>([]);
  const [searchSubTheme, setSearchSubTheme] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [courseWeights, setCourseWeights] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const isComprehensive = assessmentType === "comprehensive";
  const LANGUAGES = [
    { value: "Marathi", label: "Marathi" },
    { value: "Bengali", label: "Bengali" },
    { value: "Hindi", label: "Hindi" },
    { value: "Malayalam", label: "Malayalam" },
    { value: "Kannada", label: "Kannada" },
    { value: "Tamil", label: "Tamil" },
    { value: "English", label: "English" },
    { value: "Telugu", label: "Telugu" },
    { value: "Punjabi", label: "Punjabi" },
    { value: "Gujarati", label: "Gujarati" },
  ];
  const handleCourseSelect = (value: string) => {

    if (!isComprehensive) {
      onCourseIdsChange([value]);
      setCourseSearchOpen(false);
      fetchLearningOutcomes(value);
    } else {
      const filtered = courseIds.filter(id => id !== "NA");
      if (filtered.includes(value)) {
        onCourseIdsChange(filtered.filter(id => id !== value));
      } else {
        onCourseIdsChange([...filtered, value]);
      }
    }
  };

  const removeCourseId = (id: string) => {
    onCourseIdsChange(courseIds.filter((c) => c !== id));
  };


  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      onTopicsChange([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (topic: string) => {
    onTopicsChange(topics.filter((t) => t !== topic));
  };

  const handleTranscriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f =>
      f.name.endsWith('.vtt') || f.name.endsWith('.txt')
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid File Type",
        description: "Only VTT and TXT files are allowed.",
        variant: "destructive",
      });
    }

    const totalFiles = [...transcriptFiles, ...validFiles].slice(0, 10);
    onTranscriptFilesChange(totalFiles);
    e.target.value = "";
  };

  const handleMaterialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (!f.name.endsWith('.pdf')) return false;
      if (f.size > 25 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${f.name} exceeds 25MB limit.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    const totalFiles = [...materialFiles, ...validFiles].slice(0, 3);
    onMaterialFilesChange(totalFiles);
    e.target.value = "";
  };

  const removeTranscript = (index: number) => {
    onTranscriptFilesChange(transcriptFiles.filter((_, i) => i !== index));
  };

  const removeMaterial = (index: number) => {
    onMaterialFilesChange(materialFiles.filter((_, i) => i !== index));
  };


  const canProceed = assessmentType == 'standalone' ? topics.length > 0 && materialFiles?.length > 0 : topics.length > 0 && courseIds.length > 0;

  const selectedCourseLabels = useMemo(() => {
    if (courseIds.length === 0) return "Select course...";
    if (courseIds.length === 1) {
      const course = availableCourseIds.find(c => c.value === courseIds[0]);
      return course?.label || courseIds[0];
    }
    return `${courseIds.length} courses selected`;
  }, [courseIds, availableCourseIds]); // ✅ FIX

  // useEffect(() => {
  //   if (!user?.access_token) return;
  useEffect(() => {
    if (courseSearchOpen) {
      setCourseOffset(0);
      setHasMoreCourses(true);
      fetchCourses(true);
    }
  }, [courseQuery]);

  const fetchCourses = async (reset = false) => {
    // if (!user?.access_token || isCoursesLoading || (!hasMoreCourses && !reset)) return;
    if (isCoursesLoading || (!hasMoreCourses && !reset)) return;

    try {
      setIsCoursesLoading(true);

      const response = await fetch(
        "https://portal.igotkarmayogi.gov.in/api/content/v1/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${user.access_token}`,
          },
          body: JSON.stringify({
            request: {
              filters: {
                primaryCategory: ["Course"],
                status: ["Live"],
                courseCategory: ["Course"],
              },
              fields: ["name", 'language'],
              sort_by: { createdOn: "desc" },
              limit: PAGE_LIMIT,
              offset: reset ? 0 : courseOffset,
              query: courseQuery || undefined
            },
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      const newCourses: CourseOption[] =
        data?.result?.content?.map((item: any) => ({
          value: item.identifier,
          label: `${item.name} (${item?.language?.[0]})`,
        })) ?? [];
      setAvailableCourseIds((prev) =>
        reset ? newCourses : [...prev, ...newCourses]
      );

      setCourseOffset((prev) => (reset ? PAGE_LIMIT : prev + PAGE_LIMIT));
      setHasMoreCourses(newCourses.length === PAGE_LIMIT);
    } catch (error) {
      console.error("Course fetch error:", error);
      toast({
        title: "Error",
        description: "Unable to load more courses",
        variant: "destructive",
      });
    } finally {
      setIsCoursesLoading(false);
    }
  };

  const fetchCoursesByIds = async (ids: string[]) => {
    // if (!user?.access_token || ids.length === 0) return;
    if (ids.length === 0) return;

    try {
      const response = await fetch(
        "https://portal.igotkarmayogi.gov.in/api/content/v1/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${user.access_token}`,
          },
          body: JSON.stringify({
            request: {
              filters: {
                identifier: ids,
              },
              fields: ["name"],
              limit: ids.length,
            },
          }),
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      const courses: CourseOption[] =
        data?.result?.content?.map((item: any) => ({
          value: item.identifier,
          label: item.name,
        })) ?? [];

      setAvailableCourseIds((prev) => {
        const map = new Map(prev.map(c => [c.value, c.label]));
        courses.forEach(c => map.set(c.value, c.label));

        // keep NA on top
        const merged = Array.from(map, ([value, label]) => ({ value, label }));
        return merged;
      });
    } catch (e) {
      console.error("Failed to hydrate selected courses", e);
    }
  };

  useEffect(() => {
    if (courseIds.length > 0 && courseIds[0] !== "NA") {
      fetchLearningOutcomes(courseIds[0]);
    }
  }, [courseIds, user?.access_token]);

  useEffect(() => {
    if (courseSearchOpen) {
      setCourseOffset(0);
      setHasMoreCourses(true);
      fetchCourses(true);
    }
  }, [courseSearchOpen]);

  const parseLearningOutcomes = (html: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const elements = doc.querySelectorAll("li, p");

    return Array.from(elements)
      .map(el => el.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean) as string[];
  };

  const fetchLearningOutcomes = async (courseId: string) => {
    // if (!user?.access_token || !courseId) return;
    if (!courseId) return;

    try {
      const response = await fetch(
        `https://portal.igotkarmayogi.gov.in/api/content/v1/read/${courseId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${user.access_token}`,
          },
        }
      );


      if (!response.ok) throw new Error("Failed to fetch learning outcomes");

      const data = await response.json();

      const htmlInstructions = data?.result?.content?.instructions || "";

      const outcomes = parseLearningOutcomes(htmlInstructions);

      setLearningOutcomes(outcomes);

    } catch (error) {
      console.error("Learning Outcomes fetch error:", error);

      toast({
        title: "Error",
        description: "Unable to load learning outcomes",
        variant: "destructive",
      });
    }
  };


  const filteredThemes = useMemo(() => {
    return Object.values(THEME_OPTIONS).filter((theme) =>
      theme.toLowerCase().includes(searchTheme.toLowerCase())
    );
  }, [searchTheme]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme)
        ? prev.filter((t) => t !== theme)
        : [...prev, theme]
    );
  };

  const filteredSubThemes = useMemo(() => {
    if (selectedThemes.length === 0) return [];

    const subThemes = selectedThemes.flatMap(
      (theme) => SUB_THEME_MAP[theme as THEME_OPTIONS] || []
    );

    return subThemes.filter((subTheme) =>
      subTheme.toLowerCase().includes(searchSubTheme.toLowerCase())
    );
  }, [selectedThemes, searchSubTheme]);

  const toggleSubTheme = (subTheme: string) => {
    setSelectedSubThemes((prev) =>
      prev.includes(subTheme)
        ? prev.filter((t) => t !== subTheme)
        : [...prev, subTheme]
    );
  };

  const totalWeight = useMemo(() => {
    return Object.values(courseWeights).reduce((sum, w) => sum + (Number(w) || 0), 0);
  }, [courseWeights]);


  const handleWeightChange = (courseId: string, value: string) => {
    const num = Math.min(100, Math.max(0, Number(value)));

    setCourseWeights(prev => ({
      ...prev,
      [courseId]: num
    }));
  };


  return (
    <div className="space-y-4 stagger-children">
      {/* Course DO ID */}
      {
        assessmentType != 'standalone' && assessmentType !== 'Competency' &&
        <div className="card-elevated p-4">
          <div className="flex  items-center mb-3">
            <h3 className="text-sm font-medium text-foreground">Course DO ID
              <span className="text-destructive">*</span></h3>
            <Tooltip
              title="Select the course this assessment belongs to. Only one course can be selected."
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-3" data-state="closed"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </Tooltip>
            {isComprehensive && (
              <Badge variant="secondary" className="text-xs">Multi-select</Badge>
            )}
          </div>

          <Popover open={courseSearchOpen} onOpenChange={setCourseSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={courseSearchOpen}
                className="w-full justify-between h-10 text-left font-normal"
                disabled={isCoursesLoading}
              >
                <span className="truncate">
                  {isCoursesLoading ? "Loading courses..." : selectedCourseLabels}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>

            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-popover border shadow-lg" align="start">
              <Command>
                <CommandInput
                  placeholder="Search courses..."
                  className="h-10"
                  value={courseQuery}
                  onValueChange={(value) => {
                    setCourseQuery(value);
                    setCourseOffset(0);
                    setHasMoreCourses(true);
                  }}
                />
                <CommandList onScroll={(e) => {
                  const target = e.currentTarget;
                  if (
                    target.scrollTop + target.clientHeight >= target.scrollHeight - 20
                  ) {
                    fetchCourses();
                  }
                }}>
                  <CommandEmpty>No course found.</CommandEmpty>
                  <CommandGroup>
                    {isCoursesLoading && (
                      <div className="py-2 text-center text-xs text-muted-foreground">
                        Loading more courses...
                      </div>
                    )}

                    {!hasMoreCourses && (
                      <div className="py-2 text-center text-xs text-muted-foreground">
                        No more courses
                      </div>
                    )}
                    {availableCourseIds.map((course) => (
                      <CommandItem
                        key={course.value}
                        value={course.label}
                        onSelect={() => handleCourseSelect(course.value)}
                        className="py-2.5 cursor-pointer"
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border mr-2 flex items-center justify-center",
                          courseIds.includes(course.value)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {courseIds.includes(course.value) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        {course.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Chips */}
          {courseIds.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {courseIds.map((id) => {
                const course = availableCourseIds.find(c => c.value === id);

                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-xs px-2 py-1 flex items-center gap-1"
                  >
                    {course?.label ?? id}

                    <button
                      onClick={() => removeCourseId(id)}
                      className="hover:text-destructive ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* {courseIds.length > 0 && courseIds[0] !== "NA" && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {courseIds.map((id) => {
                const course = availableCourseIds.find(c => c.value === id);

                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-xs px-2 py-1 flex items-center gap-1"
                  >
                    {course?.label ?? id}
                    <button
                      onClick={() => removeCourseId(id)}
                      className="hover:text-destructive ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}

            </div>
          )} */}

        </div>
      }

      {/* Learning Outcomes */}
      {learningOutcomes.length > 0 && (
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-book-open w-4 h-4 text-primary"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>
            <h3 className="text-sm font-medium text-foreground">Learning Outcomes</h3>
            <Tooltip
              title="Learning outcomes mapped to the selected course(s)"
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-1" data-state="closed"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </Tooltip>
          </div>
          <ul className="list-disc space-y-1 text-sm text-muted-foreground">
            {learningOutcomes.map((outcome, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-check w-3.5 h-3.5 text-accent mt-0.5 shrink-0"><path d="M20 6 9 17l-5-5"></path></svg>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}


      {/* Course Weightage */}
      {assessmentType === "comprehensive" && courseIds.length > 1 && (
        <div className="card-elevated p-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-weight w-4 h-4 text-primary"><circle cx="12" cy="5" r="3"></circle><path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"></path></svg>
              <h3 className="text-sm font-medium text-foreground">
                Course Weightage
              </h3>

              <Tooltip
                title="Specify the percentage weight assigned to each course in the assessment. The total across all courses must equal 100%."
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
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-1" data-state="closed"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              </Tooltip>
            </div>

            {/* Total */}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs", "font-medium",
                totalWeight === 100
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-500"
              )}
            >
              {totalWeight}% / 100%
            </Badge>
          </div>

          {/* Course Rows */}
          <div className="space-y-3">
            {courseIds.map((id) => {
              const course = availableCourseIds.find((c) => c.value === id);

              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 justify-between"
                >
                  <span className="text-sm text-foreground">
                    {course?.label || id}
                  </span>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={courseWeights[id] ?? 0}
                      onChange={(e) =>
                        handleWeightChange(id, e.target.value)
                      }
                      className="w-20 h-9 text-center"
                    />

                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Competency Area  */}
      {assessmentType === 'Competency' && (
        <div className="card-elevated p-4">
          <div className="flex items-center mb-3">
            <h3 className="text-sm font-medium text-foreground">
              Competency Area
              <span className="text-destructive">*</span>
            </h3>

            <Tooltip
              title="Select the relevant KCM competency that the assessment will evaluate. Select only one competency area."
              arrow
              placement="top"
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

          <div className="grid grid-cols-3 gap-2">
            {Object.values(COMPETENCY_OPTIONS).map((item) => {
              const isSelected = selectedCompetency === item;

              return (
                <button
                  key={item}
                  onClick={() => setSelectedCompetency(item)}
                  className={cn(
                    "relative px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary shadow-soft"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {item}

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Theme  */}
      {assessmentType === "Competency" && (
        <div className="card-elevated p-4">
          <div className="flex items-center mb-3">
            <h3 className="text-sm font-medium text-foreground">Theme</h3>

            <Tooltip
              title="Select one or more themes within the competency area"
              arrow
              placement="top"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 ml-3 text-muted-foreground cursor-help"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </Tooltip>

            {isComprehensive && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Multi-select
              </Badge>
            )}
          </div>

          {/* Combobox */}
          <Popover open={openTheme} onOpenChange={setOpenTheme}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openTheme}
                className="w-full justify-between h-10 text-left font-normal"
              >
                <span className="truncate">
                  {selectedThemes.length > 0
                    ? `${selectedThemes.length} selected`
                    : "Select theme"}
                </span>

                <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent side="bottom" align="start" className=" w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Search theme..."
                  value={searchTheme}
                  onValueChange={setSearchTheme}
                />

                <CommandList>
                  <CommandGroup>
                    {filteredThemes.map((theme) => {
                      const selected = selectedThemes.includes(theme);

                      return (
                        <CommandItem
                          key={theme}
                          onSelect={() => toggleTheme(theme)}
                          className="cursor-pointer py-2.5"
                        >
                          <div
                            className={`w-4 h-4 rounded border mr-2 flex items-center justify-center
                      ${selected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/30"
                              }`}
                          >
                            {selected && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>

                          {theme}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedThemes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedThemes.map((theme) => (
                <Badge
                  key={theme}
                  variant="secondary"
                  className="text-xs px-2 py-1 flex items-center gap-1"
                >
                  {theme}

                  <button
                    onClick={() => toggleTheme(theme)}
                    className="hover:text-destructive ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub Theme  */}
      {assessmentType === "Competency" && (
        <div className="card-elevated p-4">
          <div className="flex items-center mb-3">
            <h3 className="text-sm font-medium text-foreground">
              Sub Theme
            </h3>

            <Tooltip
              title="Select specific sub-themes to focus the assessment"
              arrow
              placement="top"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 ml-3 text-muted-foreground cursor-help"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </Tooltip>
          </div>

          {/* Combobox */}
          <Popover open={openSubTheme} onOpenChange={setOpenSubTheme}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openSubTheme}
                className="w-full justify-between h-10 text-left font-normal"
                disabled={selectedThemes.length === 0}
              >
                <span className="truncate">
                  {selectedSubThemes.length > 0
                    ? `${selectedSubThemes.length} selected`
                    : "Select sub-theme"}
                </span>

                <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent side="bottom" align="start" className="w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Search sub-theme..."
                  value={searchSubTheme}
                  onValueChange={setSearchSubTheme}
                />

                <CommandList>
                  <CommandEmpty>No sub-theme found.</CommandEmpty>

                  <CommandGroup>
                    {filteredSubThemes.map((subTheme) => {
                      const selected = selectedSubThemes.includes(subTheme);

                      return (
                        <CommandItem
                          key={subTheme}
                          onSelect={() => toggleSubTheme(subTheme)}
                          className="cursor-pointer py-2.5"
                        >
                          <div
                            className={`w-4 h-4 rounded border mr-2 flex items-center justify-center
                      ${selected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/30"
                              }`}
                          >
                            {selected && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>

                          {subTheme}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Chips */}
          {selectedSubThemes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedSubThemes.map((subTheme) => (
                <Badge
                  key={subTheme}
                  variant="secondary"
                  className="text-xs px-2 py-1 flex items-center gap-1"
                >
                  {subTheme}

                  <button
                    onClick={() => toggleSubTheme(subTheme)}
                    className="hover:text-destructive ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Topics/Subjects / Key Themes/Modules */}

      <div className="card-elevated p-4">
        <div className="flex items-center mb-3">
          <h3 className="text-sm font-medium text-foreground">
            Key Themes/Modules
            <span className="text-destructive">*</span>
          </h3>

          <Tooltip
            title="Enter course learning objectives instead of broad topics. Questions should align directly to measurable outcomes."
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

        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Enter topic and press Enter..."
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTopic();
              }
            }}
            onBlur={() => {
              if (newTopic.trim()) {
                addTopic();
              }
            }}
            className="h-10"
          />
        </div>

        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="text-xs px-2 py-1 flex items-center gap-1 bg-accent/10 text-accent border-accent/20"
              >
                {topic}
                <button
                  onClick={() => removeTopic(topic)}
                  className="hover:text-destructive ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>


      {/* Language */}
      {assessmentType !== "Competency" && <div className="card-elevated p-4">
        <div className="flex items-center mb-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-globe w-4 h-4 text-primary"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
            <h3 className="text-sm font-medium text-foreground">
              Assessment Language
              <span className="text-destructive">*</span>
            </h3>
          </div>
          {/* <Tooltip
            title="Language"
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
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-3" data-state="closed"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          </Tooltip> */}
        </div>

        <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between h-10 font-normal"
            >
              {language
                ? LANGUAGES.find(l => l.value === language)?.label
                : "Select language..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search language..." />
              <CommandList>
                <CommandEmpty>No language found.</CommandEmpty>
                <CommandGroup>
                  {LANGUAGES.map(lang => (
                    <CommandItem
                      key={lang.value}
                      value={lang.label}
                      onSelect={() => {
                        setLanguage(lang.value);
                        setLanguageOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          language === lang.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      }

      {/* Additional Notes */}
      <div className="card-elevated p-4">
        <div className="flex items-center mb-3">
          <h3 className="text-sm font-medium text-foreground">
            Additional Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </h3>
          <Tooltip
            title="Add any additional context, instructions, or specific requirements for the assessment generation."
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
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-3" data-state="closed"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          </Tooltip>
        </div>
        <Textarea
          placeholder="Enter additional notes or description..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[70px] resize-none"
        />
      </div>

      {/* File Uploads */}
      <div className={cn(
        "grid gap-4",
        assessmentType !== "Competency" ? "grid-cols-2" : "grid-cols-1"
      )}>

        {/* Transcripts */}
        {assessmentType !== "Competency" && <div className="card-elevated p-4">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-foreground">Transcripts</h3>
            <Tooltip
              title="Upload course transcripts in VTT or TXT format to help generate questions from lecture content."
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-3" data-state="closed"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </Tooltip>
          </div>


          <p className="text-xs text-muted-foreground mb-3">optional, VTT/TXT, max 10</p>

          <label className={cn(
            "flex flex-col items-center justify-center p-4 border border-dashed rounded-lg cursor-pointer transition-colors",
            "border-border hover:border-primary/40 hover:bg-primary/5"
          )}>
            <Upload className="w-5 h-5 text-muted-foreground mb-1.5" />
            <span className="text-xs text-muted-foreground">{transcriptFiles.length}/10 files</span>
            <input
              type="file"
              accept=".vtt,.txt"
              multiple
              onChange={handleTranscriptUpload}
              className="hidden"
            />
          </label>

          {transcriptFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {transcriptFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeTranscript(index)} className="text-muted-foreground hover:text-destructive shrink-0 p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* Supporting Documents */}
        <div className="card-elevated p-4">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-foreground">Supporting Documents {assessmentType == 'standalone' && <span className="text-destructive">*</span>}</h3>
            <Tooltip
              title="Upload additional PDFs or reference materials such as policy documents, scheme guidelines, circulars, or case studies. These help generate questions aligned with real policy contexts."
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-3" data-state="closed"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground mb-3">optional, PDF, max 3×25MB</p>

          <label className={cn(
            "flex flex-col items-center justify-center p-4 border border-dashed rounded-lg cursor-pointer transition-colors",
            "border-border hover:border-primary/40 hover:bg-primary/5"
          )}>
            <Upload className="w-5 h-5 text-muted-foreground mb-1.5" />
            <span className="text-xs text-muted-foreground">{materialFiles.length}/3 files</span>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleMaterialUpload}
              className="hidden"
            />
          </label>

          {materialFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {materialFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeMaterial(index)} className="text-muted-foreground hover:text-destructive shrink-0 p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save & Next Button */}
      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full h-11"
      >
        Save & Continue
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};
export default ContentInputStep;