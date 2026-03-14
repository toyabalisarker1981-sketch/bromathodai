import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Mail, Lock, User, ArrowRight, Eye, EyeOff, BookOpen, ClipboardList, Users, Play, Trophy, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const features = [
  { icon: MessageSquare, label: "AI টিউটর", desc: "ছবি দিয়ে প্রশ্ন করো" },
  { icon: BookOpen, label: "নোটবুক AI", desc: "অটো হ্যান্ড নোট" },
  { icon: ClipboardList, label: "পরীক্ষা মোড", desc: "OMR MCQ পরীক্ষা" },
  { icon: Users, label: "কমিউনিটি", desc: "একসাথে পড়ো" },
  { icon: Play, label: "StudyTube", desc: "ভিডিও শিখো" },
  { icon: Trophy, label: "লিডারবোর্ড", desc: "টপ র‍্যাংকিং" },
];

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    if (password.length < 6) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
    else { toast.success("অ্যাকাউন্ট তৈরি হয়েছে! তোমার ইমেইল চেক করো।"); navigate("/onboarding"); }
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
            <h1 className="text-2xl font-display font-bold">ফ্রি অ্যাকাউন্ট তৈরি করো</h1>
            <p className="text-sm text-muted-foreground mt-1">সকল ফিচার আনলিমিটেড ব্যবহার করো</p>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">তোমার নাম</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="তোমার পুরো নাম"
                className="w-full bg-muted/30 rounded-xl pl-10 pr-4 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" required />
            </div>
          </div>
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
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="কমপক্ষে ৬ অক্ষর"
                className="w-full bg-muted/30 rounded-xl pl-10 pr-10 py-3 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button variant="glow" className="w-full rounded-xl gap-2" type="submit" disabled={loading}>
            {loading ? "তৈরি হচ্ছে..." : <>Sign Up — বিনামূল্যে <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>

        {/* Features */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-center text-muted-foreground">🎯 তুমি পাবে</p>
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
          আগে থেকে অ্যাকাউন্ট আছে? <Link to="/login" className="text-primary hover:underline font-medium">Sign In করো</Link>
        </p>
        <p className="text-center"><Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground">← হোম পেজে ফিরে যাও</Link></p>
      </motion.div>
    </div>
  );
};

export default Signup;
