import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Clock, Target, Zap, Play, CheckCircle2, XCircle, Loader2, BookOpen, Upload, Youtube, Globe, FileText, Image, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ChatMessageContent from "@/components/chat/ChatMessageContent";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const NCTB_SUBJECTS: Record<string, string[]> = {
  "গণিত": ["সংখ্যা পদ্ধতি", "বীজগণিত", "জ্যামিতি", "পরিমিতি", "ত্রিকোণমিতি", "পরিসংখ্যান"],
  "পদার্থবিজ্ঞান": ["গতি", "বল", "কাজ ও শক্তি", "তাপ", "আলো", "শব্দ", "বিদ্যুৎ", "চুম্বক"],
  "রসায়ন": ["পদার্থের গঠন", "পর্যায় সারণি", "রাসায়নিক বন্ধন", "এসিড-ক্ষার", "জৈব রসায়ন"],
  "জীববিজ্ঞান": ["কোষ", "জীবের বৈচিত্র্য", "উদ্ভিদবিদ্যা", "প্রাণিবিদ্যা", "জেনেটিক্স", "বাস্তুবিদ্যা"],
  "ইংরেজি": ["Grammar", "Vocabulary", "Tense", "Parts of Speech", "Comprehension"],
  "বাংলা": ["ব্যাকরণ", "সাহিত্য", "রচনা", "পত্র লিখন"],
  "সাধারণ বিজ্ঞান": ["পদার্থ", "শক্তি", "পরিবেশ", "স্বাস্থ্য", "প্রযুক্তি"],
  "তথ্য ও যোগাযোগ প্রযুক্তি": ["কম্পিউটার", "ইন্টারনেট", "প্রোগ্রামিং", "ডেটাবেজ"],
};

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

type QuizMode = "select" | "subject" | "custom" | "generating" | "quiz" | "result";

const Quiz = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<QuizMode>("select");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [studentClass, setStudentClass] = useState("9");
  const [customUrl, setCustomUrl] = useState("");
  const [customSource, setCustomSource] = useState<"pdf" | "image" | "youtube" | "web">("youtube");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("student_class").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.student_class) setStudentClass(data.student_class.toString()); });
  }, [user]);

  const generateQuiz = async (customContent?: string) => {
    setGenerating(true);
    setMode("generating");

    try {
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          subject: selectedSubject,
          classLevel: studentClass,
          topic: selectedTopic,
          customContent,
          questionCount: 5,
        }),
      });

      if (!resp.ok) throw new Error("Failed to generate quiz");
      const data = await resp.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
        setCurrentQ(0);
        setSelected(null);
        setShowExplanation(false);
        setMode("quiz");
        toast({ title: "কুইজ প্রস্তুত! 🎯" });
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
    generateQuiz(`ফাইলের নাম: ${file.name}. এই বিষয় থেকে প্রশ্ন তৈরি করো।`);
  };

  const handleCustomGenerate = () => {
    if (!customUrl.trim()) return;
    generateQuiz(`এই URL/কন্টেন্ট থেকে প্রশ্ন তৈরি করো: ${customUrl}`);
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
      setMode("result");
    }
  };

  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  // Generating screen
  if (mode === "generating") {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-10 text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="font-display font-bold text-lg">AI কুইজ তৈরি হচ্ছে...</h2>
          <p className="text-sm text-muted-foreground">NCTB সিলেবাস অনুযায়ী প্রশ্ন জেনারেট করা হচ্ছে</p>
        </motion.div>
      </div>
    );
  }

  // Result screen
  if (mode === "result") {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <Target className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold gradient-text">{score}/{questions.length}</h2>
            <p className="text-muted-foreground mt-1">
              {score === questions.length ? "পারফেক্ট! তুমি দারুণ! 🎉" :
               score >= questions.length * 0.7 ? "অসাধারণ! আরো একটু প্র্যাকটিস করো! 💪" :
               "চালিয়ে যাও! প্র্যাকটিস করলে আরো ভালো করবে! 📚"}
            </p>
          </div>
          <div className="space-y-3 text-left max-h-[400px] overflow-y-auto scrollbar-hidden">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                {answers[i] === q.correctIndex ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{q.question}</p>
                  <p className="text-xs text-primary mt-1">✅ {q.options[q.correctIndex]}</p>
                  <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMode("select")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> মেনু
            </Button>
            <Button variant="glow" className="flex-1 rounded-xl" onClick={() => generateQuiz()}>
              <Sparkles className="w-4 h-4 mr-2" /> আবার কুইজ
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Quiz screen
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

  // Subject selection screen
  if (mode === "subject") {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <button onClick={() => setMode("select")} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold">বিষয় বেছে নাও</h1>
            <p className="text-xs text-muted-foreground">ক্লাস {studentClass} · NCTB সিলেবাস</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {Object.keys(NCTB_SUBJECTS).map((subject, i) => (
            <motion.button
              key={subject}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { setSelectedSubject(subject); setSelectedTopic(""); }}
              className={`glass-card-hover rounded-xl p-4 text-left ${selectedSubject === subject ? "border-primary/30 bg-primary/5" : ""}`}
            >
              <h3 className="text-sm font-semibold">{subject}</h3>
              <p className="text-xs text-muted-foreground mt-1">{NCTB_SUBJECTS[subject].length}টি টপিক</p>
            </motion.button>
          ))}
        </div>

        {selectedSubject && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h3 className="font-display font-semibold text-sm">টপিক (ঐচ্ছিক)</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTopic("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !selectedTopic ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
                }`}
              >সব টপিক</button>
              {NCTB_SUBJECTS[selectedSubject]?.map(topic => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedTopic === topic ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
                  }`}
                >{topic}</button>
              ))}
            </div>
            <Button variant="glow" className="w-full rounded-xl gap-2 mt-4" onClick={() => generateQuiz()}>
              <Sparkles className="w-4 h-4" /> কুইজ শুরু করো
            </Button>
          </motion.div>
        )}
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
            <p className="text-xs text-muted-foreground">PDF, ছবি, YouTube বা ওয়েবসাইট থেকে কুইজ তৈরি করো</p>
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

        {(customSource === "pdf" || customSource === "image") ? (
          <div>
            <input ref={fileInputRef} type="file" accept={customSource === "pdf" ? ".pdf" : "image/*"} onChange={handleFileUpload} className="hidden" id="quiz-file" />
            <label htmlFor="quiz-file" className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/10">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">{customSource === "pdf" ? "PDF আপলোড করো" : "ছবি আপলোড করো"}</p>
              <p className="text-xs text-muted-foreground">AI অটোমেটিক কুইজ তৈরি করবে</p>
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

  // Main selection screen
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-secondary" /> কুইজ ইঞ্জিন
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI দিয়ে NCTB সিলেবাস অনুযায়ী কুইজ দাও — সম্পূর্ণ ফ্রি! 🎯</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "📚 NCTB বিষয়ভিত্তিক কুইজ", desc: "ক্লাস ও বিষয় অনুযায়ী AI কুইজ জেনারেট করো", action: () => setMode("subject"), color: "primary" },
          { title: "📎 কাস্টম সোর্স থেকে কুইজ", desc: "PDF, ছবি, YouTube বা ওয়েবসাইট থেকে কুইজ তৈরি করো", action: () => setMode("custom"), color: "secondary" },
          { title: "⚡ দ্রুত কুইজ — গণিত", desc: "গণিতের গুরুত্বপূর্ণ প্রশ্ন", action: () => { setSelectedSubject("গণিত"); generateQuiz(); }, color: "primary" },
          { title: "🔬 দ্রুত কুইজ — বিজ্ঞান", desc: "বিজ্ঞানের গুরুত্বপূর্ণ প্রশ্ন", action: () => { setSelectedSubject("পদার্থবিজ্ঞান"); generateQuiz(); }, color: "secondary" },
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
            <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
              <Play className="w-3.5 h-3.5" /> শুরু করো
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Quiz;
