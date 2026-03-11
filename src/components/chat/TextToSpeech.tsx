import { useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface TextToSpeechProps {
  text: string;
  className?: string;
}

const stripMarkdown = (md: string): string => {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$]*\$/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/__([^_]*)__/g, "$1")
    .replace(/_([^_]*)_/g, "$1")
    .replace(/[-*+]\s/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
};

// Split text into smaller chunks for smoother TTS
const splitIntoChunks = (text: string, maxLen = 200): string[] => {
  const sentences = text.split(/(?<=[।.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
};

const TextToSpeech = ({ text, className = "" }: TextToSpeechProps) => {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const chunkIndexRef = useRef(0);
  const chunksRef = useRef<string[]>([]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setLoading(false);
    chunkIndexRef.current = 0;
    chunksRef.current = [];
  }, []);

  const speakChunk = useCallback((chunks: string[], index: number) => {
    if (index >= chunks.length) {
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);

    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith("bn"));
    const enVoice = voices.find(v => v.lang === "en-US" && v.name.includes("Google")) ||
                    voices.find(v => v.lang === "en-US");

    const bengaliChars = chunks[index].match(/[\u0980-\u09FF]/g)?.length || 0;
    const isMostlyBengali = bengaliChars > chunks[index].length * 0.3;

    if (isMostlyBengali && bnVoice) {
      utterance.voice = bnVoice;
      utterance.lang = "bn-BD";
    } else if (enVoice) {
      utterance.voice = enVoice;
      utterance.lang = "en-US";
    }

    utterance.rate = 0.85;
    utterance.pitch = 1.05;

    utterance.onstart = () => { setLoading(false); setSpeaking(true); };
    utterance.onend = () => {
      chunkIndexRef.current = index + 1;
      speakChunk(chunks, index + 1);
    };
    utterance.onerror = () => { setSpeaking(false); setLoading(false); };

    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(() => {
    if (speaking) {
      stop();
      return;
    }

    const cleanText = stripMarkdown(text);
    if (!cleanText) return;

    setLoading(true);
    window.speechSynthesis.cancel();

    // Ensure voices are loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const chunks = splitIntoChunks(cleanText);
        chunksRef.current = chunks;
        chunkIndexRef.current = 0;
        speakChunk(chunks, 0);
      };
    } else {
      const chunks = splitIntoChunks(cleanText);
      chunksRef.current = chunks;
      chunkIndexRef.current = 0;
      speakChunk(chunks, 0);
    }
  }, [text, speaking, stop, speakChunk]);

  if (!text) return null;

  return (
    <button
      onClick={speak}
      className={`p-1.5 rounded-lg transition-all duration-200 ${
        speaking
          ? "bg-primary/20 text-primary hover:bg-primary/30"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      } ${className}`}
      title={speaking ? "থামাও" : "পড়ে শোনাও"}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : speaking ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

export default TextToSpeech;
