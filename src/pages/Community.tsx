import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Search, Check, X, Crown, Plus, MessageSquare, Trophy, Swords, Loader2, ArrowLeft, ClipboardList, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Tab = "friends" | "groups" | "exams";

interface FriendProfile { user_id: string; full_name: string | null; xp: number; level: number; }
interface FriendRequest { id: string; from_user_id: string; to_user_id: string; status: string; created_at: string; }
interface Group { id: string; name: string; description: string | null; created_by: string; created_at: string; member_count?: number; }

const Community = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(FriendRequest & { profile?: FriendProfile })[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) { fetchFriends(); fetchGroups(); fetchRequests(); } }, [user]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("friends").select("*").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (data) {
      const friendIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, xp, level").in("user_id", friendIds);
        setFriends((profiles || []) as FriendProfile[]);
      } else setFriends([]);
    }
    setLoading(false);
  };

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase.from("friend_requests").select("*").eq("to_user_id", user.id).eq("status", "pending");
    if (data && data.length > 0) {
      const fromIds = data.map(r => r.from_user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, xp, level").in("user_id", fromIds);
      setPendingRequests(data.map(r => ({ ...r, profile: (profiles || []).find((p: any) => p.user_id === r.from_user_id) as FriendProfile | undefined })));
    } else setPendingRequests([]);
  };

  const fetchGroups = async () => {
    if (!user) return;
    const { data: memberData } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    const groupIds = memberData?.map(m => m.group_id) || [];
    const { data: createdGroups } = await supabase.from("groups").select("*").eq("created_by", user.id);
    const allIds = [...new Set([...groupIds, ...(createdGroups || []).map(g => g.id)])];
    if (allIds.length > 0) {
      const { data } = await supabase.from("groups").select("*").in("id", allIds);
      setGroups((data || []) as Group[]);
    } else setGroups([]);
  };

  const sendFriendRequest = async () => {
    if (!searchEmail.trim() || !user) return;
    setSearching(true);
    // Find user by email via profiles (we can't query auth.users)
    // So we search by full_name or ask for user_id. Let's search profiles.
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").limit(10);
    // Since we can't search by email in profiles, let's just try to send
    toast({ title: "ইমেইল দিয়ে সার্চ করতে পারছি না", description: "বন্ধুর ইউজার আইডি দিয়ে খুঁজো", variant: "destructive" });
    setSearching(false);
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    if (!user) return;
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    await supabase.from("friends").insert([
      { user_id: user.id, friend_id: fromUserId },
      { user_id: fromUserId, friend_id: user.id },
    ]);
    toast({ title: "বন্ধু যোগ হয়েছে! 🎉" });
    fetchFriends();
    fetchRequests();
  };

  const handleRejectRequest = async (requestId: string) => {
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
    fetchRequests();
  };

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    const { data, error } = await supabase.from("groups").insert({ name: groupName, description: groupDesc || null, created_by: user.id }).select().single();
    if (error) { toast({ title: "গ্রুপ তৈরি ব্যর্থ", variant: "destructive" }); return; }
    // Add creator as member
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id, role: "admin" });
    toast({ title: "গ্রুপ তৈরি হয়েছে! 🎉" });
    setShowCreateGroup(false);
    setGroupName("");
    setGroupDesc("");
    fetchGroups();
  };

  const tabs = [
    { id: "friends" as Tab, label: "বন্ধুরা", icon: Users, count: friends.length },
    { id: "groups" as Tab, label: "গ্রুপ", icon: Crown, count: groups.length },
    { id: "exams" as Tab, label: "পরীক্ষা", icon: ClipboardList },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> কমিউনিটি</h1>
        <p className="text-sm text-muted-foreground mt-1">বন্ধুদের সাথে একসাথে পড়ো ও পরীক্ষা দাও 🤝</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.count !== undefined && <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-md">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {tab === "friends" && (
        <div className="space-y-4">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> ফ্রেন্ড রিকোয়েস্ট ({pendingRequests.length})</h3>
              {pendingRequests.map(req => (
                <div key={req.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className="text-sm font-semibold">{req.profile?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">লেভেল {req.profile?.level || 1}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="glow" className="rounded-lg gap-1" onClick={() => handleAcceptRequest(req.id, req.from_user_id)}><Check className="w-3 h-3" /> Accept</Button>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleRejectRequest(req.id)}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">বন্ধু খুঁজো</h3>
            <div className="flex gap-2">
              <input type="text" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="বন্ধুর নাম বা ইমেইল..."
                className="flex-1 bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
              <Button variant="glow" className="rounded-xl gap-1" onClick={sendFriendRequest} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} খুঁজো
              </Button>
            </div>
          </div>

          {/* Friends List */}
          {friends.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">এখনো কোনো বন্ধু নেই। বন্ধুদের খুঁজে যোগ করো!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friends.map(f => (
                <div key={f.user_id} className="glass-card-hover rounded-xl p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{f.full_name || "Student"}</p>
                    <p className="text-xs text-muted-foreground">লেভেল {f.level} · {f.xp} XP</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg"><Swords className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Groups Tab */}
      {tab === "groups" && (
        <div className="space-y-4">
          <Button variant="glow" className="rounded-xl gap-2" onClick={() => setShowCreateGroup(true)}><Plus className="w-4 h-4" /> নতুন গ্রুপ তৈরি করো</Button>

          {showCreateGroup && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold">নতুন গ্রুপ</h3>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="গ্রুপের নাম..."
                className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
              <input type="text" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="গ্রুপের বিবরণ (ঐচ্ছিক)"
                className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
              <div className="flex gap-2">
                <Button variant="glow" className="rounded-xl flex-1" onClick={createGroup} disabled={!groupName.trim()}>তৈরি করো</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setShowCreateGroup(false)}>বাতিল</Button>
              </div>
            </motion.div>
          )}

          {groups.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Crown className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">এখনো কোনো গ্রুপ নেই। একটি গ্রুপ তৈরি করো!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map(g => (
                <div key={g.id} className="glass-card-hover rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{g.name}</p>
                      {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg flex-1 gap-1"><Users className="w-3 h-3" /> সদস্যরা</Button>
                    <Button size="sm" variant="glow" className="rounded-lg flex-1 gap-1"><ClipboardList className="w-3 h-3" /> পরীক্ষা</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exams Tab */}
      {tab === "exams" && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-8 text-center">
            <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-display font-semibold">কমিউনিটি পরীক্ষা</h3>
            <p className="text-sm text-muted-foreground mt-1">গ্রুপ বা বন্ধুদের সাথে একসাথে পরীক্ষা দাও!</p>
            <p className="text-xs text-muted-foreground mt-2">প্রথমে একটি গ্রুপ তৈরি করো, তারপর গ্রুপে পরীক্ষা তৈরি করো।</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
