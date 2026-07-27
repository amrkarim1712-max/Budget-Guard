import { useAuth } from "@workspace/replit-auth-web";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, LogOut } from "lucide-react";
import ThinkingSelector, { ThinkingLevel, THINKING_MODEL_MAP } from "@/components/thinking-selector";
import { useEffect, useState } from "react";
import { useListOpenrouterModels } from "@workspace/api-client-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [level, setLevel] = useState<ThinkingLevel>('balanced');
  const [model, setModel] = useState(THINKING_MODEL_MAP['balanced']);
  const { data: models } = useListOpenrouterModels();

  useEffect(() => {
    const prefsStr = localStorage.getItem("AI-prefs");
    if (prefsStr) {
      try {
        const prefs = JSON.parse(prefsStr);
        if (prefs.thinkingLevel) setLevel(prefs.thinkingLevel);
        if (prefs.model) setModel(prefs.model);
      } catch (e) {}
    }
  }, []);

  const updatePrefs = (updates: any) => {
    const prefsStr = localStorage.getItem("AI-prefs");
    const current = prefsStr ? JSON.parse(prefsStr) : {};
    const next = { ...current, ...updates };
    localStorage.setItem("AI-prefs", JSON.stringify(next));
  };

  const handleLevelChange = (newLevel: ThinkingLevel) => {
    setLevel(newLevel);
    updatePrefs({ thinkingLevel: newLevel });
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    updatePrefs({ model: newModel });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-12 md:px-8">
      <div className="max-w-xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-medium tracking-tight mb-1 text-foreground">Settings</h1>
          <p className="text-muted-foreground text-[15px]">Manage your intelligence preferences and account.</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-tight text-foreground uppercase">Appearance</h2>
          <div className="p-1 bg-muted/50 rounded-xl flex items-center border border-border/50">
            <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Sun className="w-4 h-4" /> Light
            </button>
            <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button onClick={() => setTheme('system')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${theme === 'system' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Monitor className="w-4 h-4" /> System
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-tight text-foreground uppercase">Intelligence</h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-[13px] font-medium text-foreground block mb-2">Default Thinking Level</label>
              <ThinkingSelector value={level} onChange={handleLevelChange} />
            </div>

            <div>
              <label className="text-[13px] font-medium text-foreground block mb-2">Default Model Override</label>
              <div className="relative">
                <select 
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-lg px-3 py-2.5 text-[15px] focus:ring-1 focus:ring-primary/30 outline-none appearance-none"
                >
                  {models?.map(m => (
                    <option key={m.id} value={m.id} className="bg-background text-foreground">
                      {m.name}
                    </option>
                  ))}
                  {!models && <option value={model}>{model}</option>}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-tight text-foreground uppercase">Account</h2>
          <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-medium">
                {user?.firstName?.[0] || user?.email?.[0] || "U"}
              </div>
              <div>
                <div className="font-medium text-[15px]">{user?.firstName || "User"}</div>
                <div className="text-[13px] text-muted-foreground">{user?.email || "No email"}</div>
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-border/50 text-center">
          <div className="text-[13px] text-muted-foreground font-medium">
            Version 1.0.0 • Built with OpenRouter + Replit
          </div>
        </section>

      </div>
    </div>
  );
}
