import { Copy, RefreshCw, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

export default function MessageBubble({ message, isStreaming = false }: { message: any, isStreaming?: boolean }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEmptyStreaming = isStreaming && !message.content;

  if (isUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex justify-end w-full group relative mb-4"
        onMouseEnter={() => setShowTime(true)}
        onMouseLeave={() => setShowTime(false)}
      >
        <div className="flex flex-col items-end max-w-[75%] relative">
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {message.images.map((img: string, i: number) => (
                <img key={i} src={img} alt="attached" className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-border" />
              ))}
            </div>
          )}
          
          <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-primary text-primary-foreground text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap font-[450]">
            {message.content}
          </div>
          
          <AnimatePresence>
            {showTime && message.createdAt && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="text-[11px] text-muted-foreground mt-1 absolute -top-5 right-0 whitespace-nowrap"
              >
                {formatRelativeTime(message.createdAt)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-4 group w-full relative mb-8"
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      <div className="shrink-0 w-[24px] h-[24px] mt-1 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold text-xs select-none">
        N
      </div>

      <div className="flex flex-col w-full min-w-0 relative">
        <AnimatePresence>
          {showTime && message.createdAt && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="text-[11px] text-muted-foreground mb-1 absolute -top-5 left-0 whitespace-nowrap"
            >
              {formatRelativeTime(message.createdAt)}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-foreground text-[15px] leading-relaxed">
          {isEmptyStreaming ? (
            <div className="flex gap-1 items-center h-6">
              <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} />
              <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} />
              <motion.div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words
              prose-p:leading-[1.6] prose-p:my-3 prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 
              prose-code:text-[13px] prose-code:font-mono prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
              prose-code:before:content-none prose-code:after:content-none
              prose-ul:my-3 prose-li:my-1
              prose-headings:font-medium prose-headings:tracking-tight prose-headings:mt-6 prose-headings:mb-3 prose-headings:border-b prose-headings:border-border/30 prose-headings:pb-2
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="rounded-lg overflow-hidden my-4 border border-[#2a2a2a] bg-[#0d1117]">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#2a2a2a] text-xs text-[#8b949e] font-mono">
                          <span>{match[1]}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                            className="hover:text-[#c9d1d9] transition-colors flex items-center gap-1.5"
                          >
                            <Copy className="w-3 h-3" /> Copy
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
                {message.content + (isStreaming && message.content ? " ▋" : "")}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && !isStreaming && (
          <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground transition-colors text-xs font-medium"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground transition-colors text-xs font-medium" title="Regenerate">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
