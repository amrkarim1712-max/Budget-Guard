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
import { useListOpenrouterConversations, useCreateOpenrouterConversation, useUpdateOpenrouterConversation, useDeleteOpenrouterConversation, getListOpenrouterConversationsQueryKey, useGetOpenrouterStats } from "@workspace/api-client-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: conversations } = useListOpenrouterConversations(
    { search: search || undefined },
    { query: { queryKey: getListOpenrouterConversationsQueryKey({ search: search || undefined }) } }
  );
  
  const { data: stats } = useGetOpenrouterStats();

  const createChat = useCreateOpenrouterConversation();
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
        }
      }
    );
  };

  const handleRename = (id: number, currentTitle: string) => {
    const newTitle = prompt("Rename conversation", currentTitle);
    if (newTitle && newTitle !== currentTitle) {
      updateChat.mutate(
        { id, data: { title: newTitle } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
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
      <div className="w-16 flex flex-col border-r border-border/50 bg-sidebar items-center py-4 transition-all duration-300">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNewChat}
          className="p-2 rounded-md bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/20"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const pinned = conversations?.filter(c => c.pinned) || [];
  const unpinned = conversations?.filter(c => !c.pinned) || [];

  return (
    <div className="w-64 flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-sidebar-foreground">
          <div className="w-6 h-6 bg-sidebar-primary rounded-md flex items-center justify-center text-sidebar-primary-foreground">
            <span className="text-xs">N</span>
          </div>
          NeuralChat
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 bg-sidebar-primary text-sidebar-primary-foreground px-3 py-2 rounded-lg font-medium hover:bg-sidebar-primary/90 transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/40" />
          <input
            id="sidebar-search"
            type="text"
            placeholder="Search... (⌘K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-sidebar-accent/50 border border-transparent focus:border-sidebar-ring/30 focus:bg-sidebar-accent rounded-md pl-8 pr-3 py-1.5 text-sm outline-none transition-all placeholder:text-sidebar-foreground/40 text-sidebar-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {pinned.length > 0 && (
          <div>
            <div className="px-2 text-xs font-medium text-sidebar-foreground/50 mb-1 flex items-center gap-1.5">
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
          <div className="px-2 text-xs font-medium text-sidebar-foreground/50 mb-1">
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
              <div className="px-2 py-4 text-center text-sm text-sidebar-foreground/40">
                No conversations yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-sidebar-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-medium text-xs">
                {user?.firstName?.[0] || user?.email?.[0] || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium truncate text-sidebar-foreground">
                  {user?.firstName || user?.email?.split('@')[0]}
                </div>
              </div>
              <Settings className="w-4 h-4 text-sidebar-foreground/40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {stats && (
              <div className="px-2 py-1.5 mb-1 bg-muted/50 rounded-sm">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Your Usage</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <div className="text-muted-foreground">Chats</div>
                    <div className="font-medium text-foreground">{stats.totalConversations}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Msgs</div>
                    <div className="font-medium text-foreground">{stats.totalMessages}</div>
                  </div>
                </div>
              </div>
            )}
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ChatItem({ chat, onPin, onDelete, onRename }: { chat: any, onPin: () => void, onDelete: () => void, onRename: () => void }) {
  const [location] = useLocation();
  const isActive = location === `/c/${chat.id}`;

  return (
    <div className="group relative flex items-center">
      <Link
        href={`/c/${chat.id}`}
        className={cn(
          "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors overflow-hidden",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <MessageSquare className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />
        <span className="truncate">{chat.title}</span>
      </Link>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            "absolute right-1 p-1 rounded-md bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-opacity",
            isActive && "opacity-100"
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
