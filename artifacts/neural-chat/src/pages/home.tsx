import { useLocation } from "wouter";
import { Code, Search, FileText, BarChart } from "lucide-react";
import Composer from "@/components/composer";
import { useCreateOpenrouterConversation } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { THINKING_MODEL_MAP } from "@/components/thinking-selector";

const SUGGESTIONS = [
  { icon: Code, text: "Debug my code" },
  { icon: Search, text: "Explain a concept" },
  { icon: FileText, text: "Draft a response" },
  { icon: BarChart, text: "Analyze this" }
];

export default function Home() {
  const [, setLocation] = useLocation();
  const createChat = useCreateOpenrouterConversation();
  const { toast } = useToast();
  
  const [defaultModel, setDefaultModel] = useState(THINKING_MODEL_MAP['balanced']);

  useEffect(() => {
    const prefsStr = localStorage.getItem("AI-prefs");
    if (prefsStr) {
      try {
        const prefs = JSON.parse(prefsStr);
        if (prefs.model) {
          setDefaultModel(prefs.model);
        } else if (prefs.thinkingLevel) {
          setDefaultModel(THINKING_MODEL_MAP[prefs.thinkingLevel as keyof typeof THINKING_MODEL_MAP]);
        }
      } catch (e) {}
    }
  }, []);

  const handleSend = (content: string, model: string, webSearch: boolean, images: string[]) => {
    const title = content.length > 40 ? content.slice(0, 40) + "..." : content;
    createChat.mutate(
      { data: { title, model } },
      {
        onSuccess: (chat) => {
          sessionStorage.setItem(
            `initial_msg_${chat.id}`,
            JSON.stringify({ content, model, webSearch, images })
          );
          setLocation(`/c/${chat.id}`);
        },
        onError: () => {
          toast({
            title: "Failed to create conversation",
            description: "Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full items-center justify-center relative px-4">
      <div className="w-full max-w-2xl flex flex-col items-center animate-in fade-in duration-700 ease-out mt-[-10vh]">
        <h1 className="text-[32px] font-[450] text-foreground text-center mb-1.5 tracking-tight">
          What would you like to explore?
        </h1>
        <p className="text-muted-foreground text-[15px] mb-10 text-center">
          Ask anything. Think deeper.
        </p>

        <div className="w-full mb-10">
          <Composer onSend={handleSend} disabled={createChat.isPending} defaultModel={defaultModel} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {SUGGESTIONS.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSend(suggestion.text, defaultModel, false, [])}
              disabled={createChat.isPending}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <suggestion.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <span className="text-foreground text-[15px] font-medium">
                {suggestion.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
