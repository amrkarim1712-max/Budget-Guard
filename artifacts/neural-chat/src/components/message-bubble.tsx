import { Copy, RefreshCw, Check, ExternalLink, Globe, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

// ── Copy button (shared, self-contained "copied" feedback) ─────────────────────
// Used both in the message action row and inside code blocks so the
// copy → checkmark → revert behavior and timing stay in one place.

function CopyButton({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "default" | "code";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "code") {
    return (
      <button
        onClick={handleCopy}
        aria-label={copied ? "Copied to clipboard" : "Copy code"}
        className={cn(
          "flex items-center gap-1 text-[11px] font-mono text-[#7d8590] hover:text-[#cdd9e5]",
          "transition-colors duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7d8590]/50 rounded px-1"
        )}
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : "Copy message"}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-[12px]",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Source card ────────────────────────────────────────────────────────────────

function SourceCard({ url, index }: { url: string; index: number }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Source ${index + 1}: ${hostname(url)}`}
      className={cn(
        "flex items-start gap-2.5 p-2.5 rounded-xl border border-border bg-muted/30 group min-w-0",
        "transition-all duration-150 ease-out",
        "hover:bg-muted/60 hover:border-border/80 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      )}
    >
      <div className="w-5 h-5 rounded-md bg-border/60 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-muted-foreground truncate">{hostname(url)}</div>
        <div className="text-[11px] text-muted-foreground/60 truncate">{url}</div>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors duration-150" />
    </a>
  );
}

// ── Sources panel ──────────────────────────────────────────────────────────────

function SourcesPanel({ citations }: { citations: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? citations : citations.slice(0, 3);
  const remaining = citations.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-4 pt-4 border-t border-border/50"
    >
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse sources" : "Expand sources"}
        className={cn(
          "flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground mb-2.5",
          "hover:text-foreground transition-colors duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-md"
        )}
      >
        <Globe className="w-3.5 h-3.5" />
        {citations.length} {citations.length === 1 ? 'source' : 'sources'}
        <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform duration-200", expanded && "rotate-180")} />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {shown.map((url, i) => (
          <SourceCard key={url} url={url} index={i} />
        ))}
      </div>

      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "mt-1.5 text-[11px] text-muted-foreground hover:text-foreground",
            "transition-colors duration-150 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded"
          )}
        >
          +{remaining} more
        </button>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface MessageProps {
  message: {
    id: string | number;
    role: string;
    content: string;
    images?: string[] | null;
    citations?: string[] | null;
    createdAt?: string;
  };
  isStreaming?: boolean;
  streamingCitations?: string[];
}

export default function MessageBubble({ message, isStreaming = false, streamingCitations }: MessageProps) {
  const isUser = message.role === "user";
  const [hover, setHover] = useState(false);

  const citations = message.citations ?? streamingCitations ?? null;
  const showCitations = !isUser && !isStreaming && citations && citations.length > 0;

  // ── User bubble ──────────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-end w-full mb-6"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="flex flex-col items-end max-w-[78%]">
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Attached image ${i + 1}`}
                  className="max-w-[200px] max-h-[200px] rounded-xl object-cover border border-border shadow-sm"
                />
              ))}
            </div>
          )}
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-foreground text-background text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm">
            {message.content}
          </div>
          <AnimatePresence>
            {hover && message.createdAt && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] text-muted-foreground mt-1"
              >
                {relativeTime(message.createdAt)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // ── Assistant message ────────────────────────────────────────────────────────
  const isEmptyStreaming = isStreaming && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3 w-full mb-8 group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar */}
      <div className="shrink-0 w-6 h-6 mt-0.5 rounded-md border border-border bg-muted flex items-center justify-center shadow-sm">
        <span className="text-[10px] font-bold text-foreground">N</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Thinking dots */}
        {isEmptyStreaming ? (
          <div className="flex gap-1 items-center h-6 mt-1" role="status" aria-label="Thinking">
            {[0, 0.15, 0.3].map((delay, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay }}
              />
            ))}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words text-[14px]
            prose-p:leading-[1.65] prose-p:my-2.5
            prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0
            prose-code:text-[13px] prose-code:font-mono
            prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-code:before:content-none prose-code:after:content-none
            prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-headings:mt-5 prose-headings:mb-2
            prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground
            prose-hr:border-border
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  if (!inline && match) {
                    return (
                      <div className="rounded-xl overflow-hidden my-3 border border-[#30363d] shadow-sm">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                          <span className="text-[11px] text-[#7d8590] font-mono tracking-wide">{match[1]}</span>
                          <CopyButton text={code} variant="code" />
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '1rem', background: '#0d1117', fontSize: '13px' }}
                          codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
                        >
                          {code}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  return <code {...props} className={className}>{children}</code>;
                },
              }}
            >
              {message.content + (isStreaming && message.content ? " ▋" : "")}
            </ReactMarkdown>
          </div>
        )}

        {/* Citations / Sources */}
        {showCitations && <SourcesPanel citations={citations!} />}

        {/* Actions */}
        {!isStreaming && (
          <div className={cn(
            "flex items-center gap-1 mt-2 transition-opacity duration-150 ease-out",
            hover ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
          )}>
            <CopyButton text={message.content} />
            <button
              aria-label="Retry response"
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[12px]",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                "transition-all duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}