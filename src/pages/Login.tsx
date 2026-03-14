import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Mail, Lock, ArrowRight, Eye, EyeOff, BookOpen, ClipboardList, Users, Play, Trophy, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const features = [
  { icon: MessageSquare, label: "AI টিউটর", desc: "যেকোনো প্রশ্নের উত্তর পাও" },
  { icon: BookOpen, label: "নোটবুক AI", desc: "PDF থেকে অটো নোট" },
  { icon: ClipboardList, label: "পরীক্ষা মোড", desc: "OMR স্টাইল MCQ" },
  { icon: Users, label: "কমিউনিটি", desc: "বন্ধুদের সাথে পড়ো" },
  { icon: Play, label: "StudyTube", desc: "শিক্ষামূলক ভিডিও" },
  { icon: Trophy, label: "লিডারবোর্ড", desc: "র‍্যাংকিং দেখো" },
];

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    else { toast.success("সফলভাবে লগইন হয়েছে!"); navigate("/"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-grid-pattern relative">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link to="/landing" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-emerald"><Brain className="w-6 h-6 text-primary" /></div>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Welcome Back!</h1>
            <p className="text-sm text-muted-foreground mt-1">তোমার অ্যাকাউন্টে সাইন ইন করো</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
                className="w-full bg-muted/30 rounded-xl pl-10 pr-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-muted/30 rounded-xl pl-10 pr-10 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button variant="glow" className="w-full rounded-xl gap-2" type="submit" disabled={loading}>
            {loading ? "Signing in..." : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>

        {/* Features showcase */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-center text-muted-foreground">🚀 অ্যাপের ফিচারসমূহ</p>
          <div className="grid grid-cols-3 gap-2">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/20 text-center">
                <f.icon className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-semibold">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          অ্যাকাউন্ট নেই? <Link to="/signup" className="text-primary hover:underline font-medium">Sign Up করো — ফ্রি!</Link>
        </p>
        <p className="text-center"><Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground">← হোম পেজে ফিরে যাও</Link></p>
      </motion.div>
    </div>
  );
};

export default Login;
