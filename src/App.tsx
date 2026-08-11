import React, { Component, ErrorInfo, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./components/Dashboard";
import NotFound from "./pages/NotFound";
import { ApiConfigModal } from "@/components/dashboard/ApiConfigModal";

const queryClient = new QueryClient();

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isConfigOpen: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isConfigOpen: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 GlassBox ErrorBoundary caught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-destructive/40 backdrop-blur-xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-foreground">GlassBox Terminal Notice</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => this.setState({ isConfigOpen: true })}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 transition-all"
              >
                Configure API Token
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Reload Terminal
              </button>
            </div>
          </div>
          <ApiConfigModal
            open={this.state.isConfigOpen}
            onOpenChange={(open) => this.setState({ isConfigOpen: open })}
            onConfigSaved={() => window.location.reload()}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
