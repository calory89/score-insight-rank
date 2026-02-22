import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Clock, Eye, TrendingUp, ArrowDown, Users } from "lucide-react";

// Country code to flag emoji
const countryFlag = (code: string | null) => {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

interface VisitStats {
  totalVisits: number;
  uniqueSessions: number;
  avgTimeOnPage: number;
  bounceRate: number;
  topPages: { path: string; count: number }[];
  topCountries: { country: string; code: string; count: number }[];
  visitsByDay: { date: string; count: number }[];
}

const AdminVisitsPanel = () => {
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      let query = supabase.from("page_visits" as any).select("*").order("created_at", { ascending: false }) as any;
      
      if (period === "7d") {
        const d = new Date(); d.setDate(d.getDate() - 7);
        query = query.gte("created_at", d.toISOString());
      } else if (period === "30d") {
        const d = new Date(); d.setDate(d.getDate() - 30);
        query = query.gte("created_at", d.toISOString());
      }

      const { data: visits } = await query.limit(1000);
      if (!visits) { setLoading(false); return; }

      const totalVisits = visits.length;
      const uniqueSessions = new Set(visits.map((v: any) => v.session_id)).size;
      
      const withTime = visits.filter((v: any) => v.time_on_page_ms != null);
      const avgTimeOnPage = withTime.length > 0
        ? Math.round(withTime.reduce((s: number, v: any) => s + (v.time_on_page_ms || 0), 0) / withTime.length / 1000)
        : 0;
      
      const bounceCount = visits.filter((v: any) => v.is_bounce === true).length;
      const bounceRate = totalVisits > 0 ? Math.round((bounceCount / totalVisits) * 100) : 0;

      // Top pages
      const pageCounts: Record<string, number> = {};
      visits.forEach((v: any) => { pageCounts[v.path] = (pageCounts[v.path] || 0) + 1; });
      const topPages = Object.entries(pageCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top countries
      const countryCounts: Record<string, { count: number; code: string }> = {};
      visits.forEach((v: any) => {
        const country = v.ip_country || "Unknown";
        const code = v.ip_country_code || "";
        if (!countryCounts[country]) countryCounts[country] = { count: 0, code };
        countryCounts[country].count++;
      });
      const topCountries = Object.entries(countryCounts)
        .map(([country, { count, code }]) => ({ country, code, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Visits by day
      const dayCounts: Record<string, number> = {};
      visits.forEach((v: any) => {
        const day = new Date(v.created_at).toLocaleDateString();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const visitsByDay = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setStats({ totalVisits, uniqueSessions, avgTimeOnPage, bounceRate, topPages, topCountries, visitsByDay });
    } catch (e) {
      console.error("Failed to load visit stats", e);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Website Visits</h2>
        </div>
        <div className="flex gap-1">
          {(["7d", "30d", "all"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                period === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
              }`}>
              {p === "all" ? "All Time" : p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" />
        </div>
      ) : !stats ? (
        <p className="text-xs text-muted-foreground text-center py-8">No visit data yet.</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
              <Eye className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-foreground">{stats.totalVisits}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Page Views</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
              <Users className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-foreground">{stats.uniqueSessions}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
              <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-foreground">{stats.avgTimeOnPage}s</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Time</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
              <ArrowDown className="h-4 w-4 text-score-average mx-auto mb-1" />
              <p className="text-xl font-bold font-mono text-foreground">{stats.bounceRate}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bounce Rate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Pages */}
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Top Pages
              </h3>
              <div className="space-y-1.5">
                {stats.topPages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono truncate flex-1">{p.path}</span>
                    <span className="font-mono font-medium text-foreground ml-2">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-primary" /> Visitors by Country
              </h3>
              <div className="space-y-1.5">
                {stats.topCountries.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground flex items-center gap-1.5">
                      <span className="text-sm">{countryFlag(c.code)}</span>
                      {c.country}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (c.count / stats.totalVisits) * 100)}%` }} />
                      </div>
                      <span className="font-mono font-medium text-foreground w-8 text-right">{c.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily chart */}
          {stats.visitsByDay.length > 1 && (
            <div className="mt-4 rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3">Daily Visits</h3>
              <div className="flex items-end gap-1 h-24">
                {stats.visitsByDay.map((d, i) => {
                  const max = Math.max(...stats.visitsByDay.map(v => v.count));
                  const h = max > 0 ? (d.count / max) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}: ${d.count}`}>
                      <span className="text-[8px] font-mono text-muted-foreground">{d.count}</span>
                      <div className="w-full rounded-t bg-primary/70 transition-all" style={{ height: `${Math.max(4, h)}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminVisitsPanel;
