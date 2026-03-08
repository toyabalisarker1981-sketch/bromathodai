import { motion } from "framer-motion";
import { Zap, BookOpen, Brain, Trophy, Target, Clock, Flame, Star } from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold">
          Welcome back, <span className="gradient-text">Student</span> 👋
        </h1>
        <p className="text-muted-foreground text-sm">Continue your learning journey. You're doing great!</p>
      </motion.div>

      {/* XP Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold">Level 5</span>
          </div>
          <span className="text-sm text-muted-foreground">1,250 / 2,000 XP</span>
        </div>
        <Progress value={62.5} className="h-2.5 bg-muted" />
        <p className="text-xs text-muted-foreground mt-2">750 XP to reach Level 6</p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <BentoCard title="Total XP" value="1,250" icon={Zap} delay={0.15} subtitle="Keep going!" />
        <BentoCard title="Quizzes" value={23} icon={Brain} delay={0.2} glowColor="indigo" subtitle="8 this week" />
        <BentoCard title="Notes" value={15} icon={BookOpen} delay={0.25} subtitle="3 new today" />
        <BentoCard title="Streak" value="7 days" icon={Flame} delay={0.3} glowColor="indigo" subtitle="Best: 12 days" />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-5 space-y-4"
        >
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Recent Activity
          </h2>
          {[
            { text: "Completed Physics Quiz - Mechanics", xp: "+50 XP", time: "2h ago" },
            { text: "Generated Notes from YouTube", xp: "+20 XP", time: "5h ago" },
            { text: "AI Chat - Algebra Help", xp: "+10 XP", time: "Yesterday" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <div>
                <p className="text-sm font-medium">{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
              <span className="text-xs font-semibold text-primary">{item.xp}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-5 space-y-4"
        >
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-secondary" /> Achievements
          </h2>
          {[
            { label: "Quiz Master", desc: "Complete 20 quizzes", progress: 92, icon: Target },
            { label: "Note Taker", desc: "Generate 10 notes", progress: 70, icon: BookOpen },
            { label: "Rising Star", desc: "Reach Level 5", progress: 100, icon: Star },
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
                <span className="text-xs text-muted-foreground">{item.progress}%</span>
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
