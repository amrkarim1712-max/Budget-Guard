import { useState, useRef, useEffect, useCallback } from "react";
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
import { ErrorBoundary } from "@/components/error-boundary";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [, params] = useRoute("/c/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: chat, isLoading: isChatLoading, isError: isChatError } = useGetOpenrouterConversation(id, {
    query: { enabled: !!id && !isNaN(id), queryKey: getGetOpenrouterConversationQueryKey(id) }
  });

  const { data: messages, isLoading: isMessagesLoading } = useListOpenrouterMessages(id, {
    query: { enabled: !!id && !isNaN(id), queryKey: getListOpenrouterMessagesQueryKey(id) }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<{ role: 'assistant'; content: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollDown(!isNearBottom);
  };

  useEffect(() => {
    if (!showScrollDown) {
      scrollToBottom();
    }
  }, [messages, streamingMessage, showScrollDown, scrollToBottom]);

  // Handle initial message passed from Home page via sessionStorage
  useEffect(() => {
    if (!id || isNaN(id)) return;
    const initialMsgStr = sessionStorage.getItem(`initial_msg_${id}`);
    if (initialMsgStr) {
      sessionStorage.removeItem(`initial_msg_${id}`);
      try {
        const initialMsg = JSON.parse(initialMsgStr);
        handleSend(initialMsg.content, initialMsg.model, initialMsg.webSearch, initialMsg.images ?? []);
      } catch {
        // Malformed sessionStorage entry — ignore
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSend = async (content: string, model: string, webSearch: boolean, images: string[]) => {
    if (!id || isNaN(id) || isSending) return;

    setIsSending(true);

    // Optimistic user message
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

    queryClient.setQueryData(getListOpenrouterMessagesQueryKey(id), (old: unknown) => {
      return [...(Array.isArray(old) ? old : []), tempUserMsg];
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

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Server error (${res.status})`);
      }

      if (!res.body) {
        throw new Error('No response body received from server');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
               throw new Error(data.error);
            }
            if (data.done) break;
            if (data.content) {
              setStreamingMessage(prev => ({
                role: 'assistant',
                content: (prev?.content ?? '') + data.content
              }));
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue; // incomplete chunk
            throw parseErr;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      toast({
        title: 'Message failed',
        description: message,
        variant: 'destructive',
      });
      // Roll back optimistic message
      queryClient.setQueryData(getListOpenrouterMessagesQueryKey(id), (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.filter((m: any) => m.id !== tempUserMsg.id);
      });
    } finally {
      setStreamingMessage(null);
      setIsSending(false);
      queryClient.invalidateQueries({ queryKey: getListOpenrouterMessagesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetOpenrouterConversationQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
    }
  };

  if (!id || isNaN(id)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Invalid conversation</p>
      </div>
    );
  }

  if (isChatLoading || isMessagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isChatError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <p className="text-sm text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  const shortModel = chat?.model?.split('/')[1] || chat?.model;

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-full relative">
        <div className="h-[52px] border-b border-border/60 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm z-10 sticky top-0 shrink-0">
          <h2 className="font-medium text-[15px] text-foreground truncate max-w-md tracking-tight">
            {chat?.title ?? "New Conversation"}
          </h2>
          {shortModel && (
            <div className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium font-mono tracking-tight">
              {shortModel}
            </div>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-8 md:px-8 scrollbar-thin"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          <div className="max-w-2xl mx-auto flex flex-col pb-8">
            {(!messages || messages.length === 0) && !streamingMessage && (
              <div className="text-center mt-20 text-[15px] text-muted-foreground font-medium">
                No messages yet
              </div>
            )}
            
            {(messages ?? []).map((msg: any) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {streamingMessage && (
              <MessageBubble message={{ ...streamingMessage, id: 'streaming' } as any} isStreaming />
            )}
          </div>
        </div>

        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors text-foreground z-20"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        <div className="p-4 shrink-0 bg-background">
          <div className="max-w-2xl mx-auto">
            <Composer
              onSend={handleSend}
              defaultModel={chat?.model}
              disabled={isSending}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
