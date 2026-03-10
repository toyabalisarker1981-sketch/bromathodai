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

const TextToSpeech = ({ text, className = "" }: TextToSpeechProps) => {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setLoading(false);
  }, []);

  const speak = useCallback(() => {
    if (speaking) {
      stop();
      return;
    }

    const cleanText = stripMarkdown(text);
    if (!cleanText) return;

    setLoading(true);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // Try to find a good Bengali or English voice
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith("bn"));
    const enVoice = voices.find(v => v.lang === "en-US" && v.name.includes("Google")) ||
                    voices.find(v => v.lang === "en-US");

    // Detect if text is mostly Bengali
    const bengaliChars = cleanText.match(/[\u0980-\u09FF]/g)?.length || 0;
    const isMostlyBengali = bengaliChars > cleanText.length * 0.3;

    if (isMostlyBengali && bnVoice) {
      utterance.voice = bnVoice;
      utterance.lang = "bn-BD";
    } else if (enVoice) {
      utterance.voice = enVoice;
      utterance.lang = "en-US";
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => { setLoading(false); setSpeaking(true); };
    utterance.onend = () => { setSpeaking(false); };
    utterance.onerror = () => { setSpeaking(false); setLoading(false); };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [text, speaking, stop]);

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
