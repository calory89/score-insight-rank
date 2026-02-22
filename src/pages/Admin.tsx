import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Users, BarChart3, Globe, Search, ChevronDown, ChevronUp,
  Calendar, MapPin, TrendingUp, Shield, ArrowLeft, Activity,
  Mail, Clock, Hash, Eye,
} from "lucide-react";

const ADMIN_EMAIL = "rrppspain@gmail.com";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  login_count: number;
  detected_country: string | null;
  provider: string;
  analyses_count: number;
  analyses: any[];
  plan: string;
}

interface AdminStats {
  total_users: number;
  total_analyses: number;
  countries: string[];
  recent_signups_7d: number;
  active_today: number;
}

const scoreColor = (v: number) => {
  if (v >= 80) return "text-score-excellent";
  if (v >= 65) return "text-score-good";
  if (v >= 50) return "text-score-average";
  return "text-score-poor";
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate("/");
      return;
    }

    const fetchAdminData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("admin-data");
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setUsers(data.users || []);
        setStats(data.stats || null);
      } catch (e: any) {
        setError(e.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;
  if (user.email !== ADMIN_EMAIL) return null;

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.detected_country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin CRM</h1>
            <p className="text-sm text-muted-foreground">User management & analytics</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-t-primary border-border animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Users className="h-4 w-4 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold font-mono text-foreground">{stats.total_users}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Users</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <BarChart3 className="h-4 w-4 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold font-mono text-foreground">{stats.total_analyses}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Analyses</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Globe className="h-4 w-4 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold font-mono text-foreground">{stats.countries.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Countries</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <TrendingUp className="h-4 w-4 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold font-mono text-foreground">{stats.recent_signups_7d}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">New (7d)</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Activity className="h-4 w-4 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold font-mono text-foreground">{stats.active_today}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Today</p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email or country…"
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30"
              />
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-2 px-5 py-3 border-b border-border bg-secondary/30 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                <span>User</span>
                <span>Signed Up</span>
                <span>Last Login</span>
                <span>Searches</span>
                <span>Plan</span>
                <span></span>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No users found.</div>
              ) : (
                filteredUsers.map((u, i) => (
                  <div key={u.id} className="border-b border-border last:border-b-0">
                    <div
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-2 px-5 py-3.5 items-center hover:bg-secondary/20 cursor-pointer transition-colors"
                      onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3" /> {u.provider}
                          {u.detected_country && <><MapPin className="h-3 w-3 ml-1" /> {u.detected_country}</>}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                      </span>
                      <span className="text-xs font-mono text-foreground">{u.analyses_count}</span>
                      <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${
                        u.plan === "free" ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"
                      }`}>{u.plan}</span>
                      <div className="flex justify-end">
                        {expandedUser === u.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedUser === u.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 py-4 bg-secondary/10 border-t border-border">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <div className="text-xs">
                                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Mail className="h-3 w-3" /> Email</span>
                                <span className="text-foreground font-medium">{u.email}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Hash className="h-3 w-3" /> Login Count</span>
                                <span className="text-foreground font-mono font-medium">{u.login_count}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Clock className="h-3 w-3" /> Last Active</span>
                                <span className="text-foreground font-medium">
                                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "N/A"}
                                </span>
                              </div>
                              <div className="text-xs">
                                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Globe className="h-3 w-3" /> Country</span>
                                <span className="text-foreground font-medium">{u.detected_country || "Unknown"}</span>
                              </div>
                            </div>

                            {u.analyses.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                                  <Search className="h-3 w-3 text-primary" /> Recent Searches ({u.analyses_count})
                                </h4>
                                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                  {u.analyses.map((a: any) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-xs hover:border-primary/20 cursor-pointer transition-colors"
                                      onClick={(e) => { e.stopPropagation(); navigate(`/analysis/${a.id}`); }}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="text-foreground font-medium truncate block">{a.address || a.url}</span>
                                        <span className="text-muted-foreground">{a.city}, {a.country} · {a.price}</span>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                        <span className={`font-mono font-bold ${scoreColor(a.global_score)}`}>{a.global_score}</span>
                                        <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                                        <Eye className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
