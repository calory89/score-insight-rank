import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import {
  Users, BarChart3, TrendingUp, Briefcase, Eye as EyeIcon,
  Bell, Target, Trophy, FileText, ListChecks, Layers, ArrowRight,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  analyses: any[];
  plan?: string;
}

interface Props {
  users: UserData[];
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--score-good))", "hsl(var(--score-average))",
  "hsl(var(--score-poor))", "hsl(var(--score-bad))",
];

function groupByWeek(items: { created_at: string }[]): { week: string; count: number }[] {
  const map: Record<string, number> = {};
  items.forEach(item => {
    const d = new Date(item.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, count]) => ({ week: week.slice(5), count }));
}

function getWeekKey(date: Date): string {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart.toISOString().slice(0, 10);
}

export default function AdminAnalyticsTab({ users }: Props) {
  const [featureCounts, setFeatureCounts] = useState({
    portfolio: 0, watchlist: 0, scouts: 0, achievements: 0, notes: 0, checklists: 0,
  });
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      const [portfolio, watchlist, scouts, achievements, notes, checklists] = await Promise.all([
        supabase.from("portfolio_properties").select("id", { count: "exact", head: true }),
        supabase.from("watchlist").select("id", { count: "exact", head: true }),
        supabase.from("scout_alerts").select("id", { count: "exact", head: true }),
        supabase.from("user_achievements").select("id", { count: "exact", head: true }),
        supabase.from("property_notes").select("id", { count: "exact", head: true }),
        supabase.from("due_diligence_checklists").select("id", { count: "exact", head: true }),
      ]);
      setFeatureCounts({
        portfolio: portfolio.count || 0,
        watchlist: watchlist.count || 0,
        scouts: scouts.count || 0,
        achievements: achievements.count || 0,
        notes: notes.count || 0,
        checklists: checklists.count || 0,
      });
      setLoadingFeatures(false);
    };
    fetchCounts();
  }, []);

  const signupsByWeek = useMemo(() => groupByWeek(users), [users]);

  const allAnalyses = useMemo(() =>
    users.flatMap(u => (u.analyses || []).map((a: any) => ({ created_at: a.created_at, country: a.country }))),
    [users]
  );
  const analysesByWeek = useMemo(() => groupByWeek(allAnalyses), [allAnalyses]);

  const topCountries = useMemo(() => {
    const map: Record<string, number> = {};
    allAnalyses.forEach(a => { if (a.country) map[a.country] = (map[a.country] || 0) + 1; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [allAnalyses]);

  // Conversion funnel
  const funnel = useMemo(() => {
    const total = users.length;
    const withAnalysis = users.filter(u => (u.analyses || []).length > 0).length;
    const with3Plus = users.filter(u => (u.analyses || []).length >= 3).length;
    const proPlan = users.filter(u => u.plan && u.plan !== "free").length;
    return [
      { label: "Signed Up", value: total, pct: 100 },
      { label: "1st Analysis", value: withAnalysis, pct: total > 0 ? Math.round((withAnalysis / total) * 100) : 0 },
      { label: "3+ Analyses", value: with3Plus, pct: total > 0 ? Math.round((with3Plus / total) * 100) : 0 },
      { label: "Pro Upgrade", value: proPlan, pct: total > 0 ? Math.round((proPlan / total) * 100) : 0 },
    ];
  }, [users]);

  // Retention cohort grid
  const cohortData = useMemo(() => {
    const now = new Date();
    const weekKeys: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weekKeys.push(getWeekKey(d));
    }

    // Group users by signup week
    const cohorts: { week: string; users: UserData[]; retention: number[] }[] = [];
    
    for (let ci = 0; ci < Math.min(weekKeys.length - 1, 6); ci++) {
      const cohortWeek = weekKeys[ci];
      const nextWeek = weekKeys[ci + 1] || "9999-99-99";
      const cohortUsers = users.filter(u => {
        const key = getWeekKey(new Date(u.created_at));
        return key >= cohortWeek && key < nextWeek;
      });
      if (cohortUsers.length === 0) continue;

      const retention: number[] = [];
      for (let wi = 1; wi <= 4 && ci + wi < weekKeys.length; wi++) {
        const targetWeek = weekKeys[ci + wi];
        const activeCount = cohortUsers.filter(u =>
          (u.analyses || []).some((a: any) => {
            const aWeek = getWeekKey(new Date(a.created_at));
            return aWeek >= targetWeek;
          })
        ).length;
        retention.push(Math.round((activeCount / cohortUsers.length) * 100));
      }

      cohorts.push({ week: cohortWeek.slice(5), users: cohortUsers, retention });
    }

    return cohorts;
  }, [users]);

  const features = [
    { label: "Portfolio Items", count: featureCounts.portfolio, icon: Briefcase },
    { label: "Watchlist Entries", count: featureCounts.watchlist, icon: EyeIcon },
    { label: "Scout Alerts", count: featureCounts.scouts, icon: Target },
    { label: "Achievements", count: featureCounts.achievements, icon: Trophy },
    { label: "Property Notes", count: featureCounts.notes, icon: FileText },
    { label: "Checklists", count: featureCounts.checklists, icon: ListChecks },
  ];

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

  const retentionColor = (pct: number) => {
    if (pct >= 60) return "bg-score-excellent/80 text-white";
    if (pct >= 40) return "bg-score-good/60 text-white";
    if (pct >= 20) return "bg-score-average/50 text-foreground";
    if (pct > 0) return "bg-score-poor/40 text-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Conversion Funnel
        </h3>
        <div className="flex items-center justify-between gap-2">
          {funnel.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-1">
              <div className="flex-1 text-center">
                <div className="relative mx-auto mb-2" style={{ width: `${Math.max(40, step.pct)}%`, minWidth: 48 }}>
                  <div className="h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-lg font-bold font-mono text-primary">{step.value}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{step.label}</p>
                <p className="text-xs font-mono font-medium text-foreground">{step.pct}%</p>
              </div>
              {i < funnel.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Signups + Analyses charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Signups Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={signupsByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Signups" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Analyses Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analysesByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--score-good))" strokeWidth={2} dot={{ r: 3 }} name="Analyses" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retention Cohort Grid */}
      {cohortData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Retention Cohorts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-2 px-2">Cohort</th>
                  <th className="text-center py-2 px-2">Users</th>
                  <th className="text-center py-2 px-2">Week 1</th>
                  <th className="text-center py-2 px-2">Week 2</th>
                  <th className="text-center py-2 px-2">Week 3</th>
                  <th className="text-center py-2 px-2">Week 4</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort) => (
                  <tr key={cohort.week} className="border-b border-border/50">
                    <td className="py-2 px-2 font-mono text-muted-foreground">{cohort.week}</td>
                    <td className="py-2 px-2 text-center font-mono font-medium text-foreground">{cohort.users.length}</td>
                    {[0, 1, 2, 3].map((wi) => (
                      <td key={wi} className="py-1.5 px-2 text-center">
                        {cohort.retention[wi] != null ? (
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold ${retentionColor(cohort.retention[wi])}`}>
                            {cohort.retention[wi]}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Countries */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Top Countries by Analyses
        </h3>
        {topCountries.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCountries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {topCountries.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">No country data yet.</p>
        )}
      </div>

      {/* Feature Adoption */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Feature Adoption
        </h3>
        {loadingFeatures ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3 text-center">
                <div className="h-4 w-4 bg-muted animate-pulse rounded mx-auto mb-2" />
                <div className="h-6 w-8 bg-muted animate-pulse rounded mx-auto mb-1" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {features.map(f => (
              <div key={f.label} className="rounded-lg border border-border p-3 text-center">
                <f.icon className="h-4 w-4 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold font-mono text-foreground">{f.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
