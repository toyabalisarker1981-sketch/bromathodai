import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowRight, GraduationCap, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"welcome" | "name" | "class" | "language">("welcome");
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [language, setLanguage] = useState<"bn" | "en" | null>(null);

  const proceed = () => {
    if (step === "welcome") setStep("name");
    else if (step === "name" && name.trim()) setStep("class");
    else if (step === "class" && selectedClass) setStep("language");
    else if (step === "language" && language) navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-grid-pattern relative">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div key="welcome" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center space-y-8 max-w-sm">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-3xl bg-primary/15 flex items-center justify-center mx-auto glow-emerald"
            >
              <Brain className="w-12 h-12 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-display font-bold gradient-text">BRO MATHOD Ai</h1>
              <p className="text-muted-foreground mt-2 text-sm">Your AI-powered private tutor for NCTB curriculum</p>
            </div>
            <Button variant="glow" className="w-full rounded-xl gap-2" onClick={proceed}>
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {step === "name" && (
          <motion.div key="name" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full max-w-sm space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold">What's your name?</h2>
              <p className="text-sm text-muted-foreground mt-1">We'll personalize your learning experience</p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && proceed()}
              placeholder="Enter your name..."
              autoFocus
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
            <Button variant="glow" className="w-full rounded-xl gap-2" onClick={proceed} disabled={!name.trim()}>
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {step === "class" && (
          <motion.div key="class" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full max-w-sm space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Select your class
              </h2>
              <p className="text-sm text-muted-foreground mt-1">This helps us tailor content difficulty</p>
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
            <div>
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Languages className="w-5 h-5 text-secondary" /> Choose language
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Select your preferred learning language</p>
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
              Start Learning <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
