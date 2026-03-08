import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Youtube, Globe, FileText, Plus, Sparkles, Upload, Trash2, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type SourceType = "youtube" | "web" | "pdf" | "image";

const sourceOptions: { type: SourceType; icon: typeof Youtube; label: string }[] = [
  { type: "youtube", icon: Youtube, label: "YouTube" },
  { type: "web", icon: Globe, label: "ওয়েব লিংক" },
  { type: "pdf", icon: FileText, label: "PDF" },
  { type: "image", icon: Image, label: "ছবি" },
];

interface Note {
  id: string;
  title: string;
  content: string | null;
  source_type: string;
  source_url: string | null;
  file_path: string | null;
  created_at: string;
}

const Notebook = () => {
  const { user } = useAuth();
  const [selectedSource, setSelectedSource] = useState<SourceType>("youtube");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setNotes(data as Note[]);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: "ফাইল অনেক বড়", description: "সর্বোচ্চ ১০ MB ফাইল আপলোড করা যাবে", variant: "destructive" });
      return;
    }

    setGenerating(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("notebook-uploads")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "আপলোড ব্যর্থ", description: uploadError.message, variant: "destructive" });
      setGenerating(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("notebook-uploads").getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("notes").insert({
      user_id: user.id,
      title: file.name.replace(/\.[^/.]+$/, ""),
      source_type: selectedSource,
      file_path: urlData.publicUrl,
      content: `ফাইল আপলোড সম্পন্ন: ${file.name}\n\nAI দিয়ে এই ফাইল থেকে নোটস তৈরি করতে AI Tutor এ যাও এবং ফাইলের বিষয়বস্তু সম্পর্কে প্রশ্ন করো।`,
    });

    if (insertError) {
      toast({ title: "সেভ ব্যর্থ", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "সফল! ✅", description: "ফাইল আপলোড এবং নোট তৈরি হয়েছে" });
      fetchNotes();
    }
    setGenerating(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!url.trim() || !user) return;
    setGenerating(true);

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: selectedSource === "youtube" ? "YouTube থেকে নোটস" : "ওয়েব থেকে নোটস",
      source_type: selectedSource,
      source_url: url,
      content: `সোর্স: ${url}\n\nAI দিয়ে এই লিংক থেকে নোটস তৈরি করতে AI Tutor এ যাও এবং এই URL শেয়ার করো।`,
    });

    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "নোট সেভ হয়েছে! ✅" });
      setUrl("");
      fetchNotes();
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (!error) {
      setNotes(notes.filter((n) => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
      toast({ title: "নোট মুছে ফেলা হয়েছে" });
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    const days = Math.floor(hours / 24);
    return `${days} দিন আগে`;
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> নোটবুক AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">যেকোনো সোর্স থেকে নোটস তৈরি করো — সব ফ্রি!</p>
      </motion.div>

      {/* Source selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm">নতুন নোট তৈরি করো</h2>
        <div className="flex flex-wrap gap-2">
          {sourceOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setSelectedSource(opt.type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedSource === opt.type
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          ))}
        </div>

        {(selectedSource === "pdf" || selectedSource === "image") ? (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={selectedSource === "pdf" ? ".pdf" : "image/*"}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/10"
            >
              {generating ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {selectedSource === "pdf" ? "PDF ফাইল আপলোড করো" : "ছবি আপলোড করো"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">সর্বোচ্চ ১০ MB</p>
                  </div>
                </>
              )}
            </label>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={selectedSource === "youtube" ? "YouTube URL পেস্ট করো..." : "ওয়েব লিংক পেস্ট করো..."}
              className="flex-1 bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
            <Button variant="glow" className="gap-2 rounded-xl" onClick={handleGenerate} disabled={generating || !url.trim()}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              সেভ করো
            </Button>
          </div>
        )}
      </motion.div>

      {/* Notes list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-sm">তোমার নোটস ({notes.length})</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">এখনো কোনো নোটস নেই। উপরের অপশন থেকে নতুন নোট তৈরি করো!</p>
          </div>
        ) : (
          <AnimatePresence>
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-card-hover rounded-xl p-4 cursor-pointer ${selectedNote?.id === note.id ? "border-primary/30" : ""}`}
                onClick={() => setSelectedNote(selectedNote?.id === note.id ? null : note)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{note.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.source_type === "youtube" ? "🎬 YouTube" : note.source_type === "web" ? "🌐 ওয়েব" : note.source_type === "pdf" ? "📄 PDF" : "🖼️ ছবি"} · {timeAgo(note.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {selectedNote?.id === note.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border/30">
                    {note.file_path && (
                      <div className="mb-3">
                        {note.source_type === "image" ? (
                          <img src={note.file_path} alt={note.title} className="rounded-lg max-h-48 object-cover" />
                        ) : (
                          <a href={note.file_path} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📎 ফাইল দেখো</a>
                        )}
                      </div>
                    )}
                    {note.source_url && (
                      <a href={note.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mb-2 block">🔗 সোর্স লিংক</a>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default Notebook;
