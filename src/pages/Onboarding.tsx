import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowRight, GraduationCap, Languages, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"class" | "language">("class");
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [language, setLanguage] = useState<"bn" | "en" | null>(null);

  const proceed = () => {
    if (step === "class" && selectedClass) setStep("language");
    else if (step === "language" && language) navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-grid-pattern relative">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <AnimatePresence mode="wait">
        {step === "class" && (
          <motion.div key="class" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold">তুমি কোন ক্লাসে পড়ো?</h2>
              <p className="text-sm text-muted-foreground mt-1">তোমার ক্লাস অনুযায়ী কন্টেন্ট কাস্টমাইজ করা হবে</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    selectedClass === cls
                      ? "bg-primary/15 text-primary border border-primary/30 glow-emerald"
                      : "glass-card hover:border-primary/20"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
            <Button variant="glow" className="w-full rounded-xl gap-2" onClick={proceed} disabled={!selectedClass}>
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {step === "language" && (
          <motion.div key="language" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center mx-auto mb-4">
                <Languages className="w-7 h-7 text-secondary" />
              </div>
              <h2 className="text-xl font-display font-bold">ভাষা নির্বাচন করো</h2>
              <p className="text-sm text-muted-foreground mt-1">তোমার পছন্দের ভাষায় শিখো</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { code: "bn" as const, label: "বাংলা", sub: "Bengali" },
                { code: "en" as const, label: "English", sub: "English" },
              ]).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`py-6 rounded-2xl text-center transition-all duration-200 ${
                    language === lang.code
                      ? "bg-primary/15 border border-primary/30 glow-emerald"
                      : "glass-card hover:border-primary/20"
                  }`}
                >
                  <p className="text-lg font-display font-bold">{lang.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{lang.sub}</p>
                </button>
              ))}
            </div>
            <Button variant="glow" className="w-full rounded-xl gap-2" onClick={proceed} disabled={!language}>
              <Sparkles className="w-4 h-4" /> শেখা শুরু করো!
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
