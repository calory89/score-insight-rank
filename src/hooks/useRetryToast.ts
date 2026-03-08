import { toast } from "@/hooks/use-toast";

interface RetryToastOptions {
  title: string;
  description?: string;
  retryFn: () => Promise<void> | void;
  maxRetries?: number;
}

/**
 * Show a toast with a "Retry" action button for recoverable errors.
 */
export function retryToast({ title, description, retryFn, maxRetries = 3 }: RetryToastOptions) {
  let attempts = 0;

  const attempt = () => {
    attempts++;
    toast({
      title,
      description: description ?? (attempts > 1 ? `Attempt ${attempts}/${maxRetries}` : "Something went wrong"),
      variant: "destructive",
      action: attempts < maxRetries
        ? (
          <button
            onClick={() => {
              try { retryFn(); } catch { attempt(); }
            }}
            className="inline-flex items-center rounded-md border border-destructive-foreground/30 bg-destructive-foreground/10 px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive-foreground/20 transition-colors"
          >
            Retry
          </button>
        ) as any
        : undefined,
    });
  };

  attempt();
}
