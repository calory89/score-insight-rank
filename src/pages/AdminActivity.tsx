import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";

const db = supabase as any;
type U = { user_id: string; email: string | null; username: string | null; last_login_at: string | null; clicks: number; favorites: number; views: number; last_event: string | null; first_find: string | null; first_shortcode: string | null };
type E = { id: string; user_id: string; event: string; created_at: string; ig_finds: { source_account: string; caption: string | null; post_url: string; price_eur: number | null } | null };
type L = { id: string; email: string; company: string | null; message: string | null; source: string | null; created_at: string };

const AdminActivity = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<U[]>([]);
  const [events, setEvents] = useState<E[]>([]);
  const [leads, setLeads] = useState<L[]>([]);
  const [finds, setFinds] = useState<{ n: number; accounts: number } | null>(null);
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

  useEffect(() => { document.title = "Admin · Activity"; }, []);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    db.from("user_roles").select("role").eq("user_id", user.id).then(({ data }: any) => {
      const ok = (data || []).some((r: any) => String(r.role) === "admin"); setIsAdmin(ok);
      if (!ok) return;
      db.from("admin_user_activity").select("*").order("last_event", { ascending: false, nullsFirst: false }).limit(500).then(({ data }: any) => setUsers(data || []));
      db.from("find_events").select("id,user_id,event,created_at,ig_finds(source_account,caption,post_url,price_eur)").order("created_at", { ascending: false }).limit(200).then(({ data }: any) => setEvents(data || []));
      db.from("contact_requests").select("id,email,company,message,source,created_at").in("source", ["network", "network_analyze"]).order("created_at", { ascending: false }).limit(200).then(({ data }: any) => setLeads(data || []));
      db.from("ig_finds").select("source_account").then(({ data }: any) => setFinds({ n: (data || []).length, accounts: new Set((data || []).map((x: any) => x.source_account)).size }));
    });
  }, [user]);

  if (isAdmin === false) return <div className="min-h-screen bg-paper text-ink"><RHNav /><div className="max-w-[720px] mx-auto px-6 py-20 text-ink-muted">Admins only. <Link to="/auth/sign-in" className="underline text-ink">Sign in</Link></div></div>;

  const email = (id: string) => users.find((u) => u.user_id === id)?.email || id.slice(0, 8);
  const Th = ({ c }: { c: string }) => <th className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-muted font-medium px-3 py-2 border-b border-hairline">{c}</th>;
  const Td = ({ c, m }: { c: React.ReactNode; m?: boolean }) => <td className={`px-3 py-2 border-b border-hairline/70 text-[13px] align-top ${m ? "text-ink-muted" : ""}`}>{c}</td>;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <div className="max-w-[1140px] mx-auto px-6 py-10 flex flex-col gap-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2">Admin</p>
          <h1 className="font-display text-[34px] tracking-tight">Who is doing what</h1>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
            <span><b className="font-display text-[22px]">{users.length}</b> <span className="text-ink-muted">users</span></span>
            <span><b className="font-display text-[22px]">{users.reduce((a, u) => a + Number(u.clicks || 0), 0)}</b> <span className="text-ink-muted">clicks</span></span>
            <span><b className="font-display text-[22px]">{users.reduce((a, u) => a + Number(u.favorites || 0), 0)}</b> <span className="text-ink-muted">favorites</span></span>
            <span><b className="font-display text-[22px]">{finds?.n ?? "—"}</b> <span className="text-ink-muted">finds from {finds?.accounts ?? "—"} accounts</span></span>
            <span><b className="font-display text-[22px]">{leads.length}</b> <span className="text-ink-muted">developer leads</span></span>
          </div>
        </div>

        <section>
          <h2 className="font-display text-[20px] tracking-tight mb-3">Developer leads (/network)</h2>
          <div className="overflow-x-auto border border-hairline rounded-xl bg-white"><table className="w-full border-collapse"><thead><tr><Th c="When" /><Th c="Email" /><Th c="Project / company" /><Th c="Wants" /></tr></thead><tbody>
            {leads.map((l) => <tr key={l.id}><Td c={fmt(l.created_at)} m /><Td c={l.email} /><Td c={l.company || ""} /><Td c={l.message || ""} m /></tr>)}
            {leads.length === 0 && <tr><Td c="No leads yet." m /></tr>}
          </tbody></table></div>
        </section>

        <section>
          <h2 className="font-display text-[20px] tracking-tight mb-3">Users</h2>
          <div className="overflow-x-auto border border-hairline rounded-xl bg-white"><table className="w-full border-collapse"><thead><tr><Th c="Email" /><Th c="Came in via" /><Th c="Views" /><Th c="Clicks" /><Th c="Favorites" /><Th c="Last event" /><Th c="Last login" /></tr></thead><tbody>
            {users.map((u) => <tr key={u.user_id}><Td c={u.email || ""} /><Td c={u.first_shortcode ? <Link to={`/find/${u.first_shortcode}`} className="underline">{u.first_find}</Link> : ""} m /><Td c={u.views || 0} /><Td c={u.clicks} /><Td c={u.favorites} /><Td c={fmt(u.last_event)} m /><Td c={fmt(u.last_login_at)} m /></tr>)}
          </tbody></table></div>
        </section>

        <section>
          <h2 className="font-display text-[20px] tracking-tight mb-3">Latest activity</h2>
          <div className="overflow-x-auto border border-hairline rounded-xl bg-white"><table className="w-full border-collapse"><thead><tr><Th c="When" /><Th c="User" /><Th c="Event" /><Th c="Listing" /></tr></thead><tbody>
            {events.map((e) => <tr key={e.id}><Td c={fmt(e.created_at)} m /><Td c={email(e.user_id)} /><Td c={e.event} /><Td c={e.ig_finds ? <a href={e.ig_finds.post_url} target="_blank" rel="noreferrer" className="underline">@{e.ig_finds.source_account}{e.ig_finds.price_eur ? " · €" + e.ig_finds.price_eur.toLocaleString("en-GB") : ""} · {(e.ig_finds.caption || "").slice(0, 60)}</a> : ""} /></tr>)}
            {events.length === 0 && <tr><Td c="No activity yet." m /></tr>}
          </tbody></table></div>
        </section>
      </div>
    </div>
  );
};
export default AdminActivity;
