import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Copy, Check, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface NegotiationLetterModalProps {
  analysis: any;
  open: boolean;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-negotiation-letter`;

const NegotiationLetterModal = ({ analysis, open, onClose }: NegotiationLetterModalProps) => {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    setLetter("");
    setError("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ analysis }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { setError("Rate limit exceeded. Try again shortly."); setLoading(false); return; }
        if (resp.status === 402) { setError("AI credits exhausted."); setLoading(false); return; }
        throw new Error("Failed to generate letter");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setLetter(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">AI Negotiation Letter</h2>
                <p className="text-xs text-muted-foreground">Data-driven offer based on your analysis</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {!letter && !loading && !error && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-1">Generate a professional negotiation letter</p>
                <p className="text-xs text-muted-foreground mb-6">
                  Uses {(analysis.red_flags as string[])?.length || 0} red flags and market data as leverage
                </p>
                <Button variant="hero" size="lg" onClick={generate}>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Letter
                </Button>
              </div>
            )}

            {loading && !letter && (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm text-muted-foreground">Crafting your negotiation strategy…</p>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={generate}>Try Again</Button>
              </div>
            )}

            {letter && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-serif">
                  {letter}
                  {loading && <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {letter && !loading && (
            <div className="flex items-center gap-2 p-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={generate} className="text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate
              </Button>
              <Button variant="hero" size="sm" onClick={copyToClipboard} className="text-xs ml-auto">
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NegotiationLetterModal;
