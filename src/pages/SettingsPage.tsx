import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Key, Cpu, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const SettingsPage = () => {
  const [provider, setProvider] = useState<"gemini" | "openrouter">("gemini");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> API Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your AI provider and credentials</p>
      </motion.div>

      {/* Provider Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" /> AI Provider
        </h2>
        <div className="flex gap-2">
          {(["gemini", "openrouter"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                provider === p
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {p === "gemini" ? "Google Gemini" : "OpenRouter"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* API Key */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <Key className="w-4 h-4 text-secondary" /> API Key
        </h2>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider === "gemini" ? "Enter your Google Gemini API key..." : "Enter your OpenRouter API key..."}
          className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
        />
      </motion.div>

      {/* Custom Model ID */}
      {provider === "openrouter" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm">Custom Model ID</h2>
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="e.g., deepseek/deepseek-chat"
            className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground font-mono"
          />
          <p className="text-xs text-muted-foreground">Enter the model identifier from OpenRouter's model list</p>
        </motion.div>
      )}

      <Button variant="glow" className="w-full rounded-xl gap-2" onClick={handleSave}>
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
      </Button>
    </div>
  );
};

export default SettingsPage;
