import { cn } from "@/lib/utils";
import { Zap, Target, Brain } from "lucide-react";

export type ThinkingLevel = "fast" | "balanced" | "deep";

/**
 * Model selection based on user effort level.
 * Models are selected automatically.
 */
export const THINKING_MODEL_MAP: Record<ThinkingLevel, string> = {
  fast: "meta-llama/llama-3.3-70b-instruct",
  balanced: "meta-llama/llama-3.3-70b-instruct",
  deep: "deepseek/deepseek-r1",
};

export const THINKING_LABELS: Record<
  ThinkingLevel,
  { label: string; hint: string }
> = {
  fast: {
    label: "Fast",
    hint: "Llama 3.3 · fast",
  },
  balanced: {
    label: "Balanced",
    hint: "Llama 3.3 · balanced",
  },
  deep: {
    label: "Deep",
    hint: "DeepSeek R1 · reasoning",
  },
};

interface Props {
  value: ThinkingLevel;
  onChange: (level: ThinkingLevel) => void;
  disabled?: boolean;
}

const OPTIONS: { id: ThinkingLevel; Icon: typeof Zap }[] = [
  { id: "fast", Icon: Zap },
  { id: "balanced", Icon: Target },
  { id: "deep", Icon: Brain },
];

export default function ThinkingSelector({ value, onChange, disabled }: Props) {
  return (
    <div
      className={cn(
        "inline-flex items-center bg-muted/40 border border-border/60 rounded-lg p-0.5",
        disabled && "opacity-40 pointer-events-none",
      )}
      title={THINKING_LABELS[value].hint}
    >
      {OPTIONS.map(({ id, Icon }) => {
        const isSelected = value === id;

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            disabled={disabled}
            title={THINKING_LABELS[id].hint}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-100",
              isSelected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-3 h-3" />
            {THINKING_LABELS[id].label}
          </button>
        );
      })}
    </div>
  );
}