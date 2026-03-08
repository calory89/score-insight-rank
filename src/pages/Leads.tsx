import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, X, Users, Target, TrendingUp, Zap, Building2,
  Mail, Globe, Linkedin, Twitter, Phone, MapPin, ArrowRight,
  Filter, ChevronDown, ChevronUp, Brain, Sparkles, MessageSquare,
  Calendar, BarChart3, Eye, Trash2, Edit3, Star, RefreshCw,
} from "lucide-react";

type Lead = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  source: string | null;
  lead_score: number;
  status: string;
  ai_summary: string | null;
  ai_pain_points: string[];
  ai_recommended_approach: string | null;
  ai_ideal_message: string | null;
  tags: string[];
  notes: string | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  created_at: string;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  qualified: { label: "Qualified", color: "bg-primary/10 text-primary border-primary/20" },
  contacted: { label: "Contacted", color: "bg-score-average/10 text-score-average border-score-average/20" },
  responded: { label: "Responded", color: "bg-score-good/10 text-score-good border-score-good/20" },
  meeting: { label: "Meeting", color: "bg-score-excellent/10 text-score-excellent border-score-excellent/20" },
  converted: { label: "Converted", color: "bg-primary/20 text-primary border-primary/30" },
  cold: { label: "Cold", color: "bg-muted text-muted-foreground border-border" },
  lost: { label: "Lost", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-score-excellent";
  if (score >= 60) return "text-score-good";
  if (score >= 40) return "text-score-average";
  return "text-score-poor";
};

const scoreBg = (score: number) => {
  if (score >= 80) return "bg-score-excellent/10";
  if (score >= 60) return "bg-score-good/10";
  if (score >= 40) return "bg-score-average/10";
  return "bg-score-poor/10";
};

// Add Lead Modal
const AddLeadModal = ({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    website: "",
    industry: "",
    notes: "",
  });

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.company_name && !form.contact_name && !form.website) {
      toast({ title: "Missing info", description: "Provide at least a company name, contact name, or website.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-lead", { body: form });
      if (error) throw error;
      toast({ title: "🎯 Lead analyzed & saved!", description: `Score: ${data?.data?.lead_score ?? "—"}/100` });
      setForm({ company_name: "", contact_name: "", contact_email: "", website: "", industry: "", notes: "" });
      onAdded();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to analyze lead", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Add & Analyze Lead</h3>
                <p className="text-[10px] text-muted-foreground">AI will score and analyze this lead</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          <div className="space-y-4">
            {/* URL — Primary input */}
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
              <label className="text-xs font-semibold text-primary mb-1.5 block flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Paste any URL (primary)
              </label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://zillow.com/homedetails/... or any company website"
                className="border-primary/20 bg-background text-base" />
              <p className="text-[10px] text-muted-foreground mt-1.5">AI will scrape this page and base the score on real content: neighborhood, price, condition, industry, etc.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Company / Property Name</label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Corp or 123 Main St" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contact Name</label>
                <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="John Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="john@acme.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Industry / Category</label>
                <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Real Estate, SaaS, E-commerce..." />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes (extra context for AI)</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any context: how you found them, what they need, neighborhood quality, etc."
                className="min-h-[80px]" />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="hero" onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Analyze & Save</>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Lead Detail Panel
const LeadDetail = ({ lead, onClose, onUpdate }: { lead: Lead; onClose: () => void; onUpdate: () => void }) => {
  const { toast } = useToast();
  const sc = statusConfig[lead.status] || statusConfig.new;

  const updateStatus = async (newStatus: string) => {
    await (supabase as any).from("leads").update({ status: newStatus }).eq("id", lead.id);
    toast({ title: `Status updated to ${statusConfig[newStatus]?.label || newStatus}` });
    onUpdate();
  };

  const deleteLead = async () => {
    await (supabase as any).from("leads").delete().eq("id", lead.id);
    toast({ title: "Lead deleted" });
    onClose();
    onUpdate();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 bg-card border-l border-border shadow-2xl overflow-y-auto">
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${scoreBg(lead.lead_score)}`}>
            <span className={`font-mono text-lg font-bold ${scoreColor(lead.lead_score)}`}>{lead.lead_score}</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{lead.company_name || lead.contact_name || "Unknown"}</h3>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
      </div>

      <div className="p-5 space-y-6">
        {/* Contact Info */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>
          {lead.contact_name && <div className="flex items-center gap-2 text-sm"><Users className="h-3.5 w-3.5 text-muted-foreground" /> {lead.contact_name}</div>}
          {lead.contact_email && <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> <a href={`mailto:${lead.contact_email}`} className="text-primary hover:underline">{lead.contact_email}</a></div>}
          {lead.contact_phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {lead.contact_phone}</div>}
          {lead.website && <div className="flex items-center gap-2 text-sm"><Globe className="h-3.5 w-3.5 text-muted-foreground" /> <a href={lead.website} target="_blank" className="text-primary hover:underline truncate">{lead.website}</a></div>}
          {lead.linkedin_url && <div className="flex items-center gap-2 text-sm"><Linkedin className="h-3.5 w-3.5 text-muted-foreground" /> <a href={lead.linkedin_url} target="_blank" className="text-primary hover:underline">LinkedIn</a></div>}
          {lead.location && <div className="flex items-center gap-2 text-sm"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {lead.location}</div>}
        </div>

        {/* AI Summary */}
        {lead.ai_summary && (
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">AI Analysis</h4>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{lead.ai_summary}</p>
          </div>
        )}

        {/* Pain Points */}
        {lead.ai_pain_points?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pain Points</h4>
            <ul className="space-y-1.5">
              {lead.ai_pain_points.map((p, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Target className="h-3 w-3 text-score-average flex-shrink-0 mt-1" /> {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Approach */}
        {lead.ai_recommended_approach && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommended Approach</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{lead.ai_recommended_approach}</p>
          </div>
        )}

        {/* Ideal Message */}
        {lead.ai_ideal_message && (
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> AI-Generated Message
              </h4>
              <button onClick={() => { navigator.clipboard.writeText(lead.ai_ideal_message!); toast({ title: "Copied!" }); }}
                className="text-[10px] text-primary hover:underline">Copy</button>
            </div>
            <p className="text-sm text-foreground leading-relaxed italic">"{lead.ai_ideal_message}"</p>
          </div>
        )}

        {/* Tags */}
        {lead.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        )}

        {/* Status Update */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Status</h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(statusConfig).map(([key, config]) => (
              <button key={key} onClick={() => updateStatus(key)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                  lead.status === key ? config.color + " ring-1 ring-primary/30" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                }`}>
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        {lead.notes && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground">{lead.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="destructive" size="sm" onClick={deleteLead} className="text-xs">
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// Main Page
const Leads = () => {
  useDocumentMeta({ title: "Leads CRM | RealHunt", description: "AI-powered lead discovery and management for your growth engine." });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading]);

  useEffect(() => {
    if (user) loadLeads();
  }, [user]);

  const loadLeads = async () => {
    const { data } = await (supabase as any)
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads((data || []) as Lead[]);
    setLoading(false);
  };

  const filtered = leads
    .filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          l.company_name?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.contact_email?.toLowerCase().includes(q) ||
          l.industry?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.lead_score - a.lead_score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Pipeline stats
  const stats = {
    total: leads.length,
    qualified: leads.filter((l) => l.lead_score >= 70).length,
    avgScore: leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.lead_score, 0) / leads.length) : 0,
    hot: leads.filter((l) => l.lead_score >= 80).length,
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Lead Engine</h1>
            </div>
            <p className="text-sm text-muted-foreground">AI-powered lead discovery, scoring, and management.</p>
          </div>
          <Button variant="hero" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Lead <Sparkles className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Leads</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Target className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono text-primary">{stats.qualified}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Qualified</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className={`text-2xl font-bold font-mono ${scoreColor(stats.avgScore)}`}>{stats.avgScore}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Score</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Zap className="h-4 w-4 text-score-excellent mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono text-score-excellent">{stats.hot}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hot Leads (80+)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, company, email, industry..."
              className="pl-10" />
          </div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg text-xs px-3 py-2 bg-card border border-border text-foreground focus:outline-none focus:border-primary/40">
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "score" | "date")}
              className="rounded-lg text-xs px-3 py-2 bg-card border border-border text-foreground focus:outline-none focus:border-primary/40">
              <option value="score">Best Score</option>
              <option value="date">Newest</option>
            </select>
          </div>
        </div>

        {/* Leads List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 rounded-2xl border border-dashed border-border bg-secondary/20">
            {leads.length === 0 ? (
              <>
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Your lead engine is ready</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Add your first lead and let AI analyze, score, and generate personalized outreach strategies automatically.
                </p>
                <Button variant="hero" size="lg" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Your First Lead
                </Button>
              </>
            ) : (
              <>
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No leads match your filters.</p>
              </>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead, i) => {
              const sc = statusConfig[lead.status] || statusConfig.new;
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedLead(lead)}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    {/* Score */}
                    <div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${scoreBg(lead.lead_score)}`}>
                      <span className={`font-mono text-lg font-bold ${scoreColor(lead.lead_score)}`}>{lead.lead_score}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {lead.company_name || lead.contact_name || "Unknown Lead"}
                        </h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${sc.color}`}>{sc.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {lead.contact_name && lead.company_name && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {lead.contact_name}</span>}
                        {lead.industry && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {lead.industry}</span>}
                        {lead.contact_email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {lead.contact_email}</span>}
                      </div>
                      {lead.ai_summary && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{lead.ai_summary}</p>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                      {lead.tags?.slice(0, 2).map((t, j) => (
                        <Badge key={j} variant="secondary" className="text-[9px]">{t}</Badge>
                      ))}
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={loadLeads} />
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black" onClick={() => setSelectedLead(null)} />
            <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={() => { loadLeads(); setSelectedLead(null); }} />
          </>
        )}
      </AnimatePresence>

      <div className="hidden sm:block"><Footer /></div>
      <BottomNav />
    </div>
  );
};

export default Leads;
