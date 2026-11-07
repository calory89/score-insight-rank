import { isEs } from "@/lib/lang";
// RealHunt v7 (23-sep-2026): growth pass.
//  - Insider: the secret weekly Top 5 (7-nov-2026, Carlos: "enseña todas a todos": every home is public as soon
//    as it is approved, so the 48-hour early window is gone)
//    (the homes furthest below their country's median). Free: invite 3 friends who sign up.
//    Server side: community_insider(), community_is_insider(), trigger community_insider_window_trg.
//  - Blog (/blog, /blog/:slug): data articles from src/data/blog.json, prerendered by vite.config.ts.
//  - Search pages (/cheap-houses, /cheap-houses/:slug): src/data/search-pages.json, rebuilt daily by
//    scripts/search_pages.py, prerendered with their content for search engines.
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock, Share2, Copy, Check, Sparkles, Clock, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FLAG } from "@/lib/rh";
import { money } from "./api";
import { useCommunity } from "./ctx";
import { guestRef, guestDaysLeft } from "./extras";
import { ThumbImg } from "./thumbimg";
import { BlogListSkeleton, PostSkeleton } from "./mobile-ux";

const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data;
};
const flag = (c?: string | null) => FLAG[c || ""] || "🌍";
const setMeta = (title: string, desc?: string) => {
  document.title = title;
  if (desc) document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
};

// ---------------------------------------------------------------- Insider
type Insider = {
  insider: boolean; can_see: boolean; guest: boolean; host_name: string | null; signed_in: boolean; count: number; needed: number; code: string | null; week: string;
  early_count: number; early: any[]; top: any[]; next_week: string;
};
let insiderCache: Promise<Insider> | null = null;
let insiderUser: string | null | undefined;
export function loadInsider(uid: string | null, fresh = false) {
  const key = `${uid || ""}:${guestRef() || ""}`;
  if (!insiderCache || fresh || insiderUser !== key) { insiderUser = key; insiderCache = rpc("community_insider", { p_ref: guestRef() }); insiderCache.catch(() => { insiderCache = null; }); }
  return insiderCache;
}
function useInsider() {
  const { user } = useCommunity();
  const [s, setS] = useState<Insider | null>(null);
  useEffect(() => { let on = true; loadInsider(user?.id || null).then((r) => on && setS(r)).catch(() => {}); return () => { on = false; }; }, [user?.id]);
  return s;
}
const hoursLeft = (iso: string) => Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 3600000));

export function InsiderStrip() {
  const s = useInsider();
  if (!s) return null;
  return (
    <Link to="/insider" className={"hv-insider-strip" + (s.can_see ? " is-in" : "")}>
      <span className="hv-ins-icon">{s.can_see ? <Star size={16} fill="currentColor" /> : <Lock size={16} />}</span>
      <span>
        <strong>{s.insider ? "You're an Insider" : s.guest ? `${s.host_name || "A friend"} gave you Insider access` : "The secret Top 5 of the week is out"}</strong>
        <small>{s.insider ? `Top 5 of week ${s.week.slice(-2)}` : s.guest ? `See the secret Top 5${guestDaysLeft() ? ` · ${guestDaysLeft()} days left` : ""}` : "Invite 3 friends to unlock it. Free."}</small>
      </span>
      <ChevronRight size={18} />
    </Link>
  );
}

export function InsiderPage() {
  const { user, requireUser, setNotice } = useCommunity();
  const [s, setS] = useState<Insider | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setMeta("RealHunt Insider · The secret Top 5 of the week", "Invite 3 friends and unlock the secret weekly Top 5: the homes furthest below their country's typical price. Free."); }, []);
  useEffect(() => { loadInsider(user?.id || null, true).then(setS).catch(() => setS(null)); }, [user?.id]);
  const link = s?.code ? `https://realhunt.co/insider?ref=${s.code}` : "";
  const share = () => {
    if (!link) return;
    const text = s?.insider ? "This week's secret Top 5 on RealHunt: the homes furthest below their country's typical price. This link lets you see it too:" : "I'm hunting the best homes on RealHunt, ranked by score. Join with my link and help me unlock the secret weekly Top 5:";
    (navigator.share ? navigator.share({ title: "RealHunt", text, url: link }) : navigator.clipboard.writeText(`${text} ${link}`).then(() => setNotice("Link copied ✓"))).catch(() => {});
  };
  const copy = () => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  const n = Math.min(s?.count || 0, 3);
  return (
    <div className="hunt-wrap hunt-page hv-insider">
      <span className="hunt-eyebrow"><Sparkles size={13} /> RealHunt Insider</span>
      <h1>The secret Top 5 of the week.</h1>
      <p className="hv-ins-sub">Every Monday, the five homes furthest below their country's typical price on RealHunt. It's free. Invite 3 friends to unlock it for good.</p>

      {s?.guest && (
        <div className="hv-ins-guest">
          <span>🎟️</span>
          <div><strong>{s.host_name || "A friend"} gave you Insider access{guestDaysLeft() ? ` for ${guestDaysLeft()} days` : ""}.</strong>
          <p>You can see the secret Top 5 below. To keep it for good, invite 3 friends of your own.</p></div>
        </div>
      )}
      <section className={"hv-ins-card" + (s?.insider ? " is-in" : "")}>
        {!s ? <div className="hunt-skeleton-list" /> : s.insider ? (
          <div className="hv-ins-done"><span><Check size={20} /></span><div><strong>You're an Insider</strong><p>The secret Top 5 is yours every week, and you have the Connector badge.</p></div></div>
        ) : (
          <>
            <div className="hv-ins-progress" aria-label={`${n} of 3 friends joined`}>
              {[0, 1, 2].map((i) => <i key={i} className={i < n ? "is-on" : ""}>{i < n ? <Check size={14} /> : i + 1}</i>)}
              <strong>{n}/3 friends joined</strong>
            </div>
            {!s.signed_in ? (
              <button className="hunt-primary" onClick={() => requireUser()}>Sign in to get your invite link</button>
            ) : (
              <>
                <code className="hv-ins-link">{link.replace("https://", "")}</code>
                <div className="hunt-row">
                  <button className="hunt-primary" onClick={share}><Share2 size={16} /> Share my link</button>
                  <button className="hunt-secondary" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}</button>
                </div>
              </>
            )}
            <p className="hunt-fine">A friend counts when they create a new RealHunt account from your link. Once 3 have joined, Insider stays on.</p>
          </>
        )}
      </section>

      <h2 className="hv-ins-h2"><span><Star size={18} /> Secret Top 5 · week {s?.week.slice(-2) || ""}</span>{s?.insider && link && <button className="hunt-secondary" onClick={share}><Share2 size={15} /> Share it</button>}</h2>
      <p className="hunt-fine">Picked every Monday from the homes with the biggest gap between their price and the median price of homes in the same country on RealHunt.</p>
      <ol className="hv-ins-top">
        {(s?.top || []).map((d, i) => s!.can_see ? (
          <li key={d.id}>
            <Link to={`/deal/${encodeURIComponent(d.slug)}`}>
              <b>{i + 1}</b><ThumbImg src={d.image_urls?.[0]} alt="" loading="lazy" />
              <span><strong>{money(d.price_eur)} · {d.title}</strong><small>{flag(d.country)} {d.location_name || d.country} · {d.below}% below the {d.country} median ({money(d.median)})</small></span>
            </Link>
          </li>
        ) : (
          <li key={d.id} className="is-locked">
            <b>{i + 1}</b><img src={d.cover} alt="" loading="lazy" />
            <span><strong><Lock size={13} /> {d.below}% below the {d.country} median</strong><small>{flag(d.country)} Unlock with 3 invites</small></span>
          </li>
        ))}
      </ol>

      <h2>How it works</h2>
      <ol className="hv-ins-steps">
        <li><strong>Share your link</strong><span>Send it to friends who dream about a cheap house somewhere.</span></li>
        <li><strong>They join, free</strong><span>A friend counts when they sign up from your link.</span></li>
        <li><strong>You're in</strong><span>At 3 friends you see the secret Top 5 every week.</span></li>
      </ol>
      {!user && <button className="hunt-primary" onClick={() => requireUser()}>Get my invite link</button>}
    </div>
  );
}

// ---------------------------------------------------------------- shared: internal links inside HTML
function useInternalLinks() {
  const navigate = useNavigate();
  return (ev: MouseEvent<HTMLElement>) => {
    const a = (ev.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!a || !href || !href.startsWith("/") || ev.metaKey || ev.ctrlKey || ev.shiftKey || a.target) return;
    ev.preventDefault();
    navigate(href);
    window.scrollTo(0, 0);
  };
}
const fmtDate = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// ---------------------------------------------------------------- Blog
type Post = { slug: string; title: string; desc: string; date: string; author: string; image: string; tags: string[]; minutes: number; html: string };
let blogP: Promise<Post[]> | null = null;
const loadBlog = () => (blogP ||= (isEs() ? import("@/data/blog-es.json") : import("@/data/blog.json")).then((m: any) => (m.default || m) as Post[]));
function usePosts() {
  const [p, setP] = useState<Post[] | null>(null);
  useEffect(() => { loadBlog().then(setP).catch(() => setP([])); }, []);
  return p;
}

export function BlogIndex() {
  const posts = usePosts();
  useEffect(() => { setMeta("RealHunt Research · Data on cheap homes around the world", "Original data and plain-English guides on affordable homes: prices by country, buying rules, rent vs buy."); }, []);
  return (
    <div className="hunt-wrap hunt-page hv-blog">
      <span className="hunt-eyebrow">RealHunt Research</span>
      <h1>What cheap homes really cost, in numbers.</h1>
      <p>Studies and guides built from the homes on RealHunt: prices by country, buying rules, and what to check before you buy.</p>
      {!posts ? <BlogListSkeleton /> : (
        <div className="hv-blog-list">
          {posts.map((p, i) => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className={"hv-blog-card" + (i === 0 ? " is-lead" : "")}>
              <img src={p.image} alt="" loading={i < 2 ? "eager" : "lazy"} />
              <span>
                <small>{p.tags[0]} · {p.minutes} min read</small>
                <strong>{p.title}</strong>
                <em>{p.desc}</em>
              </span>
            </Link>
          ))}
        </div>
      )}
      <InsiderCTA />
    </div>
  );
}

export function BlogPost() {
  const { slug = "" } = useParams();
  const posts = usePosts();
  const onClick = useInternalLinks();
  const post = posts?.find((p) => p.slug === slug);
  useEffect(() => { if (post) setMeta(`${post.title} · RealHunt`, post.desc); }, [post?.slug]);
  if (!posts) return <PostSkeleton />;
  if (!post) return <div className="hunt-wrap hunt-page"><h1>Article not found</h1><Link to="/blog" className="hunt-link">All articles</Link></div>;
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <article className="hunt-wrap hunt-page hv-post">
      <nav className="hv-crumbs"><Link to="/blog">RealHunt Research</Link> › <span>{post.tags[0]}</span></nav>
      <h1>{post.title}</h1>
      <p className="hv-post-dek">{post.desc}</p>
      <p className="hv-post-by">{post.author} · {fmtDate(post.date)} · {post.minutes} min read</p>
      <div className="hv-post-body" onClick={onClick} dangerouslySetInnerHTML={{ __html: post.html }} />
      <p className="hv-post-note">Prices and counts are from homes published on RealHunt on {fmtDate(post.date)}. Homes sell; the live list is always on the <Link to="/">front page</Link>.</p>
      <InsiderCTA />
      <h2>More from RealHunt Research</h2>
      <div className="hv-blog-list is-small">
        {more.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} className="hv-blog-card" onClick={() => window.scrollTo(0, 0)}>
            <img src={p.image} alt="" loading="lazy" /><span><small>{p.minutes} min read</small><strong>{p.title}</strong></span>
          </Link>
        ))}
      </div>
    </article>
  );
}

function InsiderCTA() {
  return (
    <Link to="/insider" className="hv-ins-cta">
      <Lock size={18} />
      <span><strong>The secret Top 5 of the week</strong><small>Invite 3 friends and unlock RealHunt Insider. Free.</small></span>
      <ChevronRight size={18} />
    </Link>
  );
}

// ---------------------------------------------------------------- Search pages
type SPage = { slug: string; kind: string; country: string | null; price: number | null; label: string | null; h1: string; title: string; desc: string; intro: string[]; faq: [string, string][]; count: number; min: number; median: number; homes: string[]; related: string[] };
type SData = { updated: string; pages: SPage[]; homes: Record<string, { t: string; p: number; img: string; place: string; c: string; sqm: number | null; bd: number | null }> };
let searchP: Promise<SData> | null = null;
const loadSearch = () => (searchP ||= import("@/data/search-pages.json").then((m: any) => (m.default || m) as SData));
function useSearchData() {
  const [d, setD] = useState<SData | null>(null);
  useEffect(() => { loadSearch().then(setD).catch(() => setD({ updated: "", pages: [], homes: {} })); }, []);
  return d;
}

export function CheapHousesPage() {
  const { slug = "" } = useParams();
  const data = useSearchData();
  const page = data?.pages.find((p) => p.slug === slug);
  const titles = useMemo(() => Object.fromEntries((data?.pages || []).map((p) => [p.slug, p.h1])), [data]);
  const [open, setOpen] = useState<number | null>(0);
  useEffect(() => { if (page) setMeta(page.title, page.desc); }, [page?.slug]);
  if (!data) return <div className="hunt-wrap hunt-page"><div className="hunt-skeleton-list" /></div>;
  if (!page) return <div className="hunt-wrap hunt-page"><h1>No homes for this search yet</h1><Link to="/cheap-houses" className="hunt-link">All searches</Link></div>;
  return (
    <div className="hunt-wrap hunt-page hv-sp">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <Link to="/cheap-houses">Cheap houses</Link>{page.country && <> › <Link to={`/homes/${page.country.toLowerCase()}`}>{page.country}</Link></>}</nav>
      <h1>{page.h1}</h1>
      <div className="hv-sp-facts">
        <span><strong>{page.count}</strong> homes</span>
        <span>from <strong>{money(page.min)}</strong></span>
        <span>median <strong>{money(page.median)}</strong></span>
        <span>updated daily</span>
      </div>
      {page.intro.map((t, i) => <p key={i}>{t}</p>)}
      <div className="hv-sp-grid">
        {page.homes.map((s) => { const h = data.homes[s]; if (!h) return null; return (
          <Link key={s} to={`/deal/${encodeURIComponent(s)}`} className="hv-sp-card">
            <span className="hv-sp-img"><img src={h.img} alt={h.t} loading="lazy" /><b>{money(h.p)}</b></span>
            <strong>{h.t}</strong>
            <small>{flag(h.c)} {h.place}{h.bd ? ` · ${h.bd} bed` : ""}</small>
          </Link>
        ); })}
      </div>
      <InsiderCTA />
      <h2>Questions people ask</h2>
      <div className="hv-faq">
        {page.faq.map(([q, a], i) => (
          <div key={q} className={open === i ? "is-open" : ""}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>{q}<ChevronRight size={16} /></button>
            {open === i && <p>{a}</p>}
          </div>
        ))}
      </div>
      {page.related.length > 0 && (<>
        <h2>Related searches</h2>
        <div className="hv-chips">{page.related.map((r) => <Link key={r} to={`/cheap-houses/${r}`} onClick={() => window.scrollTo(0, 0)}>{titles[r]}</Link>)}</div>
      </>)}
    </div>
  );
}

export function CheapHousesIndex() {
  const data = useSearchData();
  useEffect(() => { setMeta("Cheap houses for sale by what you want · RealHunt", "Cheap houses by the sea, near a lake, with a sauna, cabins, stone houses and homes under €30,000 or €50,000. Real listings, checked by people."); }, []);
  const groups: [string, (p: SPage) => boolean][] = [
    ["Around the world", (p) => !p.country && p.kind === "vibe"],
    ["By price", (p) => p.kind === "price"],
    ["By country", (p) => !!p.country && p.kind === "vibe"],
  ];
  return (
    <div className="hunt-wrap hunt-page hv-sp">
      <span className="hunt-eyebrow">Cheap houses</span>
      <h1>Find a cheap house by what you want around it.</h1>
      <p>Every page lists real homes that a person has checked, ranked by score. No ruins, no land, no one-photo listings. Updated every day.</p>
      {!data ? <div className="hunt-skeleton-list" /> : groups.map(([name, test]) => (
        <section key={name}>
          <h2>{name}</h2>
          <div className="hv-chips is-big">{data.pages.filter(test).map((p) => <Link key={p.slug} to={`/cheap-houses/${p.slug}`}>{p.h1.replace(/^Cheap /, "")} <small>{p.count}</small></Link>)}</div>
        </section>
      ))}
      <h2>Read</h2>
      <Link to="/blog" className="hunt-link">RealHunt Research: prices by country, buying rules and more →</Link>
    </div>
  );
}
