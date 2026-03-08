import { useState } from "react";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ReferralCardProps {
  referralCode: string | null;
  referralCount: number;
}

const ReferralCard = ({ referralCode, referralCount }: ReferralCardProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!referralCode) return null;

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `🏠 I use RealHunt to find the best real estate deals with AI scoring. Join me and get 2 bonus analyses!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join RealHunt", text, url: referralLink });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Invite Friends</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Share your link — you get <strong>+3 analyses</strong> per signup, they get <strong>+2 bonus</strong>.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
          {referralLink}
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{referralCount} friend{referralCount !== 1 ? "s" : ""} invited</span>
        <Button variant="hero" size="sm" onClick={handleShare} className="text-xs">
          <Share2 className="h-3 w-3 mr-1" /> Share
        </Button>
      </div>
    </div>
  );
};

export default ReferralCard;
