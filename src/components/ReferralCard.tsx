import { useState } from "react";
import { Gift, Copy, Check, Share2, Twitter, MessageCircle, Mail, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface ReferralCardProps {
  referralCode: string | null;
  referralCount: number;
}

const REWARD_TIERS = [
  { count: 1, reward: "+3 analyses" },
  { count: 5, reward: "+10 analyses" },
  { count: 10, reward: "Pro for 1 month" },
];

const ReferralCard = ({ referralCode, referralCount }: ReferralCardProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!referralCode) return null;

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;
  const shareText = `🏠 I use RealHunt to find the best real estate deals with AI scoring. Join me and get 2 bonus analyses!`;

  const nextTier = REWARD_TIERS.find(t => referralCount < t.count) || REWARD_TIERS[REWARD_TIERS.length - 1];
  const progressToNext = Math.min((referralCount / nextTier.count) * 100, 100);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join RealHunt", text: shareText, url: referralLink });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const socialLinks = [
    {
      icon: Twitter,
      label: "Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`,
    },
    {
      icon: Mail,
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent("Join RealHunt — AI Property Intelligence")}&body=${encodeURIComponent(`${shareText}\n\n${referralLink}`)}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Gift className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Invite Friends</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Share your link — you get <strong className="text-foreground">+3 analyses</strong> per signup, they get <strong className="text-foreground">+2 bonus</strong>.
      </p>

      {/* Referral link */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
          {referralLink}
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Social share buttons */}
      <div className="flex items-center gap-2 mb-4">
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 active:scale-[0.97]"
          >
            <link.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{link.label}</span>
          </a>
        ))}
        <Button variant="hero" size="sm" onClick={handleShare} className="flex-1 text-xs">
          <Share2 className="h-3 w-3 mr-1" /> Share
        </Button>
      </div>

      {/* Progress toward next reward */}
      <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Users className="h-3 w-3" /> {referralCount} invited
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            Next: <strong className="text-foreground">{nextTier.reward}</strong>
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
        <Progress value={progressToNext} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground mt-1">
          {referralCount < nextTier.count
            ? `${nextTier.count - referralCount} more to unlock ${nextTier.reward}`
            : "🎉 All tiers unlocked!"}
        </p>
      </div>

      {/* Social proof */}
      <p className="text-[10px] text-muted-foreground text-center">
        🔥 <strong className="text-foreground">127 users</strong> earned bonus analyses this week
      </p>
    </motion.div>
  );
};

export default ReferralCard;
