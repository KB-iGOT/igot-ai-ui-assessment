import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Calendar,
  Eye,
  ChevronRight,
  Plus,
  ChevronDown,
  Check,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACCESS_TOKEN_2 } from "@/components/ConstantAPI";
import "react-day-picker/dist/style.css";
import { DayPicker } from "react-day-picker";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PastAssessmentsPage = () => {
  const [search, setSearch] = useState("");
  const [assessmentList, setAssessmentList] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const navigate = useNavigate();
const handleView = (jobId : string) => {
  pollGenerationStatus(
    jobId,
    (data) => {
      navigate("/", { state: { viewJobData: data } });
    },
    (error) => {
      console.error("Polling failed:", error);
    }
  );
};
 const pollGenerationStatus = async (
    jobId: string,
    onComplete: (data: any) => void,
    onError: (error: any) => void
  ) => {
    const poll = async () => {
      try {
        const response = await fetch(
          `/apis/proxies/v8/ai/assessments/v1/status/${jobId}`
          ,
        );

        const result = await response.json();

        if (result.status === "COMPLETED") {
          onComplete(result);
          return;
        }

        if (result.status === "FAILED") {
          // onError(result); 
          onComplete(result);
          return;
        }
        setTimeout(poll, 5000);
      } catch (err) {
        onError(err);
      }
    };

    poll();
  };
  // Map API data to table structure
  const mappedAssessments = useMemo(() => {
    return assessmentList
      .filter((item: any) => item.status === "COMPLETED")
      .map((item: any, idx: number) => {
        const config = item.config || {};
        const createdAt = item.created_at ? new Date(item.created_at) : null;
        return {
          id: item.job_id,
          code: `ASM-${item.job_id.split("_")[0].slice(-8).toUpperCase()}-${item.job_id.split("_")[1]?.slice(0, 4)?.toUpperCase() || "XXXX"}`,
          type: config.assessment_type
            ? config.assessment_type.charAt(0).toUpperCase() + config.assessment_type.slice(1)
            : "—",
          course: "CS401", // You can update this if you have course info in API
          date: createdAt
            ? createdAt.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            : "—",
          time: createdAt
            ? createdAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "—",
          lang: config.language
            ? config.language.charAt(0).toUpperCase() + config.language.slice(1)
            : "—",
          qs: config.total_questions || "—",
          level: config.difficulty
            ? config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)
            : "—",
        };
      });
  }, [assessmentList]);

  // Check if any filter/search is active
  const isFilterActive =
    search !== "" ||
    selectedType !== "all" ||
    selectedLevel !== "all" ||
    fromDate !== undefined ||
    toDate !== undefined;

  // Function to clear all filters/search
  const handleClearAll = () => {
    setSearch("");
    setSelectedType("all");
    setSelectedLevel("all");
    setFromDate(undefined);
    setToDate(undefined);
  };

  const levels = useMemo(() => {
    const lvl = assessmentList.map((item: any) => item.config?.difficulty);
    return ["all", ...Array.from(new Set(lvl.filter(Boolean)))];
  }, [assessmentList]);

  const assessmentTypes = useMemo(() => {
    const types = assessmentList.map((item: any) => item.config?.assessment_type);
    return ["all", ...Array.from(new Set(types.filter(Boolean)))];
  }, [assessmentList]);

  // Search filter
  const filtered = useMemo(() => {
    return mappedAssessments.filter((a: any) => {
      const matchesSearch = a.code.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        selectedType === "all" ||
        a.type.toLowerCase() === selectedType.toLowerCase();

      const matchesLevel =
        selectedLevel === "all" ||
        a.level.toLowerCase() === selectedLevel.toLowerCase();

      const itemDate = a.date ? new Date(a.date.split(" ").reverse().join("-")) : null;

      const matchesFrom = fromDate ? itemDate && itemDate >= fromDate : true;
      const matchesTo = toDate ? itemDate && itemDate <= toDate : true;

      return matchesSearch && matchesType && matchesLevel && matchesFrom && matchesTo;
    });
  }, [search, mappedAssessments, selectedType, selectedLevel, fromDate, toDate]);

  const getPastAssessments = async () => {
    try {
      const url = `/apis/proxies/v8/ai/assessments/v1/history`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const dataList = await response.json();
      setAssessmentList(dataList);
    } catch (error) {
      console.log('======= this is the response error =======', error);
    }
  };

  useEffect(() => {
    getPastAssessments();
  }, []);


  return (
    <div className="container mx-auto lg:px-4 md:px-2 sm:px-1 py-6 max-w-4xl">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Past Assessments
          </h1>
          <p className="text-sm text-muted-foreground">
            {mappedAssessments.length} assessments generated
          </p>
        </div>
        <Button className="flex gap-2">
          <Plus size={18} />
          New Assessment
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />
        <Input
          className="pl-10"
          placeholder="Search by ID, course, or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">

        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-filter w-3.5 h-3.5 text-muted-foreground">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          {/* All Types */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <span className="text-xs">
                  {selectedType === "all"
                    ? "All Types"
                    : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                </span>
                <ChevronDown size={14} className="ml-1" />
              </Button>

            </PopoverTrigger>

            <PopoverContent className="w-32 p-0">
              <div className="flex flex-col">
                {assessmentTypes.map((type: string) => (
                  <Button
                    key={type}
                    variant={"ghost"}
                    onClick={() => setSelectedType(type)}
                    className="justify-between"
                  >
                    <span className="text-xs">
                      {type === "all"
                        ? "All Types"
                        : type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                    {selectedType === type && (
                      <Check size={14} color="black" className="text-primary ml-2 " />
                    )}
                  </Button>

                ))}

              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-chart-column w-3.5 h-3.5 text-muted-foreground"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
          {/* All Levels */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <span className="text-xs">
                  {selectedLevel === "all"
                    ? "All Levels"
                    : selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)}
                </span>
                <ChevronDown size={14} className="ml-1" />
              </Button>

            </PopoverTrigger>
            <PopoverContent className="w-32 p-0">
              <div className="flex flex-col">
                {levels.map((lvl: string) => (
                  <Button
                    key={lvl}
                    variant={"ghost"}
                    onClick={() => setSelectedLevel(lvl)}
                    className="justify-start"
                  >
                    <span className="text-xs">
                      {lvl === "all"
                        ? "All Levels"
                        : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </span>
                    {selectedLevel === lvl && (
                      <Check size={14} color="black" className="text-primary ml-2 " />
                    )}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-px h-7 bg-border"></div>

        {/* form date and to date filters  */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar size={14} />
              <span className="text-xs">
                {fromDate ? fromDate.toLocaleDateString() : "From date"}
              </span>
              <ChevronDown size={14} className="ml-1" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="m-0 p-0 text-xs">
            <DayPicker
              mode="single"
              selected={fromDate}
              onSelect={setFromDate}
              disabled={{ after: new Date() }}
              className="text-xs m-0 p-1"
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar size={14} />
              <span className="text-xs">
                {toDate ? toDate.toLocaleDateString() : "To date"}
              </span>
              <ChevronDown size={14} className="ml-1" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="m-0 p-0 text-xs">
            <DayPicker
              mode="single"
              selected={toDate}
              onSelect={setToDate}
              disabled={{ after: new Date() }}
              className="text-xs m-0 p-1"
            />
          </PopoverContent>
        </Popover>


        {/* clear all filters and search */}
        {isFilterActive && (
          <Button
            variant="ghost"
            className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md px-3 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
            onClick={handleClearAll}
          >
            <X size={18} className="mr-1" />
            Clear all
          </Button>
        )}
      </div>



      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
        <div className="col-span-3">ASSESSMENT</div>
        <div className="col-span-2">COURSE</div>
        <div className="col-span-2">DATE & TIME</div>
        <div className="col-span-1 text-center">LANG</div>
        <div className="col-span-1 text-center">QS</div>
        <div className="col-span-1 text-center">LEVEL</div>
        <div className="col-span-2 text-right">ACTION</div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {filtered.map((a: any, index: number) => (

          <div
            key={a.id}
            className="group relative grid grid-cols-12 gap-3 items-center px-4 py-3.5 rounded-xl border border-border bg-card transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
          >
            <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-sky-500"></div>
            {/* Assessment */}
            <div className="col-span-3 pl-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-primary/10 text-primary border border-primary/20">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground font-mono truncate"> {a.code}</p>
                  <Badge variant="secondary">
                    {a.type}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Course */}
            <div className="col-span-2">
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-book-open w-3.5 h-3.5 text-muted-foreground shrink-0"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>
                <span className="text-sm text-foreground truncate">{a.course}</span>
              </div>
            </div>


            {/* Date & Time */}
            <div className="col-span-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-calendar w-3 h-3 text-muted-foreground"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg>
                  <span className="text-sm text-foreground">{a.date}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-clock w-3 h-3 text-muted-foreground"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span className="text-xs text-muted-foreground"> {a.time}</span>
                </div>
              </div>
            </div>

            {/* Lang */}
            <div className="col-span-1 text-center">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground text-[10px]">{a.lang}</div>
            </div>


            {/* Qs */}
            <div className="col-span-1 text-center">
              <span className="text-sm font-semibold text-foreground"> {a.qs}</span>
            </div>

            {/* Level */}
            <div className="col-span-1 text-center">
              <div className="inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-[10px] capitalize border bg-amber-50 text-amber-700 border-amber-200">
                {a.level}
              </div>
            </div>

            {/* Action */}
            <div onClick={() => handleView(a.id)} className="col-span-2 flex justify-end">
              <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 gap-1.5 text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-eye w-4 h-4">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                View
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-chevron-right w-3.5 h-3.5">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PastAssessmentsPage;