import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Star, Flame, Crown, TrendingUp, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  xp: number;
  level: number;
  streak_days: number;
}

const getLevelTitle = (level: number) => {
  if (level >= 20) return { title: "Top Performer 🏆", color: "text-yellow-400" };
  if (level >= 10) return { title: "Advanced 🔥", color: "text-orange-400" };
  if (level >= 5) return { title: "Intermediate ⭐", color: "text-blue-400" };
  return { title: "Beginner 🌱", color: "text-emerald-400" };
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
};

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myProfile, setMyProfile] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, xp, level, streak_days")
        .order("xp", { ascending: false })
        .limit(50);
      if (data) {
        setEntries(data as LeaderboardEntry[]);
        if (user) {
          const rank = data.findIndex(e => e.user_id === user.id);
          if (rank !== -1) {
            setMyRank(rank + 1);
            setMyProfile(data[rank] as LeaderboardEntry);
          }
        }
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, [user]);

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-primary" /> লিডারবোর্ড</h1>
        <p className="text-sm text-muted-foreground mt-1">সেরা স্টুডেন্টদের র‍্যাংকিং 🏆</p>
      </motion.div>

      {/* My Rank */}
      {myProfile && myRank && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl font-bold text-primary">
              #{myRank}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold">{myProfile.full_name || "তুমি"}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-primary" /> {myProfile.xp} XP</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> লেভেল {myProfile.level}</span>
                <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {myProfile.streak_days} দিন</span>
              </div>
              <p className={`text-xs mt-1 font-medium ${getLevelTitle(myProfile.level).color}`}>
                {getLevelTitle(myProfile.level).title}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Level System */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-3">লেভেল সিস্টেম</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { title: "Beginner 🌱", range: "লেভেল ১-৪", color: "from-emerald-500/20 to-green-500/20" },
            { title: "Intermediate ⭐", range: "লেভেল ৫-৯", color: "from-blue-500/20 to-indigo-500/20" },
            { title: "Advanced 🔥", range: "লেভেল ১০-১৯", color: "from-orange-500/20 to-red-500/20" },
            { title: "Top Performer 🏆", range: "লেভেল ২০+", color: "from-yellow-500/20 to-amber-500/20" },
          ].map((l, i) => (
            <div key={i} className={`p-3 rounded-xl bg-gradient-to-br ${l.color} text-center`}>
              <p className="text-xs font-bold">{l.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{l.range}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Leaderboard List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
        <h3 className="text-sm font-semibold">Top Students</h3>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : entries.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">এখনো কোনো ডাটা নেই</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = entry.user_id === user?.id;
            return (
              <motion.div key={entry.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className={`glass-card rounded-xl p-4 flex items-center gap-3 ${isMe ? "border-primary/30 bg-primary/5" : ""} ${rank <= 3 ? "border-yellow-500/20" : ""}`}>
                <div className="flex-shrink-0">{getRankIcon(rank)}</div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center text-xs font-bold">
                  {(entry.full_name || "S")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{entry.full_name || "Student"} {isMe && <span className="text-xs text-primary">(তুমি)</span>}</p>
                  <p className={`text-[10px] font-medium ${getLevelTitle(entry.level).color}`}>{getLevelTitle(entry.level).title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{entry.xp} XP</p>
                  <p className="text-[10px] text-muted-foreground">লেভেল {entry.level}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
};

export default Leaderboard;
