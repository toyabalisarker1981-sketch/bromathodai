import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Library as LibraryIcon, Upload, Search, BookOpen, Eye, Trash2, Plus, Loader2, X, FileText, Image, Download, CheckCircle2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// IndexedDB helper for offline PDF caching
const DB_NAME = "bro-mathod-library";
const STORE_NAME = "cached-pdfs";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const getCachedPdf = async (id: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
};

const cachePdf = async (id: string, blob: Blob) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
  } catch (e) { console.error("Cache error:", e); }
};

const isCached = async (id: string): Promise<boolean> => {
  const blob = await getCachedPdf(id);
  return blob !== null;
};

interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  class_level: number | null;
  pdf_url: string;
  thumbnail_url: string | null;
  view_count: number;
  created_at: string;
}

const subjects = ["গণিত", "পদার্থবিজ্ঞান", "রসায়ন", "জীববিজ্ঞান", "ইংরেজি", "বাংলা", "ICT", "সাধারণ জ্ঞান", "অন্যান্য"];

const Library = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userClass, setUserClass] = useState<number | null>(null);
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<LibraryItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<string | null>(null);

  // Upload states
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadClass, setUploadClass] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [uploadDriveUrl, setUploadDriveUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const checkCachedItems = async () => {
      const cached = new Set<string>();
      for (const item of items) {
        if (await isCached(item.id)) cached.add(item.id);
      }
      setCachedIds(cached);
    };
    if (items.length > 0) checkCachedItems();
  }, [items]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("library_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data as LibraryItem[]);
    setLoading(false);
  };

  const handleOpenPdf = async (item: LibraryItem) => {
    setDownloadingId(item.id);
    
    const cached = await getCachedPdf(item.id);
    if (cached) {
      const url = URL.createObjectURL(cached);
      setPdfBlobUrl(url);
      setViewingPdf(item);
      setDownloadingId(null);
      return;
    }

    // Check if it's a drive/external URL
    const isExternal = item.pdf_url.startsWith("http") && !item.pdf_url.includes("supabase");
    
    if (isExternal) {
      // For external URLs (Google Drive etc), open in iframe directly
      setPdfBlobUrl(null);
      setViewingPdf(item);
      setDownloadingId(null);
      return;
    }

    const confirm = window.confirm("এই বইটি ক্যাশ করতে চাও? পরে অফলাইনেও পড়তে পারবে।");
    
    try {
      const response = await fetch(item.pdf_url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      
      if (confirm) {
        await cachePdf(item.id, blob);
        setCachedIds(prev => new Set(prev).add(item.id));
        toast({ title: "ডাউনলোড সম্পন্ন ✅" });
      }
      
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setViewingPdf(item);
    } catch (e) {
      toast({ title: "ডাউনলোড ব্যর্থ", variant: "destructive" });
    }
    setDownloadingId(null);
  };

  const handleClosePdf = () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
    setViewingPdf(null);
  };

  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbFile(file);
      const reader = new FileReader();
      reader.onload = () => setThumbPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Convert Google Drive share link to embeddable link
  const convertDriveUrl = (url: string): string => {
    // Handle various Google Drive URL formats
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    // If already a direct link or other format, return as-is
    return url;
  };

  const handleUpload = async () => {
    if (!user) return;
    
    if (uploadMode === "url") {
      // URL mode - just save the drive/external URL
      if (!uploadDriveUrl.trim() || !uploadTitle.trim()) return;
      setUploading(true);
      try {
        const finalUrl = convertDriveUrl(uploadDriveUrl.trim());

        let thumbnailUrl: string | null = null;
        if (thumbFile) {
          const thumbPath = `thumbnails/${Date.now()}_${thumbFile.name}`;
          const { error: thumbErr } = await supabase.storage.from("library").upload(thumbPath, thumbFile);
          if (thumbErr) throw thumbErr;
          const { data: thumbUrlData } = supabase.storage.from("library").getPublicUrl(thumbPath);
          thumbnailUrl = thumbUrlData.publicUrl;
        }

        const { error: insertErr } = await supabase.from("library_items").insert({
          title: uploadTitle,
          description: uploadDesc || null,
          subject: uploadSubject || null,
          class_level: uploadClass ? parseInt(uploadClass) : null,
          pdf_url: finalUrl,
          thumbnail_url: thumbnailUrl,
          uploaded_by: user.id,
        });
        if (insertErr) throw insertErr;

        toast({ title: "সফলভাবে যুক্ত হয়েছে! ✅" });
        setShowUpload(false);
        resetUploadForm();
        fetchItems();
      } catch (err: any) {
        toast({ title: "যুক্ত করতে ব্যর্থ", description: err.message, variant: "destructive" });
      }
      setUploading(false);
      return;
    }

    // File upload mode
    if (!pdfFile || !uploadTitle.trim()) return;
    setUploading(true);

    try {
      const pdfPath = `pdfs/${Date.now()}_${pdfFile.name}`;
      const { error: pdfErr } = await supabase.storage.from("library").upload(pdfPath, pdfFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (pdfErr) {
        console.error("PDF upload error:", pdfErr);
        throw new Error(`PDF আপলোড ব্যর্থ: ${pdfErr.message}`);
      }
      const { data: pdfUrlData } = supabase.storage.from("library").getPublicUrl(pdfPath);

      let thumbnailUrl: string | null = null;
      if (thumbFile) {
        const thumbPath = `thumbnails/${Date.now()}_${thumbFile.name}`;
        const { error: thumbErr } = await supabase.storage.from("library").upload(thumbPath, thumbFile);
        if (thumbErr) console.error("Thumb upload error:", thumbErr);
        else {
          const { data: thumbUrlData } = supabase.storage.from("library").getPublicUrl(thumbPath);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      const { error: insertErr } = await supabase.from("library_items").insert({
        title: uploadTitle,
        description: uploadDesc || null,
        subject: uploadSubject || null,
        class_level: uploadClass ? parseInt(uploadClass) : null,
        pdf_url: pdfUrlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        uploaded_by: user.id,
      });

      if (insertErr) throw insertErr;

      toast({ title: "সফলভাবে আপলোড হয়েছে! ✅" });
      setShowUpload(false);
      resetUploadForm();
      fetchItems();
    } catch (err: any) {
      console.error("Upload error details:", err);
      toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDesc("");
    setUploadSubject("");
    setUploadClass("");
    setUploadDriveUrl("");
    setUploadMode("file");
    setPdfFile(null);
    setThumbFile(null);
    setThumbPreview(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("library_items").delete().eq("id", id);
    if (!error) {
      setItems(items.filter((i) => i.id !== id));
      toast({ title: "মুছে ফেলা হয়েছে" });
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !filterSubject || item.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  // PDF Viewer overlay
  if (viewingPdf) {
    const pdfSrc = pdfBlobUrl || viewingPdf.pdf_url;
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
        <div className="glass-card border-b border-border/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <h2 className="font-display font-semibold text-sm truncate">{viewingPdf.title}</h2>
            {cachedIds.has(viewingPdf.id) && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> ক্যাশড
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleClosePdf} className="rounded-xl flex-shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={pdfSrc}
            className="w-full h-full border-0"
            title={viewingPdf.title}
            allow="autoplay"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <LibraryIcon className="w-6 h-6 text-primary" /> লাইব্রেরী
          </h1>
          <p className="text-sm text-muted-foreground mt-1">সকল বই ও স্টাডি ম্যাটেরিয়াল — সম্পূর্ণ ফ্রি</p>
        </div>
        {isAdmin && (
          <Button variant="glow" className="gap-2 rounded-xl" onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4" /> আপলোড
          </Button>
        )}
      </motion.div>

      {/* Search & Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="বই বা বিষয় খুঁজো..."
            className="w-full bg-muted/20 backdrop-blur-sm rounded-xl pl-11 pr-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hidden pb-1">
          <button
            onClick={() => setFilterSubject(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              !filterSubject ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
            }`}
          >
            সব
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setFilterSubject(filterSubject === s ? null : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterSubject === s ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-12 text-center">
          <LibraryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{searchQuery ? "কোনো ফলাফল পাওয়া যায়নি" : "লাইব্রেরীতে এখনো কিছু যোগ হয়নি"}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`glass-card-hover rounded-2xl overflow-hidden cursor-pointer group relative ${downloadingId === item.id ? "pointer-events-none opacity-70" : ""}`}
              onClick={() => handleOpenPdf(item)}
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-muted/20">
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <FileText className="w-12 h-12 text-muted-foreground/40" />
                  </div>
                )}
                <div className={`absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity flex items-center justify-center ${downloadingId === item.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {downloadingId === item.id ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <Eye className="w-5 h-5" /> পড়ো
                    </div>
                  )}
                </div>
                {cachedIds.has(item.id) && (
                  <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> অফলাইন
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <h3 className="text-sm font-semibold leading-tight line-clamp-2">{item.title}</h3>
                {item.subject && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{item.subject}</span>
                )}
                {item.class_level && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-secondary/10 text-secondary font-medium ml-1">ক্লাস {item.class_level}</span>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {item.view_count}</span>
                  {isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg">নতুন বই যুক্ত করো</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)} className="rounded-xl">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Upload mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    uploadMode === "file" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <Upload className="w-4 h-4" /> PDF আপলোড
                </button>
                <button
                  onClick={() => setUploadMode("url")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    uploadMode === "url" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <Link2 className="w-4 h-4" /> Drive/URL লিংক
                </button>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">শিরোনাম *</label>
                <input type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="বইয়ের নাম লেখো..." className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">বিবরণ</label>
                <textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} placeholder="সংক্ষিপ্ত বিবরণ..." rows={2} className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">বিষয়ের নাম</label>
                  <input type="text" value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} placeholder="যেমন: গণিত..." className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ক্লাস</label>
                  <input type="text" value={uploadClass} onChange={(e) => setUploadClass(e.target.value)} placeholder="যেমন: 9, 10..." className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />
                </div>
              </div>

              {uploadMode === "file" ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">PDF ফাইল *</label>
                  <input ref={pdfInputRef} type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" />
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-colors ${
                      pdfFile ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30 bg-muted/10"
                    }`}
                  >
                    <FileText className={`w-6 h-6 ${pdfFile ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm truncate">{pdfFile ? pdfFile.name : "PDF সিলেক্ট করো (কোন সাইজ লিমিট নেই)"}</span>
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Google Drive বা PDF লিংক *</label>
                  <input
                    type="url"
                    value={uploadDriveUrl}
                    onChange={(e) => setUploadDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... অথবা PDF URL পেস্ট করো"
                    className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Google Drive, Dropbox, বা যেকোনো পাবলিক PDF লিংক দাও</p>
                </div>
              )}

              {/* Thumbnail Upload */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">কভার ছবি (ঐচ্ছিক)</label>
                <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbSelect} className="hidden" />
                <button
                  onClick={() => thumbInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-colors ${
                    thumbFile ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30 bg-muted/10"
                  }`}
                >
                  {thumbPreview ? (
                    <img src={thumbPreview} alt="thumb" className="w-12 h-16 object-cover rounded-lg" />
                  ) : (
                    <Image className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-sm truncate">{thumbFile ? thumbFile.name : "কভার ছবি সিলেক্ট করো"}</span>
                </button>
              </div>

              <Button
                variant="glow"
                className="w-full rounded-xl gap-2"
                onClick={handleUpload}
                disabled={uploading || (uploadMode === "file" ? !pdfFile : !uploadDriveUrl.trim()) || !uploadTitle.trim()}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadMode === "file" ? "আপলোড করো" : "যুক্ত করো"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Library;
