import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Youtube, Globe, FileText, Sparkles, Upload, Trash2, Image, Loader2, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ChatMessageContent from "@/components/chat/ChatMessageContent";
import TextToSpeech from "@/components/chat/TextToSpeech";

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

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-notes`;

const Notebook = () => {
  const { user } = useAuth();
  const [selectedSource, setSelectedSource] = useState<SourceType>("pdf");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setNotes(data as Note[]);
    setLoading(false);
  };

  const generateAINotes = async (fileUrl: string, fileName: string, sourceType: string): Promise<string> => {
    try {
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ fileUrl, fileName, sourceType }),
      });
      if (!resp.ok) throw new Error("AI notes generation failed");
      const data = await resp.json();
      return data.content;
    } catch (e) {
      console.error("AI notes error:", e);
      return `# 📝 ${fileName}\n\nনোট তৈরি করা যায়নি। পরে আবার চেষ্টা করো।`;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setGenerating(true);
    toast({ title: "আপলোড হচ্ছে... ⏳", description: "ফাইল আপলোড এবং AI নোট তৈরি হচ্ছে" });

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
    const fileName = file.name.replace(/\.[^/.]+$/, "");

    const aiContent = await generateAINotes(urlData.publicUrl, fileName, selectedSource);

    const { error: insertError } = await supabase.from("notes").insert({
      user_id: user.id,
      title: fileName,
      source_type: selectedSource,
      file_path: urlData.publicUrl,
      content: aiContent,
    });

    if (insertError) {
      toast({ title: "সেভ ব্যর্থ", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "নোট তৈরি হয়েছে! ✅", description: "AI হ্যান্ড নোট প্রস্তুত" });
      fetchNotes();
    }
    setGenerating(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!url.trim() || !user) return;
    setGenerating(true);

    const aiContent = await generateAINotes(url, selectedSource === "youtube" ? "YouTube ভিডিও" : "ওয়েব পেজ", selectedSource);

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: selectedSource === "youtube" ? "YouTube থেকে নোটস" : "ওয়েব থেকে নোটস",
      source_type: selectedSource,
      source_url: url,
      content: aiContent,
    });

    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "AI নোট তৈরি হয়েছে! ✅" });
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

  const handlePrint = (note: Note) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "পপ-আপ ব্লক করা আছে", description: "পপ-আপ অনুমতি দাও", variant: "destructive" });
      return;
    }

    const content = note.content || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${note.title} - BRO MATHOD AI Notes</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.38/dist/katex.min.css">
        <style>
          @page { size: A4; margin: 20mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Noto Sans Bengali', 'SolaimanLipi', sans-serif; font-size: 13px; line-height: 1.8; color: #1a1a1a; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 20px; color: #6366f1; margin-bottom: 4px; }
          .header p { font-size: 11px; color: #666; }
          .content { max-width: 100%; }
          .content h1 { font-size: 18px; color: #1e293b; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .content h2 { font-size: 16px; color: #334155; margin: 14px 0 6px; }
          .content h3 { font-size: 14px; color: #475569; margin: 12px 0 4px; }
          .content p { margin: 6px 0; text-align: justify; }
          .content ul, .content ol { margin: 6px 0 6px 20px; }
          .content li { margin: 3px 0; }
          .content strong { color: #1e293b; }
          .content code { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
          .content pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
          .content blockquote { border-left: 3px solid #6366f1; padding-left: 12px; margin: 8px 0; color: #64748b; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 ${note.title}</h1>
          <p>Generated by BRO MATHOD AI · ${new Date(note.created_at).toLocaleDateString('bn-BD')}</p>
        </div>
        <div class="content">${convertMarkdownToHtml(content)}</div>
        <div class="footer">BRO MATHOD AI — তোমার পড়ালেখার সেরা বন্ধু</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const convertMarkdownToHtml = (md: string): string => {
    // Protect LaTeX blocks from markdown processing
    const latexBlocks: string[] = [];
    let processed = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => {
      latexBlocks.push(`<div class="katex-display-placeholder" data-expr="${encodeURIComponent(expr.trim())}"></div>`);
      return `%%LATEX_BLOCK_${latexBlocks.length - 1}%%`;
    });
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, expr) => {
      latexBlocks.push(`<span class="katex-inline-placeholder" data-expr="${encodeURIComponent(expr.trim())}"></span>`);
      return `%%LATEX_BLOCK_${latexBlocks.length - 1}%%`;
    });

    processed = processed
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/# (.*)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(?!<[hluop])(.+)$/gm, '<p>$1</p>');

    // Restore LaTeX blocks
    processed = processed.replace(/%%LATEX_BLOCK_(\d+)%%/g, (_, idx) => latexBlocks[parseInt(idx)]);
    return processed;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    return `${Math.floor(hours / 24)} দিন আগে`;
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> নোটবুক AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">PDF বা ছবি আপলোড করো — AI অটোমেটিক হ্যান্ড নোট তৈরি করবে! ✨</p>
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
              disabled={generating}
            />
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/10 ${generating ? "pointer-events-none opacity-60" : ""}`}
            >
              {generating ? (
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-primary">AI নোট তৈরি হচ্ছে...</p>
                    <p className="text-xs text-muted-foreground mt-1">এতে কিছুক্ষণ সময় লাগতে পারে</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {selectedSource === "pdf" ? "PDF ফাইল আপলোড করো" : "ছবি আপলোড করো"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">আনলিমিটেড সাইজ — AI অটোমেটিক নোট তৈরি করবে 🤖</p>
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
              নোট তৈরি করো
            </Button>
          </div>
        )}
      </motion.div>

      {/* Notes list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
        <h2 className="font-display font-semibold text-sm">তোমার নোটস ({notes.length})</h2>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : notes.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">এখনো কোনো নোটস নেই। PDF আপলোড করো — AI নোট তৈরি করবে!</p>
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
                className={`glass-card rounded-xl overflow-hidden ${selectedNote?.id === note.id ? "border-primary/30" : ""}`}
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setSelectedNote(selectedNote?.id === note.id ? null : note)}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {note.source_type === "pdf" ? <FileText className="w-4 h-4 text-primary" /> :
                       note.source_type === "image" ? <Image className="w-4 h-4 text-primary" /> :
                       note.source_type === "youtube" ? <Youtube className="w-4 h-4 text-primary" /> :
                       <Globe className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate">{note.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(note.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TextToSpeech text={note.content || ""} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrint(note); }}
                      className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="প্রিন্ট / PDF সেভ"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedNote?.id === note.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-4 pb-4">
                    <div className="border-t border-border/30 pt-4">
                      {note.file_path && note.source_type === "image" && (
                        <img src={note.file_path} alt={note.title} className="rounded-lg max-h-48 object-cover mb-4" />
                      )}
                      {note.source_url && (
                        <a href={note.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mb-3 block">🔗 সোর্স লিংক</a>
                      )}
                      <div className="glass-card rounded-xl p-4" ref={printRef}>
                        <ChatMessageContent content={note.content || ""} />
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => handlePrint(note)}>
                          <Printer className="w-3.5 h-3.5" /> প্রিন্ট / PDF সেভ
                        </Button>
                      </div>
                    </div>
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
