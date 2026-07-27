import { useCallback, useRef, useState } from "react";
import { ArrowUp, Globe, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ThinkingSelector, { ThinkingLevel, THINKING_MODEL_MAP } from "./thinking-selector";

interface ComposerProps {
  onSend: (content: string, model: string, webSearch: boolean, images: string[]) => void;
  defaultModel?: string;
  disabled?: boolean;
}

// Sizing constants for the textarea. Bumped up slightly from the original
// to give the composer a bit more presence, matching premium AI products.
const MIN_TEXTAREA_HEIGHT = 56;
const MAX_TEXTAREA_HEIGHT = 280;

// ---------------------------------------------------------------------------
// Future extension point: today only images are supported, but the shape of
// "attachments" is kept simple/flat (string[] of data URLs) to match the
// existing onSend signature. When files / PDFs / voice / vision / MCP tool
// attachments are added, consider introducing a discriminated union like:
//
//   type Attachment =
//     | { kind: "image"; dataUrl: string }
//     | { kind: "file"; name: string; dataUrl: string }
//     | { kind: "pdf"; name: string; dataUrl: string }
//     | { kind: "voice"; blobUrl: string; durationMs: number };
//
// and a single `attachments: Attachment[]` state array, with the toolbar
// rendering one "attach" affordance per kind via a small config list. The
// toolbar and preview rail below are already structured so a new kind is a
// matter of adding another button + preview renderer, not restructuring the
// component. onSend's public signature is left untouched here.
// ---------------------------------------------------------------------------

function modelToLevel(model: string): ThinkingLevel {
  const stripped = model.replace(/:online$/, "").replace(/:free$/, "");
  for (const [level, m] of Object.entries(THINKING_MODEL_MAP) as [ThinkingLevel, string][]) {
    if (m.replace(/:free$/, "") === stripped) return level;
  }
  return "balanced";
}

export default function Composer({ onSend, defaultModel, disabled }: ComposerProps) {
  const [content, setContent] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [level, setLevel] = useState<ThinkingLevel>(
    defaultModel ? modelToLevel(defaultModel) : "balanced"
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModel = THINKING_MODEL_MAP[level];

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  const resetTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
  }, []);

  const focusTextarea = useCallback(() => {
    // Defer to the next frame so it runs after the state update/re-render.
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const readFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setImages((prev) => [...prev, e.target!.result as string]);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) readFile(file);
        }
      }
    },
    [readFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      Array.from(e.dataTransfer.files).forEach(readFile);
    },
    [readFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) Array.from(e.target.files).forEach(readFile);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [readFile]
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, j) => j !== index));
  }, []);

  const submit = useCallback(() => {
    if (disabled) return;
    if (!content.trim() && images.length === 0) return;
    onSend(content.trim(), activeModel, webSearch, images);
    setContent("");
    setImages([]);
    resetTextareaHeight();
    focusTextarea();
  }, [disabled, content, images, onSend, activeModel, webSearch, resetTextareaHeight, focusTextarea]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isEnter = e.key === "Enter";
      if (!isEnter) return;

      // Shift+Enter -> newline (let the browser handle it, no-op here).
      if (e.shiftKey) return;

      // Enter, Ctrl+Enter, or Cmd+Enter -> send.
      e.preventDefault();
      submit();
    },
    [submit]
  );

  const canSubmit = !disabled && (content.trim().length > 0 || images.length > 0);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl shadow-sm",
        "transition-all duration-200 ease-out",
        "focus-within:border-foreground/25 focus-within:shadow-[0_2px_18px_-4px_rgba(0,0,0,0.12)]"
      )}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2.5 px-4 pt-3.5 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <div
              key={i}
              className={cn(
                "relative w-16 h-16 rounded-xl overflow-hidden shrink-0",
                "border border-border/80 shadow-sm",
                "transition-transform duration-200 ease-out hover:scale-[1.03]"
              )}
            >
              <img src={img} alt={`Attached image ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                aria-label={`Remove image ${i + 1}`}
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  "bg-black/0 hover:bg-black/55 opacity-0 hover:opacity-100",
                  "transition-all duration-150 ease-out",
                  "focus-visible:opacity-100 focus-visible:bg-black/55 focus-visible:outline-none"
                )}
              >
                <span className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white" />
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <div className="px-4 pt-3.5 pb-1.5">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onInput={autoResize}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="Ask anything..."
          aria-label="Message"
          rows={1}
          style={{ minHeight: MIN_TEXTAREA_HEIGHT, maxHeight: MAX_TEXTAREA_HEIGHT }}
          className={cn(
            "w-full bg-transparent resize-none outline-none",
            "text-[15px] leading-relaxed tracking-[-0.01em] text-foreground",
            "placeholder:text-muted-foreground/45",
            "overflow-y-auto scrollbar-thin",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1.5 gap-2">
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
          {/* Thinking level */}
          <ThinkingSelector value={level} onChange={setLevel} disabled={disabled} />

          <div className="w-px h-4 bg-border shrink-0 mx-1" />

          {/* Web Search */}
          <button
            onClick={() => setWebSearch((v) => !v)}
            disabled={disabled}
            aria-pressed={webSearch}
            aria-label={webSearch ? "Disable web search" : "Enable web search"}
            title={webSearch ? "Web search on" : "Enable web search"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium shrink-0",
              "transition-all duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
              webSearch
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            Search
          </button>

          {/* Image attach */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept="image/*"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Attach image"
            title="Attach image"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium shrink-0",
              "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              "transition-all duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image
          </button>
        </div>

        {/* Send */}
        <button
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send message"
          title="Send (Enter)"
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            "bg-foreground text-background shadow-sm",
            "transition-all duration-150 ease-out",
            "hover:opacity-90 hover:shadow-md active:scale-90",
            "disabled:opacity-25 disabled:shadow-none disabled:active:scale-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          )}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}