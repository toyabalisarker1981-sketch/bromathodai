import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, X, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface ChatHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentMessages: Message[];
  currentConversationId: string | null;
  onSelectConversation: (conv: Conversation) => void;
  onNewChat: () => void;
}

const ChatHistoryDrawer = ({
  open,
  onClose,
  userId,
  currentMessages,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: ChatHistoryDrawerProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) fetchConversations();
  }, [open, userId]);

  const fetchConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (data) {
      setConversations(data.map(d => ({
        ...d,
        messages: (d.messages as unknown as Message[]) || [],
      })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("chat_conversations").delete().eq("id", id);
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== id));
      toast({ title: "চ্যাট মুছে ফেলা হয়েছে" });
    }
  };

  const handleDeleteAll = async () => {
    const { error } = await supabase.from("chat_conversations").delete().eq("user_id", userId);
    if (!error) {
      setConversations([]);
      toast({ title: "সকল হিস্ট্রি মুছে ফেলা হয়েছে" });
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} মি. আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘ. আগে`;
    return `${Math.floor(hours / 24)} দিন আগে`;
  };

  const getPreview = (msgs: Message[]) => {
    const userMsgs = msgs.filter(m => m.role === "user");
    if (userMsgs.length === 0) return "নতুন চ্যাট";
    return userMsgs[0].content.slice(0, 50) + (userMsgs[0].content.length > 50 ? "..." : "");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 glass-card border-r border-border/50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> চ্যাট হিস্ট্রি
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* New chat button */}
            <div className="p-3">
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2 text-xs"
                onClick={() => { onNewChat(); onClose(); }}
              >
                <Plus className="w-3.5 h-3.5" /> নতুন চ্যাট শুরু করো
              </Button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1.5 scrollbar-hidden">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">কোনো চ্যাট হিস্ট্রি নেই</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all text-xs ${
                      currentConversationId === conv.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/30"
                    }`}
                    onClick={() => { onSelectConversation(conv); onClose(); }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{conv.title || getPreview(conv.messages)}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{timeAgo(conv.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Delete all */}
            {conversations.length > 0 && (
              <div className="p-3 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteAll}
                >
                  <Trash2 className="w-3 h-3" /> সব হিস্ট্রি মুছে ফেলো
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryDrawer;
