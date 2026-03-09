import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap, BookOpen, Brain, Trophy, Target, Flame, Star,
  MessageSquare, FileText, Calculator, Lightbulb, GraduationCap,
  TrendingUp, Library, Settings, Sparkles, ArrowRight
} from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { Progress } from "@/components/ui/progress";
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
  const [libraryCount, setLibraryCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: p }, { count: nc }, { count: lc }] = await Promise.all([
        supabase.from("profiles").select("full_name, xp, level, streak_days, student_class").eq("user_id", user.id).single(),
        supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("library_items").select("*", { count: "exact", head: true }),
      ]);
      if (p) setProfile(p as Profile);
      setNotesCount(nc ?? 0);
      setLibraryCount(lc ?? 0);
    };
    fetchData();
  }, [user]);

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const nextLevelXp = level * 500;
  const xpProgress = Math.min((xp / nextLevelXp) * 100, 100);
  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Student";

  const allFeatures = [
    { label: "🤖 AI টিউটর", desc: "যেকোনো প্রশ্ন করো — বন্ধুর মতো বোঝাবে", icon: MessageSquare, path: "/chat", gradient: "from-emerald-500/20 to-teal-500/20" },
    { label: "📝 নোটবুক AI", desc: "PDF আপলোড করো — AI নোট তৈরি করবে", icon: BookOpen, path: "/notebook", gradient: "from-blue-500/20 to-indigo-500/20" },
    { label: "🎯 কুইজ ইঞ্জিন", desc: "NCTB সিলেবাস অনুযায়ী AI কুইজ", icon: Brain, path: "/quiz", gradient: "from-purple-500/20 to-pink-500/20" },
    { label: "📚 লাইব্রেরী", desc: `${libraryCount}টি বই ও গাইড পড়ো ফ্রিতে`, icon: Library, path: "/library", gradient: "from-amber-500/20 to-orange-500/20" },
    { label: "📐 ফর্মুলা শীট", desc: "সকল সূত্র এক জায়গায়", icon: Calculator, path: "/chat", gradient: "from-cyan-500/20 to-sky-500/20" },
    { label: "⚙️ সেটিংস", desc: "প্রোফাইল ও পছন্দ পরিবর্তন", icon: Settings, path: "/settings", gradient: "from-gray-500/20 to-slate-500/20" },
  ];

  const studyTips = [
    "📖 প্রতিদিন অন্তত ৩০ মিনিট পড়াশোনা করো",
    "🧠 কঠিন বিষয় AI টিউটরকে জিজ্ঞেস করো",
    "📝 PDF আপলোড করে AI নোটস তৈরি করো",
    "🎯 কুইজ দিয়ে নিজেকে যাচাই করো",
    "📚 লাইব্রেরী থেকে ফ্রি বই পড়ো",
  ];

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">
          স্বাগতম, <span className="gradient-text">{displayName}</span> 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          {profile?.student_class ? `ক্লাস ${profile.student_class} · ` : ""}তোমার শেখার যাত্রা চালিয়ে যাও!
        </p>
      </motion.div>

      {/* XP + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">লেভেল {level}</span>
            </div>
            <span className="text-sm text-muted-foreground">{xp} / {nextLevelXp} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2.5 bg-muted" />
          <p className="text-xs text-muted-foreground mt-2">{nextLevelXp - xp} XP দরকার পরের লেভেলে যেতে</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <BentoCard title="স্ট্রিক" value={`${profile?.streak_days ?? 0} দিন`} icon={Flame} delay={0.15} glowColor="indigo" subtitle="ধারাবাহিকতা" />
          <BentoCard title="নোটস" value={notesCount} icon={FileText} delay={0.2} subtitle="তৈরি হয়েছে" />
        </div>
      </div>

      {/* All Features Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-3">
        <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-primary" /> সকল ফিচার
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {allFeatures.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => navigate(feature.path)}
              className="glass-card-hover rounded-2xl p-4 cursor-pointer group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3`}>
                <feature.icon className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold">{feature.label}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{feature.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                খোলো <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tips & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" /> আজকের টিপস
          </h2>
          {studyTips.map((tip, i) => (
            <div key={i} className="py-2 border-b border-border/30 last:border-0">
              <p className="text-sm">{tip}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
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
