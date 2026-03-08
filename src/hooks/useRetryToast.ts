import { toast } from "@/hooks/use-toast";

interface RetryToastOptions {
  title: string;
  description?: string;
  retryFn: () => Promise<void> | void;
  maxRetries?: number;
}

/**
 * Show a toast with a "Retry" action for recoverable errors.
 */
export function retryToast({ title, description, retryFn, maxRetries = 3 }: RetryToastOptions) {
  let attempts = 0;

  const attempt = () => {
    attempts++;
    toast({
      title,
      description: description ?? (attempts > 1 ? `Attempt ${attempts}/${maxRetries}` : "Something went wrong"),
      variant: "destructive",
    });

    // Auto-retry once after a short delay if below threshold
    if (attempts < maxRetries) {
      setTimeout(async () => {
        try {
          await retryFn();
        } catch {
          attempt();
        }
      }, 2000 * attempts);
    }
  };

  attempt();
}
