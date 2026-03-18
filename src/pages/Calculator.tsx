import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Delete, RotateCcw } from "lucide-react";
import * as math from "mathjs";

const Calculator = () => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("0");
  const [isShift, setIsShift] = useState(false);
  const [isDeg, setIsDeg] = useState(true);

  const handleInput = useCallback((val: string) => {
    setInput(prev => prev + val);
  }, []);

  const handleClear = () => { setInput(""); setResult("0"); };
  const handleDelete = () => setInput(prev => prev.slice(0, -1));

  const calculate = useCallback(() => {
    if (!input.trim()) return;
    try {
      let expr = input
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, `(${Math.PI})`)
        .replace(/e(?![a-z])/g, `(${Math.E})`)
        .replace(/(\d+)!/g, "factorial($1)")
        .replace(/√\(/g, "sqrt(")
        .replace(/∛\(/g, "cbrt(")
        .replace(/(\d+)\^/g, "$1^")
        .replace(/log\(/g, "log10(")
        .replace(/ln\(/g, "log(");

      if (isDeg) {
        expr = expr
          .replace(/sin\(/g, "sin(pi/180*")
          .replace(/cos\(/g, "cos(pi/180*")
          .replace(/tan\(/g, "tan(pi/180*");
        if (isShift) {
          expr = expr
            .replace(/sin⁻¹\(/g, "(180/pi)*asin(")
            .replace(/cos⁻¹\(/g, "(180/pi)*acos(")
            .replace(/tan⁻¹\(/g, "(180/pi)*atan(");
        }
      } else {
        if (isShift) {
          expr = expr
            .replace(/sin⁻¹\(/g, "asin(")
            .replace(/cos⁻¹\(/g, "acos(")
            .replace(/tan⁻¹\(/g, "atan(");
        }
      }

      const res = math.evaluate(expr);
      const formatted = typeof res === "number"
        ? Number.isInteger(res) ? String(res) : parseFloat(res.toPrecision(12)).toString()
        : String(res);
      setResult(formatted);
    } catch {
      setResult("Error");
    }
  }, [input, isDeg, isShift]);

  const btnClass = (type: "num" | "op" | "fn" | "eq" | "special") => {
    const base = "flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 select-none";
    switch (type) {
      case "num": return `${base} bg-muted/30 hover:bg-muted/50 text-foreground h-12`;
      case "op": return `${base} bg-primary/15 hover:bg-primary/25 text-primary h-12`;
      case "fn": return `${base} bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground h-10 text-xs`;
      case "eq": return `${base} bg-primary hover:bg-primary/90 text-primary-foreground h-12 shadow-lg shadow-primary/20`;
      case "special": return `${base} bg-destructive/10 hover:bg-destructive/20 text-destructive h-12`;
      default: return base;
    }
  };

  const fnButtons = isShift
    ? [
        { label: "sin⁻¹", action: () => handleInput("sin⁻¹(") },
        { label: "cos⁻¹", action: () => handleInput("cos⁻¹(") },
        { label: "tan⁻¹", action: () => handleInput("tan⁻¹(") },
        { label: "10ˣ", action: () => handleInput("10^") },
        { label: "eˣ", action: () => handleInput("e^") },
        { label: "∛(", action: () => handleInput("∛(") },
      ]
    : [
        { label: "sin", action: () => handleInput("sin(") },
        { label: "cos", action: () => handleInput("cos(") },
        { label: "tan", action: () => handleInput("tan(") },
        { label: "log", action: () => handleInput("log(") },
        { label: "ln", action: () => handleInput("ln(") },
        { label: "√(", action: () => handleInput("√(") },
      ];

  return (
    <div className="p-4 lg:p-8 max-w-md mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-display font-bold text-center">🔬 সায়েন্টিফিক ক্যালকুলেটর</h1>
        <p className="text-xs text-muted-foreground text-center mt-1">Casio fx-991ES Style</p>
      </motion.div>

      {/* Display */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-4 space-y-1 border border-border/50">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isDeg ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"}`}>
            {isDeg ? "DEG" : "RAD"}
          </span>
          {isShift && <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-500 font-bold">SHIFT</span>}
        </div>
        <p className="text-right text-sm text-muted-foreground min-h-[20px] break-all font-mono">{input || " "}</p>
        <p className="text-right text-3xl font-bold font-mono text-foreground min-h-[40px] break-all">{result}</p>
      </motion.div>

      {/* Mode Buttons */}
      <div className="flex gap-2">
        <button onClick={() => setIsShift(!isShift)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${isShift ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" : "bg-muted/30 text-muted-foreground"}`}>
          SHIFT
        </button>
        <button onClick={() => setIsDeg(!isDeg)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${isDeg ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary/15 text-secondary border border-secondary/30"}`}>
          {isDeg ? "DEG → RAD" : "RAD → DEG"}
        </button>
      </div>

      {/* Function Buttons */}
      <div className="grid grid-cols-6 gap-1.5">
        {fnButtons.map(btn => (
          <button key={btn.label} onClick={btn.action} className={btnClass("fn")}>{btn.label}</button>
        ))}
      </div>

      {/* Extra Functions Row */}
      <div className="grid grid-cols-6 gap-1.5">
        <button onClick={() => handleInput("x²")} className={btnClass("fn")}>x²</button>
        <button onClick={() => handleInput("^")} className={btnClass("fn")}>xⁿ</button>
        <button onClick={() => handleInput("(")} className={btnClass("fn")}>(</button>
        <button onClick={() => handleInput(")")} className={btnClass("fn")}>)</button>
        <button onClick={() => handleInput("!")} className={btnClass("fn")}>n!</button>
        <button onClick={() => handleInput("π")} className={btnClass("fn")}>π</button>
      </div>

      {/* Main Keypad */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => handleInput("7")} className={btnClass("num")}>7</button>
        <button onClick={() => handleInput("8")} className={btnClass("num")}>8</button>
        <button onClick={() => handleInput("9")} className={btnClass("num")}>9</button>
        <button onClick={() => handleInput("÷")} className={btnClass("op")}>÷</button>

        <button onClick={() => handleInput("4")} className={btnClass("num")}>4</button>
        <button onClick={() => handleInput("5")} className={btnClass("num")}>5</button>
        <button onClick={() => handleInput("6")} className={btnClass("num")}>6</button>
        <button onClick={() => handleInput("×")} className={btnClass("op")}>×</button>

        <button onClick={() => handleInput("1")} className={btnClass("num")}>1</button>
        <button onClick={() => handleInput("2")} className={btnClass("num")}>2</button>
        <button onClick={() => handleInput("3")} className={btnClass("num")}>3</button>
        <button onClick={() => handleInput("-")} className={btnClass("op")}>−</button>

        <button onClick={() => handleInput("0")} className={btnClass("num")}>0</button>
        <button onClick={() => handleInput(".")} className={btnClass("num")}>.</button>
        <button onClick={() => handleInput("e")} className={btnClass("num")}>e</button>
        <button onClick={() => handleInput("+")} className={btnClass("op")}>+</button>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={handleClear} className={btnClass("special")}>
          <RotateCcw className="w-4 h-4 mr-1" /> AC
        </button>
        <button onClick={handleDelete} className={btnClass("special")}>
          <Delete className="w-4 h-4 mr-1" /> DEL
        </button>
        <button onClick={calculate} className={btnClass("eq")}>=</button>
      </div>

      {/* Ans button */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { if (result !== "0" && result !== "Error") handleInput(result); }} className={btnClass("fn")}>Ans</button>
        <button onClick={() => handleInput("%")} className={btnClass("fn")}>%</button>
      </div>
    </div>
  );
};

export default Calculator;
