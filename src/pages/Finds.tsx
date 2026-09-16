import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import { Heart, Lock, ExternalLink } from "lucide-react";

type F = { id: string; source_account: string; post_url: string; caption: string | null; image_urls: string[] | null; posted_at: string | null; location_name: string | null; country_guess: string | null; price_eur: number | null; price_raw: string | null; likes: number | null };
const db = supabase as any;
const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");

const Finds = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<F[] | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [acc, setAcc] = useState("all");

  useEffect(() => { document.title = "RealHunt · Cheap homes spotted this month"; }, []);
  useEffect(() => {
    db.from("ig_finds").select("*").order("posted_at", { ascending: false }).limit(300).then(({ data }: any) => setRows(data || []));
  }, []);
  useEffect(() => {
    if (!user) { setFavs(new Set()); return; }
    db.from("find_events").select("find_id").eq("user_id", user.id).eq("event", "favorite").then(({ data }: any) => setFavs(new Set((data || []).map((x: any) => x.find_id))));
  }, [user]);

  const accounts = useMemo(() => Array.from(new Set((rows || []).map((r) => r.source_account))).sort(), [rows]);
  const list = useMemo(() => (rows || []).filter((r) => acc === "all" || r.source_account === acc), [rows, acc]);

  const gate = () => { nav(`/auth/sign-in?next=${encodeURIComponent("/finds")}`); };
  const open = async (f: F) => {
    if (!user) return gate();
    db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "click" }).then(() => {});
    window.open(f.post_url, "_blank", "noopener");
  };
  const fav = async (f: F) => {
    if (!user) return gate();
    const n = new Set(favs);
    if (n.has(f.id)) { n.delete(f.id); await db.from("find_events").delete().eq("user_id", user.id).eq("find_id", f.id).eq("event", "favorite"); }
    else { n.add(f.id); await db.from("find_events").insert({ user_id: user.id, find_id: f.id, event: "favorite" }); }
    setFavs(n);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <section className="max-w-[1140px] mx-auto px-6 pt-12 pb-8">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-4">Spotted in the last 30 days · {rows ? rows.length : "—"} homes</p>
        <h1 className="font-display text-[clamp(32px,5.5vw,56px)] leading-[1.02] tracking-tight max-w-[20ch] text-balance">Cheap homes people are talking about this month.</h1>
        <p className="mt-4 text-[16px] text-ink-muted max-w-[58ch]">Curated from the accounts that hunt cheap houses across Europe and Japan. Free account to open a listing, save it and get the details we dig up.</p>
        {!user && <p className="mt-4 inline-flex items-center gap-2 text-[13px] text-ink-muted"><Lock size={14} /> Sign in to open listings. Takes ten seconds. <Link to="/auth/sign-up" className="underline text-ink">Create account</Link></p>}
        {accounts.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {["all", ...accounts].map((a) => (
              <button key={a} onClick={() => setAcc(a)} aria-pressed={acc === a} className={`px-3 py-1.5 text-[13px] rounded-full border ${acc === a ? "border-ink bg-ink text-paper" : "border-hairline text-ink-muted hover:border-ink"}`}>{a === "all" ? "All" : "@" + a}</button>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-[1140px] mx-auto px-6 pb-24">
        {!rows ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{[0,1,2,3,4,5].map((i) => <div key={i} className="aspect-[4/5] rounded-2xl bg-hairline/50 animate-pulse" />)}</div>
        : list.length === 0 ? <p className="text-ink-muted">Nothing yet. The next batch lands on Tuesday.</p>
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((f) => {
              const img = f.image_urls?.[0];
              const cap = (f.caption || "").replace(/#\w+/g, "").trim();
              return (
                <article key={f.id} className="group border border-hairline rounded-2xl bg-white overflow-hidden flex flex-col">
                  <button onClick={() => open(f)} className="block relative aspect-[4/4] bg-hairline/40 overflow-hidden text-left" aria-label="Open listing">
                    {img && <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${user ? "" : "blur-[2px]"}`} />}
                    {f.price_eur != null && <span className="absolute bottom-3 left-3 font-display text-[22px] bg-white/95 px-3 py-1 rounded-full tabular-nums">{eur(f.price_eur)}</span>}
                    {!user && <span className="absolute inset-0 flex items-center justify-center"><span className="inline-flex items-center gap-2 bg-ink text-paper text-[13px] px-3 py-2 rounded-full"><Lock size={13} /> Sign in to open</span></span>}
                  </button>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-ink-muted truncate">@{f.source_account}{f.location_name ? " · " + f.location_name : f.country_guess ? " · " + f.country_guess : ""}</span>
                      <button onClick={() => fav(f)} aria-label="Save" className={`shrink-0 h-8 w-8 rounded-full border inline-flex items-center justify-center ${favs.has(f.id) ? "border-red-500 text-red-500" : "border-hairline text-ink-muted hover:border-ink"}`}><Heart size={14} fill={favs.has(f.id) ? "currentColor" : "none"} /></button>
                    </div>
                    <p className="text-[14px] leading-snug line-clamp-3">{user ? cap || "No caption" : cap.slice(0, 70) + (cap.length > 70 ? "…" : "")}</p>
                    <div className="mt-auto pt-2 flex items-center justify-between text-[12px] text-ink-muted">
                      <span>{f.posted_at ? new Date(f.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
                      <button onClick={() => open(f)} className="inline-flex items-center gap-1 text-ink hover:underline">Open <ExternalLink size={12} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <footer className="border-t border-hairline"><div className="max-w-[1140px] mx-auto px-6 py-8 text-[12px] text-ink-muted">Listings belong to their original posters. We link, we do not sell. Prices as stated in the post, converted approximately.</div></footer>
    </div>
  );
};
export default Finds;
