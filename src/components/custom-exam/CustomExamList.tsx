import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Clock, Users, Play, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CustomExam {
  id: string;
  title: string;
  subject: string;
  question_count: number;
  duration_minutes: number;
  questions: any[];
  created_at: string;
  created_by: string;
}

interface CustomExamListProps {
  onBack: () => void;
  onStartExam: (questions: any[], title: string, subject: string, duration: number) => void;
  examType: "quiz" | "exam";
}

const CustomExamList = ({ onBack, onStartExam, examType }: CustomExamListProps) => {
  const { user } = useAuth();
  const [exams, setExams] = useState<CustomExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      if (data?.some((r) => r.role === "admin")) setIsAdmin(true);
    });
    fetchExams();
  }, [user]);

  const fetchExams = async () => {
    setLoading(true);
    const filterType = examType === "quiz" ? "custom_quiz" : "custom_exam";
    const { data, error } = await supabase
      .from("community_exams")
      .select("*")
      .eq("exam_type", filterType)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setExams(data as CustomExam[]);
    }
    setLoading(false);
  };

  const deleteExam = async (examId: string) => {
    const { error } = await supabase.from("community_exams").delete().eq("id", examId);
    if (!error) {
      setExams(prev => prev.filter(e => e.id !== examId));
      toast({ title: "পরীক্ষা মুছে ফেলা হয়েছে" });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted/30 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-display font-bold">📋 কাস্টম {examType === "quiz" ? "কুইজ" : "পরীক্ষা"}</h1>
          <p className="text-xs text-muted-foreground">অ্যাডমিনের তৈরি পরীক্ষায় অংশগ্রহণ করো</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="font-display font-bold">কোনো কাস্টম {examType === "quiz" ? "কুইজ" : "পরীক্ষা"} নেই</h2>
          <p className="text-sm text-muted-foreground">অ্যাডমিন এখনো কোনো পরীক্ষা তৈরি করেনি</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card-hover rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-display font-semibold text-base">{exam.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{exam.subject}</span>
                    <span className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" /> {exam.question_count}টি প্রশ্ন
                    </span>
                    <span className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {exam.duration_minutes} মিনিট
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatDate(exam.created_at)}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteExam(exam.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button variant="glow" size="sm" className="w-full rounded-xl gap-2"
                onClick={() => onStartExam(exam.questions as any[], exam.title, exam.subject, exam.duration_minutes)}>
                <Play className="w-3.5 h-3.5" /> পরীক্ষা শুরু করো
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomExamList;
