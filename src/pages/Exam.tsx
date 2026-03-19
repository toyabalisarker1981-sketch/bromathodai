import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, ArrowLeft, Sparkles, Loader2, Upload, Youtube, Globe, FileText, Image, Printer, Camera, CheckCircle2, XCircle, Target, Clock, Timer, ChevronLeft, ChevronRight, Shield, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { updateXpAndStreak, saveExamResult } from "@/lib/xpHelper";
import CustomExamCreator from "@/components/custom-exam/CustomExamCreator";
import CustomExamList from "@/components/custom-exam/CustomExamList";

interface ExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

type ExamMode = "setup" | "generating" | "omr" | "exam" | "scan" | "result" | "custom_exam_list" | "custom_exam_create";

const Exam = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<ExamMode>("setup");
  const [subjectInput, setSubjectInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [questionCount, setQuestionCount] = useState<25 | 30 | 50>(25);
  const [duration, setDuration] = useState(30); // minutes
  const [studentClass, setStudentClass] = useState("9");
  const [sourceType, setSourceType] = useState<"ai" | "url" | "file">("ai");
  const [sourceUrl, setSourceUrl] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("student_class").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.student_class) setStudentClass(data.student_class.toString()); });
  }, [user]);

  // Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const generateExam = async () => {
    setGenerating(true);
    setMode("generating");
    try {
      const body: any = { classLevel: studentClass, questionCount, subject: subjectInput, topic: topicInput };
      if (sourceType === "url" && sourceUrl.trim()) {
        body.customContent = `এই URL/কন্টেন্ট সম্পূর্ণ পড়ো এবং গভীরভাবে বিশ্লেষণ করো। প্রতিটি অনুচ্ছেদ, সংজ্ঞা, সূত্র, তথ্য চিহ্নিত করো। শুধুমাত্র মূল পাঠ্য বিষয়বস্তু থেকে বোর্ড পরীক্ষার মানের MCQ তৈরি করো। Cover page, Index, Page number, Author info সম্পূর্ণ উপেক্ষা করো: ${sourceUrl}`;
      }
      body.includeShortQuestions = false;
      body.includeAnalytical = false;
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      if (data.questions?.length > 0) {
        setQuestions(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(null));
        setMode("omr");
        toast({ title: `${data.questions.length}টি প্রশ্ন তৈরি হয়েছে! 📝` });
      } else throw new Error("No questions");
    } catch (e) {
      console.error(e);
      toast({ title: "পরীক্ষা তৈরি ব্যর্থ", variant: "destructive" });
      setMode("setup");
    }
    setGenerating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGenerating(true);
    setMode("generating");
    try {
      const body: any = {
        classLevel: studentClass,
        questionCount,
        subject: subjectInput,
        topic: topicInput,
        customContent: `ফাইলের নাম: ${file.name}. ফাইলের ধরন: ${file.type}. এই ফাইলের বিষয়বস্তু গভীরভাবে বিশ্লেষণ করে বোর্ড পরীক্ষার মানের MCQ তৈরি করো। Cover page, Index, Page number, Author info সম্পূর্ণ উপেক্ষা করো — শুধুমাত্র মূল পাঠ্য বিষয়বস্তু থেকে প্রশ্ন করো।`,
        includeShortQuestions: false,
        includeAnalytical: false,
      };
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      if (data.questions?.length > 0) {
        setQuestions(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(null));
        setMode("omr");
        toast({ title: `${data.questions.length}টি প্রশ্ন তৈরি হয়েছে! 📝` });
      } else throw new Error("No questions");
    } catch (e) {
      toast({ title: "পরীক্ষা তৈরি ব্যর্থ", variant: "destructive" });
      setMode("setup");
    }
    setGenerating(false);
  };

  const printOMR = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const half = Math.ceil(questions.length / 2);
    const makeCol = (start: number, end: number) =>
      questions.slice(start, end).map((_, i) => `
        <tr>
          <td style="text-align:center;font-weight:bold;padding:4px 8px;border:1px solid #333;font-size:12px;">${start + i + 1}</td>
          ${["ক", "খ", "গ", "ঘ"].map(l => `<td style="text-align:center;padding:4px;border:1px solid #333;"><div style="width:20px;height:20px;border-radius:50%;border:2px solid #333;margin:auto;font-size:9px;line-height:20px;">${l}</div></td>`).join("")}
        </tr>`).join("");

    printWin.document.write(`<!DOCTYPE html><html><head><title>OMR Sheet</title>
    <style>@page{size:A4;margin:12mm;}body{font-family:'Segoe UI',sans-serif;color:#000;font-size:12px;}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:12px;}table{border-collapse:collapse;width:100%;}th{background:#f0f0f0;padding:5px;border:1px solid #333;font-size:11px;}.cols{display:flex;gap:12px;}.col{flex:1;}</style></head><body>
    <div class="header"><h1 style="margin:0;font-size:20px;">BRO MATHOD Ai — OMR Sheet</h1><p style="margin:4px 0 0;font-size:12px;">${subjectInput} ${topicInput ? `· ${topicInput}` : ""} · ক্লাস ${studentClass} · সময়: ${duration} মিনিট</p></div>
    <div style="display:flex;gap:15px;margin-bottom:10px;font-size:11px;"><span>নাম: ______________________</span><span>রোল: ________</span><span>তারিখ: ________</span></div>
    <p style="font-size:10px;margin-bottom:8px;">📌 সঠিক উত্তরের বৃত্তটি কালো কলম দিয়ে পূরণ করো। মোট: ${questions.length}টি</p>
    <div class="cols"><div class="col"><table><thead><tr><th>নং</th><th>ক</th><th>খ</th><th>গ</th><th>ঘ</th></tr></thead><tbody>${makeCol(0, half)}</tbody></table></div>
    <div class="col"><table><thead><tr><th>নং</th><th>ক</th><th>খ</th><th>গ</th><th>ঘ</th></tr></thead><tbody>${makeCol(half, questions.length)}</tbody></table></div></div>
    <div style="margin-top:15px;text-align:center;font-size:9px;color:#666;">© BRO MATHOD Ai — Created by MD. Otunu</div></body></html>`);
    printWin.document.close();
    printWin.print();
  };

  const startExam = () => {
    setTimeLeft(duration * 60);
    setTimerActive(true);
    setMode("exam");
  };

  const selectAnswer = (qIndex: number, optIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[qIndex] = newAnswers[qIndex] === optIndex ? null : optIndex;
    setUserAnswers(newAnswers);
  };

  const finishExam = useCallback(async () => {
    setTimerActive(false);
    setMode("scan");
    if (!user) return;
    const correctCount = userAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
    const xpEarned = correctCount * 10 + questions.length * 2;
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    // Save exam result
    await saveExamResult(user.id, questions.length, correctCount, accuracy, userAnswers);

    // Update XP with proper daily streak
    const result = await updateXpAndStreak(user.id, xpEarned);
    if (result) {
      toast({ title: `+${result.xpEarned} XP অর্জন! 🎉`, description: `লেভেল ${result.level} · স্ট্রিক ${result.streak_days} দিন` });
    }
  }, [user, userAnswers, questions]);

  const handleOMRScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: [
                { type: "text", text: `তুমি একজন OMR শীট স্ক্যানার। এই ছবিটি একটি OMR শীট যেখানে ${questions.length}টি প্রশ্নের উত্তর বৃত্ত পূরণ করে দাগানো আছে।

⚠️ অত্যন্ত গুরুত্বপূর্ণ নিয়ম:
1. প্রতিটি প্রশ্নের জন্য ৪টি বৃত্ত আছে: ক(0), খ(1), গ(2), ঘ(3)
2. যে বৃত্তটি কালো/গাঢ় কালি দিয়ে পূরণ করা হয়েছে সেটিই উত্তর
3. পূরণ না করা বৃত্ত ফাঁকা/সাদা থাকে — সেগুলো উত্তর নয়
4. একটি প্রশ্নে শুধু একটিই বৃত্ত পূরণ থাকবে
5. যদি কোনো প্রশ্নে কোনো বৃত্ত পূরণ না থাকে, null দাও
6. OMR শীটে 2-কলামে প্রশ্ন থাকতে পারে — বাম কলামে 1 থেকে শুরু, ডান কলামে পরের অর্ধেক

খুব সাবধানে প্রতিটি সারি দেখো এবং সঠিকভাবে শনাক্ত করো কোন বৃত্ত পূরণ করা হয়েছে।

শুধুমাত্র একটি JSON array দাও, যেমন: [0, 1, 2, 3, 0, null, ...] 
মোট ${questions.length}টি উত্তর দিতে হবে। অতিরিক্ত কোনো টেক্সট লিখবে না।` },
                { type: "image_url", image_url: { url: `data:image/${file.type.split("/")[1]};base64,${base64}` } },
              ],
            }],
          }),
        });
        if (resp.ok) {
          const text = await resp.text();
          let fullContent = "";
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try { const p = JSON.parse(line.slice(6)); const c = p.choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
            }
          }
          // Try to extract the JSON array more robustly
          const cleanContent = fullContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          const arrMatch = cleanContent.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            try {
              const scannedAnswers = JSON.parse(arrMatch[0]);
              // Validate and sanitize: ensure values are 0-3 or null
              const sanitized = scannedAnswers.slice(0, questions.length).map((a: any) => {
                if (a === null || a === undefined || a === "null") return null;
                const num = typeof a === "number" ? a : parseInt(a);
                return (num >= 0 && num <= 3) ? num : null;
              });
              setUserAnswers(sanitized);
              toast({ title: "OMR স্ক্যান সম্পন্ন! ✅", description: `${sanitized.filter((a: any) => a !== null).length}টি উত্তর শনাক্ত হয়েছে` });
              setMode("result");
              setScanning(false);
              return;
            } catch (parseErr) {
              console.error("OMR parse error:", parseErr);
            }
          }
        }
        toast({ title: "OMR স্ক্যান ব্যর্থ", description: "ম্যানুয়ালি উত্তর দাও বা আবার চেষ্টা করো", variant: "destructive" });
        setScanning(false);
        setMode("scan");
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "স্ক্যান ব্যর্থ", variant: "destructive" });
      setScanning(false);
    }
  };

  const score = userAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const wrong = userAnswers.filter((a, i) => a !== null && a !== questions[i]?.correctIndex).length;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Generating
  if (mode === "generating") {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-10 text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="font-display font-bold text-lg">পরীক্ষা তৈরি হচ্ছে...</h2>
          <p className="text-sm text-muted-foreground">{questionCount}টি বোর্ড স্ট্যান্ডার্ড প্রশ্ন তৈরি করা হচ্ছে</p>
        </motion.div>
      </div>
    );
  }

  // OMR Preview
  if (mode === "omr") {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <button onClick={() => setMode("setup")} className="p-2 rounded-lg hover:bg-muted/30 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-xl font-display font-bold">OMR শীট ও পরীক্ষা</h1><p className="text-xs text-muted-foreground">{subjectInput} · {questions.length}টি প্রশ্ন · {duration} মিনিট</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 space-y-4 text-center">
          <ClipboardList className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display font-bold text-lg">পরীক্ষা প্রস্তুত! 🎯</h2>
          <p className="text-sm text-muted-foreground">{questions.length}টি MCQ · সময় {duration} মিনিট</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <Button variant="outline" className="rounded-xl gap-2" onClick={printOMR}><Printer className="w-4 h-4" /> OMR প্রিন্ট</Button>
            <Button variant="glow" className="rounded-xl gap-2" onClick={startExam}><Sparkles className="w-4 h-4" /> পরীক্ষা শুরু</Button>
            <div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleOMRScan} className="hidden" id="omr-scan" />
              <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={() => cameraRef.current?.click()} disabled={scanning}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} OMR স্ক্যান
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">🖨️ OMR প্রিন্ট → ✍️ উত্তর দাগাও → 📸 স্ক্যান অথবা অনলাইন পরীক্ষা দাও</p>
        </motion.div>
      </div>
    );
  }

  // OMR-style exam with bubbles, 2-column layout, timer
  if (mode === "exam" && questions.length > 0) {
    const answeredCount = userAnswers.filter(a => a !== null).length;
    const half = Math.ceil(questions.length / 2);

    return (
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        {/* Timer bar */}
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setTimerActive(false); setMode("omr"); }} className="p-1.5 rounded-lg hover:bg-muted/30"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <p className="text-sm font-semibold">{subjectInput}</p>
              <p className="text-xs text-muted-foreground">{answeredCount}/{questions.length} উত্তর দেওয়া হয়েছে</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${timeLeft < 60 ? "bg-destructive/15 text-destructive animate-pulse" : timeLeft < 300 ? "bg-yellow-500/15 text-yellow-400" : "bg-primary/15 text-primary"}`}>
            <Timer className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>

        {/* OMR-style 2-column question grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {questions.map((q, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="glass-card rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium leading-snug">
                <span className="text-primary font-bold mr-1">{i + 1}.</span>
                {q.question}
              </p>
              <div className="flex items-center gap-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => selectAnswer(i, oi)}
                    className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                      userAnswers[i] === oi
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    }`}
                    style={{ width: "28px", height: "28px", fontSize: "11px", fontWeight: 700 }}
                    title={opt}
                  >
                    {String.fromCharCode(2453 + oi)}
                  </button>
                ))}
              </div>
              {/* Option text on hover/tap */}
              <div className="text-[10px] text-muted-foreground leading-tight space-y-0.5">
                {q.options.map((opt, oi) => (
                  <p key={oi} className={userAnswers[i] === oi ? "text-primary font-medium" : ""}>
                    {String.fromCharCode(2453 + oi)}. {opt}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit */}
        <div className="sticky bottom-20 md:bottom-4 flex gap-3">
          <Button variant="glow" className="flex-1 rounded-xl gap-2 text-base py-6" onClick={finishExam}>
            <Target className="w-5 h-5" /> পরীক্ষা শেষ করো ({answeredCount}/{questions.length})
          </Button>
        </div>
      </div>
    );
  }

  // After exam - show OMR upload option or result
  if (mode === "scan") {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-8 text-center space-y-4">
          <Upload className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display font-bold text-lg">OMR Sheet আপলোড করো 📸</h2>
          <p className="text-sm text-muted-foreground">তোমার দাগানো OMR Sheet এর ছবি তুলো বা গ্যালারী থেকে আপলোড করো</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleOMRScan} className="hidden" id="omr-camera" />
              <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={() => cameraRef.current?.click()} disabled={scanning}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} ক্যামেরা দিয়ে তোলো
              </Button>
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleOMRScan} className="hidden" id="omr-gallery" />
              <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />} গ্যালারী থেকে
              </Button>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl w-full mt-2" onClick={() => setMode("result")}>
            OMR ছাড়া রেজাল্ট দেখো
          </Button>
        </motion.div>
      </div>
    );
  }

  // Result
  if (mode === "result") {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <Target className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold text-primary">{score}/{questions.length}</h2>
            <p className="text-lg text-muted-foreground">{percentage}% সঠিক</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-center">
              <p className="text-xl font-bold text-primary">{score}</p>
              <p className="text-xs text-muted-foreground">সঠিক</p>
            </div>
            <div className="p-3 rounded-xl bg-destructive/10 text-center">
              <p className="text-xl font-bold text-destructive">{wrong}</p>
              <p className="text-xs text-muted-foreground">ভুল</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 text-center">
              <p className="text-xl font-bold">{percentage}%</p>
              <p className="text-xs text-muted-foreground">নির্ভুলতা</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {percentage >= 80 ? "অসাধারণ! তুমি দারুণ করেছো! 🎉" : percentage >= 50 ? "ভালো! আরো একটু প্র্যাকটিস করো! 💪" : "চালিয়ে যাও! প্র্যাকটিস করলে আরো ভালো করবে! 📚"}
          </p>
        </motion.div>

        {/* Review with explanations */}
        <h3 className="text-sm font-semibold">প্রশ্ন রিভিউ ও ব্যাখ্যা</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hidden">
          {questions.map((q, i) => {
            const isCorrect = userAnswers[i] === q.correctIndex;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`glass-card rounded-xl p-4 space-y-2 ${!isCorrect ? "border-destructive/20" : "border-primary/20"}`}>
                <div className="flex items-start gap-2">
                  {isCorrect ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />}
                  <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                </div>
                <p className="text-xs text-primary ml-7">✅ সঠিক উত্তর: {q.options[q.correctIndex]}</p>
                {userAnswers[i] !== null && userAnswers[i] !== q.correctIndex && (
                  <p className="text-xs text-destructive ml-7">❌ তোমার উত্তর: {q.options[userAnswers[i]!]}</p>
                )}
                {userAnswers[i] === null && (
                  <p className="text-xs text-muted-foreground ml-7">⚠️ উত্তর দেওয়া হয়নি</p>
                )}
                <div className="ml-7 p-2 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">💡 <span className="font-medium">ব্যাখ্যা:</span> {q.explanation}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMode("setup")}><ArrowLeft className="w-4 h-4 mr-2" /> নতুন পরীক্ষা</Button>
          <Button className="flex-1 rounded-xl" onClick={() => setMode("scan")}><Upload className="w-4 h-4 mr-2" /> OMR আপলোড</Button>
        </div>
      </div>
    );
  }

  // Setup
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" /> পরীক্ষা মোড</h1>
        <p className="text-sm text-muted-foreground mt-1">OMR স্টাইল MCQ পরীক্ষা দাও — AI প্রশ্ন তৈরি করবে 🎯</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">বিষয়ের নাম *</label>
            <input type="text" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="যেমন: পদার্থবিজ্ঞান"
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">অধ্যায় / টপিক</label>
            <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} placeholder="যেমন: গতি, বল"
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">প্রশ্ন সংখ্যা</label>
          <div className="flex gap-2">
            {([25, 30, 50] as const).map(c => (
              <button key={c} onClick={() => setQuestionCount(c)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${questionCount === c ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
                {c}টি
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">পরীক্ষার সময় (মিনিট)</label>
          <input type="number" min="5" max="180" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
        </div>

        {/* Source type */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">প্রশ্নের সোর্স</label>
          <div className="flex gap-2">
            {[
              { type: "ai" as const, label: "AI জেনারেট", icon: Sparkles },
              { type: "url" as const, label: "URL / লিংক", icon: Globe },
              { type: "file" as const, label: "ফাইল আপলোড", icon: Upload },
            ].map(s => (
              <button key={s.type} onClick={() => setSourceType(s.type)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${sourceType === s.type ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
                <s.icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            ))}
          </div>
        </div>

        {sourceType === "url" && (
          <input type="text" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="YouTube, ওয়েবসাইট বা PDF URL..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
        )}

        {sourceType === "file" && (
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={handleFileUpload} className="hidden" id="exam-file" />
            <label htmlFor="exam-file" className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/10">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm font-medium">PDF বা বইয়ের ছবি আপলোড করো</p>
            </label>
          </div>
        )}

        {sourceType !== "file" && (
          <Button variant="glow" className="w-full rounded-xl gap-2" onClick={generateExam} disabled={!subjectInput.trim() || generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} পরীক্ষা তৈরি করো
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default Exam;
