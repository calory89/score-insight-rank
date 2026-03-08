import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Shield, Trash2, LogOut, Mail, Key, Zap, Crown, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const planLabels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  super_pro: "Super Pro",
  enterprise: "Enterprise",
};

const planColors: Record<string, string> = {
  free: "text-muted-foreground",
  pro: "text-primary",
  super_pro: "text-score-excellent",
  enterprise: "text-score-excellent",
};

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { plan, creditsUsed, creditsTotal, billingPeriodEnd, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setTotalAnalyses(count || 0));
  }, [user]);

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match.", variant: "destructive" });
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
    }
    setUpdatingPassword(false);
  };

  const handleDeleteAllAnalyses = async () => {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id);
    await supabase.from("analyses").delete().eq("user_id", user.id);
    setTotalAnalyses(0);
    setShowDeleteConfirm(false);
    toast({ title: "All analyses deleted", description: "Your analysis history has been cleared." });
  };

  if (authLoading || !user) return null;

  const isOAuthUser = user.app_metadata?.provider === "google" || user.app_metadata?.providers?.includes("google");
  const createdAt = new Date(user.created_at).toLocaleDateString();

  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditsPercent = creditsTotal > 0 ? Math.min(100, (creditsUsed / creditsTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-8">Manage your account and preferences.</p>

        {/* Plan & Credits */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Plan & Credits</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <span className={`text-sm font-semibold ${planColors[plan]}`}>
                {plan !== "free" && <Zap className="h-3.5 w-3.5 inline mr-1" />}
                {planLabels[plan] || plan}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Credits Used</span>
                <span className="text-sm font-mono text-foreground">
                  {creditsUsed} / {creditsTotal === 999 ? "∞" : creditsTotal}
                </span>
              </div>
              <Progress value={creditsTotal === 999 ? 5 : creditsPercent} className="h-2" />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {creditsTotal === 999 ? "Unlimited" : `${creditsRemaining} remaining`}
                </span>
                {billingPeriodEnd && (
                  <span className="text-xs text-muted-foreground">
                    Renews {new Date(billingPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {plan === "free" && (
              <Button variant="hero" size="sm" className="w-full" onClick={() => navigate("/#pricing")}>
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Upgrade to Pro
              </Button>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </div>
              <span className="text-sm text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auth method</span>
              <span className="text-sm text-foreground">{isOAuthUser ? "Google" : "Email/Password"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="text-sm text-foreground">{createdAt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total analyses</span>
              <span className="text-sm font-mono text-foreground">{totalAnalyses}</span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Security</h2>
          </div>
          {!isOAuthUser && (
            <>
              {!changingPassword ? (
                <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
                  <Key className="h-3.5 w-3.5 mr-1" /> Change Password
                </Button>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="hero" size="sm" onClick={handlePasswordUpdate} disabled={updatingPassword}>
                      {updatingPassword ? "Updating…" : "Update Password"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setChangingPassword(false); setNewPassword(""); setConfirmPassword(""); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </>
          )}
          {isOAuthUser && (
            <p className="text-xs text-muted-foreground">Your account is secured via Google. No password management needed.</p>
          )}
        </div>

        {/* Data Management */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-foreground">Data Management</h2>
          </div>
          {!showDeleteConfirm ? (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)}>
              Delete All Analyses ({totalAnalyses})
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm text-foreground mb-3">
                Are you sure? This will permanently delete <strong>{totalAnalyses} analyses</strong> and all favorites.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDeleteAllAnalyses}>Yes, Delete Everything</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div className="rounded-xl border border-border bg-card p-6">
          <Button variant="outline" size="sm" onClick={signOut} className="w-full sm:w-auto">
            <LogOut className="h-3.5 w-3.5 mr-1" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
