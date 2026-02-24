import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Globe, Monitor, Smartphone, ArrowRight } from "lucide-react";

const countryFlag = (code: string | null) => {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const parseDevice = (ua: string | null) => {
  if (!ua) return { type: "Unknown", short: "?" };
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  let browser = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  return { type: isMobile ? "Mobile" : "Desktop", short: browser, isMobile };
};

const formatDuration = (ms: number | null) => {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

interface Visit {
  id: string;
  session_id: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  ip_country: string | null;
  ip_country_code: string | null;
  time_on_page_ms: number | null;
  is_bounce: boolean | null;
  created_at: string;
}

const AdminVisitorLog = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("today");

  useEffect(() => {
    const fetchVisits = async () => {
      setLoading(true);
      const now = new Date();
      let since: Date;
      if (period === "today") {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === "7d") {
        since = new Date(now.getTime() - 7 * 86400000);
      } else {
        since = new Date(now.getTime() - 30 * 86400000);
      }

      const { data } = await (supabase
        .from("page_visits" as any)
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500) as any);

      setVisits(data || []);
      setLoading(false);
    };
    fetchVisits();
  }, [period]);

  // Group visits by session
  const sessionMap = new Map<string, Visit[]>();
  visits.forEach(v => {
    const list = sessionMap.get(v.session_id) || [];
    list.push(v);
    sessionMap.set(v.session_id, list);
  });

  const sessions = Array.from(sessionMap.entries()).map(([sid, vList]) => {
    const sorted = vList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const first = sorted[0];
    const totalTime = sorted.reduce((s, v) => s + (v.time_on_page_ms || 0), 0);
    const device = parseDevice(first.user_agent);
    return {
      sessionId: sid,
      visits: sorted,
      country: first.ip_country,
      countryCode: first.ip_country_code,
      device,
      startedAt: first.created_at,
      totalTime,
      pages: sorted.length,
      isBounce: sorted.length === 1 && sorted[0].is_bounce,
      referrer: first.referrer,
    };
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Visitor Activity Log</h2>
          <span className="text-[10px] text-muted-foreground">{sessions.length} sessions</span>
        </div>
        <div className="flex gap-1">
          {(["today", "7d", "30d"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                period === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
              }`}>
              {p === "today" ? "Today" : p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 rounded-full border-2 border-t-primary border-border animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No visits in this period.</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {sessions.map((s) => (
            <details key={s.sessionId} className="group rounded-xl border border-border overflow-hidden">
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors text-xs">
                {/* Time */}
                <span className="text-muted-foreground font-mono w-16 flex-shrink-0">
                  {new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {/* Flag + Country */}
                <span className="flex items-center gap-1.5 w-28 flex-shrink-0">
                  <span className="text-sm">{countryFlag(s.countryCode)}</span>
                  <span className="text-foreground truncate">{s.country || "Unknown"}</span>
                </span>
                {/* Device */}
                <span className="flex items-center gap-1 text-muted-foreground w-20 flex-shrink-0">
                  {s.device.isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                  {s.device.short}
                </span>
                {/* Pages */}
                <span className="text-foreground font-mono w-12 flex-shrink-0 text-center">{s.pages} pg</span>
                {/* Time on site */}
                <span className="flex items-center gap-1 text-muted-foreground w-16 flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatDuration(s.totalTime)}
                </span>
                {/* Bounce */}
                {s.isBounce && (
                  <span className="text-[9px] text-score-average bg-score-average/10 px-1.5 py-0.5 rounded-full uppercase font-medium">bounce</span>
                )}
                {/* Referrer */}
                {s.referrer && (
                  <span className="text-[10px] text-muted-foreground truncate flex-1 text-right">
                    from: {(() => { try { return new URL(s.referrer).hostname; } catch { return s.referrer; }})()}
                  </span>
                )}
              </summary>
              {/* Expanded: page journey */}
              <div className="border-t border-border bg-secondary/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.visits.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-1.5">
                      <div className="rounded-lg bg-card border border-border px-2 py-1 text-[10px]">
                        <span className="font-mono text-primary">{v.path}</span>
                        {v.time_on_page_ms != null && (
                          <span className="text-muted-foreground ml-1.5">({formatDuration(v.time_on_page_ms)})</span>
                        )}
                      </div>
                      {i < s.visits.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 font-mono truncate">
                  {new Date(s.startedAt).toLocaleString()}
                  {s.referrer && <> · Referrer: {s.referrer}</>}
                </p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVisitorLog;
