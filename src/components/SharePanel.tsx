import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, MessageCircle, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SharePanelProps {
  address: string;
  score: number;
  slug?: string | null;
  verdict?: string | null;
}

const SharePanel = ({ address, score, slug, verdict }: SharePanelProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = slug
    ? `${window.location.origin}/r/${slug}`
    : window.location.href;

  const shareTitle = `${address || "Property"} — Score ${score}/100 on RealHunt`;
  const shareText = `🏠 I just analyzed this property on RealHunt — it scored ${score}/100! ${verdict ? `Verdict: ${verdict}.` : ""}\n\nCheck it out:`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share this report with anyone." });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => {
          if (navigator.share) shareNative();
          else setOpen(prev => !prev);
        }}
      >
        <Share2 className="h-3.5 w-3.5 sm:mr-1" />
        <span className="hidden sm:inline">Share</span>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-border bg-card shadow-xl p-3 space-y-1.5"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Share this report</p>

            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm text-foreground"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              WhatsApp
            </button>

            <button
              onClick={shareTwitter}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm text-foreground"
            >
              <XIcon className="h-4 w-4" />
              X / Twitter
            </button>

            <button
              onClick={shareLinkedIn}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm text-foreground"
            >
              <svg className="h-4 w-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </button>

            <div className="border-t border-border pt-1.5 mt-1.5">
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm text-foreground"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
};

export default SharePanel;
