import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ArrowLeft, Map, CreditCard, BarChart3, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ChatMessageContent from "@/components/chat/ChatMessageContent";
import TextToSpeech from "@/components/chat/TextToSpeech";

type ContentType = "mindmap" | "flashcard" | "infographic" | "formula";

const contentTypes: { type: ContentType; icon: typeof Map; label: string; desc: string }[] = [
  { type: "mindmap", icon: Map, label: "মাইন্ড ম্যাপ", desc: "টপিকের সম্পূর্ণ মাইন্ড ম্যাপ তৈরি করো" },
  { type: "flashcard", icon: CreditCard, label: "ফ্ল্যাশ কার্ড", desc: "প্রশ্ন-উত্তর ভিত্তিক ফ্ল্যাশ কার্ড" },
  { type: "infographic", icon: BarChart3, label: "ইনফোগ্রাফিক", desc: "ভিজ্যুয়াল ইনফোগ্রাফিক নোটস" },
  { type: "formula", icon: Calculator, label: "ফর্মুলা শীট", desc: "সকল সূত্র এক জায়গায়" },
];

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-notes`;

const CreateContent = () => {
  const { user } = useAuth();
  const [subjectInput, setSubjectInput] = useState("");
  const [chapterInput, setChapterInput] = useState("");
  const [selectedType, setSelectedType] = useState<ContentType>("mindmap");
  const [studentClass, setStudentClass] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("student_class").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.student_class) setStudentClass(data.student_class.toString()); });
  }, [user]);

  const getPromptForType = (type: ContentType): string => {
    const base = `বিষয়: ${subjectInput}, অধ্যায়: ${chapterInput}${studentClass ? `, ক্লাস: ${studentClass}` : ""}। NCTB সিলেবাস অনুযায়ী।`;
    switch (type) {
      case "mindmap":
        return `${base}\n\nএই অধ্যায়ের একটি বিস্তারিত মাইন্ড ম্যাপ তৈরি করো। মূল টপিক থেকে সাব-টপিক, কি-পয়েন্ট, সংজ্ঞা সব গুছিয়ে tree structure এ দেখাও। ASCII diagram বা markdown hierarchy ব্যবহার করো। বাংলায় লেখো।`;
      case "flashcard":
        return `${base}\n\nএই অধ্যায় থেকে ২০টি গুরুত্বপূর্ণ ফ্ল্যাশ কার্ড তৈরি করো। প্রতিটি কার্ডে একটি প্রশ্ন (Q) এবং সংক্ষিপ্ত উত্তর (A) থাকবে। পরীক্ষায় আসতে পারে এমন প্রশ্ন দাও। বাংলায় লেখো।`;
      case "infographic":
        return `${base}\n\nএই অধ্যায়ের একটি ইনফোগ্রাফিক স্টাইলে নোটস তৈরি করো। Key stats, facts, diagrams (ASCII), timeline, comparison chart ইত্যাদি ব্যবহার করো। ভিজ্যুয়ালি আকর্ষণীয় ও তথ্যবহুল করো। বাংলায় লেখো।`;
      case "formula":
        return `${base}\n\nএই অধ্যায়ের সকল গুরুত্বপূর্ণ সূত্র, নিয়ম ও শর্টকাট একটি ফর্মুলা শীটে সুন্দরভাবে সাজিয়ে দাও। LaTeX ব্যবহার করো: $...$ এবং $$...$$। প্রতিটি সূত্রের পাশে কোথায় ব্যবহার হয় তা উল্লেখ করো। বাংলায় লেখো।`;
    }
  };

  const handleGenerate = async () => {
    if (!subjectInput.trim() || !chapterInput.trim()) {
      toast({ title: "বিষয় ও অধ্যায়ের নাম লেখো", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          fileUrl: "",
          fileName: `${subjectInput} - ${chapterInput}`,
          sourceType: "custom",
          customPrompt: getPromptForType(selectedType),
        }),
      });

      if (!resp.ok) throw new Error("Generation failed");
      const data = await resp.json();
      setResult(data.content || "কনটেন্ট তৈরি করা যায়নি। আবার চেষ্টা করো।");
    } catch (e) {
      console.error(e);
      toast({ title: "কনটেন্ট তৈরি ব্যর্থ", variant: "destructive" });
    }
    setGenerating(false);
  };

  if (result) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setResult(null)} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold">{subjectInput} — {chapterInput}</h1>
              <p className="text-xs text-muted-foreground">{contentTypes.find(c => c.type === selectedType)?.label}</p>
            </div>
          </div>
          <TextToSpeech text={result} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
          <ChatMessageContent content={result} />
        </motion.div>

        <Button variant="glow" className="w-full rounded-xl gap-2" onClick={handleGenerate}>
          <Sparkles className="w-4 h-4" /> আবার তৈরি করো
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> কনটেন্ট তৈরি
        </h1>
        <p className="text-sm text-muted-foreground mt-1">মাইন্ড ম্যাপ, ফ্ল্যাশ কার্ড, ইনফোগ্রাফিক বা ফর্মুলা শীট তৈরি করো ✨</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">বিষয়ের নাম *</label>
          <input
            type="text"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            placeholder="যেমন: গণিত, পদার্থবিজ্ঞান, ইংরেজি..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">অধ্যায়ের নাম *</label>
          <input
            type="text"
            value={chapterInput}
            onChange={(e) => setChapterInput(e.target.value)}
            placeholder="যেমন: বীজগণিত, গতিবিদ্যা, Tense..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <h2 className="text-sm font-display font-semibold">কী তৈরি করতে চাও?</h2>
        <div className="grid grid-cols-2 gap-3">
          {contentTypes.map((ct) => (
            <button
              key={ct.type}
              onClick={() => setSelectedType(ct.type)}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl text-center transition-all duration-200 ${
                selectedType === ct.type
                  ? "bg-primary/15 border border-primary/30 text-primary"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <ct.icon className="w-7 h-7" />
              <span className="text-sm font-semibold">{ct.label}</span>
              <span className="text-[10px] text-muted-foreground">{ct.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <Button
        variant="glow"
        className="w-full rounded-xl gap-2"
        onClick={handleGenerate}
        disabled={generating || !subjectInput.trim() || !chapterInput.trim()}
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? "তৈরি হচ্ছে..." : "তৈরি করো"}
      </Button>
    </div>
  );
};

export default CreateContent;
