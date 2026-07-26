import { Copy, RefreshCw, Pencil, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";

export default function MessageBubble({ message, isStreaming = false }: { message: any, isStreaming?: boolean }) {
  const isUser = message.role === "user";
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex gap-4 group w-full", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm select-none">
        {isUser ? (
          <div className="w-full h-full rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium text-xs">
            {user?.firstName?.[0] || user?.email?.[0] || "U"}
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-xs">
            N
          </div>
        )}
      </div>

      <div className={cn(
        "flex flex-col max-w-[85%]",
        isUser ? "items-end" : "items-start"
      )}>
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {message.images.map((img: string, i: number) => (
              <img key={i} src={img} alt="attached" className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-border" />
            ))}
          </div>
        )}

        <div className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border/50 text-foreground rounded-tl-sm shadow-sm"
        )}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words
              prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 
              prose-code:text-[13px] prose-code:font-mono prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
              prose-code:before:content-none prose-code:after:content-none
              prose-ul:my-2 prose-li:my-0.5
              prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mt-4 prose-headings:mb-2
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="rounded-lg overflow-hidden my-4 border border-border/50 bg-[#1e1e1e]">
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/10 text-xs text-muted-foreground font-mono">
                          <span>{match[1]}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                            className="hover:text-foreground transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                          codeTagProps={{ style: { fontFamily: 'inherit' } }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code {...props} className={className}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.content + (isStreaming ? " ▋" : "")}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && !isStreaming && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Regenerate">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {isUser && !isStreaming && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
            <button 
              disabled
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors opacity-50 cursor-not-allowed"
              title="Edit (Coming soon)"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
