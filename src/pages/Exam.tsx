import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, ArrowLeft, Sparkles, Loader2, Upload, Youtube, Globe, FileText, Image, Printer, Camera, CheckCircle2, XCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

type ExamMode = "setup" | "generating" | "omr" | "exam" | "scan" | "result";

const Exam = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<ExamMode>("setup");
  const [subjectInput, setSubjectInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [questionCount, setQuestionCount] = useState<25 | 30 | 50>(25);
  const [studentClass, setStudentClass] = useState("9");
  const [sourceType, setSourceType] = useState<"ai" | "url">("ai");
  const [sourceUrl, setSourceUrl] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("student_class").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.student_class) setStudentClass(data.student_class.toString()); });
  }, [user]);

  const generateExam = async () => {
    setGenerating(true);
    setMode("generating");

    try {
      const body: any = {
        classLevel: studentClass,
        questionCount,
        subject: subjectInput,
        topic: topicInput,
      };

      if (sourceType === "url" && sourceUrl.trim()) {
        body.customContent = `এই URL/কন্টেন্ট ভালোভাবে পড়ো এবং শুধুমাত্র এই কন্টেন্ট থেকে প্রশ্ন তৈরি করো: ${sourceUrl}`;
      }

      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();

      if (data.questions?.length > 0) {
        setQuestions(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(null));
        setMode("omr");
        toast({ title: `${data.questions.length}টি প্রশ্ন তৈরি হয়েছে! 📝` });
      } else {
        throw new Error("No questions");
      }
    } catch (e) {
      console.error(e);
      toast({ title: "পরীক্ষা তৈরি ব্যর্থ", variant: "destructive" });
      setMode("setup");
    }
    setGenerating(false);
  };

  const printOMR = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const rows = questions.map((_, i) => `
      <tr>
        <td style="text-align:center;font-weight:bold;padding:6px 12px;border:1px solid #333;">${i + 1}</td>
        <td style="text-align:center;padding:6px 12px;border:1px solid #333;"><div style="width:22px;height:22px;border-radius:50%;border:2px solid #333;margin:auto;"></div></td>
        <td style="text-align:center;padding:6px 12px;border:1px solid #333;"><div style="width:22px;height:22px;border-radius:50%;border:2px solid #333;margin:auto;"></div></td>
        <td style="text-align:center;padding:6px 12px;border:1px solid #333;"><div style="width:22px;height:22px;border-radius:50%;border:2px solid #333;margin:auto;"></div></td>
        <td style="text-align:center;padding:6px 12px;border:1px solid #333;"><div style="width:22px;height:22px;border-radius:50%;border:2px solid #333;margin:auto;"></div></td>
      </tr>
    `).join("");

    printWin.document.write(`<!DOCTYPE html><html><head><title>OMR Sheet - BRO MATHOD Ai</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Segoe UI', sans-serif; color: #000; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
      .info-row { display: flex; gap: 20px; margin-bottom: 15px; }
      .info-field { flex: 1; border-bottom: 1px solid #555; padding: 5px 0; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f0f0f0; padding: 8px; border: 1px solid #333; font-size: 13px; }
    </style></head><body>
    <div class="header">
      <h1 style="margin:0;font-size:24px;">BRO MATHOD Ai — OMR Sheet</h1>
      <p style="margin:5px 0 0;font-size:14px;">${subjectInput} ${topicInput ? `· ${topicInput}` : ""} · ক্লাস ${studentClass}</p>
    </div>
    <div class="info-row">
      <div class="info-field">নাম: ______________________</div>
      <div class="info-field">রোল: ________</div>
      <div class="info-field">তারিখ: ________</div>
    </div>
    <p style="font-size:12px;margin-bottom:10px;">📌 সঠিক উত্তরের বৃত্তটি কালো কলম দিয়ে পূরণ করো। মোট প্রশ্ন: ${questions.length}</p>
    <table>
      <thead><tr><th>নং</th><th>ক</th><th>খ</th><th>গ</th><th>ঘ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:20px;text-align:center;font-size:11px;color:#666;">
      <p>© BRO MATHOD Ai — Created by MD. Otunu</p>
    </div>
    </body></html>`);
    printWin.document.close();
    printWin.print();
  };

  const startExam = () => {
    setCurrentQ(0);
    setMode("exam");
  };

  const selectAnswer = (optIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQ] = optIndex;
    setUserAnswers(newAnswers);
  };

  const goToQuestion = (index: number) => {
    setCurrentQ(index);
  };

  const finishExam = () => {
    setMode("result");
    // Update XP
    if (!user) return;
    const correctCount = userAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
    const xpEarned = correctCount * 10 + questions.length * 2;
    
    supabase.from("profiles").select("xp, level, streak_days").eq("user_id", user.id).single()
      .then(({ data: profile }) => {
        if (profile) {
          const newXp = (profile.xp || 0) + xpEarned;
          const newLevel = Math.floor(newXp / 500) + 1;
          const newStreak = (profile.streak_days || 0) + 1;
          supabase.from("profiles").update({ xp: newXp, level: newLevel, streak_days: newStreak }).eq("user_id", user.id).then(() => {
            toast({ title: `+${xpEarned} XP অর্জন! 🎉` });
          });
        }
      });
  };

  const handleOMRScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    
    // Upload image and use AI to scan OMR
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        
        const LOVABLE_API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `এটি একটি OMR শীটের ছবি। এখানে ${questions.length}টি প্রশ্নের উত্তর দাগানো আছে। প্রতিটি প্রশ্নের জন্য কোন অপশন (ক=0, খ=1, গ=2, ঘ=3) দাগানো হয়েছে বলো। শুধুমাত্র JSON array হিসেবে উত্তর দাও, যেমন: [0, 1, 2, 3, 0, ...]. যদি কোনো প্রশ্নের উত্তর দাগানো না থাকে, null দাও।`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/${file.type.split("/")[1]};base64,${base64}` },
                  },
                ],
              },
            ],
          }),
        });

        if (resp.ok) {
          // Try to parse the streamed response
          const text = await resp.text();
          // Extract JSON array from the response
          const jsonMatch = text.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            try {
              // Parse from SSE format
              let fullContent = "";
              const lines = text.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) fullContent += content;
                  } catch {}
                }
              }
              
              const arrMatch = fullContent.match(/\[[\s\S]*?\]/);
              if (arrMatch) {
                const scannedAnswers = JSON.parse(arrMatch[0]);
                setUserAnswers(scannedAnswers.slice(0, questions.length));
                toast({ title: "OMR স্ক্যান সম্পন্ন! ✅" });
                setMode("result");
                setScanning(false);
                return;
              }
            } catch {}
          }
        }
        toast({ title: "OMR স্ক্যান ব্যর্থ", description: "ম্যানুয়ালি উত্তর দাও", variant: "destructive" });
        setScanning(false);
        setMode("exam");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      toast({ title: "স্ক্যান ব্যর্থ", variant: "destructive" });
      setScanning(false);
    }
  };

  const score = userAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Generating state
  if (mode === "generating") {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-10 text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="font-display font-bold text-lg">পরীক্ষা তৈরি হচ্ছে...</h2>
          <p className="text-sm text-muted-foreground">{questionCount}টি প্রশ্ন জেনারেট করা হচ্ছে</p>
        </motion.div>
      </div>
    );
  }

  // OMR Preview + Print
  if (mode === "omr") {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <button onClick={() => setMode("setup")} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold">OMR শীট ও পরীক্ষা</h1>
            <p className="text-xs text-muted-foreground">{subjectInput} · {questions.length}টি প্রশ্ন</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 space-y-4 text-center">
          <ClipboardList className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display font-bold text-lg">পরীক্ষা প্রস্তুত! 🎯</h2>
          <p className="text-sm text-muted-foreground">{questions.length}টি MCQ প্রশ্ন তৈরি হয়েছে</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <Button variant="outline" className="rounded-xl gap-2" onClick={printOMR}>
              <Printer className="w-4 h-4" /> OMR প্রিন্ট
            </Button>
            <Button variant="glow" className="rounded-xl gap-2" onClick={startExam}>
              <Sparkles className="w-4 h-4" /> পরীক্ষা শুরু
            </Button>
            <div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleOMRScan} className="hidden" id="omr-scan" />
              <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={() => cameraRef.current?.click()} disabled={scanning}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                OMR স্ক্যান
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            🖨️ প্রথমে OMR প্রিন্ট করো → ✍️ উত্তর দাগাও → 📸 OMR স্ক্যান করো অথবা অনলাইনে পরীক্ষা দাও
          </p>
        </motion.div>
      </div>
    );
  }

  // Exam mode - show questions one by one
  if (mode === "exam" && questions.length > 0) {
    const q = questions[currentQ];
    const answeredCount = userAnswers.filter(a => a !== null).length;

    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMode("omr")} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">{answeredCount}/{questions.length} উত্তর দেওয়া হয়েছে</span>
        </div>

        {/* Question number grid */}
        <div className="flex flex-wrap gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => goToQuestion(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                i === currentQ
                  ? "bg-primary text-primary-foreground"
                  : userAnswers[i] !== null
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/30 text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <span className="text-xs text-muted-foreground">প্রশ্ন {currentQ + 1}</span>
            <h2 className="text-base font-display font-semibold leading-relaxed mt-1">{q.question}</h2>
          </div>

          <div className="space-y-2.5">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                className={`w-full text-left p-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  userAnswers[currentQ] === i
                    ? "bg-primary/15 border border-primary/40 text-primary"
                    : "glass-card hover:border-primary/20"
                }`}
              >
                <span className="mr-3 text-muted-foreground">{String.fromCharCode(2453 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            {currentQ > 0 && (
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setCurrentQ(p => p - 1)}>
                ← আগের প্রশ্ন
              </Button>
            )}
            {currentQ < questions.length - 1 ? (
              <Button variant="glow" className="flex-1 rounded-xl" onClick={() => setCurrentQ(p => p + 1)}>
                পরের প্রশ্ন →
              </Button>
            ) : (
              <Button variant="glow" className="flex-1 rounded-xl" onClick={finishExam}>
                পরীক্ষা শেষ করো 🎯
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Result mode
  if (mode === "result") {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <Target className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold gradient-text">{score}/{questions.length}</h2>
            <p className="text-lg text-muted-foreground">{percentage}% সঠিক</p>
            <p className="text-muted-foreground mt-1">
              {percentage >= 90 ? "অসাধারণ! তুমি দারুণ! 🎉" :
               percentage >= 70 ? "খুব ভালো! আরো প্র্যাকটিস করো! 💪" :
               percentage >= 50 ? "ভালো চেষ্টা! আরো পড়ো! 📚" :
               "চালিয়ে যাও! প্র্যাকটিসে ফলাফল আসবে! 🌟"}
            </p>
          </div>

          {/* Detailed review */}
          <div className="space-y-3 text-left max-h-[400px] overflow-y-auto scrollbar-hidden">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                {userAnswers[i] === q.correctIndex ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                  {userAnswers[i] !== null && userAnswers[i] !== q.correctIndex && (
                    <p className="text-xs text-destructive mt-1">❌ তোমার উত্তর: {q.options[userAnswers[i]!]}</p>
                  )}
                  <p className="text-xs text-primary mt-1">✅ সঠিক: {q.options[q.correctIndex]}</p>
                  <p className="text-xs text-muted-foreground mt-1">💡 {q.explanation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMode("setup")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> মেনু
            </Button>
            <Button variant="glow" className="flex-1 rounded-xl" onClick={() => { setMode("setup"); }}>
              <Sparkles className="w-4 h-4 mr-2" /> নতুন পরীক্ষা
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Setup screen
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-secondary" /> পরীক্ষা মোড
        </h1>
        <p className="text-sm text-muted-foreground mt-1">OMR শীট সহ পরীক্ষা দাও — রিয়েল এক্সাম ফিল! 📝</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">বিষয়ের নাম *</label>
          <input
            type="text"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            placeholder="যেমন: গণিত, পদার্থবিজ্ঞান..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">অধ্যায় / টপিক (ঐচ্ছিক)</label>
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="যেমন: বীজগণিত, গতি..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">প্রশ্ন সংখ্যা</label>
          <div className="flex gap-3">
            {([25, 30, 50] as const).map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  questionCount === n
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {n}টি
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">সোর্স</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSourceType("ai")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                sourceType === "ai" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <Sparkles className="w-4 h-4" /> AI জেনারেট
            </button>
            <button
              onClick={() => setSourceType("url")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                sourceType === "url" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <Globe className="w-4 h-4" /> URL থেকে
            </button>
          </div>
        </div>

        {sourceType === "url" && (
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="YouTube, ওয়েবসাইট বা PDF URL দাও..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        )}

        <Button
          variant="glow"
          className="w-full rounded-xl gap-2 mt-2"
          onClick={generateExam}
          disabled={!subjectInput.trim() || generating}
        >
          <ClipboardList className="w-4 h-4" /> পরীক্ষা তৈরি করো
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="font-display font-semibold text-sm">📋 কিভাবে পরীক্ষা দেবে?</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>1️⃣ বিষয় ও প্রশ্ন সংখ্যা সিলেক্ট করো</p>
          <p>2️⃣ পরীক্ষা তৈরি হলে OMR শীট প্রিন্ট করো</p>
          <p>3️⃣ পরীক্ষা শুরু করো — প্রশ্ন দেখে OMR-এ উত্তর দাগাও</p>
          <p>4️⃣ পরীক্ষা শেষে OMR স্ক্যান করো বা অনলাইনে উত্তর দাও</p>
          <p>5️⃣ রেজাল্ট দেখো — ব্যাখ্যাসহ সকল উত্তর রিভিউ করো</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Exam;
