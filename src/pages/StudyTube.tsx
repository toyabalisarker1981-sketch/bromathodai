import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Search, Plus, Loader2, Eye, Trash2, X, ExternalLink, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail_url: string | null;
  subject: string | null;
  topic: string | null;
  class_level: number | null;
  view_count: number;
}

const StudyTube = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);

  // Add form
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addSubject, setAddSubject] = useState("");
  const [addTopic, setAddTopic] = useState("");
  const [adding, setAdding] = useState(false);

  // AI search
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<{ title: string; videoId: string; thumbnail: string }[]>([]);

  useEffect(() => {
    fetchVideos();
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
  };

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase.from("study_tube_videos").select("*").order("created_at", { ascending: false });
    if (data) setVideos(data as Video[]);
    setLoading(false);
  };

  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleAddVideo = async () => {
    if (!addUrl.trim() || !addTitle.trim() || !user) return;
    const ytId = extractYouTubeId(addUrl);
    if (!ytId) { toast({ title: "সঠিক YouTube URL দাও", variant: "destructive" }); return; }
    setAdding(true);
    const { error } = await supabase.from("study_tube_videos").insert({
      title: addTitle,
      youtube_url: addUrl,
      youtube_id: ytId,
      thumbnail_url: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
      subject: addSubject || null,
      topic: addTopic || null,
      added_by: user.id,
    });
    if (error) toast({ title: "যুক্ত করতে ব্যর্থ", variant: "destructive" });
    else {
      toast({ title: "ভিডিও যুক্ত হয়েছে! ✅" });
      setShowAdd(false);
      setAddUrl(""); setAddTitle(""); setAddSubject(""); setAddTopic("");
      fetchVideos();
    }
    setAdding(false);
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    setAiSearching(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "তুমি শিক্ষামূলক ভিডিও রেকমেন্ড করো। ব্যবহারকারী যে টপিক বলবে সেই অনুযায়ী YouTube ভিডিও suggest করো। suggest_videos tool ব্যবহার করো।" },
            { role: "user", content: `"${searchQuery}" টপিকের জন্য সেরা ৬টি শিক্ষামূলক YouTube ভিডিও সাজেস্ট করো। বাংলা ভিডিও প্রাধান্য দাও।` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_videos",
              description: "Suggest YouTube videos",
              parameters: {
                type: "object",
                properties: {
                  videos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        videoId: { type: "string" },
                      },
                      required: ["title", "videoId"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["videos"],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "suggest_videos" } },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          setAiResults((parsed.videos || []).map((v: any) => ({
            ...v,
            thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`
          })));
        }
      }
    } catch (e) { console.error(e); }
    setAiSearching(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("study_tube_videos").delete().eq("id", id);
    setVideos(videos.filter(v => v.id !== id));
    toast({ title: "মুছে ফেলা হয়েছে" });
  };

  const filteredVideos = videos.filter(v =>
    !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || v.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Video player overlay
  if (playing) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
        <div className="glass-card border-b border-border/50 p-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-sm truncate flex-1">{playing.title}</h2>
          <Button variant="ghost" size="icon" onClick={() => setPlaying(null)} className="rounded-xl"><X className="w-5 h-5" /></Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden">
            <iframe src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1`} className="w-full h-full border-0" allow="autoplay; fullscreen" allowFullScreen title={playing.title} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Play className="w-6 h-6 text-primary" /> StudyTube</h1>
          <p className="text-sm text-muted-foreground mt-1">শিক্ষামূলক ভিডিও দেখো ও শেখো 🎬</p>
        </div>
        {isAdmin && <Button variant="glow" className="gap-2 rounded-xl" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> ভিডিও যোগ করো</Button>}
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="টপিক লিখে ভিডিও খুঁজো..."
            className="w-full bg-muted/20 backdrop-blur-sm rounded-xl pl-11 pr-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === "Enter" && handleAISearch()} />
        </div>
        <Button variant="glow" className="rounded-xl gap-1" onClick={handleAISearch} disabled={aiSearching}>
          {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} AI সার্চ
        </Button>
      </motion.div>

      {/* Add Video Modal */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">নতুন ভিডিও যোগ করো</h3>
          <input type="text" value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="YouTube URL..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
          <input type="text" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="ভিডিওর শিরোনাম..."
            className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={addSubject} onChange={(e) => setAddSubject(e.target.value)} placeholder="বিষয়..."
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
            <input type="text" value={addTopic} onChange={(e) => setAddTopic(e.target.value)} placeholder="টপিক..."
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            <Button variant="glow" className="flex-1 rounded-xl" onClick={handleAddVideo} disabled={adding || !addUrl.trim() || !addTitle.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "যোগ করো"}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowAdd(false)}>বাতিল</Button>
          </div>
        </motion.div>
      )}

      {/* AI Search Results */}
      {aiResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Youtube className="w-4 h-4 text-primary" /> AI সাজেশন</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {aiResults.map((v, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card-hover rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => setPlaying({ id: "", title: v.title, youtube_url: "", youtube_id: v.videoId, thumbnail_url: v.thumbnail, subject: null, topic: null, class_level: null, view_count: 0 })}>
                <div className="aspect-video relative overflow-hidden bg-muted/20">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center"><Play className="w-6 h-6 text-primary-foreground ml-1" /></div>
                  </div>
                </div>
                <div className="p-3"><p className="text-xs font-semibold line-clamp-2">{v.title}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : filteredVideos.length === 0 && aiResults.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{searchQuery ? "কোনো ভিডিও পাওয়া যায়নি" : "এখনো কোনো ভিডিও নেই"}</p>
          <p className="text-xs text-muted-foreground mt-1">AI সার্চ করে ভিডিও খুঁজে দেখো!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.length > 0 && <h3 className="text-sm font-semibold">সকল ভিডিও ({filteredVideos.length})</h3>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVideos.map((video, i) => (
              <motion.div key={video.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass-card-hover rounded-xl overflow-hidden cursor-pointer group relative"
                onClick={() => setPlaying(video)}>
                <div className="aspect-video relative overflow-hidden bg-muted/20">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                      <Play className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center"><Play className="w-6 h-6 text-primary-foreground ml-1" /></div>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-xs font-semibold leading-tight line-clamp-2">{video.title}</h3>
                  {video.subject && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{video.subject}</span>}
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyTube;
