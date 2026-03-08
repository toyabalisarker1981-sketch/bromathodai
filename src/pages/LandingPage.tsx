import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, MessageSquare, BookOpen, Zap, Trophy, Shield, ArrowRight, Sparkles, Users, GraduationCap, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: MessageSquare,
    title: "AI Tutor Chat",
    desc: "যেকোনো বিষয়ে প্রশ্ন করুন — গণিত, বিজ্ঞান, ইংরেজি। LaTeX সাপোর্ট সহ।",
    descEn: "Ask anything — Math, Science, English. With LaTeX math rendering.",
    color: "primary",
  },
  {
    icon: BookOpen,
    title: "Notebook AI",
    desc: "YouTube, ওয়েব লিংক বা PDF থেকে স্ট্রাকচার্ড নোটস তৈরি করুন।",
    descEn: "Generate structured study notes from YouTube, web links, or PDFs.",
    color: "secondary",
  },
  {
    icon: Brain,
    title: "Quiz & Exam Engine",
    desc: "MCQ ও সৃজনশীল প্রশ্ন তৈরি করুন। টাইমার ও নেগেটিভ মার্কিং সহ।",
    descEn: "Generate MCQ & Creative Questions with timer and negative marking.",
    color: "primary",
  },
  {
    icon: Trophy,
    title: "Gamification & XP",
    desc: "পড়াশোনা করে XP অর্জন করুন, লেভেল আপ করুন, অ্যাচিভমেন্ট আনলক করুন।",
    descEn: "Earn XP, level up, and unlock achievements as you learn.",
    color: "secondary",
  },
  {
    icon: Sparkles,
    title: "Vision AI",
    desc: "ছবি আপলোড করুন — AI ছবি দেখে বিশ্লেষণ করবে ও সমাধান দেবে।",
    descEn: "Upload images for AI-powered visual analysis and solutions.",
    color: "primary",
  },
  {
    icon: Shield,
    title: "১০০% ফ্রি",
    desc: "সকল ফিচার সম্পূর্ণ ফ্রি। কোনো হিডেন চার্জ নেই। চিরকাল ফ্রি।",
    descEn: "All features completely free. No hidden charges. Free forever.",
    color: "secondary",
  },
];

const stats = [
  { value: "∞", label: "Unlimited AI Queries" },
  { value: "1-12", label: "Class Support" },
  { value: "2", label: "Languages" },
  { value: "100%", label: "Free Forever" },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-grid-pattern relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glass-card border-b border-border/50"
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display text-lg font-bold gradient-text">BRO MATHOD Ai</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
            <Button variant="glow" size="sm" onClick={() => navigate("/signup")} className="rounded-xl">
              Sign Up Free
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-medium text-primary"
          >
            <Sparkles className="w-3.5 h-3.5" /> সম্পূর্ণ ফ্রি — সকল স্টুডেন্টদের জন্য
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight"
          >
            তোমার <span className="gradient-text">AI Private Tutor</span>
            <br />
            এখন তোমার হাতের মুঠোয়
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            NCTB কারিকুলাম ভিত্তিক AI-চালিত শিক্ষা প্ল্যাটফর্ম। গণিত, বিজ্ঞান, ইংরেজি — যেকোনো বিষয়ে সাহায্য নাও, নোটস তৈরি কর, কুইজ দাও। একদম ফ্রি!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button variant="glow" size="lg" onClick={() => navigate("/signup")} className="rounded-xl gap-2 text-base px-8">
              এখনই শুরু করো — বিনামূল্যে <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="glass" size="lg" onClick={() => navigate("/login")} className="rounded-xl gap-2 text-base px-8">
              Sign In
            </Button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="pt-8"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground mx-auto" />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-5 text-center"
            >
              <p className="text-2xl md:text-3xl font-display font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              সকল ফিচার <span className="gradient-text">এক জায়গায়</span>
            </h2>
            <p className="text-muted-foreground mt-3">World-class AI features — completely free for all students</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card-hover rounded-2xl p-6 space-y-4"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color === "primary" ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto glass-card rounded-3xl p-8 md:p-12 text-center space-y-6 gradient-border"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            আজই শুরু করো তোমার <span className="gradient-text">AI Learning Journey</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            BRO MATHOD Ai তোমাকে দেবে একজন world-class private tutor এর সমান সুবিধা — সম্পূর্ণ বিনামূল্যে। NCTB কারিকুলামের ক্লাস ১-১২ এর সকল বিষয়ে সাহায্য পাও।
          </p>
          <Button variant="glow" size="lg" onClick={() => navigate("/signup")} className="rounded-xl gap-2 text-base px-8">
            <Users className="w-4 h-4" /> ফ্রি অ্যাকাউন্ট তৈরি করো
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="font-display text-sm font-semibold gradient-text">BRO MATHOD Ai</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 BRO MATHOD Ai. সকল শিক্ষার্থীদের জন্য সম্পূর্ণ ফ্রি।</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
