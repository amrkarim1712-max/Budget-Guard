import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  MessageSquare,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Settings,
  LogOut,
  Moon,
  Sun,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  Edit2
} from "lucide-react";
import {
  useListOpenrouterConversations,
  useUpdateOpenrouterConversation,
  useDeleteOpenrouterConversation,
  getListOpenrouterConversationsQueryKey,
  useGetOpenrouterStats
} from "@workspace/api-client-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversations } = useListOpenrouterConversations(
    { search: search || undefined },
    { query: { queryKey: getListOpenrouterConversationsQueryKey({ search: search || undefined }) } }
  );

  const updateChat = useUpdateOpenrouterConversation();
  const deleteChat = useDeleteOpenrouterConversation();

  const handleNewChat = () => {
    setLocation("/");
  };

  const togglePin = (id: number, currentPinned: boolean) => {
    updateChat.mutate(
      { id, data: { pinned: !currentPinned } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update conversation", variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteChat.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
          setLocation("/");
        },
        onError: () => {
          toast({ title: "Failed to delete conversation", variant: "destructive" });
        }
      }
    );
  };

  const handleRename = (id: number, currentTitle: string) => {
    const newTitle = prompt("Rename conversation", currentTitle);
    if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
      updateChat.mutate(
        { id, data: { title: newTitle.trim() } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
          },
          onError: () => {
            toast({ title: "Failed to rename conversation", variant: "destructive" });
          }
        }
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("sidebar-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col border-r border-sidebar-border/60 bg-sidebar items-center py-4 transition-all duration-300">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const pinned = conversations?.filter(c => c.pinned) ?? [];
  const unpinned = conversations?.filter(c => !c.pinned) ?? [];

  return (
    <div className="w-[260px] flex flex-col border-r border-sidebar-border/60 bg-sidebar transition-all duration-300">
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-medium text-sidebar-foreground text-[15px] tracking-tight">
          <div className="w-5 h-5 bg-primary rounded-sm shadow-sm" />
          NeuralChat
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          <PanelLeftClose className="w-[18px] h-[18px]" />
        </button>
      </div>

      <div className="px-3 pb-3 pt-1">
        <button
          onClick={handleNewChat}
          className="w-full h-[34px] flex items-center justify-center gap-2 bg-primary/8 text-primary hover:bg-primary/14 border border-primary/20 rounded-lg font-medium transition-colors text-[13px]"
        >
          <Plus className="w-[14px] h-[14px]" />
          New Chat
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative group">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/40" />
          <input
            id="sidebar-search"
            type="text"
            placeholder="Search... (⌘K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-sidebar-accent/60 border border-transparent focus:ring-1 focus:ring-primary/30 rounded-lg pl-8 pr-3 py-1.5 text-[13px] outline-none transition-all placeholder:text-sidebar-foreground/40 text-sidebar-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 scrollbar-thin">
        {pinned.length > 0 && (
          <div>
            <div className="px-3 text-[11px] font-medium text-sidebar-foreground/50 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
              <Pin className="w-3 h-3" /> Pinned
            </div>
            <div className="space-y-0.5">
              {pinned.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  onPin={() => togglePin(chat.id, chat.pinned)}
                  onDelete={() => handleDelete(chat.id)}
                  onRename={() => handleRename(chat.id, chat.title)}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="px-3 text-[11px] font-medium text-sidebar-foreground/50 mb-1 uppercase tracking-wider">
            {pinned.length > 0 ? "Recent" : "Conversations"}
          </div>
          <div className="space-y-0.5">
            {unpinned.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                onPin={() => togglePin(chat.id, chat.pinned)}
                onDelete={() => handleDelete(chat.id)}
                onRename={() => handleRename(chat.id, chat.title)}
              />
            ))}
            {unpinned.length === 0 && !search && (
              <div className="px-3 py-4 text-sm text-sidebar-foreground/40">
                No conversations yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-sidebar-border/60 flex items-center justify-between">
        <Link href="/settings" className="flex items-center gap-2.5 hover:bg-sidebar-accent rounded-lg p-1.5 transition-colors flex-1 min-w-0 mr-1">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-medium text-[13px] shrink-0">
            {user?.firstName?.[0] ?? user?.email?.[0] ?? "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-[13px] font-medium truncate text-sidebar-foreground">
              {user?.firstName ?? (user?.email ? user.email.split('@')[0] : "Guest")}
            </div>
          </div>
        </Link>
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ChatItem({ chat, onPin, onDelete, onRename }: {
  chat: { id: number; title: string; pinned: boolean };
  onPin: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const [location] = useLocation();
  const isActive = location === `/c/${chat.id}`;

  return (
    <div className="group relative flex items-center h-[32px] px-1">
      <Link
        href={`/c/${chat.id}`}
        className={cn(
          "flex-1 flex items-center gap-2 px-2.5 h-full rounded-lg text-[13px] transition-colors overflow-hidden",
          isActive
            ? "bg-sidebar-accent text-foreground font-medium"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
        )}
      >
        <span className="truncate">{chat.title}</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            "absolute right-2 p-1 rounded-md bg-sidebar opacity-0 group-hover:opacity-100 transition-opacity",
            isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"
          )}>
            <MoreHorizontal className="w-3.5 h-3.5 text-sidebar-foreground/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onRename}>
            <Edit2 className="w-4 h-4 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPin}>
            {chat.pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
            {chat.pinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
