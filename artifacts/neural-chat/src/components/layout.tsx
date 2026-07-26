import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-sm px-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <div className="w-6 h-6 bg-primary rounded-md" />
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-foreground">Welcome to NeuralChat</h1>
          <p className="text-muted-foreground text-sm">
            A powerful, quiet space for thinking.
          </p>
          <button
            onClick={login}
            className="w-full bg-primary text-primary-foreground h-11 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Log in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {children}
      </main>
    </div>
  );
}
