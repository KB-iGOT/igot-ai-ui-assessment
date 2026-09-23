import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import ContextualDocuments from "./ContextualDocuments";
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
  courseNames?: string[];
  topics: string[];
  notes: string;
  transcriptFiles: File[];
  learningOutcomes: string[];
  setLearningOutcomes: (outcomes: string[]) => void;
  materialFiles: File[];
  language: string;
  setLanguage: (language: string) => void;
  onCourseIdsChange: (ids: string[]) => void;
  onCourseNamesChange: (names: string[]) => void;
  onTopicsChange: (topics: string[]) => void;
  onNotesChange: (notes: string) => void;
  onTranscriptFilesChange: (files: File[]) => void;
  onMaterialFilesChange: (files: File[]) => void;
  onNext: () => void;
  userDetails: any;
  selectedCompetency: string | null;
  onCompetencyChange: (competency: string | null) => void;
  selectedThemes: any[];
  onThemesChange: (themes: any[]) => void;
  selectedSubThemes: any[];
  onSubThemesChange: (subThemes: any[]) => void;
}
interface CourseOption {
  value: string; // identifier
  label: string; // name
}


const ContentInputStep = ({
  assessmentType,
  courseIds,
  courseNames,
  topics,
  notes,
  transcriptFiles,
  materialFiles,
  language,
  setLanguage,
  onCourseIdsChange,
  onCourseNamesChange,
  onTopicsChange,
  onNotesChange,
  onTranscriptFilesChange,
  onMaterialFilesChange,
  onNext,
  userDetails,
  learningOutcomes,
  setLearningOutcomes,
  selectedCompetency,
  onCompetencyChange,
  selectedThemes,
  onThemesChange,
  selectedSubThemes,
  onSubThemesChange,
}: ContentInputStepProps) => {
  const [newTopic, setNewTopic] = useState("");
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const PAGE_LIMIT = 100;
  const [courseQuery, setCourseQuery] = useState("");
  const [availableCourseIds, setAvailableCourseIds] = useState<CourseOption[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);
  const [courseOffset, setCourseOffset] = useState(0);
  const [hasMoreCourses, setHasMoreCourses] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const [searchTheme, setSearchTheme] = useState("");
  const [openSubTheme, setOpenSubTheme] = useState(false);
  const [searchSubTheme, setSearchSubTheme] = useState("");
  const [courseWeights, setCourseWeights] = useState<Record<string, number>>({});
  const [courseNameMap, setCourseNameMap] = useState<Record<string, string>>({}); // Maps course ID to display name
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
  const [allCompetencies, setAllCompetencies] = useState<any[]>([]);
const [allThemes, setAllThemes] = useState<any[]>([]);
const [allSubThemes, setAllSubThemes] = useState<any[]>([]);
const [allThemeData, setAllThemeData] = useState<any[]>([]);
 console.log('availableCourseIds', availableCourseIds)
 const courseTriggerRef = useRef<HTMLButtonElement>(null);
 useEffect(() => {
  const handleScroll = () => {
    if (!courseSearchOpen || !courseTriggerRef.current) return;

    const header = document.getElementById("app-header");
    if (!header) return;

    const headerBottom = header.getBoundingClientRect().bottom;
    const triggerTop = courseTriggerRef.current.getBoundingClientRect().top;

    if (triggerTop <= headerBottom) {
      setCourseSearchOpen(false);
    }
  };

  window.addEventListener("scroll", handleScroll);

  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, [courseSearchOpen]);

// Initialize courseNameMap when courseNames are passed in (e.g., on page load after generation)
useEffect(() => {
  if (courseNames && courseNames.length > 0 && courseIds.length > 0) {
    const newMap: Record<string, string> = {};
    courseIds.forEach((id, index) => {
      if (courseNames[index]) {
        newMap[id] = courseNames[index];
      }
    });
    setCourseNameMap(newMap);
  }
}, []);

useEffect(() => {
  const fetchCompetencyFramework = async () => {
    if (assessmentType !== "Competency") return;

    try {
      const response = await fetch(
        "/apis/proxies/v8/framework/v1/read/kcmfinal_fw",
        {
          method: "GET",
          headers: {
            accept: "application/json, text/plain, */*",
            locale: "en",
            org: "dopt",
            rootorg: "igot",
            hostpath: "cbp.igotkarmayogi.gov.in",
            wid: "fc1624a4-fc81-4b74-aec7-141f45c2f934",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch competency framework");
      }

      const data = await response.json();

      console.log("Competency Framework Data:", data);

      const competencyAreas =
        data?.result?.framework?.categories?.find(
          (c: any) => c.code === "competencyarea"
        )?.terms || [];

      setAllCompetencies(competencyAreas);
      const allThemeCategory =
  data?.result?.framework?.categories?.find(
    (c: any) => c.code === "theme"
  )?.terms || [];

console.log("ALL THEME CATEGORY", allThemeCategory);
setAllThemeData(allThemeCategory);

    } catch (error) {
      console.error("Competency Framework fetch error:", error);
    }
  };

  fetchCompetencyFramework();
}, [assessmentType]);
  const fetchTranscoderStats = async (courseId: string) => {
    if (!courseId) return;

    try {
      const response = await fetch(
        `/apis/proxies/v8/extended/content/v1/read/${courseId}`,
        {
          method: "GET",
          headers: {
            accept: "application/json, text/plain, */*",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch content details");

      const data = await response.json();
      console.log("Content Details:", data);
    } catch (error) {
      console.error("Content Details fetch error:", error);
    }
  };

  const handleCourseSelect = (value: string) => {
    const selectedCourse = availableCourseIds.find(c => c.value === value);
    const courseName = selectedCourse?.label || value;

    if (!isComprehensive) {
      onCourseIdsChange([value]);
      onCourseNamesChange([courseName]);
      // Update the mapping for persistent display
      setCourseNameMap({ [value]: courseName });
      setCourseSearchOpen(false);
      fetchLearningOutcomes(value);
      fetchTranscoderStats(value);
    } else {
      const filtered = courseIds.filter(id => id !== "NA");
      if (filtered.includes(value)) {
        const newIds = filtered.filter(id => id !== value);
        onCourseIdsChange(newIds);
        // Update mapping - remove deleted course
        const newMap = { ...courseNameMap };
        delete newMap[value];
        setCourseNameMap(newMap);
        onCourseNamesChange(newIds.map(id => courseNameMap[id] || availableCourseIds.find(c => c.value === id)?.label || id));
      } else {
        const newIds = [...filtered, value];
        onCourseIdsChange(newIds);
        // Update mapping - add new course
        setCourseNameMap(prev => ({ ...prev, [value]: courseName }));
        onCourseNamesChange(newIds.map(id => (id === value ? courseName : (courseNameMap[id] || availableCourseIds.find(c => c.value === id)?.label || id))));
        fetchTranscoderStats(value);
      }
    }
  };
const handleCompetencySelect = (item: any) => {
  onCompetencyChange(item.name);

  onThemesChange([]);
  onSubThemesChange([]);
  setAllSubThemes([]);

  const themes = item?.associations || [];

setAllThemes(
  [...themes].sort((a: any, b: any) =>
    a.name.localeCompare(b.name)
  )
);

};
  const removeCourseId = (id: string) => {
    const newIds = courseIds.filter((c) => c !== id);
    onCourseIdsChange(newIds);
    // Update mapping - remove deleted course
    const newMap = { ...courseNameMap };
    delete newMap[id];
    setCourseNameMap(newMap);
    onCourseNamesChange(newIds.map(cid => courseNameMap[cid] || availableCourseIds.find(c => c.value === cid)?.label || cid));
  };

  const getNames = (ids: string[]) =>
    ids.map(id => courseNameMap[id] || availableCourseIds?.find(c => c.value === id)?.label || id);

  const getCourseName = (id: string): string => {
    return courseNameMap[id] || availableCourseIds?.find(c => c.value === id)?.label || id;
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


const totalWeight = useMemo(() => {
    return Object.values(courseWeights).reduce((sum, w) => sum + (Number(w) || 0), 0);
  }, [courseWeights]);

const canProceed =
  assessmentType === "standalone"
    ? topics.length > 0 && materialFiles?.length > 0
    : assessmentType === "Competency"
    ? topics.length > 0 &&
      !!selectedCompetency &&
      selectedThemes.length > 0 &&
      selectedSubThemes.length > 0
    : topics.length > 0 && courseIds.length > 0 && totalWeight <= 100;
    
  const selectedCourseLabels = useMemo(() => {
    if (courseIds.length === 0) return "Select course...";
    if (courseIds.length === 1) {
      const courseId = courseIds[0];
      return getCourseName(courseId);
    }
    return `${courseIds.length} courses selected`;
  }, [courseIds, availableCourseIds, courseNameMap]);

  // Handle course dropdown open/close and search query changes
  useEffect(() => {
    if (!courseSearchOpen) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Reset and fetch courses when dropdown opens or search query changes
    const loadCourses = async () => {
      setIsCoursesLoading(true);
      setCourseOffset(0);
      setHasMoreCourses(true);
      setAvailableCourseIds([]); // Clear previous results

      try {
        const response = await fetch(
          "/apis/proxies/v8/sunbirdigot/v4/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: abortController.signal,
            body: JSON.stringify({
              request: {
                filters: {
                  contentType: ["Course"],
                  courseCategory : ["Course"],
                  status: ["Live" , 'Draft'],
                },
                fields: [
                  "identifier",
                  "name",
                  "language",
                  "contentType",
                  "courseCategory",
                  "createdOn",
                  "status"
                ],
                facets: [
                 "status"
                ],
                query: courseQuery || "",
                limit: PAGE_LIMIT,
                offset: 0,
                sort_by: { createdOn: "desc" },
              },
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to fetch courses");
        const data = await response.json();
        const newCourses: CourseOption[] =
          data?.result?.content?.map((item: any) => ({
            value: item.identifier,
            label: `${item.name} (${item?.language?.[0] || "English"})`,
            status: item.status
          })) ?? [];
        
        // Only update state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setAvailableCourseIds(newCourses);
          setCourseOffset(PAGE_LIMIT);
          setHasMoreCourses(newCourses.length === PAGE_LIMIT);
        }
      } catch (error) {
        // Only show error if request wasn't aborted
        if ((error as Error).name !== 'AbortError') {
          console.error("Course fetch error:", error);
          toast({
            title: "Error",
            description: "Unable to load courses",
            variant: "destructive",
          });
        }
      } finally {
        setIsCoursesLoading(false);
      }
    };

    loadCourses();
  }, [courseSearchOpen, courseQuery]);

 const fetchCourses = async (reset = false) => {
  if (isCoursesLoading || (!hasMoreCourses && !reset)) return;

  try {
    setIsCoursesLoading(true);

    const response = await fetch(
      "/apis/proxies/v8/sunbirdigot/v4/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify({
          request: {
            filters: {
              contentType: ["Course"],
              courseCategory : ["Course"],
              status: ["Live" , 'Draft'],
            },
            fields: [
              "identifier",
              "name",
              "language",
              "contentType",
              "courseCategory",
              "createdOn",
              "status"
            ],
            facets: [
             "status"
            ],
            query: courseQuery || "",
              limit: PAGE_LIMIT,
              offset: reset ? 0 : courseOffset,
              sort_by: { createdOn: "desc" },
            },
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      const newCourses: CourseOption[] =
        data?.result?.content?.map((item: any) => ({
          value: item.identifier,
          label: `${item.name} (${item?.language?.[0] || "English"})`,
          status: item.status
        })) ?? [];
     
      // Only update state if not aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setAvailableCourseIds((prev) => {
          const merged = reset
            ? newCourses
            : [...prev, ...newCourses];

          return Array.from(
            new Map(
              merged.map((course) => [course.value, course])
            ).values()
          );
        });

        setCourseOffset((prev) => (reset ? PAGE_LIMIT : prev + PAGE_LIMIT));
        setHasMoreCourses(newCourses.length === PAGE_LIMIT);
      }
    } catch (error) {
      // Only show error if request wasn't aborted
      if ((error as Error).name !== 'AbortError') {
        console.error("Course fetch error:", error);
        toast({
          title: "Error",
          description: "Unable to load more courses",
          variant: "destructive",
        });
      }
    } finally {
      setIsCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (courseIds.length === 0 || courseIds[0] === "NA") {
      setLearningOutcomes([]);
      return;
    }
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          courseIds.map(async (courseId) => {
            const response = await fetch(`/api/content/v1/read/${courseId}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) return [];
            const data = await response.json();
            const htmlInstructions = data?.result?.content?.instructions || "";
            return parseLearningOutcomes(htmlInstructions);
          })
        );
        setLearningOutcomes([...new Set(results.flat())]);
      } catch (error) {
        console.error("Learning Outcomes fetch error:", error);
        toast({
          title: "Error",
          description: "Unable to load learning outcomes",
          variant: "destructive",
        });
      }
    };
    fetchAll();
  }, [courseIds, user?.access_token]);

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
        `/api/content/v1/read/${courseId}`,
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
    return allThemes.filter((theme: any) =>
      theme.name.toLowerCase().includes(searchTheme.toLowerCase())
    );
  }, [allThemes, searchTheme]);

const toggleTheme = (theme: any) => {
  const alreadySelected = selectedThemes.some(
  (t: any) => t.identifier === theme.identifier
);

  let updatedThemes: any[] = [];

  if (alreadySelected) {
    updatedThemes = selectedThemes.filter(
      (t: any) => t.identifier !== theme.identifier
    );
  } else {
    updatedThemes = [...selectedThemes, theme];
  }

  onThemesChange(updatedThemes);

  onSubThemesChange([]);

const subThemes = updatedThemes.flatMap((theme: any) => {
  const matchedTheme = allThemeData.find(
    (t: any) => t.identifier === theme.identifier
  );

  return matchedTheme?.associations || [];
});
  setAllSubThemes(
  [...subThemes].sort((a: any, b: any) =>
    a.name.localeCompare(b.name)
  )
);
};
const filteredSubThemes = useMemo(() => {
  return allSubThemes.filter((subTheme: any) =>
    subTheme.name.toLowerCase().includes(searchSubTheme.toLowerCase())
  );
}, [allSubThemes, searchSubTheme]);

const toggleSubTheme = (subTheme: any) => {
  const newSubThemes = selectedSubThemes.some((t: any) => t.identifier === subTheme.identifier)
    ? selectedSubThemes.filter((t: any) => t.identifier !== subTheme.identifier)
    : [...selectedSubThemes, subTheme];
  onSubThemesChange(newSubThemes);
};

  const handleWeightChange = (courseId: string, value: string) => {
    const proposed = Math.max(0, Number(value));
    const currentForId = courseWeights[courseId] ?? 0;
    const otherTotal = totalWeight - currentForId;
    const num = Math.min(100 - otherTotal, proposed);

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
            <h3 className="text-sm font-medium text-foreground">Course name(s)
              <span className="text-destructive">*</span></h3>
            <Tooltip
              title="Select the course for this assessment."
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
                  ref={courseTriggerRef}
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
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={4}
              avoidCollisions={true}
                collisionPadding={{
    top: 70,
    bottom: 20,
    left: 20,
    right: 20,
  }}
              className="p-0 bg-popover border shadow-lg z-[27]"
              style={{
                width: "var(--radix-popover-trigger-width)",
                maxHeight: "70vh",
                overflow: "hidden",
              }}
            >
              <Command>
                <CommandInput
                  placeholder="Search courses..."
                  className="h-10"
                  value={courseQuery}
                  onValueChange={(value) => {
                    setCourseQuery(value);
                  }}
                />
                <CommandList
                  className="max-h-[60vh] overflow-y-auto"
                  onScroll={(e) => {
                  const target = e.currentTarget;
                  if (
                    target.scrollTop + target.clientHeight >= target.scrollHeight - 20
                  ) {
                    fetchCourses();
                  }
                }}>
                  <CommandEmpty>No course found.</CommandEmpty>
                  <CommandGroup>
                  
                    {availableCourseIds.map((course : any) => (
                      <CommandItem
                        key={course.value}
                        value={course.label}
                        onSelect={() => handleCourseSelect(course.value)}
                        className="py-2.5 cursor-pointer"
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border mr-2 flex items-center justify-center",
                          courseIds.includes(course.value)
                            ? "bg-primary border-primary hover:border-secondary/40"
                            : " hover:border-secondary/40"
                        )}>
                          {courseIds.includes(course.value) && (
                            <Check className="w-3 h-3 text-primary-foreground hover:border-secondary/40" />
                          )}
                        </div>
                        {course.label}  {course.status == "Draft" ? "- Draft" : ""}
                      </CommandItem>
                    ))}
                      {isCoursesLoading && (
                      <div className="py-2 text-center text-xs text-muted-foreground">
                        Loading more courses...
                      </div>
                    )}

                    {!isCoursesLoading &&
    !hasMoreCourses &&
    availableCourseIds.length <= 0 && (
      <div className="py-2 text-center text-xs text-muted-foreground">
        No more courses
      </div>
    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Chips */}
          {courseIds.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {courseIds.map((id) => {
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-xs px-2 py-1 flex items-center gap-1"
                  >
                    {getCourseName(id)}

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
              title="Learning outcomes mapped to the selected course"
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


      {/* Contextual documents and VTT availability per selected course */}
      {assessmentType !== "standalone" && assessmentType !== "Competency" && (
        <ContextualDocuments
          courseIds={courseIds}
          courseNameMap={courseNameMap}
        />
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
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 justify-between"
                >
                  <span className="text-sm text-foreground">
                    {getCourseName(id)}
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
            {allCompetencies.map((item: any) => {
              const isSelected = selectedCompetency === item.name;

              return (
                <button
                  key={item.identifier}
                 onClick={() => handleCompetencySelect(item)}
                  className={cn(
                    "relative px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary shadow-soft"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {item.name}

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

            <PopoverContent
              side="bottom"
              align="start"
              className="p-0"
              style={{ width: 'var(--radix-popover-trigger-width)', maxWidth: 'var(--radix-popover-content-available-width)' }}
            >
              <Command>
                <CommandInput
                  placeholder="Search theme..."
                  value={searchTheme}
                  onValueChange={setSearchTheme}
                />

                <CommandList className="popover-command-list">
                  <CommandGroup>
                    {filteredThemes.map((theme: any) => {
  const selected = selectedThemes.some(
    (t: any) => t.identifier === theme.identifier
  );


                      return (
                        <CommandItem
                          key={theme.identifier}
                          onSelect={() => toggleTheme(theme)}
                          className="cursor-pointer py-2.5"
                        >
                          <div
                            className={`w-4 h-4 rounded border mr-2 flex items-center justify-center
                      ${selected
                                ? "bg-primary border-primary"
                                : "hover:border-secondary/40"
                              }`}
                          >
                            {selected && (
                              <Check className="w-3 h-3 text-primary-foreground hover:border-secondary/40" />
                            )}
                          </div>

                          {theme.name}
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
              {selectedThemes.map((theme: any) => (
                <Badge
                  key={theme.identifier}
                  variant="secondary"
                  className="text-xs px-2 py-1 flex items-center gap-1 "
                >
                  {theme.name}

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

            <PopoverContent
              side="bottom"
              align="start"
              className="p-0"
              style={{ width: 'var(--radix-popover-trigger-width)', maxWidth: 'var(--radix-popover-content-available-width)' }}
            >
              <Command>
                <CommandInput
                  placeholder="Search sub-theme..."
                  value={searchSubTheme}
                  onValueChange={setSearchSubTheme}
                />

                <CommandList className="popover-command-list">
                  <CommandEmpty>No sub-theme found.</CommandEmpty>

                  <CommandGroup>
                    {filteredSubThemes.map((subTheme: any) => {
                    const selected = selectedSubThemes.some(
                      (t: any) => t.identifier === subTheme.identifier
                    );

                      return (
                        <CommandItem
                          key={subTheme.identifier}
                          onSelect={() => toggleSubTheme(subTheme)}
                          className="cursor-pointer py-2.5"
                        >
                          <div
                            className={`w-4 h-4 rounded border mr-2 flex items-center justify-center
                      ${selected
                                ? "bg-primary border-primary"
                                : "hover:border-secondary/40"
                              }`}
                          >
                            {selected && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>

                          {subTheme.name}
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
              {selectedSubThemes.map((subTheme : any) => (
                <Badge
                  key={subTheme.identifier}
                  variant="secondary"
                  className="text-xs px-2 py-1 flex items-center gap-1"
                >
                  {subTheme.name}

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
            Key Learning Areas
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

          <PopoverContent
            className="p-0"
            align="start"
            style={{ width: 'var(--radix-popover-trigger-width)', maxWidth: 'var(--radix-popover-content-available-width)' }}
          >
            <Command>
              <CommandInput placeholder="Search language..." />
              <CommandList className="popover-command-list">
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
              title="Upload additional PDFs or reference materials such as policy documents, scheme guidelines, circulars, case studies, etc. These help generate questions aligned with real policy contexts."
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
        className={canProceed ? `w-full h-11` : `w-full h-11 opacity-50 bg-primary/50 cursor-not-allowed`}
      >
        Save & Continue
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};
export default ContentInputStep;
