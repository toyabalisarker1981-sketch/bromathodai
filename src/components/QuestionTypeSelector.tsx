import { motion } from "framer-motion";
import { BookOpen, HelpCircle, Lightbulb } from "lucide-react";

type QuestionType = "mcq" | "sq" | "cq" | "all";

interface QuestionTypeSelectorProps {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
}

const types = [
  { type: "all" as const, label: "সব ধরন", icon: "🎯", desc: "MCQ + SQ + CQ" },
  { type: "mcq" as const, label: "MCQ", icon: "📝", desc: "নৈর্বিত্তিক" },
  { type: "sq" as const, label: "SQ", icon: "✍️", desc: "সংক্ষিপ্ত" },
  { type: "cq" as const, label: "CQ", icon: "💡", desc: "সৃজনশীল" },
];

const QuestionTypeSelector = ({ value, onChange }: QuestionTypeSelectorProps) => {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">প্রশ্নের ধরন সিলেক্ট করো</label>
      <div className="grid grid-cols-4 gap-2">
        {types.map((t) => (
          <button
            key={t.type}
            onClick={() => onChange(t.type)}
            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
              value === t.type
                ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span className="font-bold">{t.label}</span>
            <span className="text-[9px] opacity-70">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuestionTypeSelector;
export type { QuestionType };
