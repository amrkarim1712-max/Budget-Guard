import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
        <div className="text-center space-y-8 max-w-[340px] px-4 w-full">
          <div className="mx-auto flex flex-col items-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mb-6 shadow-sm">
              <div className="w-4 h-4 bg-background rounded-sm" />
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-foreground mb-3">NeuralChat</h1>
            <p className="text-muted-foreground text-[15px] leading-relaxed">
              Precision intelligence for deep thinkers.
            </p>
          </div>
          <div className="space-y-4 pt-4">
            <button
              onClick={login}
              className="w-full bg-primary text-primary-foreground h-11 rounded-xl text-[15px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              Log in to continue
            </button>
            <p className="text-xs text-muted-foreground font-medium">Powered by OpenRouter</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-[15px] selection:bg-primary/20">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {children}
      </main>
    </div>
  );
}
