import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User, GraduationCap, Languages, Save, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [language, setLanguage] = useState("bn");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, student_class, language")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setStudentClass(data.student_class?.toString() || "");
          setLanguage(data.language || "bn");
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        student_class: studentClass ? parseInt(studentClass) : null,
        language,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "সেভ ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      setSaved(true);
      toast({ title: "সেটিংস সেভ হয়েছে! ✅" });
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> সেটিংস
        </h1>
        <p className="text-sm text-muted-foreground mt-1">তোমার প্রোফাইল এবং পছন্দ পরিবর্তন করো</p>
      </motion.div>

      {/* Profile Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> প্রোফাইল তথ্য
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">পুরো নাম</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="তোমার নাম লেখো..."
              className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ইমেইল</label>
            <input
              type="text"
              value={user?.email || ""}
              disabled
              className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 text-muted-foreground opacity-60"
            />
          </div>
        </div>
      </motion.div>

      {/* Class Selection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-secondary" /> ক্লাস
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {[6, 7, 8, 9, 10].map((cls) => (
            <button
              key={cls}
              onClick={() => setStudentClass(cls.toString())}
              className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                studentClass === cls.toString()
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[11, 12, "HSC"].map((cls) => (
            <button
              key={cls.toString()}
              onClick={() => setStudentClass(cls === "HSC" ? "13" : cls.toString())}
              className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                studentClass === (cls === "HSC" ? "13" : cls.toString())
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {cls === "HSC" ? "HSC+" : `${cls}`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Language */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <Languages className="w-4 h-4 text-primary" /> ভাষা
        </h2>
        <div className="flex gap-2">
          {[{ val: "bn", label: "বাংলা 🇧🇩" }, { val: "en", label: "English 🇬🇧" }].map((lang) => (
            <button
              key={lang.val}
              onClick={() => setLanguage(lang.val)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                language === lang.val
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Free info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">সম্পূর্ণ ফ্রি প্ল্যান ✨</h3>
            <p className="text-xs text-muted-foreground">সকল ফিচার আনলিমিটেড ব্যবহার করো — কোনো পেমেন্ট লাগবে না!</p>
          </div>
        </div>
      </motion.div>

      <Button variant="glow" className="w-full rounded-xl gap-2" onClick={handleSave} disabled={saving}>
        {saved ? <><Check className="w-4 h-4" /> সেভ হয়েছে!</> : <><Save className="w-4 h-4" /> সেভ করো</>}
      </Button>
    </div>
  );
};

export default SettingsPage;
