import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Search, Check, X, Crown, Plus, Swords, Loader2, Mail, MessageCircle, Send, ArrowLeft, Trash2, Bell, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type MainView = "chats" | "requests" | "groups" | "search";

interface FriendProfile { user_id: string; full_name: string | null; xp: number; level: number; email?: string | null; student_class?: number | null; }
interface FriendRequest { id: string; from_user_id: string; to_user_id: string; status: string; created_at: string; }
interface Group { id: string; name: string; description: string | null; created_by: string; created_at: string; }
interface Message { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; read: boolean; }
interface ChatPreview { friend: FriendProfile; lastMessage?: Message; unreadCount: number; }
interface Challenge { id: string; challenger_id: string; challenged_id: string; subject: string; topic: string | null; question_count: number; questions: any; status: string; challenger_score: number | null; challenged_score: number | null; created_at: string; }

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

const Community = () => {
  const { user } = useAuth();
  const [view, setView] = useState<MainView>("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [loading, setLoading] = useState(true);

  // Chat state
  const [activeChatFriend, setActiveChatFriend] = useState<FriendProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Challenge state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeSubject, setChallengeSubject] = useState("");
  const [challengeTopic, setChallengeTopic] = useState("");
  const [challengeCount, setChallengeCount] = useState(10);
  const [sendingChallenge, setSendingChallenge] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState<(Challenge & { profile?: FriendProfile })[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challengeQuestions, setChallengeQuestions] = useState<any[]>([]);
  const [challengeAnswers, setChallengeAnswers] = useState<(number | null)[]>([]);
  const [challengeCurrentQ, setChallengeCurrentQ] = useState(0);
  const [challengeMode, setChallengeMode] = useState<"idle" | "taking" | "result">("idle");

  // Group invite state
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<{ [gid: string]: FriendProfile[] }>({});

  useEffect(() => {
    if (user) {
      supabase.from("profiles").update({ email: user.email }).eq("user_id", user.id);
      fetchAll();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('community-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          if (activeChatFriend && (msg.sender_id === activeChatFriend.user_id || msg.receiver_id === activeChatFriend.user_id)) {
            setMessages(prev => [...prev, msg]);
            if (msg.receiver_id === user.id) {
              supabase.from("messages").update({ read: true }).eq("id", msg.id);
            }
          }
          loadChatPreviews();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => {
        fetchChallenges();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeChatFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchGroups(), loadChatPreviews(), fetchChallenges()]);
    setLoading(false);
  };

  const fetchFriends = async () => {
    if (!user) return;
    const { data } = await supabase.from("friends").select("*").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (data) {
      const friendIds = [...new Set(data.map(f => f.user_id === user.id ? f.friend_id : f.user_id))];
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, xp, level, email, student_class").in("user_id", friendIds);
        setFriends((profiles || []) as FriendProfile[]);
      } else setFriends([]);
    }
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

  const fetchChallenges = async () => {
    if (!user) return;
    const { data } = await supabase.from("challenges").select("*")
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      const otherIds = data.map(c => c.challenger_id === user.id ? c.challenged_id : c.challenger_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, xp, level, email").in("user_id", otherIds);
      setPendingChallenges(data.map(c => ({
        ...c as Challenge,
        profile: (profiles || []).find((p: any) => p.user_id === (c.challenger_id === user.id ? c.challenged_id : c.challenger_id)) as FriendProfile | undefined,
      })));
    } else setPendingChallenges([]);
  };

  const loadChatPreviews = async () => {
    if (!user) return;
    const { data: friendData } = await supabase.from("friends").select("*").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (!friendData || friendData.length === 0) { setChatPreviews([]); return; }
    const friendIds = [...new Set(friendData.map(f => f.user_id === user.id ? f.friend_id : f.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, xp, level, email, student_class").in("user_id", friendIds);
    const previews: ChatPreview[] = [];
    for (const fId of friendIds) {
      const profile = (profiles || []).find((p: any) => p.user_id === fId) as FriendProfile | undefined;
      if (!profile) continue;
      const { data: lastMsg } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${fId}),and(sender_id.eq.${fId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: false }).limit(1);
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true })
        .eq("sender_id", fId).eq("receiver_id", user.id).eq("read", false);
      previews.push({ friend: profile, lastMessage: lastMsg?.[0] as Message | undefined, unreadCount: count || 0 });
    }
    previews.sort((a, b) => (b.lastMessage?.created_at || "0").localeCompare(a.lastMessage?.created_at || "0"));
    setChatPreviews(previews);
  };

  const openChat = async (friend: FriendProfile) => {
    if (!user) return;
    setActiveChatFriend(friend);
    setChallengeMode("idle");
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.user_id}),and(sender_id.eq.${friend.user_id},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true }).limit(200);
    setMessages((data || []) as Message[]);
    await supabase.from("messages").update({ read: true }).eq("sender_id", friend.user_id).eq("receiver_id", user.id).eq("read", false);
    loadChatPreviews();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !activeChatFriend) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: activeChatFriend.user_id, content: newMessage.trim() });
    if (!error) setNewMessage("");
    setSendingMessage(false);
  };

  const searchFriend = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    setSearchResults([]);
    const q = searchQuery.trim().toLowerCase();
    const { data: byEmail } = await supabase.from("profiles").select("user_id, full_name, xp, level, email, student_class").ilike("email", `%${q}%`).neq("user_id", user.id).limit(10);
    const { data: byName } = await supabase.from("profiles").select("user_id, full_name, xp, level, email, student_class").ilike("full_name", `%${q}%`).neq("user_id", user.id).limit(10);
    const allResults = [...(byEmail || []), ...(byName || [])];
    const unique = Array.from(new Map(allResults.map(r => [r.user_id, r])).values());
    if (unique.length === 0) toast({ title: "কোনো ইউজার পাওয়া যায়নি", variant: "destructive" });
    setSearchResults(unique as FriendProfile[]);
    setSearching(false);
  };

  const addFriendDirectly = async (toUserId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("friends").select("id").or(`and(user_id.eq.${user.id},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${user.id})`);
    if (existing && existing.length > 0) { toast({ title: "ইতোমধ্যে বন্ধু!" }); return; }
    const { error } = await supabase.from("friends").insert({ user_id: user.id, friend_id: toUserId });
    if (error) { toast({ title: "বন্ধু যোগ ব্যর্থ", variant: "destructive" }); return; }
    toast({ title: "বন্ধু যোগ হয়েছে! 🎉" });
    setSearchResults(prev => prev.filter(r => r.user_id !== toUserId));
    fetchAll();
  };

  const deleteGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId);
    await supabase.from("groups").delete().eq("id", groupId);
    toast({ title: "গ্রুপ মুছে ফেলা হয়েছে" });
    fetchGroups();
  };

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    const { data, error } = await supabase.from("groups").insert({ name: groupName, description: groupDesc || null, created_by: user.id }).select().single();
    if (error) { toast({ title: "গ্রুপ তৈরি ব্যর্থ", variant: "destructive" }); return; }
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id, role: "admin" });
    toast({ title: "গ্রুপ তৈরি হয়েছে! 🎉" });
    setShowCreateGroup(false); setGroupName(""); setGroupDesc("");
    fetchGroups();
  };

  const inviteFriendToGroup = async (groupId: string, friendId: string) => {
    if (!user) return;
    // Check if already a member
    const { data: existing } = await supabase.from("group_members").select("id").eq("group_id", groupId).eq("user_id", friendId);
    if (existing && existing.length > 0) { toast({ title: "ইতোমধ্যে সদস্য!" }); return; }
    // Add directly as member
    await supabase.from("group_members").insert({ group_id: groupId, user_id: friendId, role: "member" });
    toast({ title: "বন্ধু গ্রুপে যুক্ত হয়েছে! ✅" });
    setShowInviteModal(null);
    fetchGroupMembers(groupId);
  };

  const fetchGroupMembers = async (groupId: string) => {
    const { data } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
    if (data && data.length > 0) {
      const ids = data.map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, xp, level, email").in("user_id", ids);
      setGroupMembers(prev => ({ ...prev, [groupId]: (profiles || []) as FriendProfile[] }));
    }
  };

  // 1v1 Challenge functions
  const sendChallenge = async () => {
    if (!user || !activeChatFriend || !challengeSubject.trim()) return;
    setSendingChallenge(true);
    try {
      // Generate questions first
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ subject: challengeSubject, topic: challengeTopic || undefined, questionCount: challengeCount, classLevel: activeChatFriend.student_class?.toString() || "10" }),
      });
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      if (!data.questions?.length) throw new Error("No questions");

      const { error } = await supabase.from("challenges").insert({
        challenger_id: user.id,
        challenged_id: activeChatFriend.user_id,
        subject: challengeSubject,
        topic: challengeTopic || null,
        question_count: challengeCount,
        questions: data.questions,
        status: "pending",
      });
      if (error) throw error;

      toast({ title: "চ্যালেঞ্জ পাঠানো হয়েছে! ⚔️" });
      setShowChallengeModal(false);
      setChallengeSubject(""); setChallengeTopic("");
      fetchChallenges();
    } catch (e) {
      toast({ title: "চ্যালেঞ্জ পাঠানো ব্যর্থ", variant: "destructive" });
    }
    setSendingChallenge(false);
  };

  const acceptChallenge = async (challenge: Challenge) => {
    if (!user) return;
    setActiveChallenge(challenge);
    setChallengeQuestions(challenge.questions as any[]);
    setChallengeAnswers(new Array((challenge.questions as any[]).length).fill(null));
    setChallengeCurrentQ(0);
    setChallengeMode("taking");
    // Mark as active
    await supabase.from("challenges").update({ status: "active" }).eq("id", challenge.id);
  };

  const submitChallengeAnswer = (qIndex: number, optIndex: number) => {
    const newAnswers = [...challengeAnswers];
    newAnswers[qIndex] = optIndex;
    setChallengeAnswers(newAnswers);
  };

  const finishChallenge = async () => {
    if (!user || !activeChallenge) return;
    const score = challengeAnswers.filter((a, i) => a === challengeQuestions[i]?.correctIndex).length;
    const isChallenger = activeChallenge.challenger_id === user.id;

    await supabase.from("challenges").update({
      ...(isChallenger ? { challenger_answers: challengeAnswers, challenger_score: score } : { challenged_answers: challengeAnswers, challenged_score: score }),
      status: isChallenger
        ? (activeChallenge.challenged_score !== null ? "completed" : "active")
        : (activeChallenge.challenger_score !== null ? "completed" : "active"),
      completed_at: (isChallenger ? activeChallenge.challenged_score !== null : activeChallenge.challenger_score !== null) ? new Date().toISOString() : null,
    }).eq("id", activeChallenge.id);

    setChallengeMode("result");
    toast({ title: `তুমি ${score}/${challengeQuestions.length} পেয়েছো! 🎯` });
    fetchChallenges();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "এখনই";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}মি`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}ঘ`;
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
  };

  const totalUnread = chatPreviews.reduce((sum, c) => sum + c.unreadCount, 0);

  // Challenge taking mode
  if (challengeMode === "taking" && challengeQuestions.length > 0) {
    const q = challengeQuestions[challengeCurrentQ];
    const answered = challengeAnswers.filter(a => a !== null).length;
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { setChallengeMode("idle"); setActiveChallenge(null); }} className="p-2 rounded-lg hover:bg-muted/30"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <p className="text-sm font-semibold">⚔️ চ্যালেঞ্জ</p>
              <p className="text-xs text-muted-foreground">{activeChallenge?.subject} · {answered}/{challengeQuestions.length}</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(answered / challengeQuestions.length) * 100}%` }} />
        </div>
        <motion.div key={challengeCurrentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-2">প্রশ্ন {challengeCurrentQ + 1}/{challengeQuestions.length}</p>
          <h2 className="text-base font-semibold leading-relaxed">{q.question}</h2>
        </motion.div>
        <div className="space-y-2">
          {q.options.map((opt: string, i: number) => (
            <button key={i} onClick={() => submitChallengeAnswer(challengeCurrentQ, i)}
              className={`w-full text-left p-4 rounded-xl text-sm font-medium transition-all ${
                challengeAnswers[challengeCurrentQ] === i ? "bg-primary/15 border border-primary/40 text-primary" : "glass-card hover:border-primary/20"
              }`}>
              <span className="mr-3 text-muted-foreground">{String.fromCharCode(2453 + i)}.</span>{opt}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {challengeCurrentQ > 0 && (
            <Button variant="outline" className="rounded-xl" onClick={() => setChallengeCurrentQ(p => p - 1)}>← আগের</Button>
          )}
          {challengeCurrentQ < challengeQuestions.length - 1 ? (
            <Button variant="glow" className="flex-1 rounded-xl" onClick={() => setChallengeCurrentQ(p => p + 1)}
              disabled={challengeAnswers[challengeCurrentQ] === null}>পরের →</Button>
          ) : (
            <Button variant="glow" className="flex-1 rounded-xl" onClick={finishChallenge}>ফলাফল দেখো 🎯</Button>
          )}
        </div>
      </div>
    );
  }

  // Challenge result
  if (challengeMode === "result" && activeChallenge) {
    const myScore = challengeAnswers.filter((a, i) => a === challengeQuestions[i]?.correctIndex).length;
    const isChallenger = activeChallenge.challenger_id === user?.id;
    const opponentScore = isChallenger ? activeChallenge.challenged_score : activeChallenge.challenger_score;
    const opponentName = pendingChallenges.find(c => c.id === activeChallenge.id)?.profile?.full_name || "প্রতিপক্ষ";

    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-4">
          <Trophy className="w-14 h-14 text-primary mx-auto" />
          <h2 className="text-xl font-display font-bold">চ্যালেঞ্জ ফলাফল ⚔️</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/10">
              <p className="text-sm font-medium">তুমি</p>
              <p className="text-3xl font-bold text-primary">{myScore}</p>
              <p className="text-xs text-muted-foreground">/{challengeQuestions.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30">
              <p className="text-sm font-medium">{opponentName}</p>
              <p className="text-3xl font-bold">{opponentScore !== null ? opponentScore : "⏳"}</p>
              <p className="text-xs text-muted-foreground">{opponentScore !== null ? `/${challengeQuestions.length}` : "অপেক্ষমান"}</p>
            </div>
          </div>
          {opponentScore !== null && (
            <p className="text-lg font-bold">
              {myScore > opponentScore ? "🏆 তুমি জিতেছো!" : myScore < opponentScore ? "😔 প্রতিপক্ষ জিতেছে" : "🤝 ড্র!"}
            </p>
          )}
          {opponentScore === null && (
            <p className="text-sm text-muted-foreground">প্রতিপক্ষ এখনো পরীক্ষা দেয়নি। ফলাফল পরে দেখা যাবে।</p>
          )}
          <Button className="rounded-xl w-full" onClick={() => { setChallengeMode("idle"); setActiveChallenge(null); }}>
            ফিরে যাও
          </Button>
        </motion.div>
      </div>
    );
  }

  // Active Chat View
  if (activeChatFriend) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
        <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <Button variant="ghost" size="sm" className="rounded-full p-2" onClick={() => { setActiveChatFriend(null); loadChatPreviews(); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold">
            {(activeChatFriend.full_name || "S")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{activeChatFriend.full_name || "Student"}</p>
            <p className="text-xs text-muted-foreground">লেভেল {activeChatFriend.level} · {activeChatFriend.xp} XP</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg gap-1" onClick={() => setShowChallengeModal(true)}>
            <Swords className="w-4 h-4" /> চ্যালেঞ্জ
          </Button>
        </div>

        {/* Pending challenges banner */}
        {pendingChallenges.filter(c => c.challenged_id === user?.id && c.status === "pending" && (c.challenger_id === activeChatFriend.user_id || c.challenged_id === activeChatFriend.user_id)).map(c => (
          <div key={c.id} className="mx-3 mt-2 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">⚔️ চ্যালেঞ্জ আসছে!</p>
              <p className="text-xs text-muted-foreground">{c.subject} · {c.question_count}টি প্রশ্ন</p>
            </div>
            <Button size="sm" className="rounded-lg" onClick={() => acceptChallenge(c)}>Accept</Button>
          </div>
        ))}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>কথোপকথন শুরু করো! 👋</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="মেসেজ লিখো..."
              className="flex-1 bg-muted/30 rounded-full px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
            <Button className="rounded-full w-10 h-10 p-0" onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
              {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Challenge Modal */}
        <AnimatePresence>
          {showChallengeModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowChallengeModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold">⚔️ 1v1 চ্যালেঞ্জ</h3>
                  <button onClick={() => setShowChallengeModal(false)} className="p-1 rounded-lg hover:bg-muted/30"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-muted-foreground">{activeChatFriend.full_name} কে MCQ চ্যালেঞ্জ পাঠাও</p>
                <div className="space-y-3">
                  <input type="text" value={challengeSubject} onChange={e => setChallengeSubject(e.target.value)} placeholder="বিষয় (যেমন: গণিত) *"
                    className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 placeholder:text-muted-foreground" />
                  <input type="text" value={challengeTopic} onChange={e => setChallengeTopic(e.target.value)} placeholder="অধ্যায় (ঐচ্ছিক)"
                    className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 placeholder:text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">প্রশ্ন সংখ্যা</p>
                    <div className="flex gap-2">
                      {[5, 10, 15].map(c => (
                        <button key={c} onClick={() => setChallengeCount(c)}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold ${challengeCount === c ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="glow" className="w-full rounded-xl gap-2" onClick={sendChallenge} disabled={!challengeSubject.trim() || sendingChallenge}>
                  {sendingChallenge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  চ্যালেঞ্জ পাঠাও
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Main View
  const navItems = [
    { id: "chats" as MainView, label: "চ্যাট", icon: MessageCircle, badge: totalUnread },
    { id: "requests" as MainView, label: "চ্যালেঞ্জ", icon: Swords, badge: pendingChallenges.filter(c => c.challenged_id === user?.id && c.status === "pending").length },
    { id: "groups" as MainView, label: "গ্রুপ", icon: Crown, badge: groups.length },
    { id: "search" as MainView, label: "খুঁজো", icon: Search },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> কমিউনিটি</h1>
        <p className="text-sm text-muted-foreground mt-1">বন্ধুদের সাথে চ্যাট করো ও একসাথে পড়ো 🤝</p>
      </motion.div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {navItems.map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${view === t.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {t.badge ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${view === t.id ? "bg-primary-foreground/20" : "bg-primary/20 text-primary"}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Chats View */}
      {view === "chats" && (
        <div className="space-y-1">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : chatPreviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">কোনো চ্যাট নেই</p>
              <p className="text-xs text-muted-foreground mt-1">বন্ধু খুঁজে চ্যাট শুরু করো!</p>
              <Button className="mt-4 rounded-full gap-1" size="sm" onClick={() => setView("search")}><Search className="w-3.5 h-3.5" /> বন্ধু খুঁজো</Button>
            </div>
          ) : (
            chatPreviews.map(cp => (
              <button key={cp.friend.user_id} onClick={() => openChat(cp.friend)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors text-left">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold">
                    {(cp.friend.full_name || "S")[0].toUpperCase()}
                  </div>
                  {cp.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{cp.unreadCount}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${cp.unreadCount > 0 ? "font-bold" : "font-medium"}`}>{cp.friend.full_name || "Student"}</p>
                    {cp.lastMessage && <span className="text-[10px] text-muted-foreground">{formatTime(cp.lastMessage.created_at)}</span>}
                  </div>
                  <p className={`text-xs truncate ${cp.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {cp.lastMessage ? (cp.lastMessage.sender_id === user?.id ? `তুমি: ${cp.lastMessage.content}` : cp.lastMessage.content) : "কথোপকথন শুরু করো"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Requests View */}
      {view === "requests" && (
        <div className="space-y-4">
          {/* Incoming Challenges */}
          {pendingChallenges.filter(c => c.challenged_id === user?.id && c.status === "pending").length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> চ্যালেঞ্জ আসছে!</h3>
              {pendingChallenges.filter(c => c.challenged_id === user?.id && c.status === "pending").map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"><Swords className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className="text-sm font-semibold">{c.profile?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{c.subject} · {c.question_count}টি প্রশ্ন</p>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-lg gap-1 h-8" onClick={() => acceptChallenge(c)}><Swords className="w-3 h-3" /> Accept</Button>
                </div>
              ))}
            </div>
          )}

          {/* Incoming Friend Requests */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> প্রাপ্ত রিকোয়েস্ট ({pendingRequests.length})</h3>
            {pendingRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-4 text-center">কোনো নতুন রিকোয়েস্ট নেই</p>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold">
                      {(req.profile?.full_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{req.profile?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{req.profile?.email || `লেভেল ${req.profile?.level || 1}`}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="rounded-lg gap-1 h-8" onClick={() => handleAcceptRequest(req.id, req.from_user_id)}><Check className="w-3 h-3" /> Accept</Button>
                    <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => handleRejectRequest(req.id)}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Sent Requests */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Send className="w-4 h-4 text-muted-foreground" /> পাঠানো রিকোয়েস্ট ({sentRequests.length})</h3>
            {sentRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-4 text-center">কোনো পাঠানো রিকোয়েস্ট নেই</p>
            ) : (
              sentRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center text-sm font-bold">
                      {(req.profile?.full_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{req.profile?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">পেন্ডিং...</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-lg h-8 text-destructive" onClick={() => cancelSentRequest(req.id)}><X className="w-3 h-3" /> বাতিল</Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Groups View */}
      {view === "groups" && (
        <div className="space-y-4">
          <Button className="rounded-xl gap-2" size="sm" onClick={() => setShowCreateGroup(true)}><Plus className="w-4 h-4" /> নতুন গ্রুপ</Button>
          {showCreateGroup && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/20 rounded-2xl p-4 space-y-3 border border-border/30">
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="গ্রুপের নাম..."
                className="w-full bg-background rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 placeholder:text-muted-foreground" />
              <input type="text" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="বিবরণ (ঐচ্ছিক)"
                className="w-full bg-background rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 placeholder:text-muted-foreground" />
              <div className="flex gap-2">
                <Button className="rounded-xl flex-1" size="sm" onClick={createGroup} disabled={!groupName.trim()}>তৈরি করো</Button>
                <Button variant="outline" className="rounded-xl" size="sm" onClick={() => setShowCreateGroup(false)}>বাতিল</Button>
              </div>
            </motion.div>
          )}
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Crown className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">কোনো গ্রুপ নেই</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g.id} className="glass-card rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{g.name}</p>
                      {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                      {g.created_by === user?.id && <span className="text-[10px] text-primary font-medium">অ্যাডমিন</span>}
                    </div>
                    <div className="flex gap-1">
                      {g.created_by === user?.id && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1" onClick={() => { setShowInviteModal(g.id); fetchGroupMembers(g.id); }}>
                            <UserPlus className="w-3 h-3" /> ইনভাইট
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-lg text-destructive h-8" onClick={() => deleteGroup(g.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Group members */}
                  {groupMembers[g.id] && (
                    <div className="flex flex-wrap gap-1 ml-14">
                      {groupMembers[g.id].map(m => (
                        <span key={m.user_id} className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{m.full_name || "Student"}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Invite Modal */}
          <AnimatePresence>
            {showInviteModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(null)}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                  className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold">বন্ধু ইনভাইট করো</h3>
                    <button onClick={() => setShowInviteModal(null)} className="p-1 rounded-lg hover:bg-muted/30"><X className="w-4 h-4" /></button>
                  </div>
                  {friends.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">আগে বন্ধু যোগ করো</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {friends.map(f => {
                        const alreadyMember = groupMembers[showInviteModal]?.some(m => m.user_id === f.user_id);
                        return (
                          <div key={f.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold">
                                {(f.full_name || "S")[0].toUpperCase()}
                              </div>
                              <p className="text-sm">{f.full_name || "Student"}</p>
                            </div>
                            {alreadyMember ? (
                              <span className="text-xs text-primary">✓ সদস্য</span>
                            ) : (
                              <Button size="sm" className="rounded-lg h-7 text-xs" onClick={() => inviteFriendToGroup(showInviteModal, f.user_id)}>
                                যোগ করো
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Search View */}
      {view === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="নাম বা ইমেইল দিয়ে খুঁজো..."
              onKeyDown={(e) => e.key === "Enter" && searchFriend()}
              className="flex-1 bg-muted/30 rounded-full px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 placeholder:text-muted-foreground" />
            <Button className="rounded-full" onClick={searchFriend} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{searchResults.length}টি ফলাফল</p>
              {searchResults.map(r => (
                <div key={r.user_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold">
                      {(r.full_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.full_name || "Student"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {r.email && <><Mail className="w-3 h-3" /> {r.email}</>}
                        {!r.email && `লেভেল ${r.level} · ${r.xp} XP`}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-lg gap-1 h-8" onClick={() => sendFriendRequest(r.user_id)}>
                    <UserPlus className="w-3 h-3" /> Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Community;
