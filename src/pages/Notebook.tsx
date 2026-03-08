import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Youtube, Globe, FileText, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type SourceType = "youtube" | "web" | "pdf";

const sourceOptions: { type: SourceType; icon: typeof Youtube; label: string }[] = [
  { type: "youtube", icon: Youtube, label: "YouTube URL" },
  { type: "web", icon: Globe, label: "Web Link" },
  { type: "pdf", icon: FileText, label: "PDF Upload" },
];

const sampleNotes = [
  { id: 1, title: "Physics - Newton's Laws of Motion", source: "YouTube", date: "Today", pages: 3 },
  { id: 2, title: "Chemistry - Periodic Table Groups", source: "Web", date: "Yesterday", pages: 5 },
  { id: 3, title: "Biology - Cell Division", source: "PDF", date: "2 days ago", pages: 4 },
];

const Notebook = () => {
  const [selectedSource, setSelectedSource] = useState<SourceType>("youtube");
  const [url, setUrl] = useState("");

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Notebook AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Generate structured study notes from any source</p>
      </motion.div>

      {/* Source selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm">Create New Notes</h2>
        <div className="flex gap-2">
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

        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={selectedSource === "pdf" ? "Upload a PDF file..." : "Paste URL here..."}
            className="flex-1 bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
          <Button variant="glow" className="gap-2 rounded-xl">
            <Sparkles className="w-4 h-4" /> Generate
          </Button>
        </div>
      </motion.div>

      {/* Notes list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-sm">Your Notes</h2>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        </div>
        {sampleNotes.map((note, i) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            className="glass-card-hover rounded-xl p-4 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{note.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {note.source} · {note.date} · {note.pages} pages
                </p>
              </div>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Notebook;
