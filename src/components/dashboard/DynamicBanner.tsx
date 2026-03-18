import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, X, Upload, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Notice {
  id: string;
  image_url: string;
  title: string | null;
  is_active: boolean;
  created_at: string;
}

const DynamicBanner = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotices();
    if (user) checkAdmin();
  }, [user]);

  useEffect(() => {
    if (notices.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % notices.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [notices.length]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
  };

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (data) setNotices(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("notices").upload(path, file);
    if (uploadErr) {
      toast({ title: "আপলোড ব্যর্থ", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("notices").getPublicUrl(path);

    const { error: insertErr } = await supabase.from("notices").insert({
      image_url: urlData.publicUrl,
      created_by: user.id,
    });

    if (insertErr) {
      toast({ title: "সেভ ব্যর্থ", description: insertErr.message, variant: "destructive" });
    } else {
      toast({ title: "নোটিশ যুক্ত হয়েছে! ✅" });
      fetchNotices();
      setShowUpload(false);
    }
    setUploading(false);
  };

  const handleDelete = async (notice: Notice) => {
    const fileName = notice.image_url.split("/").pop();
    if (fileName) await supabase.storage.from("notices").remove([fileName]);
    await supabase.from("notices").delete().eq("id", notice.id);
    toast({ title: "নোটিশ মুছে ফেলা হয়েছে 🗑️" });
    fetchNotices();
    setCurrentIndex(0);
  };

  if (notices.length === 0 && !isAdmin) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
          <Megaphone className="w-4 h-4 text-primary" /> নোটিশ বোর্ড
        </h2>
        {isAdmin && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showUpload ? "বাতিল" : "নোটিশ যুক্ত করো"}
          </Button>
        )}
      </div>

      {/* Admin Upload */}
      {showUpload && isAdmin && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="liquid-glass rounded-2xl p-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button
            variant="outline"
            className="w-full rounded-xl gap-2 border-dashed border-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড করো"}
          </Button>
        </motion.div>
      )}

      {/* Banner Carousel */}
      {notices.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl liquid-glass">
          <AnimatePresence mode="wait">
            <motion.div
              key={notices[currentIndex]?.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <img
                src={notices[currentIndex]?.image_url}
                alt={notices[currentIndex]?.title || "নোটিশ"}
                className="w-full h-40 sm:h-52 object-cover rounded-2xl"
              />
              {isAdmin && (
                <button
                  onClick={() => handleDelete(notices[currentIndex])}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-white hover:bg-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {notices.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex(prev => (prev - 1 + notices.length) % notices.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/60 backdrop-blur-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentIndex(prev => (prev + 1) % notices.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/60 backdrop-blur-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {notices.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-primary w-4" : "bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default DynamicBanner;
