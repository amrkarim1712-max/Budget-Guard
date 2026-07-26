import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { 
  useGetOpenrouterConversation, 
  useListOpenrouterMessages,
  getGetOpenrouterConversationQueryKey,
  getListOpenrouterMessagesQueryKey,
  getListOpenrouterConversationsQueryKey
} from "@workspace/api-client-react";
import Composer from "@/components/composer";
import MessageBubble from "@/components/message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Chat() {
  const [, params] = useRoute("/c/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  
  const { data: chat, isLoading: isChatLoading } = useGetOpenrouterConversation(id, {
    query: { enabled: !!id, queryKey: getGetOpenrouterConversationQueryKey(id) }
  });

  const { data: messages, isLoading: isMessagesLoading } = useListOpenrouterMessages(id, {
    query: { enabled: !!id, queryKey: getListOpenrouterMessagesQueryKey(id) }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<{role: 'assistant', content: string} | null>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollDown(!isNearBottom);
  };

  useEffect(() => {
    if (!showScrollDown) {
      scrollToBottom();
    }
  }, [messages, streamingMessage]);

  // Handle initial message from Home page
  useEffect(() => {
    if (!id) return;
    const initialMsgStr = sessionStorage.getItem(`initial_msg_${id}`);
    if (initialMsgStr) {
      sessionStorage.removeItem(`initial_msg_${id}`);
      const initialMsg = JSON.parse(initialMsgStr);
      handleSend(initialMsg.content, initialMsg.model, initialMsg.webSearch, initialMsg.images);
    }
  }, [id]);

  const handleSend = async (content: string, model: string, webSearch: boolean, images: string[]) => {
    if (!id) return;
    
    // Optimistically add user message
    const tempUserMsg = {
      id: Date.now(),
      conversationId: id,
      role: 'user',
      content,
      model,
      webSearch,
      images: images.length > 0 ? images : null,
      createdAt: new Date().toISOString()
    };
    
    queryClient.setQueryData(getListOpenrouterMessagesQueryKey(id), (old: any) => {
      return [...(old || []), tempUserMsg];
    });

    setStreamingMessage({ role: 'assistant', content: '' });

    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/openrouter/conversations/${id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, model, webSearch, images }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
          if (!dataStr.trim()) continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.done) break;
            if (data.content) {
              setStreamingMessage(prev => ({
                role: 'assistant',
                content: (prev?.content || '') + data.content
              }));
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (err) {
      console.error(err);
      // Handle error gracefully
    } finally {
      setStreamingMessage(null);
      queryClient.invalidateQueries({ queryKey: getListOpenrouterMessagesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetOpenrouterConversationQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() }); // Refresh titles
    }
  };

  if (isChatLoading || isMessagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="h-14 border-b border-border/50 flex items-center px-4 bg-background/80 backdrop-blur-sm z-10 sticky top-0 shrink-0">
        <h2 className="font-medium text-sm text-foreground truncate max-w-md">
          {chat?.title || "New Conversation"}
        </h2>
      </div>

      <div 
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
        onScroll={handleScroll}
        ref={scrollRef}
      >
        <div className="max-w-3xl mx-auto space-y-6 pb-8">
          {messages?.map((msg: any) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {streamingMessage && (
            <MessageBubble message={{...streamingMessage, id: 'streaming'} as any} isStreaming />
          )}
        </div>
      </div>

      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-colors text-foreground z-20"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      <div className="p-4 bg-gradient-to-t from-background via-background to-transparent shrink-0">
        <div className="max-w-3xl mx-auto">
          <Composer onSend={handleSend} defaultModel={chat?.model} disabled={!!streamingMessage} />
        </div>
      </div>
    </div>
  );
}
