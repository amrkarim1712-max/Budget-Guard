import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  MessageSquare, Search, Plus, PanelLeftClose, PanelLeft,
  Settings, LogOut, Moon, Sun, MoreHorizontal, Pin, PinOff,
  Trash2, Edit2, ChevronLeft
} from "lucide-react";
import {
  useListOpenrouterConversations,
  useUpdateOpenrouterConversation,
  useDeleteOpenrouterConversation,
  getListOpenrouterConversationsQueryKey,
  useGetOpenrouterStats,
} from "@workspace/api-client-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NeuralLogo } from "./logo";

// Small, purely-presentational helper for icon-only buttons so hover /
// focus-visible / transition styling stays consistent and isn't repeated
// at every call site. No behavior, no state — safe to extract.
function IconButton({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center justify-center rounded-lg text-muted-foreground",
        "hover:text-foreground hover:bg-sidebar-accent",
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: conversations } = useListOpenrouterConversations(
    { search: search || undefined },
    { query: { queryKey: getListOpenrouterConversationsQueryKey({ search: search || undefined }) } }
  );
  const { data: stats } = useGetOpenrouterStats();
  const updateChat = useUpdateOpenrouterConversation();
  const deleteChat = useDeleteOpenrouterConversation();

  const invalidateConversations = () =>
    queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });

  const togglePin = (id: number, pinned: boolean) => {
    updateChat.mutate({ id, data: { pinned: !pinned } }, {
      onSuccess: invalidateConversations,
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteChat.mutate({ id }, {
      onSuccess: () => {
        invalidateConversations();
        setLocation("/");
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const handleRename = (id: number, current: string) => {
    const title = prompt("Rename conversation", current)?.trim();
    if (title && title !== current) {
      updateChat.mutate({ id, data: { title } }, {
        onSuccess: invalidateConversations,
        onError: () => toast({ title: "Failed to rename", variant: "destructive" }),
      });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearch("");
      searchRef.current?.blur();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pinned = conversations?.filter(c => c.pinned) ?? [];
  const unpinned = conversations?.filter(c => !c.pinned) ?? [];
  const userInitial = user?.firstName?.[0] ?? user?.email?.[0] ?? "U";
  const userName = user?.firstName ?? (user?.email ? user.email.split('@')[0] : "Guest");

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-3 gap-1.5 border-r border-sidebar-border bg-sidebar shrink-0">
        <IconButton onClick={() => setCollapsed(false)} label="Expand sidebar" className="w-8 h-8">
          <PanelLeft className="w-4 h-4" />
        </IconButton>
        <IconButton onClick={() => setLocation("/")} label="New chat" className="w-8 h-8">
          <Plus className="w-4 h-4" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="w-[240px] flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 shrink-0">
        <div className="flex items-center gap-2 text-foreground">
          <NeuralLogo size={16} />
          <span className="text-[13px] font-semibold tracking-[-0.02em]">Nexa</span>
        </div>
        <IconButton onClick={() => setCollapsed(true)} label="Collapse sidebar" className="w-6 h-6">
          <ChevronLeft className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-2 shrink-0">
        <button
          onClick={() => setLocation("/")}
          aria-label="New chat"
          className={cn(
            "w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12px] font-medium",
            "border border-border/60 text-muted-foreground",
            "hover:text-foreground hover:border-border hover:bg-sidebar-accent/60 hover:shadow-sm",
            "transition-all duration-150 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
          <span className="ml-auto text-[10px] text-muted-foreground/40">⌘N</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search"
            aria-label="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className={cn(
              "w-full h-7 rounded-md pl-7 pr-2.5 text-[12px] outline-none text-foreground",
              "bg-sidebar-accent/40 border border-transparent placeholder:text-muted-foreground/40",
              "transition-all duration-150 ease-out",
              "focus:border-border/60 focus:bg-sidebar-accent"
            )}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin min-h-0">
        {pinned.length > 0 && (
          <div className="mb-3">
            <div className="px-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </div>
            {pinned.map(chat => (
              <ConvItem
                key={chat.id}
                chat={chat}
                onPin={() => togglePin(chat.id, chat.pinned)}
                onDelete={() => handleDelete(chat.id)}
                onRename={() => handleRename(chat.id, chat.title)}
              />
            ))}
          </div>
        )}

        <div>
          {(pinned.length > 0 || unpinned.length > 0) && (
            <div className="px-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1">
              {pinned.length > 0 ? "Recent" : "Conversations"}
            </div>
          )}
          {unpinned.map(chat => (
            <ConvItem
              key={chat.id}
              chat={chat}
              onPin={() => togglePin(chat.id, chat.pinned)}
              onDelete={() => handleDelete(chat.id)}
              onRename={() => handleRename(chat.id, chat.title)}
            />
          ))}
          {unpinned.length === 0 && !search && (
            <p className="text-[12px] text-muted-foreground/40 text-center py-6">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left group",
                "hover:bg-sidebar-accent transition-colors duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-foreground/10 border border-border/60 flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                {userInitial}
              </div>
              <span className="text-[12px] font-medium text-foreground/80 truncate flex-1">{userName}</span>
              <Settings className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors duration-150" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" side="top" className="w-52 mb-1">
            {stats && (
              <div className="px-2 py-2 mb-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Usage</div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <div className="text-muted-foreground text-[11px]">Chats</div>
                    <div className="font-semibold">{stats.totalConversations}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[11px]">Messages</div>
                    <div className="font-semibold">{stats.totalMessages}</div>
                  </div>
                </div>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-3.5 h-3.5" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark'
                ? <><Sun className="w-3.5 h-3.5 mr-2" />Light mode</>
                : <><Moon className="w-3.5 h-3.5 mr-2" />Dark mode</>
              }
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="w-3.5 h-3.5 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ConvItem({ chat, onPin, onDelete, onRename }: {
  chat: { id: number; title: string; pinned: boolean };
  onPin: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const [loc] = useLocation();
  const active = loc === `/c/${chat.id}`;

  return (
    <div className="group relative flex items-center mb-0.5">
      <Link
        href={`/c/${chat.id}`}
        className={cn(
          "flex-1 flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12px] font-medium truncate pr-8",
          "transition-colors duration-150 ease-out",
          active
            ? "bg-sidebar-accent text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
        )}
      >
        <MessageSquare className={cn("w-3 h-3 shrink-0", active ? "text-foreground" : "text-muted-foreground/40")} />
        <span className="truncate">{chat.title}</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`More options for ${chat.title}`}
            className={cn(
              "absolute right-1 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground",
              "hover:text-foreground hover:bg-sidebar-accent",
              "transition-all duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            )}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onRename}><Edit2 className="w-3.5 h-3.5 mr-2" />Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={onPin}>
            {chat.pinned ? <><PinOff className="w-3.5 h-3.5 mr-2" />Unpin</> : <><Pin className="w-3.5 h-3.5 mr-2" />Pin</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
