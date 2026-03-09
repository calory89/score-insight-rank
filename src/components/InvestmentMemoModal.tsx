import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Copy, Loader2, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface InvestmentMemoModalProps {
  open: boolean;
  onClose: () => void;
  analysisId: string;
  propertyName: string;
}

export default function InvestmentMemoModal({ open, onClose, analysisId, propertyName }: InvestmentMemoModalProps) {
  const [memo, setMemo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-memo", {
        body: { analysis_id: analysisId },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setMemo(data.memo);
    } catch (e: any) {
      setError(e.message || "Failed to generate memo");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!memo) return;
    await navigator.clipboard.writeText(memo);
    toast.success("Memo copied to clipboard");
  };

  const handleDownload = () => {
    if (!memo) return;
    const blob = new Blob([memo], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment-memo-${propertyName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Memo downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            AI Investment Memo
          </DialogTitle>
        </DialogHeader>

        {!memo && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-foreground mb-1">Generate Investment Memo</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                AI will create a professional investment memo for <strong>{propertyName}</strong> — formatted like a real estate fund analyst report.
              </p>
            </div>
            <Button variant="hero" onClick={generate} className="mt-2">
              <Sparkles className="h-4 w-4 mr-2" /> Generate Memo
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Generating professional investment memo…</p>
            <p className="text-xs text-muted-foreground/60">This may take 10-15 seconds</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={generate}>Try Again</Button>
          </div>
        )}

        {memo && (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download .md
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                <ReactMarkdown>{memo}</ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
