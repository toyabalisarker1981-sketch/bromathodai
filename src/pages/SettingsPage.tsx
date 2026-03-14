import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User, GraduationCap, Languages, Save, Check, Shield, LogOut, Mail, Edit3, HelpCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const userGuide = [
  {
    title: "🤖 AI টিউটর",
    steps: [
      "ড্যাশবোর্ড থেকে 'AI টিউটর' এ ক্লিক করো",
      "যেকোনো প্রশ্ন বাংলায় বা ইংরেজিতে টাইপ করো",
      "ছবি থেকে সমাধান পেতে 📷 বাটনে ক্লিক করে ছবি আপলোড করো",
      "AI তোমার ক্লাস অনুযায়ী বন্ধুর মতো করে বোঝাবে",
      "🔊 বাটনে ক্লিক করে উত্তর শুনতে পারো",
    ],
  },
  {
    title: "📝 নোটবুক AI",
    steps: [
      "PDF বা ছবি আপলোড করো — AI অটোমেটিক হ্যান্ড নোট তৈরি করবে",
      "YouTube URL বা ওয়েব লিংক দিয়েও নোট বানাতে পারো",
      "AI Cover Page, Index, Page Number উপেক্ষা করে শুধু মূল পড়ার অংশ থেকে নোট তৈরি করবে",
      "Short Summary, Key Points, Exam Focused Notes ও MCQ প্রশ্ন তৈরি করবে",
      "🖨️ বাটনে ক্লিক করে A4 সাইজে প্রিন্ট করো",
    ],
  },
  {
    title: "🎯 কুইজ ইঞ্জিন",
    steps: [
      "বিষয় ও অধ্যায়ের নাম টাইপ করে লেখো",
      "প্রশ্ন সংখ্যা সেট করো",
      "PDF, ছবি, YouTube বা ওয়েবসাইট থেকেও কুইজ বানাতে পারো",
      "AI বোর্ড স্ট্যান্ডার্ড MCQ তৈরি করবে",
      "কুইজ শেষ হলে XP ও স্ট্রিক বাড়বে!",
    ],
  },
  {
    title: "📋 পরীক্ষা মোড (OMR)",
    steps: [
      "বিষয়, অধ্যায়, প্রশ্ন সংখ্যা (২৫/৩০/৫০) ও সময় সেট করো",
      "AI বোর্ড স্ট্যান্ডার্ড MCQ তৈরি করবে",
      "OMR শীট প্রিন্ট করে কাগজে উত্তর দাগাতে পারো",
      "OMR শীটের ছবি তুলে AI দিয়ে স্ক্যান করো — AI স্বয়ংক্রিয়ভাবে গ্রেড করবে",
      "অনলাইনেও OMR স্টাইল bubble দিয়ে পরীক্ষা দিতে পারো (টাইমার সহ)",
      "পরীক্ষা শেষে সঠিক-ভুল উত্তর, Accuracy % ও ব্যাখ্যা দেখো",
    ],
  },
  {
    title: "✨ কনটেন্ট তৈরি",
    steps: [
      "বিষয় ও অধ্যায়ের নাম লেখো",
      "মাইন্ড ম্যাপ / ফ্ল্যাশ কার্ড / ইনফোগ্রাফিক / ফর্মুলা শীট সিলেক্ট করো",
      "AI তোমার জন্য সুন্দরভাবে সেটা তৈরি করে দিবে",
    ],
  },
  {
    title: "📚 লাইব্রেরী",
    steps: [
      "সার্চ বার দিয়ে বইয়ের নাম বা বিষয় খুঁজো",
      "তোমার ক্লাসের বইগুলো ফিল্টার করো",
      "বইয়ের কভারে ক্লিক করলে সরাসরি পড়তে পারবে",
      "Continue Reading — যেখানে পড়া শেষ করেছিলে সেখান থেকে শুরু করো",
      "অফলাইনেও ক্যাশ করা বই পড়তে পারো",
    ],
  },
  {
    title: "👥 কমিউনিটি",
    steps: [
      "বন্ধুদের নাম দিয়ে সার্চ করো ও ফ্রেন্ড রিকোয়েস্ট পাঠাও",
      "গ্রুপ তৈরি করো ও বন্ধুদের ইনভাইট করো",
      "গ্রুপে একসাথে MCQ পরীক্ষা দাও",
      "পরীক্ষা শেষে র‍্যাংকিং ও লিডারবোর্ড দেখো",
    ],
  },
  {
    title: "🎬 StudyTube",
    steps: [
      "টপিক লিখে শিক্ষামূলক ভিডিও সার্চ করো",
      "AI তোমার টপিক অনুযায়ী সেরা YouTube ভিডিও সাজেস্ট করবে",
      "ভিডিওর থাম্বনেইলে ক্লিক করে সরাসরি দেখো",
    ],
  },
  {
    title: "🏆 লিডারবোর্ড",
    steps: [
      "সকল স্টুডেন্টের র‍্যাংকিং দেখো",
      "তোমার র‍্যাংক ও লেভেল চেক করো",
      "বেশি পরীক্ষা দিলে ও ভালো স্কোর করলে লেভেল বাড়বে",
      "Beginner → Intermediate → Advanced → Top Performer",
    ],
  },
];

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [language, setLanguage] = useState("bn");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, student_class, language").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) { setFullName(data.full_name || ""); setStudentClass(data.student_class?.toString() || ""); setLanguage(data.language || "bn"); }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName || null, student_class: studentClass ? parseInt(studentClass) : null, language }).eq("user_id", user.id);
    if (error) toast({ title: "সেভ ব্যর্থ", description: error.message, variant: "destructive" });
    else { setSaved(true); setEditing(false); toast({ title: "সেটিংস সেভ হয়েছে! ✅" }); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const handleSignOut = async () => { await signOut(); navigate("/landing"); };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-primary" /> সেটিংস</h1>
        <p className="text-sm text-muted-foreground mt-1">তোমার প্রোফাইল এবং পছন্দ পরিবর্তন করো</p>
      </motion.div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2"><User className="w-4 h-4 text-primary" /> প্রোফাইল তথ্য</h2>
          <button onClick={() => setEditing(!editing)} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Edit3 className="w-3 h-3" /> {editing ? "বাতিল" : "এডিট করো"}</button>
        </div>
        {!editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center"><User className="w-6 h-6 text-primary" /></div>
              <div><p className="font-semibold text-sm">{fullName || "নাম সেট করো"}</p><p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {user?.email}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/20"><p className="text-xs text-muted-foreground">ক্লাস</p><p className="text-sm font-semibold mt-0.5">{studentClass ? `ক্লাস ${studentClass}` : "সেট করো"}</p></div>
              <div className="p-3 rounded-xl bg-muted/20"><p className="text-xs text-muted-foreground">ভাষা</p><p className="text-sm font-semibold mt-0.5">{language === "bn" ? "বাংলা 🇧🇩" : "English 🇬🇧"}</p></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">পুরো নাম</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="তোমার নাম লেখো..."
                className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ইমেইল</label>
              <input type="text" value={user?.email || ""} disabled className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 text-muted-foreground opacity-60" />
            </div>
          </div>
        )}
      </motion.div>

      {editing && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-secondary" /> ক্লাস</h2>
            <div className="grid grid-cols-5 gap-2">
              {[1,2,3,4,5].map(c => (
                <button key={c} onClick={() => setStudentClass(c.toString())} className={`py-3 rounded-xl text-sm font-semibold transition-all ${studentClass === c.toString() ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground border border-transparent"}`}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[6,7,8,9,10].map(c => (
                <button key={c} onClick={() => setStudentClass(c.toString())} className={`py-3 rounded-xl text-sm font-semibold transition-all ${studentClass === c.toString() ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground border border-transparent"}`}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[11, 12, "HSC"].map(c => (
                <button key={c.toString()} onClick={() => setStudentClass(c === "HSC" ? "13" : c.toString())} className={`py-3 rounded-xl text-sm font-semibold transition-all ${studentClass === (c === "HSC" ? "13" : c.toString()) ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground border border-transparent"}`}>{c === "HSC" ? "HSC+" : c}</button>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2"><Languages className="w-4 h-4 text-primary" /> ভাষা</h2>
            <div className="flex gap-2">
              {[{ val: "bn", label: "বাংলা 🇧🇩" }, { val: "en", label: "English 🇬🇧" }].map(l => (
                <button key={l.val} onClick={() => setLanguage(l.val)} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${language === l.val ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground border border-transparent"}`}>{l.label}</button>
              ))}
            </div>
          </motion.div>
          <Button variant="glow" className="w-full rounded-xl gap-2" onClick={handleSave} disabled={saving}>
            {saved ? <><Check className="w-4 h-4" /> সেভ হয়েছে!</> : <><Save className="w-4 h-4" /> সেভ করো</>}
          </Button>
        </>
      )}

      {/* User Guide */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <button onClick={() => setShowGuide(!showGuide)} className="glass-card rounded-2xl p-5 w-full text-left">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2"><HelpCircle className="w-4 h-4 text-primary" /> ইউজার গাইড</h2>
            {showGuide ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">সকল ফিচার কিভাবে ব্যবহার করবে স্টেপ বাই স্টেপ</p>
        </button>
        {showGuide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-3">
            {userGuide.map((section, i) => (
              <div key={i} className="glass-card rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <ol className="space-y-1.5">
                  {section.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary font-semibold flex-shrink-0">{j + 1}.</span>{step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button onClick={() => setShowAbout(!showAbout)} className="glass-card rounded-2xl p-5 w-full text-left">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2"><Info className="w-4 h-4 text-secondary" /> আমাদের সম্পর্কে</h2>
            {showAbout ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {showAbout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-base font-display font-bold gradient-text">BRO MATHOD Ai</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              BRO MATHOD Ai হলো বাংলাদেশী স্টুডেন্টদের জন্য তৈরি একটি <strong className="text-foreground">সম্পূর্ণ ফ্রি AI-পাওয়ার্ড শিক্ষা প্ল্যাটফর্ম</strong>। NCTB সিলেবাস অনুযায়ী ক্লাস ১ থেকে HSC পর্যন্ত সকল ছাত্র-ছাত্রী এখানে পড়াশোনা করতে পারবে।
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><strong className="text-foreground">🎯 উদ্দেশ্য:</strong> প্রতিটি ছাত্র-ছাত্রীর কাছে উন্নতমানের শিক্ষা পৌঁছে দেওয়া।</p>
              <p><strong className="text-foreground">🤖 AI টিউটর:</strong> বন্ধুর মতো করে যেকোনো বিষয় বোঝায়, ছবি থেকে সমাধান করে।</p>
              <p><strong className="text-foreground">📋 পরীক্ষা মোড:</strong> OMR স্টাইল MCQ পরীক্ষা, AI স্ক্যানিং ও স্বয়ংক্রিয় গ্রেডিং।</p>
              <p><strong className="text-foreground">👥 কমিউনিটি:</strong> বন্ধু যোগ করো, গ্রুপে একসাথে পরীক্ষা দাও, র‍্যাংকিং দেখো।</p>
              <p><strong className="text-foreground">🎬 StudyTube:</strong> শিক্ষামূলক ভিডিও প্ল্যাটফর্ম — AI সেরা ভিডিও সাজেস্ট করে।</p>
              <p><strong className="text-foreground">🏆 লিডারবোর্ড:</strong> Beginner → Advanced → Top Performer লেভেল সিস্টেম।</p>
            </div>
            <p className="text-xs text-muted-foreground border-t border-border/30 pt-3"><strong className="text-foreground">ডেভেলপার:</strong> MD. Otunu · © {new Date().getFullYear()} BRO MATHOD Ai</p>
          </motion.div>
        )}
      </motion.div>

      {/* Free Plan */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
          <div><h3 className="text-sm font-semibold">সম্পূর্ণ ফ্রি প্ল্যান ✨</h3><p className="text-xs text-muted-foreground">সকল ফিচার আনলিমিটেড ব্যবহার করো!</p></div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Button variant="outline" className="w-full rounded-xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" /> সাইন আউট
        </Button>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
