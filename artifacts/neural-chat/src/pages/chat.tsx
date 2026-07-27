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

  const { data: chat, isLoading: isChatLoading, isError: isChatError } =
    useGetOpenrouterConversation(id, {
      query: { enabled: !!id && !isNaN(id), queryKey: getGetOpenrouterConversationQueryKey(id) }
    });

  const { data: messages, isLoading: isMessagesLoading } =
    useListOpenrouterMessages(id, {
      query: { enabled: !!id && !isNaN(id), queryKey: getListOpenrouterMessagesQueryKey(id) }
    });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Streaming state — includes live citations as they arrive
  const [streamingMessage, setStreamingMessage] = useState<{
    role: 'assistant';
    content: string;
    citations: string[];
  } | null>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    setShowScrollDown(t.scrollHeight - t.scrollTop - t.clientHeight > 120);
  };

  useEffect(() => {
    if (!showScrollDown) scrollToBottom();
  }, [messages, streamingMessage, showScrollDown, scrollToBottom]);

  // Handle initial message from Home page via sessionStorage
  useEffect(() => {
    if (!id || isNaN(id)) return;
    const raw = sessionStorage.getItem(`initial_msg_${id}`);
    if (!raw) return;
    sessionStorage.removeItem(`initial_msg_${id}`);
    try {
      const m = JSON.parse(raw);
      handleSend(m.content, m.model, m.webSearch, m.images ?? []);
    } catch { /* ignore malformed entry */ }
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
      citations: null,
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(getListOpenrouterMessagesQueryKey(id), (old: unknown) =>
      [...(Array.isArray(old) ? old : []), tempUserMsg]
    );
    setStreamingMessage({ role: 'assistant', content: '', citations: [] });

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
      if (!res.body) throw new Error('No response body received');

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
            if (data.error) throw new Error(data.error);
            if (data.done) break;

            if (data.content) {
              setStreamingMessage(prev => prev
                ? { ...prev, content: prev.content + data.content }
                : { role: 'assistant', content: data.content, citations: [] }
              );
            }
            // Live citations as they stream in
            if (Array.isArray(data.citations) && data.citations.length > 0) {
              setStreamingMessage(prev => prev
                ? { ...prev, citations: data.citations }
                : { role: 'assistant', content: '', citations: data.citations }
              );
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      toast({
        title: 'Message failed',
        description: err instanceof Error ? err.message : 'Failed to send message',
        variant: 'destructive',
      });
      queryClient.setQueryData(getListOpenrouterMessagesQueryKey(id), (old: unknown) =>
        Array.isArray(old) ? old.filter((m: any) => m.id !== tempUserMsg.id) : old
      );
    } finally {
      setStreamingMessage(null);
      setIsSending(false);
      queryClient.invalidateQueries({ queryKey: getListOpenrouterMessagesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetOpenrouterConversationQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
    }
  };

  if (!id || isNaN(id)) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Invalid conversation</p>
    </div>
  );

  if (isChatLoading || isMessagesLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (isChatError) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <AlertCircle className="w-5 h-5 text-destructive" />
      <p className="text-sm text-muted-foreground">Conversation not found</p>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-12 border-b border-border/60 flex items-center px-5 shrink-0">
          <h2 className="font-medium text-[14px] text-foreground truncate tracking-tight">
            {chat?.title ?? "New Conversation"}
          </h2>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 scrollbar-thin"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          <div className="max-w-2xl mx-auto pb-6">
            {(!messages || messages.length === 0) && !streamingMessage && (
              <p className="text-center text-sm text-muted-foreground/50 mt-16">
                No messages yet
              </p>
            )}

            {(messages ?? []).map((msg: any) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {streamingMessage && (
              <MessageBubble
                message={{ ...streamingMessage, id: 'streaming', citations: null }}
                isStreaming
                streamingCitations={streamingMessage.citations.length > 0 ? streamingMessage.citations : undefined}
              />
            )}
          </div>
        </div>

        {/* Scroll to bottom */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-20"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* Composer */}
        <div className="p-4 shrink-0 border-t border-border/40 bg-background">
          <div className="max-w-2xl mx-auto">
            <Composer onSend={handleSend} defaultModel={chat?.model} disabled={isSending} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
