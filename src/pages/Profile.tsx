import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { User, BarChart3, TrendingUp, Star, Globe, ArrowLeft, ArrowRight, Zap, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import StreakBadge from "@/components/StreakBadge";
import ReferralCard from "@/components/ReferralCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { PageLoader } from "@/components/PageLoader";
import { useAchievements, AchievementGrid, AchievementToast } from "@/components/AchievementSystem";

const levelConfig = [
  { name: "Explorer", min: 0, color: "text-muted-foreground" },
  { name: "Analyst", min: 10, color: "text-score-average" },
  { name: "Pro Hunter", min: 20, color: "text-score-good" },
  { name: "Elite", min: 50, color: "text-primary" },
  { name: "Legend", min: 100, color: "text-score-excellent" },
];

const getHunterLevel = (count: number) => {
  let level = levelConfig[0];
  for (const l of levelConfig) {
    if (count >= l.min) level = l;
  }
  return level;
};

const getNextLevel = (count: number) => {
  for (const l of levelConfig) {
    if (count < l.min) return l;
  }
  return null;
};

const Profile = () => {
  useDocumentMeta({ title: "Profile | RealHunt", description: "View your investor profile, stats, and achievements on RealHunt." });
  const { userId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  const [profile, setProfile] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, high85: 0, avgScore: 0, countries: 0 });
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const { unlocked, checkAndUnlock, newlyUnlocked, dismissNew } = useAchievements();

  useEffect(() => {
    if (!authLoading && !user) { navigate("/"); return; }
    if (!targetUserId) return;
    loadProfile();
  }, [user, authLoading, targetUserId]);

  const loadProfile = async () => {
    if (!targetUserId) return;

    const [profileRes, analysesRes, followersRes, followingRes, referralsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("analyses").select("global_score, country").eq("user_id", targetUserId),
      (supabase as any).from("follows").select("id").eq("following_id", targetUserId),
      (supabase as any).from("follows").select("id").eq("follower_id", targetUserId),
      (supabase as any).from("referrals").select("id").eq("referrer_id", targetUserId),
    ]);

    const profileData = profileRes.data as any;
    setProfile(profileData);
    setEditUsername(profileData?.username || "");
    setEditBio(profileData?.bio || "");
    setFollowerCount(followersRes.data?.length || 0);
    setFollowingCount(followingRes.data?.length || 0);
    setReferralCount(referralsRes.data?.length || 0);

    const analyses = analysesRes.data || [];
    const scores = analyses.map((a: any) => a.global_score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0;
    const countries = [...new Set(analyses.map((a: any) => a.country).filter(Boolean))].length;
    setStats({ total: analyses.length, high85: scores.filter((s: number) => s >= 85).length, avgScore, countries });

    // Check achievements
    if (isOwnProfile) {
      const [favsRes, reviewsRes, streakRes, watchRes, portfolioRes] = await Promise.all([
        supabase.from("favorites").select("id").eq("user_id", targetUserId),
        supabase.from("property_reviews").select("id").eq("user_id", targetUserId),
        supabase.from("user_streaks").select("current_streak").eq("user_id", targetUserId).maybeSingle(),
        supabase.from("watchlist").select("id").eq("user_id", targetUserId),
        supabase.from("portfolio_properties" as any).select("id").eq("user_id", targetUserId),
      ]);
      checkAndUnlock({
        analysisCount: analyses.length,
        favoriteCount: favsRes.data?.length || 0,
        reviewCount: reviewsRes.data?.length || 0,
        streakDays: (streakRes.data as any)?.current_streak || 0,
        watchlistCount: watchRes.data?.length || 0,
        portfolioCount: portfolioRes.data?.length || 0,
        compareCount: 0,
      });
    }

    if (user && !isOwnProfile) {
      const { data: followCheck } = await (supabase as any)
        .from("follows").select("id").eq("follower_id", user.id).eq("following_id", targetUserId).maybeSingle();
      setIsFollowing(!!followCheck);
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user || !targetUserId) return;
    if (isFollowing) {
      await (supabase as any).from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await (supabase as any).from("follows").insert({ follower_id: user.id, following_id: targetUserId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ username: editUsername.trim() || null, bio: editBio.trim() || null })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      setEditing(false);
      loadProfile();
    }
  };

  if (authLoading || !user) return null;

  if (loading) return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8 max-w-xl">
        <PageLoader variant="profile" />
      </div>
      <BottomNav />
    </div>
  );

  const hunterLevel = getHunterLevel(stats.total);
  const nextLevel = getNextLevel(stats.total);
  const progressToNext = nextLevel ? Math.min(Math.round((stats.total / nextLevel.min) * 100), 100) : 100;
  const displayName = profile?.username || profile?.email?.split("@")[0] || "Hunter";

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8 max-w-xl">
        {!isOwnProfile && (
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="h-20 w-20 rounded-full bg-secondary border-2 border-primary/20 flex items-center justify-center mx-auto mb-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-bold text-foreground">@{displayName}</h2>
            {isOwnProfile && <StreakBadge />}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`text-xs font-medium ${hunterLevel.color}`}>{hunterLevel.name}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">#{stats.total > 0 ? "Active" : "New"}</span>
          </div>
          {profile?.bio && <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">{profile.bio}</p>}

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{followerCount}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{followingCount}</p>
              <p className="text-[10px] text-muted-foreground">Following</p>
            </div>
          </div>

          <div className="mt-4">
            {isOwnProfile ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="text-xs">
                {editing ? "Cancel" : "Edit Profile"}
              </Button>
            ) : (
              <Button variant={isFollowing ? "ghost" : "hero"} size="sm" onClick={handleFollow} className="text-xs">
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </motion.div>

        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Username</label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="your_username" className="text-sm" maxLength={30} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
              <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell others about your investment focus..." className="text-sm min-h-[60px]" maxLength={160} />
              <p className="text-[10px] text-muted-foreground mt-1">{editBio.length}/160</p>
            </div>
            <Button variant="hero" size="sm" onClick={handleSaveProfile} className="w-full">Save Profile</Button>
          </motion.div>
        )}

        {stats.total === 0 && isOwnProfile ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-dashed border-border bg-card p-8 text-center mb-6">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No analyses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Paste any property listing URL to get your first AI-powered forensic report.</p>
            <Button variant="hero" size="sm" onClick={() => navigate("/dashboard")}>Analyze Your First Property <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Analyzed</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Star className="h-4 w-4 text-score-excellent mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-score-excellent">{stats.high85}</p>
              <p className="text-[10px] text-muted-foreground">Score 85+</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-foreground">{stats.avgScore}</p>
              <p className="text-[10px] text-muted-foreground">Avg Score</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Globe className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-foreground">{stats.countries}</p>
              <p className="text-[10px] text-muted-foreground">Countries</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${hunterLevel.color}`}>Level: {hunterLevel.name}</span>
            {nextLevel && <span className="text-[10px] text-muted-foreground">Next: {nextLevel.name} ({nextLevel.min} analyses)</span>}
          </div>
          <Progress value={progressToNext} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1.5">{stats.total} / {nextLevel?.min || stats.total} analyses</p>
        </div>

        {/* Achievements */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Achievements
          </h3>
          <AchievementGrid unlocked={unlocked} />
        </div>

        {isOwnProfile && (
          <ReferralCard referralCode={profile?.referral_code} referralCount={referralCount} />
        )}
      </div>
      <AchievementToast achievement={newlyUnlocked} onDismiss={dismissNew} />
      <BottomNav />
    </div>
  );
};

export default Profile;
