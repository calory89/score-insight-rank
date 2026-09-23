// RealHunt v5 (23-sep-2026): welcome screen, boards, compare two homes, map button, in-app
// notifications, profile with streaks and badges, swipe between homes, dark mode and page motion.
// Nothing here sends email or push: notifications live only inside the site.
import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bell, X, Plus, Check, Share2, Trash2, Moon, Sun, Map as MapIcon, Scale, Flame, Heart, Bookmark, Trophy, Eye, Send, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FLAG, totalCost, bumpIx } from "@/lib/rh";
import { money, type Deal } from "./api";
import { useCommunity } from "./ctx";
import { feed, niceTitle, streakNow, type Row } from "./extras";
import { rowCache, remember, stats, preloadImages } from "./v4";

const num = (v: number = 0) => new Intl.NumberFormat("en").format(v);
const ls = { get(k: string) { try { return localStorage.getItem(k); } catch { return null; } }, set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) throw new Error("Something went wrong. Please try again.");
  if (data?.error) throw new Error(data.error);
  return data;
};
export const autoHandle = (h?: string | null) => !h || /^hunter_[0-9a-f]{6,}$/i.test(h);
const cover = (d: Pick<Deal, "image_urls" | "source_domain">) => {
  const imgs = d.image_urls || [];
  return imgs[0];
};

// ---------------------------------------------------------------- theme and page motion
export function useTheme() {
  const [dark, setDark] = useState(() => ls.get("rh_theme") === "dark");
  useEffect(() => {
    const on = () => setDark(ls.get("rh_theme") === "dark");
    window.addEventListener("rh-theme", on);
    return () => window.removeEventListener("rh-theme", on);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("rh-dark", dark);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", dark ? "#0E0E0C" : "#FAF8F3");
  }, [dark]);
  return dark;
}
export function toggleTheme() {
  ls.set("rh_theme", ls.get("rh_theme") === "dark" ? "light" : "dark");
  window.dispatchEvent(new Event("rh-theme"));
}
export function ThemeButton({ label = false }: { label?: boolean }) {
  const dark = useTheme();
  return (
    <button className="hv-theme" onClick={toggleTheme} aria-label={dark ? "Light mode" : "Dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}{label && <span>{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

// ---------------------------------------------------------------- 3: first-visit welcome
export function Welcome({ rows }: { rows: Row[] | undefined }) {
  const [open, setOpen] = useState(() => !ls.get("rh_welcome"));
  const [i, setI] = useState(0);
  const picks = useMemo(() => (rows || []).filter((r) => cover(r)).slice(0, 3), [rows]);
  useEffect(() => { if (open) preloadImages(picks.map(cover)); }, [open, picks.length]);
  useEffect(() => {
    if (!open || picks.length < 3) return;
    const t = setTimeout(() => (i < 2 ? setI(i + 1) : null), 1600);
    return () => clearTimeout(t);
  }, [open, i, picks.length]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  const close = () => { ls.set("rh_welcome", "1"); setOpen(false); bumpIx(); };
  if (!open || picks.length < 3) return null;
  const d = picks[i];
  return (
    <div className="hv-welcome" role="dialog" aria-modal="true" aria-label="Welcome to RealHunt" onClick={() => (i < 2 ? setI(i + 1) : null)}>
      {picks.map((p, n) => <img key={p.id} src={cover(p)} alt="" className={n === i ? "on" : ""} />)}
      <div className="hv-welcome-bars">{[0, 1, 2].map((n) => <i key={n} className={n < i ? "done" : n === i ? "run" : ""} />)}</div>
      <button className="hv-welcome-skip" onClick={(e) => { e.stopPropagation(); close(); }}>Skip</button>
      <div className="hv-welcome-copy">
        <span>{FLAG[d.country] || "📍"} {d.location_name || d.country}</span>
        <strong>{money(d.price_eur)}</strong>
        <p>{niceTitle(d)}</p>
        <h2>Real homes under €100k. You vote which ones rise.</h2>
        <button className="hv-welcome-go" onClick={(e) => { e.stopPropagation(); close(); }}>Start voting <Heart size={18} fill="currentColor" /></button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 4: boards
function useBoards() {
  const { user } = useCommunity();
  const [boards, setBoards] = useState<any[] | null>(null);
  const load = () => (user ? rpc("community_boards_mine").then(setBoards).catch(() => setBoards([])) : setBoards([]));
  useEffect(() => { load(); }, [user?.id]);
  return { boards, load };
}
export function BoardButton({ deal }: { deal: Deal }) {
  const { requireUser } = useCommunity();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="hv-share has-label" onClick={() => { if (requireUser()) setOpen(true); }}><Plus size={17} /><span>Add to board</span></button>
      {open && <BoardSheet deal={deal} onClose={() => setOpen(false)} />}
    </>
  );
}
export function BoardSheet({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { setNotice } = useCommunity();
  const { boards, load } = useBoards();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  async function toggle(board: string | null, newName?: string) {
    setBusy(true);
    try {
      const r = await rpc("community_board_toggle", { p_board: board, p_name: newName ?? null, p_deal: deal.id });
      setNotice(r.has ? `Added to “${r.name}” ✓` : `Removed from “${r.name}”`);
      setName("");
      await load();
    } catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="hv-sheet-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hv-sheet" role="dialog" aria-modal="true" aria-label="Add to a board">
        <div className="hv-sheet-head"><strong>Add to a board</strong><button aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <div className="hv-sheet-list">
          {!boards ? <p className="hunt-fine">Loading…</p> : boards.length === 0 ? <p className="hunt-fine">No boards yet. Name your first one below, like “Italy by the sea”.</p> : boards.map((b) => {
            const has = (b.deal_ids || []).includes(deal.id);
            return (
              <button key={b.id} className={"hv-board-row" + (has ? " is-on" : "")} disabled={busy} onClick={() => toggle(b.id)}>
                <span className="hv-board-thumb">{b.covers?.[0] ? <img src={b.covers[0]} alt="" /> : <Bookmark size={16} />}</span>
                <span><strong>{b.name}</strong><small>{b.count} {b.count === 1 ? "home" : "homes"}</small></span>
                {has ? <Check size={18} /> : <Plus size={18} />}
              </button>
            );
          })}
        </div>
        <form className="hv-sheet-new" onSubmit={(e) => { e.preventDefault(); if (name.trim()) toggle(null, name.trim()); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="New board, e.g. Lake cabins" aria-label="New board name" />
          <button className="hunt-primary" disabled={busy || !name.trim()}>Create</button>
        </form>
      </div>
    </div>
  );
}
export function BoardsSection() {
  const { user, setNotice } = useCommunity();
  const { boards, load } = useBoards();
  const [name, setName] = useState("");
  if (!user) return null;
  const link = (slug: string) => `https://realhunt.co/b/${slug}`;
  return (
    <section className="hv-boards">
      <div className="hv-boards-head"><h2>Your boards</h2><span className="hunt-fine">Group homes and share a board with one link.</span></div>
      <div className="hv-boards-grid">
        {(boards || []).map((b) => (
          <article key={b.id} className="hv-boardcard">
            <Link to={`/b/${b.slug}`} className="hv-boardcard-covers">
              {[0, 1, 2, 3].map((n) => b.covers?.[n] ? <img key={n} src={b.covers[n]} alt="" loading="lazy" /> : <i key={n} />)}
            </Link>
            <div className="hv-boardcard-body">
              <Link to={`/b/${b.slug}`}><strong>{b.name}</strong></Link>
              <small>{b.count} {b.count === 1 ? "home" : "homes"}</small>
              <div>
                <button aria-label="Share board" onClick={() => (navigator.share ? navigator.share({ title: `${b.name} · RealHunt`, url: link(b.slug) }) : navigator.clipboard.writeText(link(b.slug)).then(() => setNotice("Board link copied ✓"))).catch(() => {})}><Share2 size={15} /></button>
                <button aria-label="Delete board" onClick={async () => { if (!confirm(`Delete “${b.name}”?`)) return; await rpc("community_board_delete", { p_board: b.id }).catch(() => {}); load(); }}><Trash2 size={15} /></button>
              </div>
            </div>
          </article>
        ))}
        <form className="hv-boardcard hv-boardcard-new" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; try { await rpc("community_board_toggle", { p_board: null, p_name: name.trim(), p_deal: null }); setName(""); load(); } catch (err) { setNotice((err as Error).message); } }}>
          <Plus size={22} />
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="New board name" aria-label="New board name" />
          <button className="hunt-primary" disabled={!name.trim()}>Create board</button>
        </form>
      </div>
    </section>
  );
}
export function BoardPage() {
  const { slug = "" } = useParams();
  const { setNotice, requireUser } = useCommunity();
  const navigate = useNavigate();
  const [copying, setCopying] = useState(false);
  const [data, setData] = useState<any>(null);
  useEffect(() => { rpc("community_board_public", { p_slug: slug }).then((d) => { setData(d); remember(d.rows); document.title = `${d.name} · RealHunt`; }).catch((e) => setData({ error: e.message })); }, [slug]);
  const url = `https://realhunt.co/b/${slug}`;
  return (
    <div className="hunt-wrap hunt-page hv-boardpage">
      <div className="hv-board-hero">
        <div className="hv-board-collage">{[0, 1, 2, 3].map((n) => data?.rows?.[n] ? <img key={n} src={cover(data.rows[n])} alt="" /> : <i key={n} />)}</div>
        <div className="hv-board-hero-copy">
          <span className="hunt-eyebrow">Board{data?.handle && !autoHandle(data.handle) ? ` by @${data.handle}` : ""}</span>
          <h1>{data?.name || "…"}</h1>
          {data && !data.error && <p className="hunt-fine">{data.rows?.length || 0} homes under €100k{data.rows?.length ? ` · from ${money(Math.min(...data.rows.map((r: Row) => r.price_eur || 1e9)))}` : ""}</p>}
          <div className="hunt-row">
            <button className="hv-share has-label" onClick={() => (navigator.share ? navigator.share({ title: `${data?.name} · RealHunt`, url }) : navigator.clipboard.writeText(url).then(() => setNotice("Board link copied ✓"))).catch(() => {})}><Share2 size={16} /><span>Share this board</span></button>
            {data && !data.error && !data.mine && <button className="hunt-primary" disabled={copying} onClick={async () => {
              if (!requireUser()) return;
              setCopying(true);
              try { const r = await rpc("community_board_copy", { p_slug: slug }); setNotice(`Copied to your boards ✓`); navigate(`/b/${r.slug}`); } catch (e) { setNotice((e as Error).message); } finally { setCopying(false); }
            }}><Plus size={16} /> Copy this board</button>}
          </div>
        </div>
      </div>
      {!data ? <div className="hunt-skeleton-list" /> : data.error ? <p>{data.error}</p> : (
        <div className="hv-minigrid">
          {(data.rows || []).map((d: Row) => (
            <Link key={d.id} to={`/deal/${d.slug}`} className="hv-mini">
              <img src={cover(d)} alt="" loading="lazy" />
              <strong>{money(d.price_eur)}</strong>
              <span>{niceTitle(d)}</span>
            </Link>
          ))}
          {!data.rows?.length && <p className="hunt-fine">This board is empty for now. Open any home and tap “Add to board”.</p>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 5: compare two homes
export function CompareButton({ deal }: { deal: Deal }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="hv-share has-label" onClick={() => setOpen(true)}><Scale size={17} /><span>Compare</span></button>
      {open && <ComparePicker deal={deal} onClose={() => setOpen(false)} />}
    </>
  );
}
function ComparePicker({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { session } = useCommunity();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>(() => Array.from(rowCache.values()));
  useEffect(() => { if (rows.length < 6) feed({ limit: 40 }).then((f) => { remember(f.rows); setRows(f.rows); }).catch(() => {}); }, []);
  const saved = new Set(session?.saved || []);
  const list = rows.filter((r) => r.id !== deal.id).sort((a, b) => Number(saved.has(b.id)) - Number(saved.has(a.id)) || (a.rank || 999) - (b.rank || 999)).slice(0, 24);
  return (
    <div className="hv-sheet-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hv-sheet" role="dialog" aria-modal="true" aria-label="Compare with">
        <div className="hv-sheet-head"><strong>Compare with…</strong><button aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <div className="hv-sheet-list">
          {list.map((r) => (
            <button key={r.id} className="hv-board-row" onClick={() => navigate(`/vs/${encodeURIComponent(deal.slug)}/${encodeURIComponent(r.slug)}`)}>
              <span className="hv-board-thumb"><img src={cover(r)} alt="" /></span>
              <span><strong>{money(r.price_eur)}{saved.has(r.id) ? " · saved" : ""}</strong><small>{niceTitle(r)}</small></span>
              <Scale size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
export function ComparePage() {
  const { a = "", b = "" } = useParams();
  const { call, session } = useCommunity();
  const [pair, setPair] = useState<(Row | null)[]>([rowCache.get(a) || null, rowCache.get(b) || null]);
  useEffect(() => {
    if (!session) return;
    Promise.all([a, b].map((s) => call("detail", { slug: s }).then((r: any) => r.deal).catch(() => rowCache.get(s) || null))).then(setPair);
  }, [a, b, session?.token]);
  useEffect(() => { document.title = "Compare two homes · RealHunt"; bumpIx(); }, []);
  const [x, y] = pair;
  if (!x || !y) return <div className="hunt-wrap"><div className="hunt-skeleton-list" /></div>;
  const all = (d: Row) => (d.price_eur ? totalCost(d.price_eur, d.country) || d.price_eur : 0);
  const per = (d: Row) => (d.price_eur && d.sqm ? Math.round(d.price_eur / d.sqm) : null);
  const rows: { k: string; f: (d: Row) => ReactNode; v: (d: Row) => number | null; best: "min" | "max" }[] = [
    { k: "Price", f: (d) => money(d.price_eur), v: (d) => d.price_eur, best: "min" },
    { k: "All-in to buy", f: (d) => money(all(d)), v: (d) => all(d), best: "min" },
    { k: "Size", f: (d) => (d.sqm ? `${d.sqm} m²` : "—"), v: (d) => d.sqm || null, best: "max" },
    { k: "Price per m²", f: (d) => (per(d) ? money(per(d)) : "—"), v: per, best: "min" },
    { k: "Bedrooms", f: (d) => (d.bedrooms ? String(d.bedrooms) : "—"), v: (d) => d.bedrooms || null, best: "max" },
    { k: "Votes", f: (d) => num(d.life_net || 0), v: (d) => d.life_net || 0, best: "max" },
  ];
  const win = (r: (typeof rows)[number], d: Row, o: Row) => {
    const p = r.v(d), q = r.v(o);
    if (p == null || q == null || p === q) return false;
    return r.best === "min" ? p < q : p > q;
  };
  const score = (d: Row, o: Row) => rows.filter((r) => win(r, d, o)).length;
  return (
    <div className="hunt-wrap hv-vs">
      <span className="hunt-eyebrow">Head to head</span>
      <h1>Which one would you buy?</h1>
      <div className="hv-vs-grid">
        {[x, y].map((d, n) => {
          const o = n ? x : y;
          return (
            <div key={d.id} className={"hv-vs-col" + (score(d, o) > score(o, d) ? " is-lead" : "")}>
              <Link to={`/deal/${d.slug}`} className="hv-vs-photo"><img src={cover(d)} alt="" /><em>{FLAG[d.country] || "📍"} {d.country}</em></Link>
              <h2><Link to={`/deal/${d.slug}`}>{niceTitle(d)}</Link></h2>
              <dl>{rows.map((r) => <div key={r.k} className={win(r, d, o) ? "is-win" : ""}><dt>{r.k}</dt><dd>{r.f(d)}</dd></div>)}</dl>
              <p className="hv-vs-score">Wins {score(d, o)} of {rows.length}</p>
            </div>
          );
        })}
      </div>
      <p className="hunt-fine">All-in adds typical taxes, notary and registry for each country. Open a home to vote for it.</p>
    </div>
  );
}

// ---------------------------------------------------------------- 6: map button in the feed
export function MapFab({ search }: { search: string }) {
  // Shows once the visitor scrolls into the feed, so it never covers the podium.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 1100);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (!show) return null;
  return <Link to={`/map${search}`} className="hv-mapfab"><MapIcon size={18} /> Map</Link>;
}

// ---------------------------------------------------------------- 7: in-app notifications
type Note = { id: string; text: string; slug: string; at: number; img?: string };
const readNotes = (): Note[] => { try { return JSON.parse(ls.get("rh_notes") || "[]"); } catch { return []; } };
export function NotifBell() {
  const { session } = useCommunity();
  const [notes, setNotes] = useState<Note[]>(readNotes);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(() => Number(ls.get("rh_notes_seen") || 0));
  const ran = useRef("");
  useEffect(() => {
    if (!session) return;
    const ids = Array.from(new Set([...(session.saved || []), ...Object.keys(session.votes || {}).filter((k) => session.votes[k] === 1)])).slice(0, 100);
    const key = ids.join(",");
    if (!ids.length || ran.current === key) return;
    ran.current = key;
    feed({ scope: "week", ids, limit: 100 }).then((f) => {
      let watch: Record<string, { rank: number; price: number }> = {};
      try { watch = JSON.parse(ls.get("rh_watch") || "{}"); } catch { /* ignore */ }
      const fresh: Note[] = [];
      for (const r of f.rows) {
        const w = watch[r.id];
        const t = niceTitle(r);
        if (w && r.rank && w.rank && r.rank < w.rank && r.rank <= 20) fresh.push({ id: `${r.id}-r${r.rank}`, text: `A home you love rose to #${r.rank}: ${t}`, slug: r.slug, at: Date.now(), img: cover(r) });
        if (w && r.price_eur && w.price && r.price_eur < w.price) fresh.push({ id: `${r.id}-p${r.price_eur}`, text: `Price dropped to ${money(r.price_eur)}: ${t}`, slug: r.slug, at: Date.now(), img: cover(r) });
        watch[r.id] = { rank: r.rank, price: r.price_eur || 0 };
      }
      ls.set("rh_watch", JSON.stringify(watch));
      if (fresh.length) {
        const known = new Set(readNotes().map((n) => n.id));
        const all = [...fresh.filter((n) => !known.has(n.id)), ...readNotes()].slice(0, 30);
        ls.set("rh_notes", JSON.stringify(all));
        setNotes(all);
      }
    }).catch(() => {});
  }, [session?.token, session?.saved?.length, Object.keys(session?.votes || {}).length]);
  const unread = notes.filter((n) => n.at > seenAt).length;
  return (
    <div className="hv-bell">
      <button aria-label={`Notifications${unread ? `, ${unread} new` : ""}`} onClick={() => { setOpen(!open); const now = Date.now(); setSeenAt(now); ls.set("rh_notes_seen", String(now)); }}>
        <Bell size={19} />{unread > 0 && <i>{unread > 9 ? "9+" : unread}</i>}
      </button>
      {open && (
        <div className="hv-bell-pop" role="dialog" aria-label="Notifications">
          <strong>Updates on your homes</strong>
          {notes.length === 0 ? <p className="hunt-fine">Vote for or save homes and we will tell you here when they climb the ranking or drop in price.</p> :
            notes.map((n) => (
              <Link key={n.id} to={`/deal/${n.slug}`} onClick={() => setOpen(false)}>
                {n.img ? <img src={n.img} alt="" /> : <Sparkles size={16} />}
                <span>{n.text}<small>{new Date(n.at).toLocaleDateString()}</small></span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 8: profile with streaks and badges
function NamePicker() {
  const { session, setSession, call, setNotice } = useCommunity();
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="hv-namepick" onSubmit={async (e) => {
      e.preventDefault(); const h = v.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (h.length < 3) { setNotice("Use at least 3 letters or numbers."); return; }
      setBusy(true);
      try { const r = await call("profile", { handle: h, name: v.trim(), bio: session?.hunter?.bio || "" }); setSession((s: any) => ({ ...s, hunter: r.hunter })); setNotice(`Hi @${r.hunter?.handle || h} ✓`); }
      catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
    }}>
      <label htmlFor="rh-name">Pick your name. It shows on your boards and the hunters board.</label>
      <div><input id="rh-name" value={v} onChange={(e) => setV(e.target.value)} maxLength={24} placeholder="e.g. carlos" /><button className="hunt-primary" disabled={busy}>Save</button></div>
    </form>
  );
}
function VotedGrid() {
  const { session } = useCommunity();
  const ids = Object.keys(session?.votes || {}).filter((k) => session!.votes[k] === 1).slice(0, 100);
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { if (!ids.length) { setRows([]); return; } feed({ scope: "all", ids, limit: 100 }).then((f) => setRows(f.rows)).catch(() => setRows([])); }, [ids.length]);
  if (!rows) return <div className="hv-igrid">{[0, 1, 2, 3, 4, 5].map((n) => <i key={n} className="hv-skel-tile" />)}</div>;
  if (!rows.length) return <p className="hunt-fine">Homes you vote for show up here. <Link to="/" className="hunt-link">Start voting</Link></p>;
  return <div className="hv-igrid">{rows.map((r) => <Link key={r.id} to={`/deal/${encodeURIComponent(r.slug)}`}><img src={cover(r)} alt="" loading="lazy" /><span>{money(r.price_eur)}</span></Link>)}</div>;
}
export function ProfilePage() {
  const { user, session, requireUser } = useCommunity();
  const s = stats();
  const votes = Object.values(session?.votes || {}).filter((v) => v === 1).length;
  const saved = session?.saved?.length || 0;
  const streak = streakNow();
  let best = streak;
  try { best = Math.max(streak, Number(ls.get("rh_best_streak") || 0)); ls.set("rh_best_streak", String(best)); } catch { /* ignore */ }
  const badges = [
    { k: "First vote", ok: votes >= 1, icon: <Heart size={18} />, tip: "Vote for one home" },
    { k: "Taste maker", ok: votes >= 10, icon: <Heart size={18} fill="currentColor" />, tip: "Vote for 10 homes" },
    { k: "Super voter", ok: votes >= 50, icon: <Trophy size={18} />, tip: "Vote for 50 homes" },
    { k: "3-day streak", ok: best >= 3, icon: <Flame size={18} />, tip: "Vote 3 days in a row" },
    { k: "Week streak", ok: best >= 7, icon: <Flame size={18} fill="currentColor" />, tip: "Vote 7 days in a row" },
    { k: "Collector", ok: saved >= 5, icon: <Bookmark size={18} />, tip: "Save 5 homes" },
    { k: "Spreader", ok: (s.shares || 0) >= 1, icon: <Share2 size={18} />, tip: "Share a home" },
    { k: "Explorer", ok: (s.opened || 0) >= 20, icon: <Eye size={18} />, tip: "Open 20 homes" },
    { k: "Hunter", ok: !!session?.hunter, icon: <Send size={18} />, tip: "Pick a hunter name and submit a home" },
  ];
  const got = badges.filter((b) => b.ok).length;
  return (
    <div className="hunt-wrap hv-me">
      <div className="hv-me-head">
        <span className="hv-me-avatar">{((!autoHandle(session?.hunter?.handle) && session?.hunter?.handle) || user?.email || "?")[0].toUpperCase()}</span>
        <div>
          <h1>{(!autoHandle(session?.hunter?.handle) && (session?.hunter?.display_name || session?.hunter?.handle)) || (user ? user.email?.split("@")[0] : "Your profile")}</h1>
          {session?.hunter?.handle && !autoHandle(session.hunter.handle) && <p className="hunt-fine">@{session.hunter.handle}</p>}
          <p className="hunt-fine">{got} of {badges.length} badges · {streak > 0 ? `${streak}-day streak 🔥` : "Vote today to start a streak"}</p>
        </div>
        <ThemeButton label />
      </div>
      <div className="hv-me-stats">
        <div><strong>{num(votes)}</strong><span>Votes</span></div>
        <div><strong>{streak}</strong><span>Day streak</span></div>
        <div><strong>{best}</strong><span>Best streak</span></div>
        <div><strong>{num(saved)}</strong><span>Saved</span></div>
        <div><strong>{num(s.shares || 0)}</strong><span>Shares</span></div>
      </div>
      {user && session?.hunter && autoHandle(session.hunter.handle) && <NamePicker />}
      <h2>Homes you love</h2>
      <VotedGrid />
      <h2 style={{ marginTop: 26 }}>Badges</h2>
      <div className="hv-badges">
        {badges.map((b) => <div key={b.k} className={"hv-badge" + (b.ok ? " is-on" : "")} title={b.tip}><span>{b.icon}</span><strong>{b.k}</strong><small>{b.ok ? "Unlocked" : b.tip}</small></div>)}
      </div>
      <div className="hv-me-links">
        <Link to="/hunt/saved" className="hunt-secondary">Saved homes and boards</Link>
        {user ? <Link to="/hunt/mine" className="hunt-secondary">My submissions</Link> : <button className="hunt-primary" onClick={requireUser}>Sign in to keep your streak on every device</button>}
        {session?.hunter && <Link to={`/hunter/${session.hunter.handle}`} className="hunt-secondary">Public profile ↗</Link>}
        <Link to="/leaderboard" className="hunt-secondary">Top hunters</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 9: swipe between homes
export function saveOrder(slugs: string[]) { try { sessionStorage.setItem("rh_order", JSON.stringify(slugs)); } catch { /* ignore */ } }
function order(): string[] { try { return JSON.parse(sessionStorage.getItem("rh_order") || "[]"); } catch { return []; } }
export function useHomeSwipe(slug?: string) {
  const navigate = useNavigate();
  const list = order();
  const i = slug ? list.indexOf(slug) : -1;
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  useEffect(() => { if (next) { const r = rowCache.get(next); if (r) preloadImages([cover(r)]); } }, [next]);
  const start = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ok: !t.closest(".hunt-media, input, textarea, select, .leaflet-container, .hv-sheet") };
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current; start.current = null;
      if (!s?.ok) return;
      const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
      if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
      const to = dx < 0 ? next : prev;
      if (to) navigate(`/deal/${encodeURIComponent(to)}`);
    },
  };
  return { prev, next, handlers, pos: i >= 0 ? `${i + 1} of ${list.length}` : "" };
}
export function HomeNav({ prev, next, pos }: { prev: string | null; next: string | null; pos: string }) {
  if (!prev && !next) return null;
  return (
    <nav className="hv-homenav" aria-label="Other homes">
      {prev ? <Link to={`/deal/${encodeURIComponent(prev)}`}><ChevronLeft size={16} /> Previous</Link> : <span />}
      <small>{pos}{pos ? " · swipe to move" : ""}</small>
      {next ? <Link to={`/deal/${encodeURIComponent(next)}`}>Next home <ChevronRight size={16} /></Link> : <span />}
    </nav>
  );
}
