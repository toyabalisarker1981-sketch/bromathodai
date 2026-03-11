import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ImagePlus, Bot, User, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessageContent from "@/components/chat/ChatMessageContent";
import TextToSpeech from "@/components/chat/TextToSpeech";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const Chat = () => {
  const { user } = useAuth();
  const [studentClass, setStudentClass] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("student_class, full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.student_class) setStudentClass(data.student_class.toString());
        const name = data?.full_name || user.user_metadata?.full_name || "";
        setStudentName(name);
        setMessages([{
          id: "1",
          role: "assistant",
          content: name
            ? `আসসালামু আলাইকুম, **${name}**! 👋 আমি তোমার AI বন্ধু-টিউটর। গণিত, বিজ্ঞান, ইংরেজি — যেকোনো বিষয়ে প্রশ্ন করো! ছবি পাঠিয়েও সমাধান নিতে পারো 📸\n\nসব কিছু **সম্পূর্ণ ফ্রি**! 🎓`
            : "আসসালামু আলাইকুম! 👋 আমি তোমার AI বন্ধু-টিউটর। গণিত, বিজ্ঞান, ইংরেজি — যেকোনো বিষয়ে প্রশ্ন করো! ছবি পাঠিয়েও সমাধান নিতে পারো 📸\n\nসব কিছু **সম্পূর্ণ ফ্রি**! 🎓",
        }]);
      });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "শুধুমাত্র ছবি আপলোড করো", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/chat-images/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("notebook-uploads").upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("notebook-uploads").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isStreaming) return;

    let imageUrl: string | undefined;

    if (selectedImage) {
      setUploadingImage(true);
      try {
        imageUrl = await uploadImage(selectedImage);
      } catch (e) {
        toast({ title: "ছবি আপলোড ব্যর্থ", variant: "destructive" });
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input || (imageUrl ? "এই ছবিটি দেখে সমাধান করো" : ""),
      imageUrl,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    removeImage();
    setIsStreaming(true);

    let assistantContent = "";

    try {
      // Build message content for API
      const apiMessages = newMessages.map((m) => {
        if (m.imageUrl) {
          return {
            role: m.role,
            content: [
              { type: "text" as const, text: m.content || "এই ছবিটি বিশ্লেষণ করো এবং সমাধান দাও" },
              { type: "image_url" as const, image_url: { url: m.imageUrl } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          studentClass,
          studentName,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to connect to AI");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      const assistantId = (Date.now() + 1).toString();

      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const cur = assistantContent;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: cur } : m)));
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "দুঃখিত, কিছু সমস্যা হয়েছে। আবার চেষ্টা করো! 🔄",
      }]);
    }

    setIsStreaming(false);
  };

  return (
    <div className="flex flex-col h-screen md:h-screen">
      <div className="glass-card border-b border-border/50 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-semibold text-sm">AI বন্ধু-টিউটর</h1>
          <p className="text-xs text-muted-foreground">তোমার পড়ালেখার সেরা বন্ধু — সম্পূর্ণ ফ্রি ✨</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hidden">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "glass-card rounded-bl-md"
              }`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="uploaded" className="rounded-lg max-h-40 object-cover mb-2" />
                )}
                {msg.role === "assistant" ? (
                  <div>
                    <ChatMessageContent content={msg.content} />
                    {msg.content && (
                      <div className="flex justify-end mt-1">
                        <TextToSpeech text={msg.content} />
                      </div>
                    )}
                  </div>
                ) : (
                  msg.content.split("\n").map((line, i) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                  ))
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-secondary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 pb-2">
          <div className="inline-flex items-center gap-2 p-2 glass-card rounded-xl">
            <img src={imagePreview} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
            <button onClick={removeImage} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 glass-card border-t border-border/50">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            variant="glass"
            size="icon"
            className="flex-shrink-0 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || uploadingImage}
          >
            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </Button>
          <div className="flex-1 glass-card rounded-xl flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="যেকোনো প্রশ্ন করো বা ছবি পাঠাও..."
              className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              disabled={isStreaming}
            />
            <Button onClick={handleSend} variant="glow" size="icon" className="m-1 rounded-lg" disabled={(!input.trim() && !selectedImage) || isStreaming}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
