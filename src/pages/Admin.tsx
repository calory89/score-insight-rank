import { useEffect, useState } from "react";
import AdminVisitsPanel from "@/components/AdminVisitsPanel";
import AdminVisitorLog from "@/components/AdminVisitorLog";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GitCompare } from "lucide-react";
import {
  Users, BarChart3, Globe, Search, ChevronDown, ChevronUp,
  Calendar, MapPin, TrendingUp, Shield, ArrowLeft, Activity,
  Mail, Clock, Hash, Eye, Zap, Loader2, CheckCircle2, XCircle,
  TicketCheck, Send, AlertCircle, MessageSquare,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

interface BatchJob {
  url: string;
  status: "pending" | "running" | "done" | "error";
  analysisId?: string;
  error?: string;
  score?: number;
}

const BatchAnalysisPanel = () => {
  const [urlText, setUrlText] = useState("");
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();

  const startBatch = async () => {
    const urls = urlText
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.length > 5 && (u.startsWith("http://") || u.startsWith("https://")));

    if (urls.length === 0) {
      toast({ title: "No valid URLs", description: "Paste URLs (one per line or comma-separated)", variant: "destructive" });
      return;
    }

    const initialJobs: BatchJob[] = urls.map(url => ({ url, status: "pending" }));
    setJobs(initialJobs);
    setRunning(true);

    // Run sequentially to avoid rate limits
    for (let i = 0; i < initialJobs.length; i++) {
      setJobs(prev => prev.map((j, idx) => idx === i ? { ...j, status: "running" } : j));

      try {
        const { data, error } = await supabase.functions.invoke("analyze-property", {
          body: { url: initialJobs[i].url },
        });

        if (error) throw error;
        if (data?.scrape_failed) throw new Error("Scrape failed");
        if (data?.error) throw new Error(data.error);

        setJobs(prev => prev.map((j, idx) =>
          idx === i ? { ...j, status: "done", analysisId: data.data?.id, score: data.data?.global_score } : j
        ));
      } catch (e: any) {
        setJobs(prev => prev.map((j, idx) =>
          idx === i ? { ...j, status: "error", error: e.message || "Failed" } : j
        ));
      }
    }
    setRunning(false);
    toast({ title: "Batch complete", description: `${initialJobs.length} URLs processed` });
  };

  const doneCount = jobs.filter(j => j.status === "done").length;
  const errorCount = jobs.filter(j => j.status === "error").length;

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Batch Analysis</h2>
        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Pro</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Paste multiple listing URLs below (one per line or comma-separated). All will be analyzed automatically.
      </p>
      <Textarea
        value={urlText}
        onChange={(e) => setUrlText(e.target.value)}
        placeholder={"https://idealista.com/property/12345\nhttps://zillow.com/homedetails/67890\nhttps://rightmove.co.uk/property/11111"}
        rows={5}
        className="bg-secondary/50 text-sm font-mono mb-3"
        disabled={running}
      />
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">
          {urlText.split(/[\n,]+/).filter(u => u.trim().startsWith("http")).length} URLs detected
        </span>
        <Button variant="hero" size="sm" onClick={startBatch} disabled={running}>
          {running ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analyzing…</> : <><Zap className="h-3.5 w-3.5 mr-1" /> Analyze All</>}
        </Button>
      </div>

      {/* Results */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span>✅ {doneCount} done</span>
            {errorCount > 0 && <span>❌ {errorCount} failed</span>}
            {running && <span className="text-primary">⏳ Processing…</span>}
          </div>
          {jobs.map((job, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${
              job.status === "done" ? "border-score-excellent/20 bg-score-excellent/5" :
              job.status === "error" ? "border-destructive/20 bg-destructive/5" :
              job.status === "running" ? "border-primary/20 bg-primary/5" :
              "border-border bg-card"
            }`}>
              {job.status === "running" && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />}
              {job.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-score-excellent flex-shrink-0" />}
              {job.status === "error" && <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
              {job.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
              <span className="text-foreground truncate flex-1 font-mono">{job.url}</span>
              {job.score != null && <span className={`font-mono font-bold ${scoreColor(job.score)}`}>{job.score}</span>}
              {job.status === "done" && job.analysisId && (
                <button onClick={() => navigate(`/analysis/${job.analysisId}`)} className="text-primary hover:underline flex-shrink-0">View →</button>
              )}
              {job.status === "error" && <span className="text-destructive truncate max-w-[120px]">{job.error}</span>}
            </div>
          ))}
          {/* Compare suggestion */}
          {!running && doneCount >= 2 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
              <Button variant="hero" size="sm" onClick={() => {
                const ids = jobs.filter(j => j.status === "done" && j.analysisId).map(j => j.analysisId).join(",");
                navigate(`/compare?ids=${ids}`);
              }}>
                <GitCompare className="h-3.5 w-3.5 mr-1" /> Compare {doneCount} Properties
              </Button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminTicketsPanel = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const { user } = useAuth();

  const fetchTickets = async () => {
    const { data } = await (supabase
      .from("tickets" as any)
      .select("*")
      .order("updated_at", { ascending: false }) as any);
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const fetchMessages = async (ticketId: string) => {
    const { data } = await (supabase
      .from("ticket_messages" as any)
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }) as any);
    setMessages(data || []);
  };

  const selectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleReply = async () => {
    if (!user || !selectedTicket || !reply.trim()) return;
    setSending(true);
    await (supabase.from("ticket_messages" as any).insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: reply.trim(),
      is_admin: true,
    }) as any);
    await (supabase.from("tickets" as any).update({
      updated_at: new Date().toISOString(),
      status: "in_progress",
    }).eq("id", selectedTicket.id) as any);
    setReply("");
    setSending(false);
    fetchMessages(selectedTicket.id);
    fetchTickets();
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    await (supabase.from("tickets" as any).update({ status: "closed" }).eq("id", selectedTicket.id) as any);
    setSelectedTicket({ ...selectedTicket, status: "closed" });
    fetchTickets();
  };

  const filteredTickets = tickets.filter(t => statusFilter === "all" || t.status === statusFilter);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TicketCheck className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Support Tickets</h2>
        <span className="text-[10px] text-muted-foreground ml-2">{tickets.filter(t => t.status === "open").length} open</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[400px]">
        {/* List */}
        <div className="border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-xs text-foreground">
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[350px]">
            {loading ? (
              <div className="flex justify-center py-6"><div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" /></div>
            ) : filteredTickets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No tickets.</p>
            ) : (
              filteredTickets.map((t) => (
                <button key={t.id} onClick={() => selectTicket(t)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-secondary/30 transition-colors ${selectedTicket?.id === t.id ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{t.ticket_number}</span>
                    <span className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full ${
                      t.status === "open" ? "text-score-average bg-score-average/10" :
                      t.status === "in_progress" ? "text-primary bg-primary/10" : "text-score-excellent bg-score-excellent/10"
                    }`}>{t.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground">{t.category} · {t.priority}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="border border-border rounded-xl overflow-hidden flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{selectedTicket.subject}</h3>
                  <span className="text-[10px] text-muted-foreground">{selectedTicket.ticket_number} · {selectedTicket.category} · {selectedTicket.priority}</span>
                </div>
                {selectedTicket.status !== "closed" && (
                  <Button variant="outline" size="sm" onClick={closeTicket} className="text-xs">Close Ticket</Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[280px]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.is_admin ? "bg-primary/10" : "bg-secondary"}`}>
                      <span className="text-[10px] font-medium">{m.is_admin ? "You (Admin)" : "Customer"}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{new Date(m.created_at).toLocaleString()}</span>
                      <p className="text-xs mt-1 whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTicket.status !== "closed" && (
                <div className="p-3 border-t border-border flex gap-2">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" rows={2} className="bg-secondary/50 text-xs flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }}} />
                  <Button variant="hero" size="sm" onClick={handleReply} disabled={sending || !reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Select a ticket</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ErrorLogsPanel = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    let query = (supabase.from("error_logs" as any).select("*").order("created_at", { ascending: false }).limit(100) as any);
    if (filterType !== "all") {
      query = query.eq("error_type", filterType);
    }
    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [filterType]);

  const deleteLog = async (id: string) => {
    await (supabase.from("error_logs" as any).delete().eq("id", id) as any);
    setLogs(prev => prev.filter(l => l.id !== id));
    toast({ title: "Error log deleted" });
  };

  const deleteAll = async () => {
    if (!confirm("Delete all visible error logs?")) return;
    const ids = logs.map(l => l.id);
    for (const id of ids) {
      await (supabase.from("error_logs" as any).delete().eq("id", id) as any);
    }
    setLogs([]);
    toast({ title: "All error logs cleared" });
  };

  const retryAnalysis = async (log: any) => {
    if (!log.url) return;
    setRetrying(log.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-property", {
        body: { url: log.url },
      });
      if (error) throw error;
      if (data?.scrape_failed || data?.error) throw new Error(data?.error || "Scrape failed");
      // Delete error log on success
      await (supabase.from("error_logs" as any).delete().eq("id", log.id) as any);
      setLogs(prev => prev.filter(l => l.id !== log.id));
      toast({ title: "Retry successful!", description: `Score: ${data.data?.global_score || "N/A"}` });
      if (data.data?.id) navigate(`/analysis/${data.data.id}`);
    } catch (e: any) {
      toast({ title: "Retry failed", description: e.message, variant: "destructive" });
    }
    setRetrying(null);
  };

  const errorTypeIcon = (type: string) => {
    switch (type) {
      case "scrape_failed": return "🔍";
      case "rate_limit": return "⏱️";
      case "credits_depleted": return "💳";
      case "ai_error": return "🤖";
      default: return "❌";
    }
  };

  const errorTypeBg = (type: string) => {
    switch (type) {
      case "scrape_failed": return "border-score-average/20 bg-score-average/5";
      case "rate_limit": return "border-primary/20 bg-primary/5";
      case "credits_depleted": return "border-destructive/20 bg-destructive/5";
      case "ai_error": return "border-destructive/20 bg-destructive/5";
      default: return "border-destructive/20 bg-destructive/5";
    }
  };

  const typeCounts = logs.reduce((acc: Record<string, number>, log: any) => {
    acc[log.error_type] = (acc[log.error_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-destructive/20 bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">Error Logs</h2>
          <span className="text-[10px] text-muted-foreground ml-2">{logs.length} errors</span>
        </div>
        {logs.length > 0 && (
          <button onClick={deleteAll} className="text-[10px] text-destructive hover:underline">Clear All</button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "analysis_error", "scrape_failed", "rate_limit", "ai_error", "credits_depleted"].map((type) => (
          <button key={type} onClick={() => { setFilterType(type); }}
            className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
              filterType === type ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
            }`}>
            {type === "all" ? "All" : type.replace(/_/g, " ")}
            {type !== "all" && typeCounts[type] ? ` (${typeCounts[type]})` : ""}
          </button>
        ))}
      </div>

      {/* Logs list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No errors logged yet. 🎉</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log: any) => (
            <div key={log.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-xs ${errorTypeBg(log.error_type)}`}>
              <span className="text-sm flex-shrink-0 mt-0.5">{errorTypeIcon(log.error_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-foreground">{log.error_type.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground truncate">{log.error_message}</p>
                {log.url && <p className="text-primary/70 font-mono truncate mt-0.5">{log.url}</p>}
                {log.user_email && <p className="text-muted-foreground mt-0.5">👤 {log.user_email}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {log.url && (
                  <button
                    onClick={() => retryAnalysis(log)}
                    disabled={retrying === log.id}
                    className="text-[10px] text-primary hover:underline disabled:opacity-50 flex items-center gap-0.5"
                  >
                    {retrying === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    Retry
                  </button>
                )}
                <button onClick={() => deleteLog(log.id)} className="text-[10px] text-destructive hover:underline flex items-center gap-0.5">
                  <XCircle className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [myAnalysesCount, setMyAnalysesCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate("/");
      return;
    }

    const fetchAdminData = async () => {
      try {
        const [adminResult, countResult] = await Promise.all([
          supabase.functions.invoke("admin-data"),
          supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        if (adminResult.error) throw adminResult.error;
        if (adminResult.data?.error) throw new Error(adminResult.data.error);
        setUsers(adminResult.data.users || []);
        setStats(adminResult.data.stats || null);
        setMyAnalysesCount(countResult.count || 0);
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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Searches</p>
              <p className="text-lg font-bold font-mono text-primary">{myAnalysesCount} <span className="text-xs text-muted-foreground font-normal">/ ∞</span></p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </div>
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
            {/* Visits Analytics Panel */}
            <AdminVisitsPanel />

            {/* Visitor Activity Log */}
            <AdminVisitorLog />

            {/* Batch Analysis Panel */}
            <BatchAnalysisPanel />

            {/* Error Logs Panel */}
            <ErrorLogsPanel />

            {/* Admin Tickets Panel */}
            <AdminTicketsPanel />

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
                filteredUsers.map((u) => (
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
                        u.email === ADMIN_EMAIL ? "bg-primary/10 text-primary" :
                        u.plan === "free" ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"
                      }`}>{u.email === ADMIN_EMAIL ? "pro" : u.plan}</span>
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