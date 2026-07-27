import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { NeuralLogo } from "./logo";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full px-6">
          {/* Logo mark */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border border-border rounded-2xl flex items-center justify-center text-foreground">
              <NeuralLogo size={24} />
            </div>
            <div className="text-center">
              <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-foreground">AI</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">Precision intelligence for deep thinkers.</p>
            </div>
          </div>

          {/* Login */}
          <button
            onClick={login}
            className="w-full h-10 bg-foreground text-background text-[14px] font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Continue with Replit
          </button>

          <p className="text-[11px] text-muted-foreground/50">Powered by OpenRouter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
