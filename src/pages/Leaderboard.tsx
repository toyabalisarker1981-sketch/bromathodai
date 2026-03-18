import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Star, Flame, Crown, TrendingUp, Target, X, Mail, UserPlus, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  xp: number;
  level: number;
  streak_days: number;
  student_class: number | null;
  email?: string | null;
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
  const [myClass, setMyClass] = useState<number | null>(null);
  const [filterClass, setFilterClass] = useState<"all" | "myclass">("myclass");
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [examCount, setExamCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("student_class").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.student_class) setMyClass(data.student_class);
      });
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [user, myClass, filterClass]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, xp, level, streak_days, student_class, email")
      .order("xp", { ascending: false })
      .limit(50);

    if (filterClass === "myclass" && myClass) {
      query = query.eq("student_class", myClass);
    }

    const { data } = await query;
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

  const openProfile = async (entry: LeaderboardEntry) => {
    setSelectedUser(entry);
    // Fetch exam count
    const { count } = await supabase.from("exam_results").select("*", { count: "exact", head: true }).eq("user_id", entry.user_id);
    setExamCount(count || 0);
  };

  const sendFriendRequest = async (toUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friend_requests").insert({ from_user_id: user.id, to_user_id: toUserId });
    if (error) {
      toast({ title: "রিকোয়েস্ট পাঠানো ব্যর্থ", variant: "destructive" });
    } else {
      toast({ title: "Friend Request পাঠানো হয়েছে! ✅" });
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-primary" /> লিডারবোর্ড</h1>
        <p className="text-sm text-muted-foreground mt-1">সেরা স্টুডেন্টদের র‍্যাংকিং 🏆</p>
      </motion.div>

      {/* Class filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilterClass("myclass")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterClass === "myclass" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
          {myClass ? `ক্লাস ${myClass}` : "আমার ক্লাস"}
        </button>
        <button onClick={() => setFilterClass("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterClass === "all" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
          সবাই
        </button>
      </div>

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
                onClick={() => openProfile(entry)}
                className={`glass-card rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors ${isMe ? "border-primary/30 bg-primary/5" : ""} ${rank <= 3 ? "border-yellow-500/20" : ""}`}>
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

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">প্রোফাইল</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-muted/30"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl font-bold mx-auto">
                  {(selectedUser.full_name || "S")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-display font-bold text-lg">{selectedUser.full_name || "Student"}</p>
                  <p className={`text-sm font-medium ${getLevelTitle(selectedUser.level).color}`}>
                    {getLevelTitle(selectedUser.level).title}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-center">
                  <p className="text-lg font-bold text-primary">{selectedUser.xp}</p>
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-lg font-bold">{examCount}</p>
                  <p className="text-[10px] text-muted-foreground">পরীক্ষা</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-lg font-bold">{selectedUser.streak_days}</p>
                  <p className="text-[10px] text-muted-foreground">স্ট্রিক</p>
                </div>
              </div>

              {selectedUser.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-xl bg-muted/20">
                  <Mail className="w-4 h-4" /> {selectedUser.email}
                </div>
              )}

              {selectedUser.student_class && (
                <p className="text-sm text-muted-foreground text-center">ক্লাস: {selectedUser.student_class}</p>
              )}

              {selectedUser.user_id !== user?.id && (
                <div className="flex gap-2">
                  <Button className="flex-1 rounded-xl gap-1" onClick={() => sendFriendRequest(selectedUser.user_id)}>
                    <UserPlus className="w-4 h-4" /> বন্ধু যোগ করো
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaderboard;
