import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  FormEvent,
} from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EBC } from "@/lib/rh";
import { listingVideo } from "@/lib/listing-media";
import OriginalListingLink from "@/components/realhunt/OriginalListingLink";
import AuthModal from "@/components/realhunt/AuthModal";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Bookmark,
  MessageCircle,
  Eye,
  Share2,
  Plus,
  Search,
  Trophy,
  Flag,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import {
  api,
  ranking,
  readToken,
  storeToken,
  Deal,
  Session,
  Feed,
  categories,
  money,
  badge,
  safeUrl,
  votePreview,
} from "./api";
import "./community.css";
const Ctx = createContext<any>(null);
const useCommunity = () => useContext(Ctx);
const num = (v: number = 0) => new Intl.NumberFormat("en").format(v);
function ErrorBox({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div role="alert" className="hunt-error">
      {error}
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  );
}
function Loading() {
  return (
    <div role="status" className="hunt-loading">
      <Loader2 className="hunt-spin" size={20} /> Loading discoveries…
    </div>
  );
}
function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(false);
  const [notice, setNotice] = useState("");
  const location = useLocation();
  const sequence = useRef(0);
  async function connect() {
    const seq = ++sequence.current;
    setError("");
    try {
      const s = await api<Session>("session", readToken());
      if (seq !== sequence.current) return;
      storeToken(s.token);
      setSession(s);
    } catch (e) {
      if (seq === sequence.current) setError((e as Error).message);
    }
  }
  useEffect(() => {
    connect();
    return () => {
      sequence.current++;
    };
  }, [user?.id]);
  useEffect(() => {
    document.title =
      "RealHunt — Property deals. Found by people. Ranked by you.";
  }, [location.pathname]);
  useEffect(() => {
    if (!session?.admin) return;
    const refresh = () => { if (document.visibilityState === "visible") void connect(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [session?.admin, user?.id]);
  const requireUser = () => {
    if (!user) {
      setAuth(true);
      return false;
    }
    return true;
  };
  const call = async (
    action: string,
    payload: Record<string, unknown> = {},
  ) => {
    if (!session) throw new Error("Connecting your session. Please try again.");
    return api(action, session.token, payload);
  };
  return (
    <Ctx.Provider
      value={{
        user,
        session,
        setSession,
        call,
        requireUser,
        notice,
        setNotice,
        refreshSession: connect,
      }}
    >
      <div className="hunt">
        <header className="hunt-header">
          <Link to="/" className="hunt-brand">
            <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#141414" /><path d="M14 35 L32 17 L50 35" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="32" cy="43.5" r="6.5" fill="#0EA5E9" /></svg>RealHunt
          </Link>
          <nav aria-label="Main navigation">
            <Link to="/browse" className="hunt-browse">
              <Search size={16} />
              Browse homes
            </Link>
            <Link to="/hunt/saved" aria-label="Saved deals">
              <Bookmark size={19} />
            </Link>
            {user ? (
              <Link to="/hunt/mine" className="hunt-account">
                My submissions
              </Link>
            ) : (
              <button onClick={() => setAuth(true)} className="hunt-account">
                Sign in
              </button>
            )}
            {session?.admin && <Link to="/hunt/admin" className="hunt-admin-link">Review ({session.pending_submissions || 0})</Link>}
            <Link className="hunt-primary" to="/submit">
              <Plus size={16} />
              <span>Submit a Deal</span>
            </Link>
          </nav>
        </header>
        {error && (
          <div className="hunt-wrap">
            <ErrorBox error={error} retry={connect} />
          </div>
        )}
        {notice && (
          <div className="hunt-toast" role="status">
            {notice}
            <button aria-label="Dismiss message" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className="hunt-main">{children}</div>
        <footer className="hunt-footer">
          <Link to="/">RealHunt</Link>
          <p>
            Found by people. Ranked by you.
            <br />
            Listings belong to their original publishers. RealHunt is not the
            seller.
          </p>
          <div>
            <Link to="/browse">Browse homes</Link>
            <Link to="/winners">Weekly winners</Link>
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/legal/terms">Terms</Link>
            {session?.admin && <Link to="/hunt/admin">Moderation</Link>}
          </div>
        </footer>
        <AuthModal
          open={auth}
          onClose={() => setAuth(false)}
          redirect={location.pathname + location.search}
          title="Join the hunt"
          subtitle="Vote without an account. Sign in to save, comment or submit a deal."
        />
      </div>
    </Ctx.Provider>
  );
}
async function shareDeal(d: Pick<Deal, "slug" | "title">, message: string) {
  const url = `${location.origin}/deal/${encodeURIComponent(d.slug)}`;
  if (navigator.share) {
    await navigator.share({ title: d.title, text: message, url });
  } else {
    await navigator.clipboard.writeText(`${message}\n${url}`);
  }
}
function Media({ deal, detail = false }: { deal: Deal; detail?: boolean }) {
  const [index, setIndex] = useState(0);
  const [play, setPlay] = useState(false);
  const imgs = deal.image_urls || [];
  const videoUrl = deal.video_url || listingVideo(deal.slug)?.src;
  return (
    <div className={"hunt-media" + (detail ? " hunt-media-detail" : "")}>
      {play && videoUrl ? (
        <video
          controls
          autoPlay
          playsInline
          preload="metadata"
          poster={imgs[0]}
          src={videoUrl}
          aria-label={`${deal.title} property video`}
        />
      ) : (
        <Link to={`/deal/${deal.slug}`} tabIndex={detail ? -1 : 0}>
          <img
            src={imgs[index] || "/favicon.png"}
            alt={deal.title}
            loading={detail ? "eager" : "lazy"}
            decoding="async"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith("/favicon.png"))
                e.currentTarget.src = "/favicon.png";
            }}
          />
        </Link>
      )}
      {!play && videoUrl && (
        <button className="hunt-video" onClick={() => setPlay(true)}>
          ▶ Video tour
        </button>
      )}
      {!play && imgs.length > 1 && (
        <>
          <button
            className="hunt-prev"
            aria-label="Previous photo"
            onClick={() => setIndex((index + imgs.length - 1) % imgs.length)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="hunt-next"
            aria-label="Next photo"
            onClick={() => setIndex((index + 1) % imgs.length)}
          >
            <ChevronRight size={18} />
          </button>
          <span className="hunt-photo-count">
            {index + 1} / {imgs.length}
          </span>
        </>
      )}
    </div>
  );
}
function Vote({
  deal,
  onChange,
  scope = "week",
}: {
  deal: Deal;
  onChange?: () => void;
  scope?: string;
}) {
  const { session, setSession, call, setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Deal | null>(null);
  const [shared, setShared] = useState(false);
  const selected = session?.votes?.[deal.id];
  const d = preview || deal;
  useEffect(() => setPreview(null), [deal.week_up, deal.week_down]);
  async function vote(value: number) {
    if (busy) return;
    if (selected === value) {
      setNotice("You already voted on this deal ✓");
      return;
    }
    setBusy(true);
    setPreview(votePreview(deal, selected, value));
    try {
      await call("vote", { id: deal.id, value });
      setSession((s: Session) => ({
        ...s,
        votes: { ...s.votes, [deal.id]: value },
      }));
      setShared(true);
      setNotice(
        "Your vote counts. Thanks for helping rank this week’s discoveries.",
      );
      onChange?.();
    } catch (e) {
      setPreview(null);
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = scope === "all" ? d.life_net : d.week_net;
  return (
    <div className="hunt-vote-wrap">
      <div className="hunt-vote" aria-label="Vote on this deal">
        <button
          disabled={busy || !session}
          aria-label="Upvote deal"
          aria-pressed={selected === 1}
          onClick={() => vote(1)}
        >
          <ArrowUp size={18} />
          <span>{num(d.week_up)}</span>
        </button>
        <div>
          <strong>
            {total > 0 ? "+" : ""}
            {total || 0}
          </strong>
          <small>{scope === "all" ? "all time" : "this week"}</small>
        </div>
        <button
          disabled={busy || !session}
          aria-label="Downvote deal"
          aria-pressed={selected === -1}
          onClick={() => vote(-1)}
        >
          <ArrowDown size={17} />
          <span>{num(d.week_down)}</span>
        </button>
      </div>
      {shared && (
        <button
          className="hunt-after-vote"
          onClick={() =>
            shareDeal(
              deal,
              `I voted for this property on RealHunt. What do you think?`,
            )
              .then(() => setNotice("Ready to share ✓"))
              .catch((e) => {
                if (e.name !== "AbortError")
                  setNotice("Sharing failed. Copy the page address instead.");
              })
          }
        >
          Vote counted ✓ Share this find <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}
function Save({ deal, onChange }: { deal: Deal; onChange?: () => void }) {
  const { session, setSession, call, requireUser, setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  const saved = session?.saved.includes(deal.id);
  return (
    <button
      className="hunt-save"
      disabled={busy}
      aria-label={saved ? "Unsave deal" : "Save deal"}
      aria-pressed={!!saved}
      onClick={async () => {
        if (!requireUser()) return;
        setBusy(true);
        try {
          await call("save", { id: deal.id, saved: !saved });
          setSession((s: Session) => ({
            ...s,
            saved: saved
              ? s.saved.filter((x) => x !== deal.id)
              : [...s.saved, deal.id],
          }));
          setNotice(
            saved
              ? "Removed from your saved deals."
              : "Saved to your collection ✓",
          );
          onChange?.();
        } catch (e) {
          setNotice((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
function Card({
  deal,
  onChange,
  scope = "week",
  pick = false,
}: {
  deal: Deal;
  onChange?: () => void;
  scope?: string;
  pick?: boolean;
}) {
  const tag = badge(deal, scope);
  return (
    <article className="hunt-card">
      <div className="hunt-card-photo">
        <Media deal={deal} />
        <span className="hunt-rank">{pick ? "✦" : `#${deal.rank}`}</span>
        <Save deal={deal} onChange={onChange} />
        {tag && !pick && <span className="hunt-badge">{tag}</span>}
      </div>
      <div className="hunt-card-body">
        <div className="hunt-card-location">
          {deal.country || "Worldwide"}{" "}
          <span>
            ·{" "}
            {categories.find((c) => c[0] === deal.category)?.[1] || "Discovery"}
          </span>
        </div>
        <div className="hunt-price">
          {money(deal.price_eur)}
          {deal.sqm && deal.price_eur != null && (
            <small>{money(Math.round(deal.price_eur / deal.sqm))}/m²</small>
          )}
        </div>
        <h2>
          <Link to={`/deal/${deal.slug}`}>{deal.title}</Link>
        </h2>
        <p className="hunt-metrics">
          {deal.location_name}
          {deal.sqm ? ` · ${deal.sqm} m²` : ""}
          {deal.bedrooms ? ` · ${deal.bedrooms} beds` : ""}
        </p>
        <div className="hunt-hunter">
          <span className="hunt-avatar">
            {(deal.hunter_handle || "r")[0].toUpperCase()}
          </span>
          Found by{" "}
          <Link to={`/hunter/${deal.hunter_handle || "realhunt"}`}>
            @{deal.hunter_handle || "realhunt"}
          </Link>
          {deal.is_editorial_pick && (
            <span title="Editorial selection, independent of community rank">
              ✦ Pick
            </span>
          )}
        </div>
        <Vote deal={deal} scope={scope} onChange={onChange} />
        <div className="hunt-card-bottom">
          <Link
            to={`/deal/${deal.slug}#discussion`}
            aria-label={`${deal.comments || 0} comments`}
          >
            <MessageCircle size={14} />
            {num(deal.comments)}
          </Link>
          <span>
            <Eye size={14} />
            {num(deal.views)}
          </span>
          <span>
            <Bookmark size={13} />
            {num(deal.saves)}
          </span>
          <span className="hunt-lifetime">
            {num(deal.life_up + deal.life_down)} lifetime votes
          </span>
        </div>
        {(deal.has_source || safeUrl(deal.source_url)) && (
          <OriginalListingLink
            href={deal.source_url || undefined}
            returnTo={`/deal/${deal.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hunt-original"
          >
            Original listing <ArrowUpRight size={14} />
          </OriginalListingLink>
        )}
      </div>
    </article>
  );
}
function SponsoredCard() {
  return (
    <article className="hunt-card hunt-sponsored" aria-label="Sponsored: Eco Beach City, Sumba">
      <div className="hunt-card-photo">
        <Link to="/ecobeachcity" className="hunt-media">
          <img src={EBC.image_urls![0]} alt="Eco Beach City cabin in Sumba" loading="lazy" />
        </Link>
        <span className="hunt-sponsored-label">Sponsored</span>
      </div>
      <div className="hunt-card-body">
        <div className="hunt-card-location">Indonesia <span>· Beach</span></div>
        <div className="hunt-price">{money(EBC.price_eur!)}</div>
        <h2><Link to="/ecobeachcity">Beachfront cabin + land in Sumba</Link></h2>
        <p className="hunt-metrics">Mamboro, Sumba · Eco Beach City</p>
        <p>Cabin plus second-line plot. Renewable 80-year lease. Instalments available.</p>
        <Link to="/ecobeachcity" className="hunt-primary">Explore Eco Beach City <ArrowUpRight size={16} /></Link>
      </div>
    </article>
  );
}
function QuickSubmission({ initialUrl = "", standalone = false }: { initialUrl?: string; standalone?: boolean }) {
  const { user, session, call } = useCommunity();
  const [url, setUrl] = useState(initialUrl);
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const submitting = useRef(false);
  const destination = `/submit?quick=1&url=${encodeURIComponent(url.trim())}`;
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user) { setAuth(true); return; }
    if (!session || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try { setResult(await call("quick_submit", { url: url.trim(), why: note, website: honeypot })); }
    catch (e) { setError((e as Error).message); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section className={"hunt-quick-submit" + (standalone ? " hunt-quick-standalone" : "")} aria-label="Share a property">
    <h2>Found a great property?</h2>
    <p>Share a link. We review. Everyone votes.</p>
    {result ? <div role="status" className="hunt-quick-success">
      <strong>{result.duplicate ? "This property is already published." : result.already ? "This property is already in your submissions." : "Received. Your property is pending admin review."}</strong>
      <Link to={result.duplicate ? `/deal/${result.duplicate}` : "/hunt/mine"}>{result.duplicate ? "View and vote →" : "View my submissions →"}</Link>
      <button onClick={() => { setResult(null); setUrl(""); setNote(""); }}>Share another property</button>
    </div> : <form onSubmit={send}>
      <div className="hunt-quick-row">
        <label><span className="sr-only">Property listing URL</span><input type="url" name="property_url" required maxLength={2000} placeholder="Paste a property link…" value={url} onChange={e => setUrl(e.target.value)} /></label>
        <button type="submit" aria-label="Send property" className="hunt-primary" disabled={busy || (!!user && !session)}>{busy ? "Sending…" : standalone ? "Send property" : "Send"}<ArrowUpRight size={17} /></button>
      </div>
      {standalone && user && <label className="hunt-quick-note">Anything we should know? <span>(optional)</span><textarea maxLength={800} value={note} onChange={e => setNote(e.target.value)} /></label>}
      <label className="hunt-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></label>
      {standalone && <p className="hunt-fine">Free account · Track every submission.</p>}
    </form>}
    {standalone && !result && <Link className="hunt-full-details" to={`/submit?details=1${url ? `&url=${encodeURIComponent(url)}` : ""}`}>Add full property details instead →</Link>}
    {error && <ErrorBox error={error} />}
    {auth && <AuthModal open onClose={() => setAuth(false)} initialMode="up" redirect={destination}
      title="Create a free account to submit your property"
      subtitle="Your link is saved. After signing in, confirm your submission and track its review in My submissions." />}
  </section>;
}

function Home() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const scope = params.get("tab") === "all" ? "all" : "week";
  const country = params.get("country") || "";
  const category = params.get("category") || "";
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(false);
  const seq = useRef(0);
  async function load(more = false) {
    const n = ++seq.current;
    setBusy(true);
    setError("");
    try {
      const data = await ranking(
        scope,
        country,
        category,
        more ? feed?.rows.length || 0 : 0,
      );
      if (n !== seq.current) return;
      setFeed((f) =>
        more && f ? { ...data, rows: [...f.rows, ...data.rows] } : data,
      );
    } catch (e) {
      if (n === seq.current) setError((e as Error).message);
    } finally {
      if (n === seq.current) setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [scope, country, category, user?.id]);
  const update = (key: string, val: string) => {
    const next = new URLSearchParams(params);
    val ? next.set(key, val) : next.delete(key);
    setParams(next);
  };
  return (
    <div className="hunt-wrap hunt-home">
      <section className="hunt-hero">
        <h1>
          Property worth finding.
          <em>You decide what rises.</em>
        </h1>
        <QuickSubmission />
        <div className="hunt-hero-stats">
          <span>
            <strong>{feed ? num(feed.global_deals) : "—"}</strong> deals
          </span>
          <i />
          <span>
            <strong>{feed ? num(feed.weekly_votes) : "—"}</strong> this week
          </span>
          <i />
          <span>
            <strong>{feed ? num(feed.global_votes) : "—"}</strong> total votes
          </span>
        </div>
      </section>
      <div className="hunt-feed-header">
        <div>
          <h2>
            {scope === "all" ? "All-time favourites" : "Top deals this week"}{" "}
            <span>↗</span>
          </h2>
          <p>
            {feed?.week?.label?.replace("-", "–") || "Sep 21–28, 2026"} · UTC
          </p>
        </div>
        <Link to="/winners" className="hunt-winners-link">
          <Trophy size={16} />
          Past winners
        </Link>
      </div>
      <nav className="hunt-tabs" aria-label="Browse rankings">
        <button
          aria-pressed={scope === "week"}
          onClick={() => update("tab", "")}
        >
          This Week
        </button>
        <button
          aria-pressed={scope === "all"}
          onClick={() => update("tab", "all")}
        >
          All Time
        </button>
        <button onClick={() => setFilters((v) => !v)} aria-expanded={filters}>
          Countries <SlidersHorizontal size={13} />
        </button>
        <button onClick={() => setFilters((v) => !v)} aria-expanded={filters}>
          Categories
        </button>
        <Link to="/browse" className="hunt-secondary-search">
          <Search size={15} />
          Search listings
        </Link>
      </nav>
      {(filters || country || category) && (
        <div className="hunt-filters">
          <label>
            Country
            <select
              value={country}
              onChange={(e) => update("country", e.target.value)}
            >
              <option value="">All countries</option>
              {feed?.countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c[0]} value={c[0]}>
                  {c[1]}
                </option>
              ))}
            </select>
          </label>
          {(country || category) && (
            <button
              onClick={() => setParams(scope === "all" ? { tab: "all" } : {})}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {error && <ErrorBox error={error} retry={() => load()} />}
      {!feed && busy ? (
        <Loading />
      ) : (
        <>
          <div className="hunt-grid">
            {feed?.rows.map((d, index) => (
              <Fragment key={d.id}>
                <Card deal={d} scope={scope} onChange={() => load()} />
                {index === 1 && !country && !category && <SponsoredCard />}
              </Fragment>
            ))}
          </div>
          {feed?.rows.length === 0 && !error && (
            <div className="hunt-empty">
              <h3>The next great find could be yours.</h3>
              <p>No deals match this view yet.</p>
              <Link to="/submit" className="hunt-primary">
                Submit a Deal
              </Link>
            </div>
          )}
          {feed && <p className="hunt-feed-count" role="status">Showing {num(feed.rows.length)} of {num(feed.total)} deals{!country && !category && feed.rows.length >= 2 ? " · plus 1 sponsored listing" : ""}</p>}
          {feed && feed.rows.length < feed.total && (
            <button
              className="hunt-more"
              onClick={() => load(true)}
              disabled={busy}
            >
              {busy ? "Loading…" : "More discoveries"}
            </button>
          )}
        </>
      )}
      {feed && feed.picks?.length > 0 && (
        <section className="hunt-picks">
          <div>
            <span className="hunt-eyebrow">A LITTLE HELP FROM THE EDITORS</span>
            <h2>RealHunt Picks ✦</h2>
            <p>Our editorial favourites. Your votes decide the leaderboard.</p>
          </div>
          <div className="hunt-pick-links">
            {feed.picks.map((d) => (
              <Link key={d.id} to={`/deal/${d.slug}`}>
                <img src={d.image_urls[0]} alt="" loading="lazy" />
                <span>
                  <strong>{money(d.price_eur)}</strong>
                  {d.title}
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="hunt-join">
        <div>
          <span className="hunt-eyebrow">GOOD FINDS DESERVE GOOD COMPANY</span>
          <h2>Seen a deal worth sharing?</h2>
          <p>
            Paste the listing. Tell us why. Every submission gets a human
            review.
          </p>
        </div>
        <Link className="hunt-primary" to="/submit">
          <Plus size={17} />
          Submit a Deal
        </Link>
      </section>
      <p className="hunt-rules">
        One vote per deal, per visitor each week. Change your mind at any time.
        No account needed to vote. Rankings reset weekly; lifetime votes stay.
        Launch-day votes count towards Sep 21–28.
      </p>
    </div>
  );
}
function Detail() {
  const { user } = useAuth();
  const { slug } = useParams();
  const { session, call, requireUser, setNotice } = useCommunity();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(false);
  async function load() {
    try {
      setData(await call("detail", { slug }));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (session) load();
  }, [slug, session?.token, user?.id]);
  const d: Deal = data?.deal;
  if (error)
    return (
      <div className="hunt-wrap">
        <ErrorBox error={error} retry={load} />
      </div>
    );
  if (!d) return <Loading />;
  return (
    <div className="hunt-wrap hunt-detail">
      <Link to="/" className="hunt-back">
        ← Back to this week
      </Link>
      <div className="hunt-detail-grid">
        <Media deal={d} detail />
        <section>
          <span className="hunt-eyebrow">
            {d.country} · {d.category}
          </span>
          <h1>{d.title}</h1>
          <div className="hunt-price">{money(d.price_eur)}</div>
          <p>
            {d.location_name}
            {d.sqm ? ` · ${d.sqm} m²` : ""}
            {d.bedrooms ? ` · ${d.bedrooms} beds` : ""}
          </p>
          {d.sqm && d.price_eur != null && <p>{money(Math.round(d.price_eur / d.sqm))} per m²</p>}
          <p>
            Found by{" "}
            <Link to={`/hunter/${d.hunter_handle}`}>@{d.hunter_handle}</Link>
            {d.is_editorial_pick ? " · ✦ RealHunt Pick" : ""}
          </p>
          {d.why_great && <blockquote>{d.why_great}</blockquote>}
          <Vote
            deal={{ ...d, week_net: d.week_up - d.week_down }}
            onChange={load}
          />
          <div className="hunt-detail-actions">
            {(d.has_source || safeUrl(d.source_url)) && (
              <OriginalListingLink
                href={d.source_url || undefined}
                className="hunt-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Original listing <ArrowUpRight size={17} />
              </OriginalListingLink>
            )}
            <Save deal={d} onChange={load} />
            <button
              aria-label="Share deal"
              onClick={() =>
                shareDeal(d, d.title)
                  .then(() => setNotice("Ready to share ✓"))
                  .catch((e) => {
                    if (e.name !== "AbortError")
                      setNotice("Copy this page address to share.");
                  })
              }
            >
              <Share2 size={19} />
            </button>
          </div>
          <p className="hunt-fine">
            {num(d.life_up + d.life_down)} lifetime votes · {num(d.views)} views
            · {num(d.saves)} saves
          </p>
          <p className="hunt-fine">
            Price and availability come from the source and may change. Check
            the original listing for current details.
          </p>
          <button
            className="hunt-report"
            onClick={() => {
              if (requireUser()) setReport(true);
            }}
          >
            <Flag size={13} /> Report this deal
          </button>
        </section>
      </div>
      {report && (
        <form
          className="hunt-report-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const form = new FormData(e.currentTarget);
            try {
              await call("report", {
                id: d.id,
                reason: form.get("reason"),
                detail: form.get("detail"),
              });
              setReport(false);
              setNotice("Report received. An admin will review it.");
            } catch (e) {
              setNotice((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>What should we check?</h3>
          <select name="reason" aria-label="Report reason">
            <option>Sold or unavailable</option>
            <option>Incorrect price</option>
            <option>Misleading or fraudulent</option>
            <option>Duplicate listing</option>
            <option>Other concern</option>
          </select>
          <textarea
            name="detail"
            maxLength={1000}
            placeholder="Optional details"
            aria-label="Report details"
          />
          <button className="hunt-primary" disabled={busy}>
            Send report
          </button>
          <button type="button" onClick={() => setReport(false)}>
            Cancel
          </button>
        </form>
      )}
      <section className="hunt-discussion" id="discussion">
        <h2>Local knowledge makes better decisions.</h2>
        <p>Ask a question. Share what you know. Keep it helpful.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!requireUser()) return;
            setBusy(true);
            try {
              await call("comment", { id: d.id, body: text });
              setText("");
              await load();
            } catch (e) {
              setNotice((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="comment">Join the conversation</label>
          <textarea
            id="comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            minLength={2}
            maxLength={1200}
            required
            placeholder="What should someone know about this property?"
          />
          <button className="hunt-primary" disabled={busy}>
            {busy ? "Posting…" : "Post comment"}
          </button>
        </form>
        {data.comments.length === 0 && (
          <p className="hunt-fine">
            No comments yet. Be the first to add useful context.
          </p>
        )}
        {data.comments.map((c: any) => (
          <article className="hunt-comment" key={c.id}>
            <div>
              <Link to={`/hunter/${c.handle}`}>@{c.handle || "hunter"}</Link>
              <time>{new Date(c.created_at).toLocaleDateString()}</time>
            </div>
            <p>{c.body}</p>
            {session.admin && (
              <button
                onClick={async () => {
                  try {
                    await call("hide_comment", { id: c.id });
                    load();
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                Hide comment
              </button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
function ProfileEditor() {
  const { session, setSession, call, setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  if (!session?.hunter) return null;
  return (
    <details className="hunt-profile-editor">
      <summary>Edit your hunter profile</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const r = await call("profile", {
              handle: f.get("handle"),
              name: f.get("name"),
              bio: f.get("bio"),
            });
            setSession((s: Session) => ({ ...s, hunter: r.hunter }));
            setNotice("Profile updated ✓");
          } catch (e) {
            setNotice((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Public handle
          <input
            name="handle"
            defaultValue={session.hunter.handle}
            pattern="[a-z0-9_]{3,30}"
            minLength={3}
            maxLength={30}
            required
          />
        </label>
        <label>
          Display name
          <input
            name="name"
            maxLength={60}
            defaultValue={session.hunter.display_name}
          />
        </label>
        <label>
          About you
          <textarea
            name="bio"
            maxLength={240}
            defaultValue={session.hunter.bio}
          />
        </label>
        <button className="hunt-primary" disabled={busy}>
          Save profile
        </button>
      </form>
    </details>
  );
}
const draftKey = "rh_hunt_submission";
function Submit() {
  const [params] = useSearchParams();
  const { session, call, requireUser, setNotice } = useCommunity();
  const [draft, setDraft] = useState<any>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(draftKey) || "{}");
      return params.get("url") && params.get("url") !== stored.url ? { url: params.get("url") } : stored;
    } catch {
      return {};
    }
  });
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [duplicate, setDuplicate] = useState("");
  const field = (key: string, value: string) =>
    setDraft((d: any) => ({ ...d, [key]: value }));
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {}
  }, [draft]);
  async function importDeal(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    setDuplicate("");
    try {
      const r = await call("import", { url: draft.url });
      if (r.duplicate) {
        setDuplicate(r.duplicate);
        return;
      }
      if (r.data)
        setDraft((d: any) => ({
          ...d,
          ...r.data,
          image: r.data.image_urls?.[0],
          location: r.data.location_name,
        }));
      else
        setNotice(
          "We could not import this source. Add the details below — your draft is saved.",
        );
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="hunt-form-page hunt-success">
        <Check size={40} />
        <h1>Good find. We’ll take a look.</h1>
        <p>
          Your deal is pending review. You’ll get the credit when it goes live.
        </p>
        <Link className="hunt-primary" to="/hunt/mine">
          View my submissions
        </Link>
        <Link to="/">Back to the leaderboard</Link>
      </div>
    );
  return (
    <div className="hunt-form-page">
      <Link to="/" className="hunt-back">
        ← Back to this week
      </Link>
      <span className="hunt-eyebrow">PASS A GOOD FIND ALONG</span>
      <h1>Submit a Deal</h1>
      <p>
        Found something special? Share the original listing.
        <br />
        We review every deal before it goes live.
      </p>
      <div className="hunt-steps">
        <span className={step === 1 ? "active" : ""}>1 · Paste a link</span>
        <span className={step === 2 ? "active" : ""}>2 · Add the details</span>
      </div>
      {error && <ErrorBox error={error} />}
      {duplicate && (
        <div className="hunt-error">
          This deal is already here.{" "}
          <Link to={`/deal/${duplicate}`}>View and vote →</Link>
        </div>
      )}
      {step === 1 ? (
        <form onSubmit={importDeal}>
          <label htmlFor="source-url">Original property listing</label>
          <input
            id="source-url"
            type="url"
            required
            placeholder="https://…"
            value={draft.url || ""}
            onChange={(e) => field("url", e.target.value)}
          />
          <button disabled={busy || !session} className="hunt-primary">
            {busy ? "Checking the listing…" : "Continue →"}
          </button>
          <p className="hunt-fine">
            We reuse details from known listings where available. You can always
            enter or correct the details yourself.{" "}
          </p>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!requireUser()) return;
            setBusy(true);
            setError("");
            try {
              await call("submit", draft);
              try {
                sessionStorage.removeItem(draftKey);
              } catch {}
              setDone(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Original URL
            <input
              type="url"
              required
              value={draft.url || ""}
              onChange={(e) => field("url", e.target.value)}
            />
          </label>
          <label>
            Give it a short, useful title
            <input
              required
              minLength={5}
              maxLength={160}
              value={draft.title || ""}
              onChange={(e) => field("title", e.target.value)}
              placeholder="Stone village home with a sunny terrace"
            />
          </label>
          <div className="hunt-form-pair">
            <label>
              Price in EUR
              <input
                required
                type="number"
                min="1"
                max="2147483647"
                value={draft.price_eur || ""}
                onChange={(e) => field("price_eur", e.target.value)}
              />
            </label>
            <label>
              Country
              <input
                required
                maxLength={80}
                value={draft.country || ""}
                onChange={(e) => field("country", e.target.value)}
              />
            </label>
          </div>
          <label>
            Town / region
            <input
              maxLength={160}
              value={draft.location || ""}
              onChange={(e) => field("location", e.target.value)}
            />
          </label>
          <div className="hunt-form-pair">
            <label>
              Area (m²)
              <input
                type="number"
                min="1"
                max="100000000"
                value={draft.sqm || ""}
                onChange={(e) => field("sqm", e.target.value)}
              />
            </label>
            <label>
              Bedrooms
              <input
                type="number"
                min="0"
                max="1000"
                value={draft.bedrooms || ""}
                onChange={(e) => field("bedrooms", e.target.value)}
              />
            </label>
          </div>
          <label>
            Category
            <select
              value={draft.category || "other"}
              onChange={(e) => field("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c[0]} value={c[0]}>
                  {c[1]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Photo URL{" "}
            <small>Optional; an editor can add it during review</small>
            <input
              type="url"
              value={draft.image || ""}
              onChange={(e) => field("image", e.target.value)}
              placeholder="https://…/property.jpg"
            />
          </label>
          <label>
            Why is this a great deal? <small>Optional</small>
            <textarea
              maxLength={800}
              value={draft.why || ""}
              onChange={(e) => field("why", e.target.value)}
              placeholder="What makes this opportunity stand out?"
            />
          </label>
          <button className="hunt-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit for review"}
          </button>
          <p className="hunt-fine">
            Your draft survives sign-in. Pending submissions are private to you
            and the review team.
          </p>
        </form>
      )}
    </div>
  );
}
function Hunter() {
  const { handle } = useParams();
  const { session, call } = useCommunity();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (session)
      call("hunter", { handle })
        .then(setData)
        .catch((e: Error) => setError(e.message));
  }, [handle, session?.token]);
  return (
    <div className="hunt-wrap hunt-profile">
      <span className="hunt-eyebrow">MEET THE HUNTER</span>
      <h1>{data?.profile?.display_name || `@${handle}`}</h1>
      <p>
        @{handle}
        {data?.profile?.bio && <> · {data.profile.bio}</>}
      </p>
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <p>
            {data.approved} approved discoveries · {num(data.net_votes)} net
            lifetime votes
          </p>
          <div className="hunt-small-grid">
            {data.deals.map((d: any) => (
              <Link className="hunt-mini" to={`/deal/${d.slug}`} key={d.slug}>
                <img
                  src={d.image_urls?.[0] || "/favicon.png"}
                  alt={d.title}
                  loading="lazy"
                />
                <div>
                  <strong>{money(d.price_eur)}</strong>
                  <h2>{d.title}</h2>
                  <span>
                    {d.country} · {num(d.net)} net votes
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {!data.deals.length && <p>No approved discoveries yet.</p>}
        </>
      )}
    </div>
  );
}
function Winners() {
  const { session, call } = useCommunity();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (session)
      call("winners")
        .then(setData)
        .catch((e: Error) => setError(e.message));
  }, [session?.token]);
  return (
    <div className="hunt-wrap hunt-profile">
      <span className="hunt-eyebrow">THE FINDS THAT ROSE TO THE TOP</span>
      <h1>
        Weekly winners <Trophy size={32} />
      </h1>
      <p>A permanent record of the community’s favourite discoveries.</p>
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : !data.weeks.length ? (
        <div className="hunt-empty">
          <Trophy size={34} />
          <h2>The first chapter is being written.</h2>
          <p>
            Sep 21–28, 2026 closes on September 28 at 00:00 UTC.
            <br />
            The results will appear here after the competition closes.
          </p>
          <Link className="hunt-primary" to="/">
            Help choose this week’s winners
          </Link>
        </div>
      ) : (
        data.weeks.map((w: any) => (
          <section id={w.id} key={w.id} className="hunt-archive">
            <h2>
              <Link to={`/winners#${w.id}`}>{w.label}</Link>
            </h2>
            <div className="hunt-small-grid">
              {w.winners.map((r: any) => (
                <Link
                  className="hunt-mini"
                  key={r.deal_id}
                  to={`/deal/${r.snapshot?.slug}`}
                >
                  <img
                    src={r.snapshot?.image_urls?.[0] || "/favicon.png"}
                    alt={r.snapshot?.title}
                  />
                  <div>
                    <span>
                      #{r.rank} · {r.net_score > 0 ? "+" : ""}
                      {r.net_score} points
                    </span>
                    <h3>{r.snapshot?.title}</h3>
                    <p>
                      {money(r.snapshot?.price_eur)} · ▲ {r.up_votes} ▼{" "}
                      {r.down_votes}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
function Mine() {
  const { user, session, call, requireUser, setNotice } = useCommunity();
  const { pathname } = useLocation();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (session && user)
      call("dashboard")
        .then(setData)
        .catch((e: Error) => setError(e.message));
  }, [session?.token, user?.id]);
  if (!user)
    return (
      <div className="hunt-empty">
        <h1>Your next favourite place.</h1>
        <p>Sign in to keep your saves and discoveries together.</p>
        <button className="hunt-primary" onClick={requireUser}>
          Sign in
        </button>
      </div>
    );
  return (
    <div className="hunt-wrap hunt-profile">
      <h1>{pathname.endsWith("saved") ? "Saved deals" : "My submissions"}</h1>
      <nav className="hunt-tabs">
        <Link to="/hunt/mine">My submissions</Link>
        <Link to="/hunt/saved">Saved deals</Link>
        {session?.hunter && (
          <Link to={`/hunter/${session.hunter.handle}`}>Public profile ↗</Link>
        )}
      </nav>
      <ProfileEditor />
      {error && <ErrorBox error={error} />}{" "}
      {!data ? (
        <Loading />
      ) : pathname.endsWith("saved") ? (
        <div className="hunt-small-grid">
          {data.saved.map((d: any) => (
            <Link className="hunt-mini" to={`/deal/${d.slug}`} key={d.slug}>
              <img src={d.image_urls?.[0] || "/favicon.png"} alt={d.title} />
              <div>
                <strong>{money(d.price_eur)}</strong>
                <h2>{d.title}</h2>
              </div>
            </Link>
          ))}
          {!data.saved.length && (
            <p>No saved deals yet. Tap the bookmark on a discovery you love.</p>
          )}
        </div>
      ) : (
        <>
          <Link className="hunt-primary" to="/submit">
            <Plus size={16} />
            Find your next deal
          </Link>
          <div className="hunt-submission-summary" aria-label="Submission totals">
            <span><strong>{data.deals.length}</strong> submitted</span>
            {(["pending", "approved", "rejected"] as const).map(status => <span key={status}><strong>{data.deals.filter((d: any) => d.status === status).length}</strong> {status === "pending" ? "pending review" : status}</span>)}
          </div>
          {!data.deals.length && <p>Your first great discovery starts with a link.</p>}
          {data.deals.map((d: any) => (
            <article className="hunt-submission" key={d.id}>
              <div>
                <span className={"hunt-status " + d.status}>
                  {d.status === "pending" ? "Pending review" : d.status}
                </span>
                <h2>{d.title}</h2>
                <p>{money(d.price_eur)} · {d.country || "Location awaiting review"}{d.location_name ? ` · ${d.location_name}` : ""}</p>
                <p>Submitted {new Date(d.created_at).toLocaleDateString("en-GB")}{d.approved_at ? ` · Approved ${new Date(d.approved_at).toLocaleDateString("en-GB")}` : ""}</p>
                {d.why_great && <p>{d.why_great}</p>}
                {d.reject_reason && <p>Review note: {d.reject_reason}</p>}
                {safeUrl(d.source_url) && <a href={d.source_url} target="_blank" rel="noopener noreferrer">Original listing ↗</a>}
                {d.status === "approved" && <p>{num(d.week_score || 0)} weekly score · {num(d.lifetime_votes || 0)} lifetime votes · {num(d.views || 0)} views</p>}
              </div>
              {d.status === "approved" && (
                <div>
                  <Link to={`/deal/${d.slug}`}>View live deal →</Link>
                  <button
                    onClick={() =>
                      shareDeal(
                        d,
                        `I found this property deal on RealHunt. Help it climb this week’s ranking!`,
                      )
                        .then(() => setNotice("Ready to share ✓"))
                        .catch(() => {})
                    }
                  >
                    <Share2 size={16} />
                    Share my discovery
                  </button>
                </div>
              )}
            </article>
          ))}
        </>
      )}
    </div>
  );
}
function Admin() {
  const { session, call, setNotice, refreshSession } = useCommunity();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await call("queue"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (session?.admin) load();
  }, [session?.admin]);
  async function act(action: string, payload: any) {
    setBusy(true);
    try {
      await call(action, payload);
      await load();
      await refreshSession();
      setNotice("Review saved.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!session) return <Loading />;
  if (!session.admin)
    return (
      <div className="hunt-empty">
        <h1>Administrator access required</h1>
        <Link to="/">Back to RealHunt</Link>
      </div>
    );
  return (
    <div className="hunt-wrap hunt-profile">
      <h1>Community moderation</h1>
      <p>Review the source, price and photos before approving a discovery.</p>
      {error && <ErrorBox error={error} retry={load} />}
      <button className="hunt-more" onClick={load} disabled={busy}>Refresh submissions</button>
      <h2>Pending submissions ({data?.pending.length || 0})</h2>
      {data?.pending.map((d: any) => (
        <article key={d.id} className="hunt-review">
          <h3>{d.title}</h3>
          <p>
            {money(d.price_eur)} · {d.country} · @{d.hunter_handle}
          </p>
          <a href={d.source_url} target="_blank" rel="noopener noreferrer">
            Check original listing ↗
          </a>
          <p>{d.why_great}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act("moderate", {
                id: d.id,
                decision: "edit",
                title: f.get("title"),
                price_eur: f.get("price") ? Number(f.get("price")) : null,
                country: f.get("country"),
                location: f.get("location"),
                image: f.get("image"),
              });
            }}
          >
            <label>
              Title
              <input
                name="title"
                defaultValue={d.title}
                maxLength={160}
                required
              />
            </label>
            <label>
              Price EUR
              <input
                name="price"
                type="number"
                min="1"
                defaultValue={d.price_eur || ""}
                placeholder="Price on request if unknown"
              />
            </label>
            <label>Country<input name="country" defaultValue={d.country || ""} minLength={2} maxLength={80} required /></label>
            <label>Location<input name="location" defaultValue={d.location_name || ""} maxLength={160} /></label>
            <label>
              Photo URL
              <input
                name="image"
                type="url"
                defaultValue={safeUrl(d.image_urls[0]) ? d.image_urls[0] : ""}
                placeholder={d.image_urls.length ? "Keep current photo, or paste https://…" : "https://…"}
              />
            </label>
            <button disabled={busy}>Save edits</button>
          </form>
          <label>Rejection reason (shown to the submitter)<textarea maxLength={500} value={reasons[d.id] || ""} onChange={e => setReasons(r => ({...r, [d.id]: e.target.value}))} /></label>
          <div className="hunt-review-actions">
            <button
              className="hunt-primary"
              disabled={busy}
              onClick={() => act("moderate", { id: d.id, decision: "approve" })}
            >
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() =>
                act("moderate", {
                  id: d.id,
                  decision: "reject",
                  reason: reasons[d.id]?.trim() || "Does not meet the community listing guidelines",
                })
              }
            >
              Reject
            </button>
            <button
              disabled={busy}
              onClick={() =>
                act("moderate", { id: d.id, decision: "duplicate" })
              }
            >
              Duplicate
            </button>
          </div>
        </article>
      ))}
      {data && !data.pending.length && <p>No pending submissions.</p>}
      <h2>Open reports ({data?.reports.length || 0})</h2>
      {data?.reports.map((r: any) => (
        <article key={r.id} className="hunt-review">
          <h3>{r.reason}</h3>
          <p>{r.detail}</p>
          <p>
            <Link to={`/deal/${r.deal_slug}`}>{r.deal_title} →</Link>
          </p>
          <a href={r.source_url} target="_blank" rel="noopener noreferrer">
            Check original listing ↗
          </a>
          <button disabled={busy} onClick={() => act("resolve", { id: r.id })}>
            Dismiss report
          </button>
          <button
            disabled={busy}
            onClick={() =>
              act("moderate", {
                id: r.deal_id,
                decision: "reject",
                reason: r.reason,
              })
            }
          >
            Hide reported deal
          </button>
        </article>
      ))}
      <h2>RealHunt Picks</h2>
      <p>Editorial picks are independent of the community ranking.</p>
      {data?.approved.map((d: any) => (
        <article key={d.id} className="hunt-submission">
          <Link to={`/deal/${d.slug}`}>{d.title}</Link>
          <button
            disabled={busy}
            aria-pressed={d.is_editorial_pick}
            onClick={() =>
              act("moderate", {
                id: d.id,
                decision: "pick",
                pick: !d.is_editorial_pick,
              })
            }
          >
            {d.is_editorial_pick ? "✦ Remove pick" : "Add to Picks"}
          </button>
        </article>
      ))}
    </div>
  );
}
export default function Community() {
  const location = useLocation();
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  let page: ReactNode =
    path === "/submit" ? (
      params.get("details") === "1" ? <Submit /> : <div className="hunt-wrap"><QuickSubmission key={params.get("url")} initialUrl={params.get("url") || ""} standalone /></div>
    ) : path.startsWith("/deal/") ? (
      <Detail />
    ) : path.startsWith("/hunter/") ? (
      <Hunter />
    ) : path === "/winners" ? (
      <Winners />
    ) : path === "/hunt/admin" ? (
      <Admin />
    ) : path.startsWith("/hunt/") ? (
      <Mine />
    ) : (
      <Home />
    );
  return <Shell>{page}</Shell>;
}
