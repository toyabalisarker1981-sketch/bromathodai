import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Target, Play, CheckCircle2, XCircle, Loader2, Upload, Youtube, Globe, FileText, Image, ArrowLeft, Sparkles, BookOpen, Lightbulb, HelpCircle, ClipboardList, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ChatMessageContent from "@/components/chat/ChatMessageContent";
import { updateXpAndStreak, saveExamResult } from "@/lib/xpHelper";
import CustomExamCreator from "@/components/custom-exam/CustomExamCreator";
import CustomExamList from "@/components/custom-exam/CustomExamList";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ShortQuestion {
  question: string;
  answer: string;
}

interface AnalyticalQuestion {
  question: string;
  guidelines: string;
  keyPoints: string[];
}

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

type QuizMode = "select" | "subject" | "custom" | "generating" | "quiz" | "result" | "custom_exam_list" | "custom_exam_create" | "custom_exam_play" | "sq_mode" | "cq_mode";
type ResultTab = "mcq" | "short" | "analytical";
type QuestionType = "mcq" | "sq" | "cq" | "all";

const Quiz = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<QuizMode>("select");
  const [subjectInput, setSubjectInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [questionCountInput, setQuestionCountInput] = useState("5");
  const [customQuestionCount, setCustomQuestionCount] = useState("5");
  const [studentClass, setStudentClass] = useState("9");
  const [customUrl, setCustomUrl] = useState("");
  const [customSource, setCustomSource] = useState<"pdf" | "image" | "youtube" | "web">("youtube");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [shortQuestions, setShortQuestions] = useState<ShortQuestion[]>([]);
  const [analyticalQuestions, setAnalyticalQuestions] = useState<AnalyticalQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>("mcq");
  const [showShortAnswer, setShowShortAnswer] = useState<Record<number, boolean>>({});
  const [showAnalyticalGuide, setShowAnalyticalGuide] = useState<Record<number, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [customExamTitle, setCustomExamTitle] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("student_class").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.student_class) setStudentClass(data.student_class.toString()); });
    supabase.from("user_roles").select("role").eq("user_id", user.id)
      .then(({ data }) => { if (data?.some(r => r.role === "admin")) setIsAdmin(true); });
  }, [user]);

  const handleStartCustomExam = (examQuestions: any[], title: string, subject: string, duration: number) => {
    setQuestions(examQuestions);
    setShortQuestions([]);
    setAnalyticalQuestions([]);
    setAnswers(new Array(examQuestions.length).fill(null));
    setCurrentQ(0);
    setSelected(null);
    setShowExplanation(false);
    setCustomExamTitle(title);
    setSubjectInput(subject);
    setMode("quiz");
    toast({ title: `${title} — ${examQuestions.length}টি প্রশ্ন 🎯` });
  };

  const generateQuiz = async (customContent?: string, count?: number) => {
    setGenerating(true);
    setMode("generating");

    const qCount = count || parseInt(questionCountInput) || 5;

    try {
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          subject: subjectInput,
          classLevel: studentClass,
          topic: topicInput,
          customContent,
          questionCount: qCount,
          questionType,
          includeShortQuestions: questionType === "sq" || questionType === "all",
          includeAnalytical: questionType === "cq" || questionType === "all",
        }),
      });

      if (!resp.ok) throw new Error("Failed to generate quiz");
      const data = await resp.json();

      const mcqs = data.questions || [];
      const sqs = data.shortQuestions || [];
      const cqs = data.analyticalQuestions || [];
      const totalQ = mcqs.length + sqs.length + cqs.length;

      if (totalQ > 0) {
        setQuestions(mcqs);
        setShortQuestions(sqs);
        setAnalyticalQuestions(cqs);
        setAnswers(new Array(mcqs.length).fill(null));
        setCurrentQ(0);
        setSelected(null);
        setShowExplanation(false);
        setShowShortAnswer({});
        setShowAnalyticalGuide({});
        // If no MCQ, go straight to result to show SQ/CQ
        if (mcqs.length > 0) {
          setMode("quiz");
        } else {
          setMode("result");
          setResultTab(sqs.length > 0 ? "short" : "analytical");
        }
        toast({ title: `${totalQ}টি প্রশ্ন প্রস্তুত! 🎯` });
      } else {
        throw new Error("No questions generated");
      }
    } catch (e) {
      console.error(e);
      toast({ title: "কুইজ তৈরি ব্যর্থ", description: "আবার চেষ্টা করো", variant: "destructive" });
      setMode("select");
    }
    setGenerating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const count = parseInt(customQuestionCount) || 5;
    
    // Read the file content for better analysis
    if (file.type === "application/pdf" || file.type.startsWith("image/")) {
      generateQuiz(`ফাইলের নাম: ${file.name}. ফাইলের ধরন: ${file.type}. এই ফাইলের বিষয়বস্তু গভীরভাবে বিশ্লেষণ করে পরীক্ষার মানের প্রশ্ন তৈরি করো। কভার পেজ, সূচিপত্র, পৃষ্ঠা নম্বর, লেখক তথ্য উপেক্ষা করো — শুধুমাত্র মূল পাঠ্য বিষয়বস্তু থেকে প্রশ্ন করো।`, count);
    } else {
      generateQuiz(`ফাইলের নাম: ${file.name}. এই বিষয় থেকে পরীক্ষার মানের প্রশ্ন তৈরি করো।`, count);
    }
  };

  const handleCustomGenerate = () => {
    if (!customUrl.trim()) return;
    const count = parseInt(customQuestionCount) || 5;
    generateQuiz(`এই URL/কন্টেন্ট সম্পূর্ণ পড়ো এবং গভীরভাবে বিশ্লেষণ করো। শুধুমাত্র এই কন্টেন্টের মূল একাডেমিক বিষয়বস্তু থেকে বোর্ড পরীক্ষার মানের প্রশ্ন তৈরি করো: ${customUrl}`, count);
  };

  const submitAnswer = () => {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setSelected(null);
    setShowExplanation(false);
    if (currentQ < questions.length - 1) {
      setCurrentQ(p => p + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setMode("result");
    setResultTab("mcq");
    if (!user) return;
    try {
      const correctCount = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
      const xpEarned = correctCount * 10 + questions.length * 2;
      const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      await saveExamResult(user.id, questions.length, correctCount, accuracy, answers);
      const result = await updateXpAndStreak(user.id, xpEarned);
      if (result) {
        toast({ title: `+${result.xpEarned} XP অর্জন! 🎉`, description: `লেভেল ${result.level} · স্ট্রিক ${result.streak_days} দিন` });
      }
    } catch (e) {
      console.error("XP update error:", e);
    }
  };

  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  if (mode === "generating") {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-10 text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="font-display font-bold text-lg">AI কুইজ তৈরি হচ্ছে...</h2>
          <p className="text-sm text-muted-foreground">কন্টেন্ট বিশ্লেষণ করে বোর্ড পরীক্ষার মানের প্রশ্ন তৈরি হচ্ছে</p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">📖 MCQ</span>
            <span className="text-xs bg-secondary/10 text-secondary px-3 py-1 rounded-full">✍️ সংক্ষিপ্ত</span>
            <span className="text-xs bg-accent/30 text-foreground px-3 py-1 rounded-full">💡 বিশ্লেষণমূলক</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === "result") {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <Target className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold gradient-text">{score}/{questions.length}</h2>
            <p className="text-lg text-muted-foreground">{percentage}% সঠিক</p>
            <p className="text-sm text-muted-foreground mt-1">
              {percentage >= 80 ? "পারফেক্ট! তুমি দারুণ! 🎉" :
               percentage >= 50 ? "অসাধারণ! আরো একটু প্র্যাকটিস করো! 💪" :
               "চালিয়ে যাও! প্র্যাকটিস করলে আরো ভালো করবে! 📚"}
            </p>
          </div>
        </motion.div>

        {/* Tabs for question types */}
        <div className="flex gap-2">
          <button onClick={() => setResultTab("mcq")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${resultTab === "mcq" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
            <BookOpen className="w-3.5 h-3.5" /> MCQ ({questions.length})
          </button>
          {shortQuestions.length > 0 && (
            <button onClick={() => setResultTab("short")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${resultTab === "short" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
              <HelpCircle className="w-3.5 h-3.5" /> সংক্ষিপ্ত ({shortQuestions.length})
            </button>
          )}
          {analyticalQuestions.length > 0 && (
            <button onClick={() => setResultTab("analytical")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${resultTab === "analytical" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
              <Lightbulb className="w-3.5 h-3.5" /> বিশ্লেষণমূলক ({analyticalQuestions.length})
            </button>
          )}
        </div>

        {/* MCQ Review */}
        {resultTab === "mcq" && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hidden">
            {questions.map((q, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  {answers[i] === q.correctIndex ? (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                </div>
                <p className="text-xs text-primary ml-7">✅ সঠিক: {q.options[q.correctIndex]}</p>
                {answers[i] !== null && answers[i] !== q.correctIndex && (
                  <p className="text-xs text-destructive ml-7">❌ তোমার উত্তর: {q.options[answers[i]!]}</p>
                )}
                <div className="ml-7 p-2 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">💡 {q.explanation}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Short Questions */}
        {resultTab === "short" && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hidden">
            {shortQuestions.map((q, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold">📝 {i + 1}. {q.question}</p>
                <button
                  onClick={() => setShowShortAnswer(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  {showShortAnswer[i] ? "উত্তর লুকাও" : "✅ আদর্শ উত্তর দেখো"}
                </button>
                {showShortAnswer[i] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-foreground">{q.answer}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Analytical Questions */}
        {resultTab === "analytical" && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hidden">
            {analyticalQuestions.map((q, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold">💡 {i + 1}. {q.question}</p>
                <button
                  onClick={() => setShowAnalyticalGuide(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  {showAnalyticalGuide[i] ? "গাইডলাইন লুকাও" : "📖 উত্তরের গাইডলাইন দেখো"}
                </button>
                {showAnalyticalGuide[i] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">📋 নির্দেশনা:</p>
                    <p className="text-sm">{q.guidelines}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-2">🔑 মূল পয়েন্ট:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {q.keyPoints.map((point, pi) => (
                        <li key={pi} className="text-xs text-foreground/80">{point}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMode("select")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> মেনু
          </Button>
          <Button variant="glow" className="flex-1 rounded-xl" onClick={() => generateQuiz()}>
            <Sparkles className="w-4 h-4 mr-2" /> আবার কুইজ
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "quiz" && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">প্রশ্ন {currentQ + 1}/{questions.length}</span>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === currentQ ? "bg-primary" : i < currentQ ? (answers[i] === questions[i].correctIndex ? "bg-primary/40" : "bg-destructive/40") : "bg-muted"
                }`} />
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-base font-display font-semibold leading-relaxed">{q.question}</h2>
          </div>

          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              let style = "glass-card hover:border-primary/20";
              if (showExplanation) {
                if (i === q.correctIndex) style = "bg-primary/15 border border-primary/40 text-primary";
                else if (i === selected && i !== q.correctIndex) style = "bg-destructive/15 border border-destructive/40 text-destructive";
                else style = "glass-card opacity-50";
              } else if (selected === i) {
                style = "bg-primary/15 border border-primary/40 text-primary";
              }

              return (
                <button
                  key={i}
                  onClick={() => !showExplanation && setSelected(i)}
                  disabled={showExplanation}
                  className={`w-full text-left p-4 rounded-xl text-sm font-medium transition-all duration-200 ${style}`}
                >
                  <span className="mr-3 text-muted-foreground">{String.fromCharCode(2453 + i)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 border-l-4 border-primary">
              <p className="text-sm font-medium text-primary mb-1">💡 ব্যাখ্যা</p>
              <p className="text-sm text-muted-foreground">{q.explanation}</p>
            </motion.div>
          )}

          {!showExplanation ? (
            <Button variant="glow" className="w-full rounded-xl" disabled={selected === null} onClick={submitAnswer}>
              উত্তর দেখো
            </Button>
          ) : (
            <Button variant="glow" className="w-full rounded-xl" onClick={nextQuestion}>
              {currentQ < questions.length - 1 ? "পরের প্রশ্ন →" : "ফলাফল দেখো 🎯"}
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // Subject input screen
  if (mode === "subject") {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <button onClick={() => setMode("select")} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold">বিষয়ভিত্তিক কুইজ</h1>
            <p className="text-xs text-muted-foreground">ক্লাস {studentClass} · NCTB সিলেবাস · বোর্ড পরীক্ষার মান</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">বিষয়ের নাম লেখো *</label>
            <input
              type="text"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder="যেমন: গণিত, পদার্থবিজ্ঞান, ইংরেজি..."
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">অধ্যায় / টপিকের নাম (ঐচ্ছিক)</label>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="যেমন: বীজগণিত, গতি, Tense..."
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">কতগুলো MCQ চাও?</label>
            <input
              type="number"
              min="1"
              max="50"
              value={questionCountInput}
              onChange={(e) => setQuestionCountInput(e.target.value)}
              placeholder="5"
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">* সাথে সংক্ষিপ্ত ও বিশ্লেষণমূলক প্রশ্নও তৈরি হবে</p>
          </div>

          <Button
            variant="glow"
            className="w-full rounded-xl gap-2 mt-2"
            onClick={() => generateQuiz()}
            disabled={!subjectInput.trim()}
          >
            <Sparkles className="w-4 h-4" /> কুইজ শুরু করো
          </Button>
        </motion.div>
      </div>
    );
  }

  // Custom source screen
  if (mode === "custom") {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <button onClick={() => setMode("select")} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold">কাস্টম সোর্স থেকে কুইজ</h1>
            <p className="text-xs text-muted-foreground">PDF, ছবি, YouTube বা ওয়েবসাইট থেকে বোর্ড মানের প্রশ্ন তৈরি</p>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {([
            { type: "youtube" as const, icon: Youtube, label: "YouTube" },
            { type: "web" as const, icon: Globe, label: "ওয়েবসাইট" },
            { type: "pdf" as const, icon: FileText, label: "PDF" },
            { type: "image" as const, icon: Image, label: "ছবি" },
          ]).map(opt => (
            <button
              key={opt.type}
              onClick={() => setCustomSource(opt.type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                customSource === opt.type ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <opt.icon className="w-4 h-4" /> {opt.label}
            </button>
          ))}
        </div>

        <div className="glass-card rounded-xl p-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">কতগুলো MCQ চাও?</label>
          <input
            type="number"
            min="1"
            max="50"
            value={customQuestionCount}
            onChange={(e) => setCustomQuestionCount(e.target.value)}
            placeholder="5"
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">* সাথে সংক্ষিপ্ত ও বিশ্লেষণমূলক প্রশ্নও তৈরি হবে</p>
        </div>

        {(customSource === "pdf" || customSource === "image") ? (
          <div>
            <input ref={fileInputRef} type="file" accept={customSource === "pdf" ? ".pdf" : "image/*"} onChange={handleFileUpload} className="hidden" id="quiz-file" />
            <label htmlFor="quiz-file" className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/10">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">{customSource === "pdf" ? "PDF আপলোড করো" : "ছবি আপলোড করো"}</p>
              <p className="text-xs text-muted-foreground">AI কন্টেন্ট বিশ্লেষণ করে বোর্ড মানের প্রশ্ন তৈরি করবে</p>
            </label>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder={customSource === "youtube" ? "YouTube URL পেস্ট করো..." : "ওয়েবসাইট URL পেস্ট করো..."}
              className="flex-1 bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
            <Button variant="glow" className="gap-2 rounded-xl" onClick={handleCustomGenerate} disabled={!customUrl.trim()}>
              <Sparkles className="w-4 h-4" /> কুইজ তৈরি করো
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Custom exam modes
  if (mode === "custom_exam_create") {
    return <CustomExamCreator onBack={() => setMode("select")} examType="quiz" />;
  }

  if (mode === "custom_exam_list") {
    return <CustomExamList onBack={() => setMode("select")} onStartExam={handleStartCustomExam} examType="quiz" />;
  }

  // Main selection screen
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-secondary" /> কুইজ ইঞ্জিন
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI দিয়ে বোর্ড পরীক্ষার মানের MCQ, সংক্ষিপ্ত ও বিশ্লেষণমূলক প্রশ্ন 🎯</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "📚 NCTB বিষয়ভিত্তিক কুইজ", desc: "বিষয় ও অধ্যায়ের নাম দিয়ে বোর্ড মানের প্রশ্ন জেনারেট করো", action: () => setMode("subject") },
          { title: "📎 কাস্টম সোর্স থেকে কুইজ", desc: "PDF, ছবি, YouTube বা ওয়েবসাইট বিশ্লেষণ করে প্রশ্ন তৈরি", action: () => setMode("custom") },
          { title: "📋 কাস্টম কুইজ", desc: "অ্যাডমিনের তৈরি কুইজে অংশগ্রহণ করো", action: () => setMode("custom_exam_list") },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            onClick={item.action}
            className="glass-card-hover rounded-2xl p-6 cursor-pointer space-y-3"
          >
            <h3 className="font-display font-semibold text-base">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">MCQ</span>
              {i < 2 && <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">সংক্ষিপ্ত</span>}
              {i < 2 && <span className="text-[10px] bg-accent/30 text-foreground px-2 py-0.5 rounded-full">বিশ্লেষণমূলক</span>}
              {i === 2 && <span className="text-[10px] bg-accent/30 text-foreground px-2 py-0.5 rounded-full">অ্যাডমিন</span>}
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
              <Play className="w-3.5 h-3.5" /> শুরু করো
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Admin: create custom quiz button */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button variant="outline" className="w-full rounded-xl gap-2 border-dashed border-2" onClick={() => setMode("custom_exam_create")}>
            <Shield className="w-4 h-4" /> অ্যাডমিন: নতুন কাস্টম কুইজ তৈরি করো
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default Quiz;
