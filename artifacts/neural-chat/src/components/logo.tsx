import { cn } from "@/lib/utils";

/**
 * AI logo mark — a neural hub: central node with four dendrite connections.
 * Monochromatic, uses currentColor so it adapts to any text color context.
 */
export function NeuralLogo({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Central node */}
      <circle cx="10" cy="10" r="2.8" fill="currentColor" />
      {/* North dendrite */}
      <line x1="10" y1="1.5" x2="10" y2="7.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="1.5" r="1.5" fill="currentColor" />
      {/* East dendrite */}
      <line x1="12.8" y1="10" x2="18.5" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="18.5" cy="10" r="1.5" fill="currentColor" />
      {/* South dendrite */}
      <line x1="10" y1="12.8" x2="10" y2="18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="18.5" r="1.5" fill="currentColor" />
      {/* West dendrite */}
      <line x1="7.2" y1="10" x2="1.5" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="1.5" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Full wordmark: logo + "AI" text */
export function NeuralWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <NeuralLogo size={18} />
      <span className="font-semibold text-[15px] tracking-[-0.02em]">AI</span>
    </div>
  );
}
