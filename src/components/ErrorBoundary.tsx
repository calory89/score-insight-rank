import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, error: undefined, errorCount: prev.errorCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6 animate-scale-in">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {this.state.errorCount >= 2
                  ? "This error persists. Try refreshing the page or going back to the homepage."
                  : "An unexpected error occurred. This is usually temporary — try again."}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {this.state.errorCount < 2 && (
                <Button variant="hero" onClick={this.handleRetry} className="w-full gap-2">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
              )}
              <Button variant="outline" onClick={() => window.history.back()} className="w-full gap-2 text-sm">
                <ArrowLeft className="h-4 w-4" /> Go Back
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = "/"} className="w-full gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" /> Homepage
              </Button>
            </div>
            {this.state.error && (
              <details className="text-left">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Technical details
                </summary>
                <pre className="mt-2 text-[10px] text-muted-foreground bg-secondary/50 border border-border rounded-lg p-3 overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
