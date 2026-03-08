import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import {
  Users, BarChart3, TrendingUp, Briefcase, Eye as EyeIcon,
  Bell, Target, Trophy, FileText, ListChecks,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  analyses: any[];
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

  return (
    <div className="space-y-6">
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
