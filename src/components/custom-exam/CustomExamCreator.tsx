import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, Plus, FileText, Image, Trash2, ArrowLeft, Sparkles, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CustomExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface CustomExamCreatorProps {
  onBack: () => void;
  examType: "quiz" | "exam";
}

const EXTRACT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-questions`;

const CustomExamCreator = ({ onBack, examType }: CustomExamCreatorProps) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("9");
  const [questionCount, setQuestionCount] = useState("25");
  const [duration, setDuration] = useState("30");
  const [extracting, setExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<CustomExamQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      if (data?.some((r) => r.role === "admin")) setIsAdmin(true);
    });
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({ title: "শুধু ছবি বা PDF আপলোড করো", variant: "destructive" });
      return;
    }

    setExtracting(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        
        const resp = await fetch(EXTRACT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageBase64: base64,
            imageType: file.type,
            subject,
            classLevel,
            questionCount: parseInt(questionCount) || 25,
            title,
          }),
        });

        if (!resp.ok) throw new Error("Extraction failed");
        const data = await resp.json();

        if (data.questions?.length > 0) {
          setExtractedQuestions(data.questions);
          if (data.extractedTitle && !title) setTitle(data.extractedTitle);
          toast({ title: `${data.questions.length}টি প্রশ্ন extract হয়েছে! ✅` });
        } else {
          throw new Error("No questions found");
        }
        setExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast({ title: "প্রশ্ন extract ব্যর্থ", description: "আবার চেষ্টা করো", variant: "destructive" });
      setExtracting(false);
    }
  };

  const saveCustomExam = async () => {
    if (!user || !title.trim() || !subject.trim() || extractedQuestions.length === 0) {
      toast({ title: "সব তথ্য পূরণ করো", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("community_exams").insert({
        title: title.trim(),
        subject: subject.trim(),
        created_by: user.id,
        questions: extractedQuestions as any,
        question_count: extractedQuestions.length,
        duration_minutes: parseInt(duration) || 30,
        exam_type: examType === "quiz" ? "custom_quiz" : "custom_exam",
        is_active: true,
      });

      if (error) throw error;
      toast({ title: "কাস্টম পরীক্ষা সেভ হয়েছে! 🎉" });
      onBack();
    } catch (err) {
      console.error(err);
      toast({ title: "সেভ ব্যর্থ", variant: "destructive" });
    }
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-4">
          <Users className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="font-display font-bold text-lg">অ্যাক্সেস নেই</h2>
          <p className="text-sm text-muted-foreground">শুধুমাত্র অ্যাডমিন কাস্টম পরীক্ষা তৈরি করতে পারে</p>
          <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যাও</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted/30 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-display font-bold">কাস্টম পরীক্ষা তৈরি করো</h1>
          <p className="text-xs text-muted-foreground">PDF/ছবি আপলোড → AI প্রশ্ন extract → স্টুডেন্টদের জন্য পাবলিশ</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">পরীক্ষার শিরোনাম *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="যেমন: অধ্যায় ৩ - গতি MCQ"
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">বিষয় *</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="যেমন: পদার্থবিজ্ঞান"
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">ক্লাস</label>
            <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}
              className="w-full bg-muted/30 rounded-xl px-3 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(c => (
                <option key={c} value={c}>ক্লাস {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">প্রশ্ন সংখ্যা</label>
            <input type="number" min="5" max="100" value={questionCount} onChange={(e) => setQuestionCount(e.target.value)}
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">সময় (মিনিট)</label>
            <input type="number" min="5" max="180" value={duration} onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors" />
          </div>
        </div>

        {/* Upload area */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">প্রশ্নপত্র আপলোড করো (PDF/ছবি) *</label>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" id="custom-exam-file" />
          <label htmlFor="custom-exam-file" className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/10">
            {extracting ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium">AI প্রশ্ন extract করছে...</p>
                <p className="text-xs text-muted-foreground">ছবি বিশ্লেষণ করে MCQ তৈরি হচ্ছে</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium">PDF বা প্রশ্নপত্রের ছবি আপলোড করো</p>
                <p className="text-xs text-muted-foreground">AI ছবি পড়ে MCQ প্রশ্ন extract করবে</p>
              </>
            )}
          </label>
        </div>
      </motion.div>

      {/* Extracted questions preview */}
      {extractedQuestions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> {extractedQuestions.length}টি প্রশ্ন extract হয়েছে
            </h3>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> আরো আপলোড
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hidden">
            {extractedQuestions.map((q, i) => (
              <div key={i} className="glass-card rounded-xl p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium"><span className="text-primary font-bold">{i + 1}.</span> {q.question}</p>
                  <button onClick={() => setExtractedQuestions(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 ml-4">
                  {q.options.map((opt, oi) => (
                    <p key={oi} className={`text-[10px] ${oi === q.correctIndex ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {String.fromCharCode(2453 + oi)}. {opt} {oi === q.correctIndex && "✅"}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button variant="glow" className="w-full rounded-xl gap-2" onClick={saveCustomExam} disabled={saving || !title.trim() || !subject.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            পরীক্ষা পাবলিশ করো ({extractedQuestions.length}টি প্রশ্ন)
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default CustomExamCreator;
