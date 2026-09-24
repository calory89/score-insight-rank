// RealHunt v8/v9 (24-sep-2026): developer projects inside the community.
// - DevBlock: who builds it, rating and badges, payment plan, unit types, "Ask <developer>" with consent.
// - ClaimListing: an agency or owner claims a resale listing to receive its buyers (reviewed by RealHunt).
// - BuyerPicks: new builds that fit what you saved, similar projects when a developer does not answer
//   within 48 h, and "rate the developer" prompts.
// - NewBuildsPage (/new-builds, /new-builds/:country) and DevLeaderboard (/developers).
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Building2, Star, Timer, Trophy, X, Check, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FLAG } from "@/lib/rh";
import { money } from "./api";
import { useCommunity } from "./ctx";
import { InfoRequest, type Row } from "./extras";

const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data;
};
const flag = (c?: string | null) => FLAG[c || ""] || "🌍";
export function devBadges(s: any, verified?: boolean) {
  const out: { k: string; label: string }[] = [];
  if (verified) out.push({ k: "verified", label: "Verified developer" });
  if (s?.reply_hours != null && s.answered >= 1 && s.reply_hours <= 2) out.push({ k: "fast", label: "Replies in under 2 h" });
  else if (s?.reply_hours != null && s.answered >= 1 && s.reply_hours <= 24) out.push({ k: "day", label: "Replies within a day" });
  if ((s?.sales || 0) >= 1) out.push({ k: "sales", label: `${s.sales} ${s.sales === 1 ? "sale" : "sales"} through RealHunt` });
  if (s?.rating && s.reviews >= 1) out.push({ k: "rating", label: `★ ${s.rating} (${s.reviews})` });
  return out;
}

export function DevBlock({ deal }: { deal: Row }) {
  const dev = (deal as any).developer as { name: string; slug: string; verified?: boolean } | null;
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { if (dev?.slug) rpc("community_developer_public", { p_slug: dev.slug }).then((d) => setStats(d?.stats || null)).catch(() => {}); }, [dev?.slug]);
  if (!dev) return null;
  const plan = (deal as any).payment_plan as any;
  const units = ((deal as any).units || []) as any[];
  const badges = devBadges(stats, dev.verified);
  return (
    <div className="hv-devblock">
      <Link to={`/dev/${dev.slug}`} className="hv-devblock-who">
        <span className="hv-devblock-icon"><Building2 size={18} /></span>
        <span><small>New build by</small><strong>{dev.name} {dev.verified && <BadgeCheck size={15} className="hv-devblock-check" aria-label="Verified developer" />}</strong></span>
      </Link>
      {badges.length > 0 && <div className="hv-devbadges">{badges.map((b) => <span key={b.k} className={"hv-devbadge is-" + b.k}>{b.label}</span>)}</div>}
      {plan && (plan.deposit_pct || plan.months || plan.note) && (
        <div className="hv-plan">
          <strong><CalendarClock size={15} /> Payment plan</strong>
          <p>{[plan.deposit_pct ? `${plan.deposit_pct}% to reserve` : null, plan.months ? `the rest over ${plan.months} months${plan.interest_free ? ", 0% interest" : ""}` : null, plan.handover_pct ? `${plan.handover_pct}% at handover` : null, plan.completion ? `ready ${plan.completion}` : null].filter(Boolean).join(" · ")}</p>
          {plan.note && <p className="hunt-fine">{plan.note}</p>}
          {plan.deposit_pct && deal.price_eur ? <p className="hv-plan-big">From <b>{money(Math.round(deal.price_eur * plan.deposit_pct / 100))}</b> to reserve{plan.months ? <>, then about <b>{money(Math.round(deal.price_eur * (1 - plan.deposit_pct / 100 - (plan.handover_pct || 0) / 100) / plan.months))}</b>/month</> : null}</p> : null}
        </div>
      )}
      {units.length > 0 && (
        <table className="hv-units"><thead><tr><th>Type</th><th>Size</th><th>From</th></tr></thead>
          <tbody>{units.map((u, i) => <tr key={i}><td>{u.type}{u.available != null ? <small> · {u.available} left</small> : null}</td><td>{u.sqm ? `${u.sqm} m²` : "—"}</td><td>{u.price_eur ? money(u.price_eur) : "Ask"}</td></tr>)}</tbody></table>
      )}
      <InfoRequest deal={deal} dev={dev} />
    </div>
  );
}

// ---------------------------------------------------------------- claim a resale listing
export function ClaimListing({ deal }: { deal: Row }) {
  const { user, requireUser, setNotice } = useCommunity();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ company: "", website: "", role: "agent", phone: "", proof: "" });
  if ((deal as any).developer) return null;
  if (done) return <p className="hunt-fine hv-claim-done"><Check size={14} /> Thanks. We check it and email you within two working days. Once approved, buyers who ask about this home reach you directly.</p>;
  return (
    <div className="hv-claim">
      {!open ? (
        <button className="hunt-link" onClick={() => { if (!user) { requireUser(); return; } setOpen(true); }}>Are you the agent or owner? Claim this listing and receive its buyers</button>
      ) : (
        <form onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try { const r = await rpc("community_claim_listing", { p_deal: deal.id, p_company: f.company, p_website: f.website, p_role: f.role, p_proof: f.proof, p_phone: f.phone }); if (r?.error) setNotice(r.error); else setDone(true); }
          catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
        }}>
          <div className="hunt-row" style={{ justifyContent: "space-between" }}><strong>Claim this listing</strong><button type="button" className="hunt-link" aria-label="Close" onClick={() => setOpen(false)}><X size={16} /></button></div>
          <p className="hunt-fine">Free. Once we confirm it is yours, people who ask about this home come to you with their contact. You pay 5% only if one of them buys.</p>
          <input required placeholder="Agency or owner name" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="agent">I am the listing agent</option><option value="owner">I am the owner</option><option value="developer">I am the developer</option></select>
          <input placeholder="Website (optional)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
          <input placeholder="Phone or WhatsApp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <textarea placeholder="How can we check it is yours? e.g. the listing on your site, your reference number" value={f.proof} onChange={(e) => setF({ ...f, proof: e.target.value })} />
          <button className="hunt-primary" disabled={busy}>{busy ? "Sending…" : "Send claim"}</button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- buyer side
function MiniDev({ d }: { d: any }) {
  return (
    <Link to={`/deal/${encodeURIComponent(d.slug)}`} className="hv-minidev">
      <span className="hv-minidev-img">{d.image && <img src={d.image} alt="" loading="lazy" />}<b>{d.price_eur ? money(d.price_eur) : ""}</b></span>
      <strong>{d.title}</strong>
      <small>{flag(d.country)} {d.location_name || d.location || d.country}{d.developer ? ` · by ${d.developer}` : ""}</small>
    </Link>
  );
}
export function BuyerPicks({ compact = false }: { compact?: boolean }) {
  const { user, setNotice } = useCommunity();
  const [d, setD] = useState<any>(null);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [text, setText] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  useEffect(() => { if (user) rpc("community_buyer_home").then(setD).catch(() => {}); }, [user?.id]);
  if (!user || !d) return null;
  const has = d.matches.length || d.suggestions.length || (!compact && d.reviews.length);
  if (!has) return null;
  return (
    <section className="hv-buyerpicks">
      {d.suggestions.length > 0 && (<>
        <h2><Timer size={18} /> While you wait for an answer</h2>
        <p className="hunt-fine">{d.suggestions[0].reason}</p>
        <div className="hv-minidev-row">{d.suggestions.map((x: any) => <MiniDev key={x.slug} d={x} />)}</div>
      </>)}
      {d.matches.length > 0 && (<>
        <h2><Building2 size={18} /> New builds that fit what you saved</h2>
        <div className="hv-minidev-row">{d.matches.map((x: any) => <MiniDev key={x.slug} d={x} />)}</div>
      </>)}
      {!compact && d.reviews.length > 0 && (<>
        <h2><Star size={18} /> How did it go?</h2>
        {d.reviews.map((r: any) => sent[r.developer_id] ? <p key={r.developer_id} className="hunt-fine"><Check size={14} /> Thanks, your rating of {r.name} is live.</p> : (
          <div key={r.developer_id} className="hv-rate">
            <p>You asked <Link to={`/dev/${r.slug}`}>{r.name}</Link> about a home. Did they answer well?</p>
            <div className="hv-stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={`${n} stars`} className={(stars[r.developer_id] || 0) >= n ? "is-on" : ""} onClick={() => setStars({ ...stars, [r.developer_id]: n })}><Star size={22} fill={(stars[r.developer_id] || 0) >= n ? "currentColor" : "none"} /></button>)}</div>
            {stars[r.developer_id] ? <>
              <textarea placeholder="One line for other buyers (optional)" value={text[r.developer_id] || ""} onChange={(e) => setText({ ...text, [r.developer_id]: e.target.value })} />
              <button className="hunt-primary" onClick={async () => { try { const x = await rpc("dev_review_submit", { p_developer: r.developer_id, p_rating: stars[r.developer_id], p_text: text[r.developer_id] || "" }); if (x?.error) setNotice(x.error); else setSent({ ...sent, [r.developer_id]: true }); } catch (e) { setNotice((e as Error).message); } }}>Post rating</button>
            </> : null}
          </div>
        ))}
      </>)}
    </section>
  );
}

// ---------------------------------------------------------------- /new-builds
const setMeta = (title: string, desc: string) => { document.title = title; document.querySelector('meta[name="description"]')?.setAttribute("content", desc); };
export function NewBuildsPage() {
  const { country = "" } = useParams();
  const [d, setD] = useState<any>(null);
  const name = country ? country.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : "";
  useEffect(() => {
    setMeta(name ? `New builds under €100,000 in ${name} · RealHunt` : "New-build homes under €100,000 · RealHunt", `New-build projects from ${name || "developers around the world"} with units under €100,000, payment plans and verified developers. Ask the developer directly.`);
    rpc("community_new_builds", { p_country: country || null }).then(setD).catch(() => setD({ countries: [], rows: [] }));
  }, [country]);
  return (
    <div className="hunt-wrap hunt-page hv-sp">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <Link to="/new-builds">New builds</Link>{name && <> › <span>{name}</span></>}</nav>
      <h1>{name ? `New builds under €100,000 in ${name}` : "New-build homes under €100,000"}</h1>
      <p>Projects listed by their own developers. Ask them directly: your request goes straight to the developer, and many offer payment plans.</p>
      <div className="hv-chips">{(d?.countries || []).map((c: any) => <Link key={c.country} to={`/new-builds/${c.country.toLowerCase().replace(/ /g, "-")}`}>{flag(c.country)} {c.country} <small>{c.n}</small></Link>)}</div>
      {!d ? <div className="hunt-skeleton-list" /> : d.rows.length === 0 ? (
        <div className="hv-empty-dev"><p>No new builds listed here yet.</p><Link to="/network/start" className="hunt-primary">Are you a developer? List your project free</Link></div>
      ) : (
        <div className="hv-sp-grid" style={{ marginTop: 18 }}>{d.rows.map((x: any) => (
          <Link key={x.slug} to={`/deal/${encodeURIComponent(x.slug)}`} className="hv-sp-card">
            <span className="hv-sp-img"><img src={x.image} alt={x.title} loading="lazy" /><b>{money(x.price_eur)}</b></span>
            <strong>{x.title}</strong>
            <small>{flag(x.country)} {x.location || x.country} · {x.developer}{x.verified ? " ✓" : ""}</small>
            {x.plan?.deposit_pct ? <small>{x.plan.deposit_pct}% to reserve{x.plan.months ? `, ${x.plan.months} months` : ""}</small> : null}
          </Link>
        ))}</div>
      )}
      <p style={{ marginTop: 28 }}><Link to="/developers" className="hunt-link">See the developer ranking →</Link></p>
    </div>
  );
}

export function DevLeaderboard() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { setMeta("Developer ranking · RealHunt", "Developers ranked by sales, buyer ratings and how fast they answer buyers on RealHunt."); rpc("community_dev_leaderboard").then(setRows).catch(() => setRows([])); }, []);
  return (
    <div className="hunt-wrap hunt-page hv-sp">
      <span className="hunt-eyebrow"><Trophy size={13} /> Developers</span>
      <h1>The developers buyers trust most</h1>
      <p>Ranked by sales through RealHunt, then by buyer ratings. Badges show who answers fast.</p>
      {!rows ? <div className="hunt-skeleton-list" /> : rows.length === 0 ? <div className="hv-empty-dev"><p>The first developers are joining now.</p><Link to="/network/start" className="hunt-primary">List your project free</Link></div> : (
        <ol className="hv-devrank">{rows.map((r, i) => (
          <li key={r.slug}><b>{i + 1}</b><Link to={`/dev/${r.slug}`}><strong>{r.company}{r.verified ? <BadgeCheck size={15} className="hv-devblock-check" /> : null}</strong>
            <small>{flag(r.country)} {r.country || ""} · {r.projects} {r.projects === 1 ? "project" : "projects"}</small>
            <span className="hv-devbadges">{devBadges(r, r.verified).filter((b) => b.k !== "verified").map((b) => <span key={b.k} className={"hv-devbadge is-" + b.k}>{b.label}</span>)}</span></Link></li>
        ))}</ol>
      )}
    </div>
  );
}
