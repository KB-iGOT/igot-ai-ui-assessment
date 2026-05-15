import { useState, useEffect } from "react";
import Header from "@/components/Header";
import AssessmentTypeSelector from "@/components/AssessmentTypeSelector";
import StepNavigation from "@/components/StepNavigation";
import ContentInputStep from "@/components/ContentInputStep";
import ConfigurationStep, { QuestionTypeConfig } from "@/components/ConfigurationStep";
import ResultsStep from "@/components/ResultsStep";
import { toast } from "@/hooks/use-toast";
import { ListChecks, ToggleLeft, MessageSquare, FileText } from "lucide-react";
import { GenerateLoaderDialog } from "@/components/common/GenerateLoaderDialog";
import Tooltip from "@mui/material/Tooltip";
import { ACCESS_TOKEN_2 } from "@/components/ConstantAPI";
import { useLocation } from "react-router-dom";

const defaultQuestionTypes = [
  { id: "mcq", name: "Multiple Choice", icon: ListChecks, enabled: true, count: 10 },
  { id: "ftb", name: "Fill in the blanks", icon: ToggleLeft, enabled: true, count: 5 },
  { id: "mtf", name: "Match the following", icon: MessageSquare, enabled: false, count: 1 },
  { id: "truefalse", name: "True/False", icon: MessageSquare, enabled: false, count: 1 },
  { id: "multichoice", name: "Multi Select Questions", icon: MessageSquare, enabled: false, count: 1 },
  // { id: "essay", name: "Essay", icon: FileText, enabled: false, count: 0 },
];

const normalizeQuestions = (rawQuestions: any[]) => {
  return rawQuestions.map((q: any, index: number) => {
    const type = q.question_type?.toUpperCase();
    const isMCQ = type === "MCQ";
    const isMulti = type === "MULTICHOICE";
    const isMTF = type === "MTF";

    let correctAnswer: string | string[] = "";

    if (isMCQ && q.correct_option_index !== undefined && q.correct_option_index !== null) {
      const idx = Number(q.correct_option_index);
      if (!isNaN(idx)) correctAnswer = String.fromCharCode(65 + idx);
    }

    if (isMulti && Array.isArray(q.correct_option_index)) {
      correctAnswer = q.correct_option_index.map((i: any) => String.fromCharCode(65 + Number(i)));
    }

    if (type === "FTB" || type === "TRUEFALSE") {
      correctAnswer = q.correct_answer ?? "";
    }

    let options: { label: string; text: string }[] = [];

    if ((isMCQ || isMulti) && Array.isArray(q.options)) {
      options = q.options.map((opt: any, i: number) => ({ label: String.fromCharCode(65 + i), text: opt.text }));
    }

    if (isMTF && Array.isArray(q.pairs)) {
      options = q.pairs.map((pair: any, i: number) => ({
        label: String.fromCharCode(65 + i),
        text: pair.left,
        right: pair.right,
      }));
    }

    return {
      id: index + 1,
      type,
      bloomLevel: q.blooms_level ? q.blooms_level.charAt(0).toUpperCase() + q.blooms_level.slice(1) : "Remember",
      bloomPercent: q.relevance_percentage ?? 0,
      question: q.question_text || (type === "MTF" && "Match the following"),
      options,
      correctAnswer,
      question_type_rationale: q.reasoning?.question_type_rationale ?? "—",
      rationale: q.reasoning?.question_type_rationale ?? "—",
    };
  });
};

const Index = () => {
  const location = useLocation();
  const [assessmentType, setAssessmentType] = useState("practice");
  const [assessmentData, setAssessmentData] = useState<any>([]);
  const [currentStep, setCurrentStep] = useState("content");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [courseIds, setCourseIds] = useState<any>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [transcriptFiles, setTranscriptFiles] = useState<File[]>([]);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState('English');
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [questionTypes, setQuestionTypes] = useState(defaultQuestionTypes);
  const [assessmentLevel, setAssessmentLevel] = useState("intermediate");
  const [specificCourseId, setSpecificCourseId] = useState();
  const [bloomValues, setBloomValues] = useState<Record<string, number>>({
    remember: 10,
    understand: 20,
    apply: 25,
    analyze: 20,
    evaluate: 15,
    create: 10,
  });
  const [timeLimit, setTimeLimit] = useState(30);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    const viewJobData = location.state?.viewJobData;
    if (!viewJobData) return;

    const assessmentDataFetch =
      typeof viewJobData.assessment_data === "string"
        ? JSON.parse(viewJobData.assessment_data)
        : viewJobData.assessment_data;

    const rawQuestions = Object.values(assessmentDataFetch.questions).flat();
    const normalizedQuestions = normalizeQuestions(rawQuestions as any[]);

    setAssessmentData(assessmentDataFetch);
    setQuestions(normalizedQuestions);
    setSpecificCourseId(viewJobData.job_id);
    setCompletedSteps(["content", "configuration"]);
    setIsGenerated(true);
    setCurrentStep("results");
  }, []);

  const handleBloomChange = (id: string, value: number) => {
    setBloomValues((prev) => ({ ...prev, [id]: value }));
  };
  const handleContentNext = () => {
    if (topics.length === 0) {
      toast({
        title: "Topics Required",
        description: "Please add at least one topic.",
        variant: "destructive",
      });
      return;
    }

    setCompletedSteps((prev) => [...new Set([...prev, "content"])]);
    setCurrentStep("configuration");
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
          , {
          }
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

  const handleGenerate = async (source: "generate" | "regenerate" = "generate") => {
    setIsGenerating(true);
    const enabledQuestionTypes = questionTypes
      .filter(q => q.enabled && q.count > 0)
      .map(q => q.id);
    const totalQuestions = questionTypes
      .filter(q => q.enabled)
      .reduce((sum, q) => sum + q.count, 0);
    const questionTypeCounts = questionTypes
      .filter(q => q.enabled && q.count > 0)
      .reduce((acc: Record<string, number>, q) => {
        acc[q.id] = q.count;
        return acc;
      }, {});
    const formData = new FormData();
    formData.append(
      "question_type_counts",
      JSON.stringify(questionTypeCounts)
    );

    formData.append("course_ids", courseIds);
    const force: any = (source == 'generate') ? false : true
    formData.append("force", force);

    // 🔹 From this component
    formData.append("assessment_type", assessmentType);
    formData.append("difficulty", assessmentLevel);
    formData.append("total_questions", totalQuestions.toString());

    // enabledQuestionTypes.forEach(type => {
    //   formData.append("question_types", type);
    // });


    formData.append("time_limit", timeLimit.toString());
    formData.append("blooms_config", JSON.stringify(bloomValues));

    // 🔹 Dummy placeholders
    formData.append("topic_names", JSON.stringify(topics));
    formData.append("language", (language).toLowerCase());
    // formData.append("additional_instructions", "Auto-generated");
    // 🔹 Append transcript files
    [...transcriptFiles, ...materialFiles].forEach(file => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(`/apis/proxies/v8/ai/assessments/v1/generate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }


      const result = await response.json();
      setSpecificCourseId(result.job_id)
      
   



     
      pollGenerationStatus(
        
        result.job_id,
        (completedData) => {

          // FIX: Only parse if it's a string
          const assessmentDataFetch =
            typeof completedData.assessment_data === "string"
              ? JSON.parse(completedData.assessment_data)
              : completedData.assessment_data;

              setAssessmentData(assessmentDataFetch);

          const questionsByType = assessmentDataFetch.questions;
          const rawQuestions = Object.values(questionsByType).flat();
          const normalizedQuestions = normalizeQuestions(rawQuestions);
          setQuestions(normalizedQuestions);
          setCurrentStep("results");
          setIsGenerating(false);
          setIsGenerated(true);
          setCompletedSteps((prev) =>
            [...new Set([...prev, "configuration"])]
          );

          toast({
            title: "Assessment Generated!",
            description: `${normalizedQuestions.length} questions created.`,
          });
        },
        (error) => {
          console.error("Generation failed:", error);
          setIsGenerating(false);
        }
      );
     




    } catch (error) {
      console.error(error);
      setIsGenerating(false);
    }
  };


  const handleStartOver = () => {
    setCurrentStep("content");
    setCompletedSteps([]);
    setCourseIds([]);
    setTopics([]);
    setNotes("");
    setTranscriptFiles([]);
    setMaterialFiles([]);
    setQuestionTypes(defaultQuestionTypes);
    setAssessmentLevel("intermediate");
    setBloomValues({
      remember: 10,
      understand: 20,
      apply: 25,
      analyze: 20,
      evaluate: 15,
      create: 10,
    });
    setTimeLimit(30);
    setIsGenerated(false);
  };

  const totalQuestions = questionTypes
    .filter((qt) => qt.enabled)
    .reduce((sum, qt) => sum + qt.count, 0);

  return (
    <div className="min-h-screen bg-background">
      <GenerateLoaderDialog open={isGenerating} />
      <main className="container mx-auto lg:px-4 md:px-2 sm:px-1 py-6 max-w-4xl">
        {/* Title */}
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-foreground">iGOT AI Assessment Generator</h1>
          <p className="text-sm text-muted-foreground">Create curriculum-aligned assessments with iGOT AI</p>
        </div>

        <div className="flex items-center mb-3">
          <h3 className="text-sm font-medium text-foreground">Assessment Type</h3>
          <Tooltip
            title="Choose the assessment type based on your evaluation needs — practice for revision, final for end-of-course, comprehensive for multi-course, standalone for independent, or competency for KCM-mapped assessments."
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

        {/* Assessment Type Selector */}
        <div className="mb-5">
          <AssessmentTypeSelector
            selected={assessmentType}
            onSelect={(type) => {
              setAssessmentType(type);
              setCourseIds([]);
            }}
            currentStep={currentStep}
          />
        </div>

        {/* Step Navigation */}
        <StepNavigation
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          completedSteps={completedSteps}
          topics={topics}
          courseIds={courseIds}
        />

        {/* Step Content */}
        {currentStep === "content" && (
          <ContentInputStep
            assessmentType={assessmentType}
            courseIds={courseIds}
            topics={topics}
            notes={notes}
            transcriptFiles={transcriptFiles}
            materialFiles={materialFiles}
            onCourseIdsChange={setCourseIds}
            onTopicsChange={setTopics}
            onNotesChange={setNotes}
            onTranscriptFilesChange={setTranscriptFiles}
            onMaterialFilesChange={setMaterialFiles}
            onNext={handleContentNext}
            language={language}
            setLanguage={setLanguage}
          />
        )}

        {currentStep === "configuration" && (
          <ConfigurationStep
            questionTypes={questionTypes}
            assessmentLevel={assessmentLevel}
            bloomValues={bloomValues}
            timeLimit={timeLimit}
            onQuestionTypesChange={setQuestionTypes}
            onAssessmentLevelChange={setAssessmentLevel}
            onBloomChange={handleBloomChange}
            onTimeLimitChange={setTimeLimit}
            onBack={() => setCurrentStep("content")}
            onGenerate={() => handleGenerate("generate")}
            isGenerating={isGenerating}
            courseIds={courseIds}
          />
        )}

        {currentStep === "results" && (
          <ResultsStep
            isGenerated={isGenerated}
            totalQuestions={totalQuestions}
            assessmentLevel={assessmentLevel}
            timeLimit={timeLimit}
            topics={topics}
            onStartOver={handleStartOver}
            courseIds={courseIds}
            specificCourseId={specificCourseId}
            questions={questions}
            setQuestions={setQuestions}
            isGenerating={isGenerating}
            onRegenerate={() => handleGenerate("regenerate")}
            assessmentData={assessmentData}
          />
        )}
      </main>
    </div>
  );
};

export default Index;