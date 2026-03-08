import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Clock, Target, Zap, Play, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const quizCategories = [
  { label: "MCQ", desc: "Multiple Choice Questions" },
  { label: "CQ", desc: "Creative Questions" },
  { label: "Exam Mode", desc: "Timed with negative marking" },
];

const sampleQuestions = [
  {
    id: 1,
    question: "What is the SI unit of force?",
    options: ["Joule", "Newton", "Watt", "Pascal"],
    correct: 1,
  },
  {
    id: 2,
    question: "Which element has atomic number 6?",
    options: ["Oxygen", "Nitrogen", "Carbon", "Boron"],
    correct: 2,
  },
  {
    id: 3,
    question: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"],
    correct: 2,
  },
];

const Quiz = () => {
  const [mode, setMode] = useState<"select" | "quiz" | "result">("select");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(sampleQuestions.length).fill(null));
  const [selected, setSelected] = useState<number | null>(null);

  const startQuiz = () => {
    setMode("quiz");
    setCurrentQ(0);
    setAnswers(new Array(sampleQuestions.length).fill(null));
  };

  const submitAnswer = () => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < sampleQuestions.length - 1) {
      setCurrentQ((p) => p + 1);
    } else {
      setMode("result");
    }
  };

  const score = answers.filter((a, i) => a === sampleQuestions[i].correct).length;

  if (mode === "result") {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <Target className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold">{score}/{sampleQuestions.length}</h2>
            <p className="text-muted-foreground mt-1">Questions answered correctly</p>
          </div>
          <div className="space-y-3 text-left">
            {sampleQuestions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                {answers[i] === q.correct ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium">{q.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">Correct: {q.options[q.correct]}</p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="glow" className="rounded-xl" onClick={() => setMode("select")}>Back to Quiz Menu</Button>
        </motion.div>
      </div>
    );
  }

  if (mode === "quiz") {
    const q = sampleQuestions[currentQ];
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Question {currentQ + 1}/{sampleQuestions.length}</span>
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <Clock className="w-4 h-4" /> 2:30
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-display font-semibold">{q.question}</h2>
          </div>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full text-left p-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selected === i
                    ? "bg-primary/15 border border-primary/40 text-primary"
                    : "glass-card hover:border-primary/20"
                }`}
              >
                <span className="mr-3 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
          <Button variant="glow" className="w-full rounded-xl" disabled={selected === null} onClick={submitAnswer}>
            {currentQ < sampleQuestions.length - 1 ? "Next Question" : "Submit Quiz"}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-secondary" /> Quiz & Exam Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Test your knowledge with AI-generated questions</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quizCategories.map((cat, i) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="glass-card-hover rounded-2xl p-6 cursor-pointer text-center space-y-3"
            onClick={startQuiz}
          >
            <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center mx-auto">
              {cat.label === "MCQ" ? <Zap className="w-5 h-5 text-secondary" /> : cat.label === "CQ" ? <Brain className="w-5 h-5 text-secondary" /> : <Clock className="w-5 h-5 text-secondary" />}
            </div>
            <div>
              <h3 className="font-display font-semibold">{cat.label}</h3>
              <p className="text-xs text-muted-foreground">{cat.desc}</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              <Play className="w-3.5 h-3.5" /> Start
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Quiz;
