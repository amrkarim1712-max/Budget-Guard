import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, ArrowRight, MessageSquareText, Search, Code, FileText } from "lucide-react";
import Composer from "@/components/composer";
import { useCreateOpenrouterConversation } from "@workspace/api-client-react";

const SUGGESTIONS = [
  { icon: Search, text: "Search the web for recent news about AI models" },
  { icon: Code, text: "Write a React hook for debouncing window resize" },
  { icon: FileText, text: "Summarize the key principles of Stoicism" },
  { icon: MessageSquareText, text: "Help me prepare for a frontend interview" }
];

export default function Home() {
  const [, setLocation] = useLocation();
  const createChat = useCreateOpenrouterConversation();
  
  const handleSend = (content: string, model: string, webSearch: boolean, images: string[]) => {
    createChat.mutate(
      { data: { title: content.slice(0, 40) + "...", model } },
      {
        onSuccess: (chat) => {
          // Pass the initial message state via history state or just redirect 
          // and let the chat page handle the first message via an effect if we passed it in URL,
          // but cleaner: we create the chat, navigate to it, and send the message there.
          // Since wouter doesn't have great state passing, we can use sessionStorage.
          sessionStorage.setItem(`initial_msg_${chat.id}`, JSON.stringify({ content, model, webSearch, images }));
          setLocation(`/c/${chat.id}`);
        }
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full items-center justify-center relative px-4">
      <div className="w-full max-w-3xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-medium text-foreground text-center mb-2 tracking-tight">
          How can I help you today?
        </h1>
        <p className="text-muted-foreground mb-12 text-center max-w-md">
          NeuralChat is a powerful thinking companion.
          Search the web, analyze images, and write code.
        </p>

        <div className="w-full max-w-2xl mb-8">
          <Composer onSend={handleSend} disabled={createChat.isPending} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
          {SUGGESTIONS.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSend(suggestion.text, "openrouter/auto", false, [])}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-muted/50 transition-all text-left text-sm group"
            >
              <div className="p-2 bg-background rounded-lg shadow-sm border border-border/50 group-hover:text-primary transition-colors">
                <suggestion.icon className="w-4 h-4" />
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                {suggestion.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
