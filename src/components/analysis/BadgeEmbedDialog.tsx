import { useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  slug: string;
  address: string;
  score: number;
}

const SUPA_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://nylmhdtlshhtjkuvfbms.supabase.co";

const BadgeEmbedDialog = ({ open, onClose, slug, address, score }: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  if (!open) return null;

  const embedUrl = `${SUPA_URL}/functions/v1/embed?slug=${encodeURIComponent(slug)}`;
  const reportUrl = `https://realhunt.co/r/${slug}`;
  const alt = `Scored ${score}/100 by RealHunt — ${address}`;

  const iframeSnippet = `<iframe src="${embedUrl}" width="540" height="110" frameborder="0" style="border:0;max-width:100%;" loading="lazy" title="${alt}"></iframe>
<p><a href="${reportUrl}" target="_blank">View full RealHunt report</a></p>`;

  const linkSnippet = `<a href="${reportUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid #16150F1f;border-radius:999px;background:#FFFFFF;color:#111214;font-family:Georgia,serif;text-decoration:none;">
  <strong style="color:#D4420C;letter-spacing:1.5px;font-size:11px;text-transform:uppercase;">Scored by RealHunt</strong>
  <span style="font-weight:700;">${score}/100</span>
</a>`;

  const doCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: "Copied!", description: "Paste into your listing page HTML." });
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 print:hidden" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Get the "Scored by RealHunt" badge</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Paste on your listing page — adds credibility and links back to the full report.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Live preview */}
          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold mb-2">Preview</p>
            <div className="rounded-xl border border-border bg-[#FFFFFF] p-3 overflow-hidden">
              <iframe
                src={embedUrl}
                width="540"
                height="110"
                style={{ border: 0, maxWidth: "100%" }}
                title={alt}
                loading="lazy"
              />
            </div>
          </div>

          {/* iframe embed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold">Iframe embed (recommended)</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doCopy(iframeSnippet, "iframe")}>
                {copied === "iframe" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy
              </Button>
            </div>
            <pre className="text-[11px] bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground whitespace-pre-wrap break-all">{iframeSnippet}</pre>
          </div>

          {/* link snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold">Text link (if iframes are blocked)</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doCopy(linkSnippet, "link")}>
                {copied === "link" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy
              </Button>
            </div>
            <pre className="text-[11px] bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground whitespace-pre-wrap break-all">{linkSnippet}</pre>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Both snippets link to <span className="font-mono">{reportUrl}</span> with do-follow rel. Free to use.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BadgeEmbedDialog;
