import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  className?: string;
  glowColor?: "emerald" | "indigo";
  delay?: number;
}

const BentoCard = ({ title, value, subtitle, icon: Icon, className, glowColor = "emerald", delay = 0 }: BentoCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "glass-card-hover rounded-2xl p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center",
          glowColor === "emerald" ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-display font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

export default BentoCard;
