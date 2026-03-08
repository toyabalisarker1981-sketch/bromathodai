import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ImagePlus, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessageContent from "@/components/chat/ChatMessageContent";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "আসসালামু আলাইকুম! 👋 আমি তোমার AI টিউটর। গণিত, বিজ্ঞান, ইংরেজি — যেকোনো বিষয়ে প্রশ্ন করো! ছবি আপলোড করেও সাহায্য নিতে পারো। সব কিছু **সম্পূর্ণ ফ্রি**! 🎓",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
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

      // Add empty assistant message
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
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: currentContent } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      const errMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "দুঃখিত, কিছু সমস্যা হয়েছে। আবার চেষ্টা করো! 🔄",
      };
      setMessages((prev) => [...prev, errMsg]);
    }

    setIsStreaming(false);
  };

  return (
    <div className="flex flex-col h-screen md:h-screen">
      {/* Header */}
      <div className="glass-card border-b border-border/50 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-semibold text-sm">AI Tutor</h1>
          <p className="text-xs text-muted-foreground">Powered by BRO MATHOD Ai — সম্পূর্ণ ফ্রি ✨</p>
        </div>
      </div>

      {/* Messages */}
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
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "glass-card rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ChatMessageContent content={msg.content} />
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

      {/* Input */}
      <div className="p-4 glass-card border-t border-border/50">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Button variant="glass" size="icon" className="flex-shrink-0 rounded-xl">
            <ImagePlus className="w-4 h-4" />
          </Button>
          <div className="flex-1 glass-card rounded-xl flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="যেকোনো প্রশ্ন করো..."
              className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              disabled={isStreaming}
            />
            <Button onClick={handleSend} variant="glow" size="icon" className="m-1 rounded-lg" disabled={!input.trim() || isStreaming}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
