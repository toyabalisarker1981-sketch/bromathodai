import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ArrowLeft, Map, CreditCard, BarChart3, Calculator, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ChatMessageContent from "@/components/chat/ChatMessageContent";
import TextToSpeech from "@/components/chat/TextToSpeech";

type ContentType = "mindmap" | "flashcard" | "infographic" | "formula";

const contentTypes: { type: ContentType; icon: typeof Map; label: string; desc: string; gradient: string }[] = [
  { type: "mindmap", icon: Map, label: "মাইন্ড ম্যাপ", desc: "টপিকের সম্পূর্ণ মাইন্ড ম্যাপ", gradient: "from-emerald-500/20 to-teal-500/20" },
  { type: "flashcard", icon: CreditCard, label: "ফ্ল্যাশ কার্ড", desc: "প্রশ্ন-উত্তর কার্ড", gradient: "from-blue-500/20 to-indigo-500/20" },
  { type: "infographic", icon: BarChart3, label: "ইনফোগ্রাফিক", desc: "ভিজ্যুয়াল নোটস", gradient: "from-purple-500/20 to-pink-500/20" },
  { type: "formula", icon: Calculator, label: "ফর্মুলা শীট", desc: "সকল সূত্র একত্রে", gradient: "from-amber-500/20 to-orange-500/20" },
];

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-notes`;

// Parse flashcard content into Q&A pairs
const parseFlashcards = (content: string): { q: string; a: string }[] => {
  const cards: { q: string; a: string }[] = [];
  const lines = content.split("\n");
  let currentQ = "";
  let currentA = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^(\*\*)?Q\d*[\.:]/i) || trimmed.match(/^(\*\*)?প্রশ্ন/i) || trimmed.match(/^#+\s*\d+[\.:]/)) {
      if (currentQ && currentA) cards.push({ q: currentQ, a: currentA });
      currentQ = trimmed.replace(/^(\*\*)?Q\d*[\.:]\s*/i, "").replace(/^(\*\*)?প্রশ্ন\s*\d*[\.:]\s*/i, "").replace(/^#+\s*\d+[\.:]\s*/, "").replace(/\*\*/g, "");
      currentA = "";
    } else if (trimmed.match(/^(\*\*)?A[\.:]/i) || trimmed.match(/^(\*\*)?উত্তর/i)) {
      currentA = trimmed.replace(/^(\*\*)?A[\.:]\s*/i, "").replace(/^(\*\*)?উত্তর[\.:]\s*/i, "").replace(/\*\*/g, "");
    } else if (currentQ && !currentA && trimmed) {
      currentA += (currentA ? " " : "") + trimmed.replace(/\*\*/g, "");
    }
  }
  if (currentQ && currentA) cards.push({ q: currentQ, a: currentA });

  // Fallback: split by numbered items
  if (cards.length === 0) {
    const sections = content.split(/(?=\d+[\.\)]\s)/);
    for (const section of sections) {
      const parts = section.split(/\n/);
      if (parts.length >= 2) {
        cards.push({ q: parts[0].replace(/^\d+[\.\)]\s*/, "").replace(/\*\*/g, ""), a: parts.slice(1).join(" ").replace(/\*\*/g, "").trim() });
      }
    }
  }

  return cards.length > 0 ? cards : [{ q: "কনটেন্ট পার্স করা যায়নি", a: content.slice(0, 200) }];
};

// Flashcard Component
const FlashcardViewer = ({ content }: { content: string }) => {
  const cards = parseFlashcards(content);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-muted-foreground">
        কার্ড {currentCard + 1} / {cards.length}
      </div>

      <div
        className="relative w-full aspect-[3/2] max-w-md mx-auto cursor-pointer perspective-1000"
        onClick={() => setFlipped(!flipped)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCard}-${flipped}`}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-2xl border ${
              flipped
                ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
                : "bg-gradient-to-br from-primary/10 to-indigo-500/10 border-primary/20"
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${flipped ? "text-emerald-400" : "text-primary"}`}>
              {flipped ? "✅ উত্তর" : "❓ প্রশ্ন"}
            </span>
            <p className="text-base font-medium leading-relaxed">
              {flipped ? cards[currentCard]?.a : cards[currentCard]?.q}
            </p>
            <p className="text-[10px] text-muted-foreground mt-4">ক্লিক করো ফ্লিপ করতে</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="glass"
          size="icon"
          className="rounded-full"
          onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setFlipped(false); }}
          disabled={currentCard === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="glass"
          size="icon"
          className="rounded-full"
          onClick={() => setFlipped(!flipped)}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="glass"
          size="icon"
          className="rounded-full"
          onClick={() => { setCurrentCard(Math.min(cards.length - 1, currentCard + 1)); setFlipped(false); }}
          disabled={currentCard === cards.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Card progress dots */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentCard(i); setFlipped(false); }}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentCard ? "bg-primary scale-125" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Mind Map visual component
const MindMapViewer = ({ content }: { content: string }) => (
  <div className="space-y-4">
    <div className="glass-card rounded-2xl p-6 border border-primary/10 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
      <div className="prose prose-invert prose-sm max-w-none">
        <ChatMessageContent content={content} />
      </div>
    </div>
  </div>
);

// Infographic visual component  
const InfographicViewer = ({ content }: { content: string }) => (
  <div className="space-y-4">
    <div className="glass-card rounded-2xl p-6 border border-purple-500/10 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <div className="prose prose-invert prose-sm max-w-none">
        <ChatMessageContent content={content} />
      </div>
    </div>
  </div>
);

// Formula Sheet visual component
const FormulaViewer = ({ content }: { content: string }) => (
  <div className="space-y-4">
    <div className="glass-card rounded-2xl p-6 border border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <div className="prose prose-invert prose-sm max-w-none">
        <ChatMessageContent content={content} />
      </div>
    </div>
  </div>
);

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
        return `${base}\n\nএই অধ্যায়ের একটি বিস্তারিত মাইন্ড ম্যাপ তৈরি করো। মূল টপিক থেকে সাব-টপিক, কি-পয়েন্ট, সংজ্ঞা সব গুছিয়ে tree structure এ দেখাও। Markdown heading ও nested list ব্যবহার করো। ইমোজি ব্যবহার করো বিষয় বোঝাতে। বাংলায় লেখো।`;
      case "flashcard":
        return `${base}\n\nএই অধ্যায় থেকে ১৫টি গুরুত্বপূর্ণ ফ্ল্যাশ কার্ড তৈরি করো। প্রতিটি কার্ড এই ফরম্যাটে হবে:\n\nQ1: প্রশ্ন এখানে\nA: উত্তর এখানে\n\nQ2: প্রশ্ন এখানে\nA: উত্তর এখানে\n\nপরীক্ষায় আসতে পারে এমন প্রশ্ন দাও। বাংলায় লেখো।`;
      case "infographic":
        return `${base}\n\nএই অধ্যায়ের একটি ইনফোগ্রাফিক স্টাইলে নোটস তৈরি করো। Key stats, facts, timeline, comparison chart ইত্যাদি ব্যবহার করো। Markdown table, bold, emoji ব্যবহার করো। ভিজ্যুয়ালি আকর্ষণীয় ও তথ্যবহুল করো। বাংলায় লেখো।`;
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

  const renderResult = () => {
    if (!result) return null;
    switch (selectedType) {
      case "flashcard": return <FlashcardViewer content={result} />;
      case "mindmap": return <MindMapViewer content={result} />;
      case "infographic": return <InfographicViewer content={result} />;
      case "formula": return <FormulaViewer content={result} />;
    }
  };

  if (result) {
    const ct = contentTypes.find(c => c.type === selectedType);
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setResult(null)} className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold">{subjectInput} — {chapterInput}</h1>
              <p className="text-xs text-muted-foreground">{ct?.label}</p>
            </div>
          </div>
          <TextToSpeech text={result} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {renderResult()}
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
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl text-center transition-all duration-200 border ${
                selectedType === ct.type
                  ? `bg-gradient-to-br ${ct.gradient} border-primary/30 text-primary shadow-lg`
                  : "glass-card text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedType === ct.type ? "bg-primary/15" : "bg-muted/30"
              }`}>
                <ct.icon className="w-6 h-6" />
              </div>
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
