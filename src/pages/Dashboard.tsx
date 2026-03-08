import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap, BookOpen, Brain, Trophy, Target, Clock, Flame, Star,
  MessageSquare, FileText, Calculator, Lightbulb, GraduationCap,
  TrendingUp, Calendar
} from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  full_name: string | null;
  xp: number;
  level: number;
  streak_days: number;
  student_class: number | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, xp, level, streak_days, student_class")
        .eq("user_id", user.id)
        .single();
      if (p) setProfile(p as Profile);

      const { count } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setNotesCount(count ?? 0);
    };
    fetchData();
  }, [user]);

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const nextLevelXp = level * 500;
  const xpProgress = Math.min((xp / nextLevelXp) * 100, 100);
  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Student";

  const quickActions = [
    { label: "AI টিউটর", desc: "যেকোনো প্রশ্ন করো", icon: MessageSquare, path: "/chat", color: "primary" },
    { label: "নোটবুক", desc: "নোটস তৈরি করো", icon: BookOpen, path: "/notebook", color: "secondary" },
    { label: "কুইজ", desc: "জ্ঞান পরীক্ষা করো", icon: Brain, path: "/quiz", color: "primary" },
    { label: "ফর্মুলা শীট", desc: "সূত্র দেখো", icon: Calculator, path: "/chat", color: "secondary" },
  ];

  const studyTips = [
    "📖 প্রতিদিন অন্তত ৩০ মিনিট পড়াশোনা করো",
    "🧠 কঠিন বিষয় AI টিউটরকে জিজ্ঞেস করো",
    "📝 নোটস তৈরি করে রাখো — পরে রিভিশনে কাজে আসবে",
    "🎯 কুইজ দিয়ে নিজেকে যাচাই করো",
  ];

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">
          স্বাগতম, <span className="gradient-text">{displayName}</span> 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          {profile?.student_class ? `ক্লাস ${profile.student_class} · ` : ""}তোমার শেখার যাত্রা চালিয়ে যাও!
        </p>
      </motion.div>

      {/* XP Progress Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold">লেভেল {level}</span>
          </div>
          <span className="text-sm text-muted-foreground">{xp} / {nextLevelXp} XP</span>
        </div>
        <Progress value={xpProgress} className="h-2.5 bg-muted" />
        <p className="text-xs text-muted-foreground mt-2">{nextLevelXp - xp} XP দরকার লেভেল {level + 1} এ পৌঁছাতে</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <BentoCard title="মোট XP" value={xp.toLocaleString()} icon={Zap} delay={0.15} subtitle="চালিয়ে যাও!" />
        <BentoCard title="নোটস" value={notesCount} icon={BookOpen} delay={0.2} subtitle="তৈরি করা হয়েছে" />
        <BentoCard title="স্ট্রিক" value={`${profile?.streak_days ?? 0} দিন`} icon={Flame} delay={0.25} glowColor="indigo" subtitle="ধারাবাহিকতা বজায় রাখো" />
        <BentoCard title="লেভেল" value={level} icon={GraduationCap} delay={0.3} glowColor="indigo" subtitle="আরো উপরে যাও!" />
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-3">
        <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
          <Lightbulb className="w-4 h-4 text-primary" /> দ্রুত অ্যাক্সেস
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => navigate(action.path)}
              className="glass-card-hover rounded-2xl p-4 cursor-pointer text-center space-y-2"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto ${
                action.color === "primary" ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"
              }`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{action.label}</h3>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Study Tips & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> আজকের টিপস
          </h2>
          {studyTips.map((tip, i) => (
            <div key={i} className="py-2 border-b border-border/30 last:border-0">
              <p className="text-sm">{tip}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-secondary" /> অ্যাচিভমেন্টস
          </h2>
          {[
            { label: "নোট মাস্টার", desc: "১০টি নোটস তৈরি করো", progress: Math.min((notesCount / 10) * 100, 100), icon: FileText },
            { label: "রাইজিং স্টার", desc: `লেভেল ${level > 5 ? "✓" : "5 এ পৌঁছাও"}`, progress: Math.min((level / 5) * 100, 100), icon: Star },
            { label: "স্ট্রিক চ্যাম্পিয়ন", desc: "৭ দিন ধারাবাহিক", progress: Math.min(((profile?.streak_days ?? 0) / 7) * 100, 100), icon: Flame },
          ].map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(item.progress)}%</span>
              </div>
              <Progress value={item.progress} className="h-1.5 bg-muted" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
