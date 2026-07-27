import { cn } from "@/lib/utils";
import { Zap, Target, Brain } from "lucide-react";

export type ThinkingLevel = 'fast' | 'balanced' | 'deep';

export const THINKING_MODEL_MAP: Record<ThinkingLevel, string> = {
  fast: 'meta-llama/llama-3.3-70b-instruct',
  balanced: 'openai/gpt-4o-mini',
  deep: 'anthropic/claude-sonnet-4-5',
};

interface Props {
  value: ThinkingLevel;
  onChange: (level: ThinkingLevel) => void;
  disabled?: boolean;
}

export default function ThinkingSelector({ value, onChange, disabled }: Props) {
  const options: { id: ThinkingLevel; label: string; icon: any }[] = [
    { id: 'fast', label: 'Fast', icon: Zap },
    { id: 'balanced', label: 'Balanced', icon: Target },
    { id: 'deep', label: 'Deep', icon: Brain },
  ];

  return (
    <div className={cn(
      "inline-flex items-center bg-transparent border border-border rounded-lg p-0.5 shadow-sm",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {options.map((opt) => {
        const isSelected = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
              isSelected 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
