import { TaxPanel } from "./taxes";
import { CatalogBack, UnavailableHome, DecisionFacts, QuickHome, ComparePick, EmptyAlternatives, RankingExplanation, MotionControl, RentPreference } from "./BuyerTools";
import { storage, rememberCatalog, usePreference } from "./buyer-state";
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
import { supabase } from "@/integrations/supabase/client";
import { EBC } from "@/lib/rh";
import { listingVideo } from "@/lib/listing-media";
import OriginalListingLink from "@/components/realhunt/OriginalListingLink";
import { thumb, onThumbError } from "@/lib/thumbs";
import { FeedFilters, FooterLinks, DealSkeleton } from "./mobile-ux";
import { RemoteWorkCard, RemoteWorkStrip } from "@/components/realhunt/RemoteWorkBridge";
import AuthModal from "@/components/realhunt/AuthModal";
import { useLiveStats } from "@/components/realhunt/LiveStats";
import { lazy, Suspense } from "react";
import { DevBlock, ClaimListing, BuyerPicks, NewBuildsPage, DevLeaderboard } from "./v8";
import { InboxPage, CompareBuilds, CostsIndex, CostsPage, NewBuildReport, AgentsPage, TranslateBar, InboxLink } from "./v10";
import { HomeMethodPage } from "./method";
import { DetailAside } from "./aside";
import { StaticPage } from "./staticpage";
import { RelatedBlock } from "./related";
import { InlineAlert, HomeFaq, MortgageCalc, AlertConfirmPage, HomeArticle } from "./oct24";
import { regionOf, slugify } from "./regions";
import { InsiderPage, InsiderStrip, BlogIndex, BlogPost } from "./v7";
import { ListingRoute, ListingMissing } from "./listingRoute";
import { feed as feedV3, type FeedParams, type Row, Filters, StatusTags, VerifiedLine, CostPanel, Lightbox, SimilarHomes, InfoRequest, DropBar, Personalise, ExploreLinks, SwipePage, LeaderboardPage, InvitePage, CollectionPage, GuidePage, GUIDES, HomesPage, ServicesPage, AlertsPage, AdminInbox, AdminVerify, InstallButton, LangSwitch, useLangVersion, useReferralCapture, ShareSavedToggle, LivePodium, bumpStreak, streakNow, shareRow } from "./extras";
import { CardCheck, CheckLayer } from "./check";
import { CompareTray, CompareRoute, PriceWatch, SavedHomes } from "./compareTools";
const slugCountryKey = (c?: string | null) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
import { t } from "./i18n";
import { FindHomePage, FindHomeCTA } from "./findhome";
import BestRoute from "./best"; // stays here: its CSS must keep its place in the cascade
import { ScoreBars, BestPerCountry, RankRow, RankHead, RankSkeleton, ScoreHelp, NearestHomes, NearCity } from "./scores";
import { HomeCard, HomeCardSkeleton } from "./homecards";
import { LogoMark } from "@/components/realhunt/Logo";
import { isEs, searchQuery } from "@/lib/lang";
import { guestSaves, isGuestSaved, toggleGuestSave, clearGuestSaves, type GuestSave } from "./guestSaves";
import { Card4, CardSkeleton, Freshness, TabBar, DetailBar, HeartVote, ShareButton, SaveHeart, remember, rowCache, takeDetail, prefetchDetail, preloadImages } from "./v4";
import { bumpIx, FLAG as FLAG_ } from "@/lib/rh";
import { bumpStat } from "./v4";
import { FindSearch, FindBar, SavedSearches } from "./findui";
import { LiveSearchCard } from "./livecta";
import { AiCheckNote, AiQueue } from "./aicheck";
import { liveQueryFromParams } from "./livelogic";
import { PodiumHero, Vibes, VIBES, SmartSearch, EmptyState, DetailGallery, Amenities, Nearby, VideoTour } from "./v6";
import { useTheme, ThemeButton, Welcome, BoardButton, BoardsSection, BoardPage, CompareButton, ComparePage, MapFab, NotifBell, ProfilePage, saveOrder, useHomeSwipe, HomeNav } from "./v5";
import { Ctx, useCommunity } from "./ctx";
import { AccountMenu } from "./accountmenu";
import { PriceHead } from "./pricehead";
import { seedBootRow, openedHere } from "./bootrow";
seedBootRow(rowCache); // a home page opened directly paints from the row in its own HTML (seo/dealShell.ts)
const MapView = lazy(() => import("./map"));
const LiveSearchPage = lazy(() => import("./livesearch"));
const HomesMap = lazy(() => import("./homesmap"));
// 10-nov-2026 speed: pages that are not the feed or a home (Top 100, /about, /extension, /countries) were
// part of this file's download (about 190 KB of code before compression on every home page). Loaded when opened.
const TopListPage = lazy(() => import("./top").then((m) => ({ default: m.TopListPage })));
const TopProjectPage = lazy(() => import("./top").then((m) => ({ default: m.TopProjectPage })));
const TopClaimPage = lazy(() => import("./top").then((m) => ({ default: m.TopClaimPage })));
const TopMinePage = lazy(() => import("./top").then((m) => ({ default: m.TopMinePage })));
const TopIndexPage = lazy(() => import("./top").then((m) => ({ default: m.TopIndexPage })));
const TopMethodPage = lazy(() => import("./topTrustUI").then((m) => ({ default: m.TopMethodPage })));
const AboutPage = lazy(() => import("./topTrustUI").then((m) => ({ default: m.AboutPage })));
const CountriesPage = lazy(() => import("./countries").then((m) => ({ default: m.CountriesPage })));
const ExtensionRoute = lazy(() => import("./extension"));
// Growth pages (/can-i-buy, /buying-costs), loaded only when opened.
const CanBuyIndex = lazy(() => import("./seo2").then((m) => ({ default: m.CanBuyIndex })));
const CanBuyPage = lazy(() => import("./seo2").then((m) => ({ default: m.CanBuyPage })));
const BuyingCostsPage = lazy(() => import("./seo2").then((m) => ({ default: m.BuyingCostsPage })));
import {
  ArrowUp,
  ArrowUpRight,
  Bookmark,
  MessageCircle,
  Eye,
  Share2,
  Plus,
  Search,
  Trophy,
  Gauge,
  Flag,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
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
import "./buyer-tools.css";
import "./ux-oct.css";
import "./brand-oct.css";
import "./oct23.css";
import "./homecards.css";
import "./ds.css"; // design system, last so it settles the older layers
import "./minimal.css"; // 8-nov-2026 minimal pass: lighter buttons, one-row header, quieter cards
// Imported titles often repeat the price ("€35,000 · Your own home") right under the big price, or
// say nothing at all ("Property - Japan"). Show something a person would actually write.
function cleanTitle(d: Pick<Deal, "title" | "location_name" | "country" | "sqm">) {
  let t = (d.title || "").replace(/^\s*€\s?[\d.,]+\s*(k\b)?\s*[·\-–:|]\s*/i, "").trim();
  if (!t || /^property\s*[-–]\s*\w+$/i.test(t) || /^property$/i.test(t)) {
    const where = d.location_name || d.country || "somewhere worth a look";
    t = d.sqm ? `${d.sqm} m² home in ${where}` : `Home in ${where}`;
  }
  return t;
}
// Homes imported from Instagram accounts were shown as "Found by @account", as if that account had
// joined RealHunt and submitted them. It did not. Say where it was spotted instead.
const isImported = (d: { find_id?: string | null; imported?: boolean }) => !!d.find_id || !!d.imported;
function closesIn(end?: string) {
  if (!end) return "";
  const ms = new Date(end).getTime() - Date.now();
  if (!(ms > 0)) return "closing now";
  const dd = Math.floor(ms / 86400000), hh = Math.floor((ms % 86400000) / 3600000);
  return dd > 0 ? `closes in ${dd}d ${hh}h` : `closes in ${hh}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
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
  const langV = useLangVersion();
  useReferralCapture();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"in" | "up">("in"); // live search's "Sign up" / "Log in" buttons (8-nov-2026)
  const [notice, setNotice] = useState("");
  const location = useLocation();
  const dark = useTheme();
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
    // Child pages set their own title in effects that run before this one, so they must be listed here or the
    // default title overwrites theirs (country pages, /method and /alerts showed the home title before 24-oct-2026).
    if (/^\/(deal\/|find-my-home|extension|insider|blog|cheap-houses|new-builds|developers|inbox|compare|costs|research|agents|homes\/|method|alerts|can-i-buy|buying-costs|about|top|guide|new|sitemap|what-100k-buys|price-drops|sources|swipe|map|leaderboard|winners|best|weather|saved|legal|hunter\/|b\/|live-search)/.test(location.pathname)) return;
    document.title = "RealHunt: The best homes in every country, ranked by score";
  }, [location.pathname]);
  // A vote clicked while signed out is remembered and cast as soon as the person is in, so nobody
  // has to find the home again and click twice.
  useEffect(() => {
    if (!user || !session) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem("rh_pending_vote"); } catch {}
    if (!id) return;
    try { sessionStorage.removeItem("rh_pending_vote"); } catch {}
    api("vote", session.token, { id, value: 1 })
      .then(() => {
        setSession((s: Session | null) => s ? { ...s, votes: { ...s.votes, [id as string]: 1 } } : s);
        setNotice("You are in, and your vote counted.");
        window.dispatchEvent(new CustomEvent("rh-voted", { detail: { id } }));
      })
      .catch((e) => setNotice((e as Error).message));
  }, [user?.id, session?.token]);
  // Homes saved without an account move into the account as soon as the person signs in.
  useEffect(() => {
    if (!user || !session) return;
    const g = guestSaves();
    if (!g.length) return;
    (async () => {
      for (const x of g) { if (!session.saved.includes(x.id)) { try { await api("save", session.token, { id: x.id, saved: true }); } catch { /* gone or already saved */ } } }
      setSession((s: Session | null) => s ? { ...s, saved: Array.from(new Set([...s.saved, ...g.map((x) => x.id)])) } : s);
      clearGuestSaves();
      setNotice(g.length === 1 ? "Your saved home is now in your account." : `Your ${g.length} saved homes are now in your account.`);
    })();
  }, [user?.id, session?.token]);
  useEffect(() => {
    if (!session?.admin) return;
    const refresh = () => { if (document.visibilityState === "visible") void connect(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [session?.admin, user?.id]);
  const requireUser = (mode?: "in" | "up") => {
    if (!user) {
      setAuthMode(mode === "up" ? "up" : "in");
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
      <div className={"hunt has-tabbar" + (dark ? " is-dark" : "")}>
        <header className="hunt-header">
          <Link to="/" className="hunt-brand">
            <LogoMark />RealHunt
          </Link>
          <nav aria-label="Main navigation">
            <Link to="/top" className="hunt-browse hunt-top100" aria-label="Top 100"><Trophy size={16} /> Top 100</Link>
            <Link to="/map" className="hunt-browse hunt-maplink" aria-current={location.pathname === "/map" ? "page" : undefined}><MapPin size={16} /> {t("Map")}</Link>
            <Link to="/extension" className="hunt-browse hunt-ext" title="Free Chrome extension: see the score of any home on any property site"><Gauge size={16} /> Score any home</Link>
            <Link to="/?search=1" className="hunt-browse">
              <Search size={16} />
              Search
            </Link>
            <Link to="/hunt/saved" className="hunt-savedlink" aria-label="Saved homes">
              <Bookmark size={19} />
            </Link>
            <NotifBell />
            <span className="rh-head-inbox"><InboxLink /></span>
            <span className="hv-theme-head"><ThemeButton /></span>
            <LangSwitch compact />
            <Link className="hunt-primary" to="/submit">
              <Plus size={16} />
              <span>{t("Post a home")}</span>
            </Link>
            <AccountMenu onSignIn={() => setAuth(true)} />
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
        <div className="hunt-main hv-page" key={location.pathname + langV}>{children}</div>
        <RelatedBlock />
        <nav className="rh-footer-countries" aria-label="Homes by country">
          {[["spain","Spain"],["italy","Italy"],["denmark","Denmark"],["sweden","Sweden"],["france","France"],["poland","Poland"],["united-states","United States"],["japan","Japan"],["germany","Germany"],["netherlands","Netherlands"],["greece","Greece"],["switzerland","Switzerland"],["mexico","Mexico"],["canada","Canada"],["bulgaria","Bulgaria"]].map(([k, l]) => <Link key={k} to={`/homes/${k}`}>{t("Homes in")} {t(l)}</Link>)}
        </nav>
        <footer className="hunt-footer">
          <Link to="/" className="hunt-footer-brand"><LogoMark size={26} />RealHunt</Link>
          <p>
            {t("Checked by people. Ranked by score.")}
            <br />
            {t("Listings belong to their original publishers. RealHunt is not the seller.")}
          </p>
          <FooterLinks admin={!!session?.admin} />
          <div className="hunt-footer-tools">
            <LangSwitch />
            <InstallButton />
            <ThemeButton label />
            <Link to="/guide">{t("Guides")}</Link>
            <Link to="/help-buying">{t("Help buying")}</Link>
            <Link to="/leaderboard">{t("Hunters")}</Link>
            <Link to="/invite">{t("Invite")}</Link>
          </div>
        </footer>
        <TabBar />
        <CompareTray />
        <AuthModal
          key={authMode}
          initialMode={authMode}
          open={auth}
          onClose={() => setAuth(false)}
          redirect={location.pathname + location.search}
          title="Sign in or create a free account"
          subtitle="Save homes, get alerts and open the original listings. All you need is your email."
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
// Homes imported from a portal credit the portal (e.g. immobiliare.it), not the Instagram account that shared them.
const sourceSite = (d: any): string => {
  if (!isImported(d)) return "";
  const dom = String(d.source_domain || "").replace(/^www\./, "").toLowerCase();
  return dom && !/instagram\.com|facebook\.com|tiktok\.com/.test(dom) ? dom : "";
};
function Media({ deal, detail = false, scope = "all" }: { deal: Deal; detail?: boolean; scope?: string }) {
  const [index, setIndex] = useState(0);
  const [play, setPlay] = useState(false);
  const [lb, setLb] = useState(false);
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
        <Link to={`/deal/${deal.slug}${scope === "all" ? "?tab=all" : ""}`} tabIndex={detail ? -1 : 0}>
          <img
            src={(detail ? imgs[index] : thumb(imgs[index])) || "/favicon.png"}
            alt={deal.title}
            loading={detail ? "eager" : "lazy"}
            decoding="async"
            onClick={detail ? (e) => { e.preventDefault(); setLb(true); } : undefined}
            onError={(e) => {
              if (!detail && onThumbError(e.currentTarget, imgs[index])) return;
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
      {lb && <Lightbox images={imgs} start={index} title={deal.title} onClose={() => setLb(false)} />}
    </div>
  );
}
function Vote({
  deal,
  onChange,
  scope = "all",
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
    if (selected === value) value = 0; // second tap takes the vote back
    setBusy(true);
    setPreview(votePreview(d, selected, value));
    try {
      await call("vote", { id: deal.id, value });
      if (value === 0) {
        setSession((s: Session) => { const votes = { ...(s.votes || {}) }; delete votes[deal.id]; return { ...s, votes }; });
        setNotice(t("Vote removed."));
        onChange?.();
        return;
      }
      setSession((s: Session) => ({
        ...s,
        votes: { ...s.votes, [deal.id]: value },
      }));
      setShared(true);
      { const days = bumpStreak(); setNotice(`${t("Your vote counts.")}${days > 1 ? ` ${days} ${t("days in a row")}.` : " Thanks for helping rank the discoveries."}`); }
      window.dispatchEvent(new CustomEvent("rh-voted", { detail: { id: deal.id, country: deal.country } }));
      onChange?.();
    } catch (e) {
      setPreview(null);
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = scope === "all" ? d.life_net : d.week_net;
  const initialPoints = scope === "all" ? d.launch_points || 0 : d.launch_week_points || 0;
  return (
    <div className="hunt-vote-wrap">
      <button className="hunt-upvote" disabled={busy || !session}
        aria-label="Upvote deal" aria-pressed={selected === 1} onClick={() => vote(1)}>
        <ArrowUp size={18} /><strong>{num(total)}</strong>
      </button>
      <small className="hunt-demo-caption">{total === 1 ? "1 vote" : `${num(total)} votes`}{initialPoints > 0 ? "" : ""}</small>
      {shared && (
        <button
          className="hunt-after-vote"
          onClick={() =>
            shareRow(deal as Row, scope)
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
  const { user, session, setSession, call, setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  const [, bumpG] = useState(0);
  useEffect(() => { const on = () => bumpG((n) => n + 1); window.addEventListener("rh-guest-saves", on); return () => window.removeEventListener("rh-guest-saves", on); }, []);
  const saved = user ? session?.saved.includes(deal.id) : isGuestSaved(deal.id);
  return (
    <button
      className="hunt-save"
      disabled={busy}
      aria-label={saved ? "Unsave deal" : "Save deal"}
      aria-pressed={!!saved}
      onClick={async () => {
        if (!user) { const now = toggleGuestSave(deal as any); setNotice(now ? "Saved on this device. Create a free account to keep it everywhere." : "Removed from saved."); return; }
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
  scope = "all",
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
        <Media deal={deal} scope={scope} />
        <span className="hunt-rank">{pick ? "✦" : `#${deal.rank}`}</span>
        <Save deal={deal} onChange={onChange} />
        {tag && !pick && !tag.startsWith("#1") && <span className="hunt-badge">{tag}</span>}
      </div>
      <div className="hunt-card-body">
        <div className="hunt-card-location">
          {deal.country || "Worldwide"}{" "}
          <span>
            ·{" "}
            {categories.find((c) => c[0] === deal.category)?.[1] || "Discovery"}
          </span>
        </div>
        {deal.price_eur != null && <div className="hunt-price">
          {money(deal.price_eur)}
        </div>}
        <CardCheck d={deal as any} />
        <StatusTags deal={deal as Row} />
        <h2>
          <Link to={`/deal/${deal.slug}${scope === "all" ? "?tab=all" : ""}`}>{cleanTitle(deal)}</Link>
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
          {isImported(deal) ? "Spotted on" : "Found by"}{" "}
          {sourceSite(deal) ? <a href={`https://www.${sourceSite(deal)}/`} target="_blank" rel="noopener noreferrer nofollow">{sourceSite(deal)}</a> : <Link to={`/hunter/${deal.hunter_handle || "realhunt"}`}>
            @{deal.hunter_handle || "realhunt"}
          </Link>}
          {deal.is_editorial_pick && (
            <span title="Editorial selection, independent of community rank">
              ✦ Pick
            </span>
          )}
        </div>
        <Vote deal={deal} scope={scope} onChange={onChange} />
        <div className="hunt-card-bottom">
          <Link
            to={`/deal/${deal.slug}${scope === "all" ? "?tab=all" : ""}#discussion`}
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

        </div>

      </div>
    </article>
  );
}
function SponsoredCard() {
  return (
    <article className="hunt-card hunt-sponsored" aria-label="Our founder's project: Eco Beach City, Sumba">
      <div className="hunt-card-photo">
        <Link to="/ecobeachcity" className="hunt-media">
          <img src={EBC.image_urls![0]} alt="Eco Beach City cabin in Sumba" loading="lazy" />
        </Link>
        <span className="hunt-sponsored-label" title="Eco Beach City is developed by RealHunt's founder. It never takes part in the rankings.">Our founder's project</span>
      </div>
      <div className="hunt-card-body">
        <div className="hunt-card-location">Indonesia <span>· Beach</span></div>
        <div className="hunt-price">{money(EBC.price_eur!)}</div>
        <h2><Link to="/ecobeachcity">Furnished cabin + land in Sumba</Link></h2>
        <p className="hunt-metrics">Mamboro, Sumba · Eco Beach City</p>
        <p>Cabin, plot and furniture included. Renewable 80-year lease. Instalments available.</p>
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
    {standalone ? <h1>{t("Share a home you found")}</h1> : <h2>{t("Share a home you found")}</h2>}
    <p>{t("Paste the link. A person checks it, and if it scores well it goes live.")}</p>
    {result ? <div role="status" className="hunt-quick-success">
      <strong>{result.duplicate ? "This property is already published." : result.already ? "This property is already in your submissions." : "Received. Your property is pending admin review."}</strong>
      <Link to={result.duplicate ? `/deal/${result.duplicate}` : "/hunt/mine"}>{result.duplicate ? t("View home") : t("View my submissions")}</Link>
      <button onClick={() => { setResult(null); setUrl(""); setNote(""); }}>Share another property</button>
    </div> : <form onSubmit={send}>
      <div className="hunt-quick-row">
        <label><span className="sr-only">Property listing URL</span><input type="url" name="property_url" required maxLength={2000} placeholder="Paste a listing link" value={url} onChange={e => setUrl(e.target.value)} /></label>
        <button type="submit" aria-label="Send property" className="hunt-primary" disabled={busy || (!!user && !session)}>{busy ? t("Sending…") : t("Send link")}</button>
      </div>
      {standalone && user && <label className="hunt-quick-note">Anything we should know? <span>(optional)</span><textarea maxLength={800} value={note} onChange={e => setNote(e.target.value)} /></label>}
      <label className="hunt-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></label>
      {standalone && <p className="hunt-fine">{t("Free account. Track every home you send.")}</p>}
    </form>}
    {standalone && !result && <Link className="hunt-full-details" to={`/submit?details=1${url ? `&url=${encodeURIComponent(url)}` : ""}`}>{t("Add full details instead")}</Link>}
    {error && <ErrorBox error={error} />}
    {auth && <AuthModal open onClose={() => setAuth(false)} initialMode="up" redirect={destination}
      title="Create a free account to submit your property"
      subtitle="Your link is saved. After signing in, confirm your submission and track its review in My submissions." />}
  </section>;
}

function Home() {
  const { user } = useAuth();
  const { session } = useCommunity();
  const [more, setMore] = useState<{ country?: string } | null>(null);
  const live = useLiveStats();
  const [params, setParams] = useSearchParams();
  const scope = "all"; // votes are totals and never reset (Carlos, 28-sep-2026)
  const country = params.get("country") || "";
  const category = params.get("type") || "";
  const maxPrice = Number(params.get("price")) || null;
  const minSqm = Number(params.get("sqm")) || null;
  const minPrice = Number(params.get("min")) || null;
  const minBeds = Number(params.get("beds")) || null;
  const priceDrop = params.get("drop") === "1";
  const sort = params.get("order") || "score"; // 7-oct-2026: the feed is a score ranking, no votes
  const minScore = Number(params.get("score")) || null;
  const need = (params.get("need") || "").split(",").filter(Boolean);
  const dimMin: Record<string, number> = Object.fromEntries((params.get("dmin") || "").split(",").filter(Boolean).map((x) => { const [k, v] = x.split(":"); return [k, Number(v) || 0]; }));
  const q = params.get("q") || "";
  const vibeList = (params.get("vibe") || "").split(",").filter((k) => VIBES.some((v) => v.k === k && v.q));
  const terms = vibeList.map((k) => VIBES.find((v) => v.k === k)!.q!);
  const location = useLocation();
  const [qText, setQText] = useState(q);
  const cacheKey = "rh.feed." + location.search + "." + (user?.id || "anon");
  const initial = storage.get<any>(cacheKey, null);
  // Every feed is tagged with the filters (cacheKey) it was loaded for, so rows of one filter can never
  // be shown or appended under another (1-oct-2026 fix).
  const [feedState, setFeed] = useState<any>(() => initial && Date.now()-initial.at<300000 ? { ...initial.feed, _key: cacheKey } : null);
  const feed = feedState && feedState._key === cacheKey ? feedState : null;
  const feedRef = useRef<any>(null); feedRef.current = feed;
  const freshPending = useRef(false);
  const [quick, setQuick] = useState<number | null>(null);
  const [podium, setPodium] = usePreference("rh.podium", false);
  // Map above the results: opens by itself when a country is picked; the button shows or hides it.
  const [mapMode, setMapMode] = useState<"auto" | "on" | "off">("auto");
  useEffect(() => { setMapMode("auto"); }, [country]);
  const showMap = mapMode === "on" || (mapMode === "auto" && !!country);
  const restored = useRef(false);
  const feedKey = useRef(cacheKey);
  useEffect(() => { if (!feed || restored.current) return; restored.current=true; const y=storage.get<number>(cacheKey+".scroll",0); requestAnimationFrame(()=>window.scrollTo(0,y)); }, [feed]);
  useEffect(() => { if(feed && feedKey.current===cacheKey) storage.set(cacheKey,{at:Date.now(),feed}); }, [feed,cacheKey]);
  useEffect(() => { const save=()=>storage.set(cacheKey+".scroll",window.scrollY); window.addEventListener("scroll",save,{passive:true}); return()=>window.removeEventListener("scroll",save); }, [cacheKey]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  async function load(more = false) {
    const key = cacheKey;
    const base = feedRef.current;
    if (more && (!base || freshPending.current)) return;
    const n = ++seq.current;
    if (!more) freshPending.current = true;
    setBusy(true);
    if (!more) setFeed(null);
    setError("");
    try {
      const data: any = await feedV3({ scope, country, category, max_price: maxPrice, min_price: minPrice, min_beds: minBeds, price_drop: priceDrop, min_sqm: minSqm, sort, q: searchQuery(q), terms, min_score: minScore, need, dim_min: dimMin, limit: 24, offset: more ? base.rows.length : 0 } as any);
      if (n !== seq.current) return;
      if (!more) freshPending.current = false;
      remember(data.rows);
      feedKey.current=key;
      setFeed((f: any) =>
        more ? (f && f._key === key ? { ...data, _key: key, rows: [...f.rows, ...data.rows.filter((r: any) => !f.rows.some((x: any) => x.id === r.id))] } : f) : { ...data, _key: key },
      );
    } catch (e) {
      if (n === seq.current) setError((e as Error).message);
    } finally {
      if (n === seq.current) setBusy(false);
    }
  }
  const loadRef = useRef(load); loadRef.current = load;
  // 1-oct-2026 UX: a new filter, search or vibe takes the visitor straight to the first homes, just under
  // the sticky filter bar, instead of leaving them mid-page (or at the footer while the list reloads).
  const resultsRef = useRef<HTMLDivElement>(null);
  const shownKey = useRef(cacheKey);
  const pendingScroll = useRef(false);
  const toResults = (behavior: ScrollBehavior) => {
    const el = resultsRef.current; if (!el) return;
    const sticky = document.querySelector(".rh-sticky-filters") as HTMLElement | null;
    const off = (sticky ? (parseFloat(getComputedStyle(sticky).top) || 0) + sticky.offsetHeight : 0) + 6;
    const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - off);
    if (Math.abs(window.scrollY - y) > 12) window.scrollTo({ top: y, behavior });
  };
  useEffect(() => {
    if (shownKey.current === cacheKey) return;
    shownKey.current = cacheKey;
    pendingScroll.current = true;
    requestAnimationFrame(() => toResults("auto"));
  }, [cacheKey]);
  // once the new homes are in, correct for anything above the list that changed height while loading
  useEffect(() => { if (feed && pendingScroll.current) { pendingScroll.current = false; requestAnimationFrame(() => requestAnimationFrame(() => toResults("auto"))); } }, [feed]);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => { const on = () => setShowTop(window.scrollY > 1600); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  useEffect(() => {
    const cached=storage.get<any>(cacheKey,null);
    if(cached && Date.now()-cached.at<300000) {seq.current++; freshPending.current=false; feedKey.current=cacheKey;setFeed({ ...cached.feed, _key: cacheKey });setBusy(false);setError("");} else load();
  // 14-oct-2026 fix: reload on ANY filter change. The old list missed score, quick filters (need) and
  // dim_min, so tapping a quick filter emptied the list without loading the new homes.
  }, [cacheKey]);
  useEffect(() => { setQText(q); }, [q]);
  useEffect(() => { if (feed?.rows) saveOrder(feed.rows.map((r: any) => r.slug)); }, [feed?.rows?.length, feed?.rows?.[0]?.id]);
  useEffect(() => {
    if (params.get("search") === "1") {
      searchRef.current?.focus();
      searchRef.current?.scrollIntoView({ block: "center" });
    }
  }, [params.get("search")]);
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail || {}; if (d.country && !d.removed) setMore({ country: d.country }); };
    window.addEventListener("rh-voted", on);
    return () => window.removeEventListener("rh-voted", on);
  }, [scope]);
  // Photos of the next homes are fetched while the visitor is still looking at these ones.
  useEffect(() => {
    if (!feed?.rows?.length) return;
    const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 600));
    idle(() => preloadImages(feed.rows.slice(0, 2).map((r: any) => thumb(r.image_urls?.[0]))));
  }, [feed?.rows?.length]);
  // Endless feed: the next page loads before the visitor reaches the bottom.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !feed || feed.rows.length >= feed.total) return;
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting) && !busy) loadRef.current(true); }, { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // cacheKey: a new filter must get a new observer, or the old one keeps loading pages of the
    // previous filter into the new list (1-oct-2026: Spain at €30k showed €90k homes after scrolling).
  }, [feed?.rows?.length, feed?.total, busy, cacheKey]);
  const nextUp = more && feed ? feed.rows.filter((r: any) => r.country === more.country && !session?.votes?.[r.id]).slice(0, 3) : [];
  const setFilters = (v: FeedParams) => {
    const next = new URLSearchParams(params);
    const put = (k: string, val: unknown) => (val ? next.set(k, String(val)) : next.delete(k));
    put("country", v.country); put("type", v.category); put("price", v.max_price); put("sqm", v.min_sqm);
    put("min", v.min_price); put("beds", v.min_beds); put("drop", v.price_drop ? "1" : "");
    put("order", v.sort && v.sort !== "score" ? v.sort : "");
    put("score", v.min_score); put("need", (v.need || []).join(",")); put("dmin", Object.entries(v.dim_min || {}).map(([k, n]) => `${k}:${n}`).join(","));
    next.delete("search");
    setParams(next);
  };
  const update = (key: string, val: string) => {
    const next = new URLSearchParams(params);
    if (key !== "tab") next.delete("country");
    next.delete("category");
    val ? next.set(key, val) : next.delete(key);
    setParams(next);
  };
  const search = (text: string) => {
    const next = new URLSearchParams(params);
    text.trim() ? next.set("q", text.trim()) : next.delete("q");
    next.delete("search");
    setParams(next);
  };
  const displayedRows = feed?.rows;
  const plain = !country && !category && !q && !vibeList.length;
  const vibe = params.get("vibe") || "";
  const showPodium = podium && !!feed && plain && !vibe && !maxPrice && !minSqm && sort === "score" && false;
  // Each vibe switches its own piece of the filter on or off and keeps everything else:
  // by the sea = type beach, Nordic/Japanese = adds Sweden/Japan to the countries, under €30k = price,
  // lake/stone/sauna/terrace = words the listing must contain (all of them).
  const countries = country.split(",").filter(Boolean);
  const vibeOn = (k: string) => { const v = VIBES.find((x) => x.k === k); if (!v) return false; if (v.q) return vibeList.includes(k); if (v.type) return category === v.type; if (v.country) return countries.includes(v.country); if (v.price) return maxPrice === v.price; return false; };
  const toggleVibe = (v: (typeof VIBES)[number]) => {
    const next = new URLSearchParams(params);
    const on = vibeOn(v.k);
    if (v.q) { const l = on ? vibeList.filter((x) => x !== v.k) : [...vibeList, v.k]; l.length ? next.set("vibe", l.join(",")) : next.delete("vibe"); }
    else if (v.type) { on ? next.delete("type") : next.set("type", v.type); }
    else if (v.country) { const l = on ? countries.filter((x) => x !== v.country) : [...countries, v.country]; l.length ? next.set("country", l.join(",")) : next.delete("country"); }
    else if (v.price) { on ? next.delete("price") : next.set("price", String(v.price)); }
    next.delete("search");
    setParams(next);
  };
  return (
    <div className="hunt-wrap hunt-home hv-home" onClickCapture={rememberCatalog}>
      <MapFab search={location.search} />
      <section className="hv-hero hx-hero">
        <h1>{t("The best homes abroad, checked and scored")}</h1>
        {feed?.countries_count && <p className="hx-sub">{(() => { const v = Object.values(feed.countries_count as Record<string, number>); return <>{num(v.reduce((a, b) => a + b, 0))} {t("homes in")} {v.length} {t("countries, each checked by a person and given a score out of 100. We send you to the seller; we never sell.")}</>; })()} <Link to="/method">{t("How the score works")}</Link></p>}
        <FindSearch value={q} inputRef={searchRef} />
      </section>
      <FeedFilters countries={feed?.countries_count || {}} value={{ scope, country, category, max_price: maxPrice, min_price: minPrice, min_beds: minBeds, price_drop: priceDrop, min_sqm: minSqm, sort, q, min_score: minScore, need, dim_min: dimMin }} onChange={setFilters} total={feed?.total} busy={busy} />
      <FindBar />
      {!plain || maxPrice || minPrice || minBeds || priceDrop || minSqm || minScore || need.length || sort !== "score" || showMap ? (
      <div className="rh-results-bar" ref={resultsRef}>
        <p role="status" aria-live="polite"><strong>{busy && !feed ? t("Updating results…") : feed ? `${num(feed.total)} ${t("homes")}${country ? ` in ${country.split(",").join(", ")}` : ""}` : ""}</strong>
          {(country || category || maxPrice || minPrice || minBeds || priceDrop || minSqm || q || vibeList.length > 0 || sort !== "score") && <Link to="/" className="hunt-link rh-clear">{t("Clear filters")}</Link>}</p>
        <div className="rh-results-tools"><button type="button" className="hunt-link rh-maptoggle" aria-expanded={showMap} onClick={() => setMapMode(showMap ? "off" : "on")}>{showMap ? t("Hide map") : t("Show on map")}</button><ScoreHelp/><span className="rh-motion"><MotionControl/></span></div>
      </div>) : <div ref={resultsRef} />}
      {showMap && (
        <Suspense fallback={<div className="hm is-embedded hm-feed"><div className="hm-map" /></div>}>
          <HomesMap params={{ scope, country, category, max_price: maxPrice, min_sqm: minSqm, q: searchQuery(q), terms } as any} embedded className="hm-feed" />
        </Suspense>
      )}
      {error && <ErrorBox error={error} retry={() => load()} />}
      <div className="hx-grid" aria-busy={!feed && busy}>
        {!feed && busy
          ? [0, 1, 2, 3, 4, 5].map((n) => <HomeCardSkeleton key={n} />)
          : displayedRows?.map((d: any, index: number) => (
            <Fragment key={d.id}>
              <HomeCard deal={d} pos={index + 1} />
              {index === 5 && !q && <div className="hx-span"><Vibes rows={feed?.rows||[]} isOn={vibeOn} onToggle={toggleVibe} /></div>}
              {index === 8 && <div className="hx-span"><InlineAlert countries={Object.keys(feed?.countries_count || {})} country={country && !country.includes(",") ? country : undefined} /></div>}
              {index === 11 && <div className="hx-span"><FindHomeCTA place={q || (country && !country.includes(",") ? country : undefined)} /></div>}
              {index === 17 && plain && !maxPrice && sort === "score" && <div className="hx-span"><NearCity /></div>}
              {index === 23 && plain && !maxPrice && sort === "score" && <div className="hx-span"><BestPerCountry /></div>}
              {index === 29 && plain && <div className="hx-span"><SponsoredCard /></div>}
            </Fragment>
          ))}
        {feed && busy && feed.rows.length > 0 && feed.rows.length < feed.total && [0, 1, 2].map((n) => <HomeCardSkeleton key={"more" + n} />)}
      </div>
      {feed && !busy && !error && feed.total < 6 && <LiveSearchCard q={liveQueryFromParams(params)} />}
      <div ref={sentinel} aria-hidden="true" />
      {showTop && <button className="rh-to-top" aria-label="Back to the top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp size={18} /></button>}
      {feed?.rows.length === 0 && !error && q && <NearestHomes q={q} />}
      {feed?.rows.length === 0 && !error && !q && (
        <EmptyState title={q ? `No homes for “${q}” yet` : "Nothing here yet"}
          text={q ? "Try a country, a town or a simple word like sea, lake or cabin." : "No homes match these filters. Clear them, or post a home you found."}
          action={<div className="hunt-row"><Link to="/" className="hunt-primary">See all homes</Link><Link to={`/alerts?${new URLSearchParams({ ...(country && !country.includes(",") ? { country } : {}), ...(maxPrice ? { max: String(maxPrice) } : {}) }).toString()}`} className="hunt-secondary">{t("Email me when one appears")}</Link><Link to="/submit" className="hunt-link">{t("Post a home")}</Link><EmptyAlternatives params={{scope,country,category,max_price:maxPrice,min_sqm:minSqm,sort,q}}/></div>} />
      )}
      {feed && feed.rows.length < feed.total && !busy && (
        <button className="hunt-more" onClick={() => load(true)}>{t("Show more homes")}</button>
      )}
      {plain && !q && <HomeFaq />}
      <section className="hunt-join hv-join">
        <div>
          <span className="hunt-eyebrow">{t("Found a home we missed?")}</span>
          <h2>{t("Post it. If it scores well, it rises.")}</h2>
          <p>Paste the listing link. Every home gets a human check before it goes live.</p>
        </div>
        <QuickSubmission />
      </section>
      {quick!==null && feed?.rows?.[quick] && <QuickHome rows={feed.rows} index={quick} onIndex={setQuick} onClose={()=>setQuick(null)}/>}
      <p className="hunt-rules">
        {t("Save homes without an account. Sign in to keep them on every device.")}{" "}
        {t("Every home has a price, real photos and a hand check. The list is ranked by score and changes every day.")}
      </p>
    </div>
  );
}
function Availability({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const { requireUser, setNotice } = useCommunity();
  const [s, setS] = useState<{ available: number; sold: number; last_at: string | null; mine: string | null } | null>(null);
  useEffect(() => {
    (supabase.rpc as any)("community_availability_summary", { p_deal: dealId }).then(({ data }: any) => data && setS(data));
  }, [dealId, user?.id]);
  async function vote(status: "available" | "sold") {
    if (!user) { requireUser(); return; }
    const { data, error } = await (supabase.rpc as any)("community_availability_vote", { p_deal: dealId, p_status: status });
    if (error || data?.error) { setNotice(data?.error || "Could not save. Try again."); return; }
    setS(data); setNotice("Thanks. That helps everyone ✓");
  }
  const total = (s?.available || 0) + (s?.sold || 0);
  return (
    <div className="hunt-avail">
      <strong>{t("Is it still for sale?")}</strong>
      <span>
        {total === 0 ? t("No reports yet. Called or checked? Tell the others.") :
          `${s!.available} say available · ${s!.sold} say sold (last 30 days)`}
      </span>
      <div>
        <button aria-pressed={s?.mine === "available"} onClick={() => vote("available")}>{t("Still available")}</button>
        <button aria-pressed={s?.mine === "sold"} onClick={() => vote("sold")}>{t("Sold or gone")}</button>
      </div>
    </div>
  );
}

function Detail() {
  const [detailParams] = useSearchParams();
  const scope = "all"; void detailParams;
  const { user } = useAuth();
  const { slug } = useParams();
  const { session, call, requireUser, setNotice } = useCommunity();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(false);
  const detailSequence = useRef(0);
  async function load() {
    const request = ++detailSequence.current;
    try {
      const pre = slug ? takeDetail(slug) : undefined;
      const result = (pre ? await pre : null) || await call("detail", { slug });
      if(request!==detailSequence.current)return;
      setData(result); setError("");
    } catch (e) {
      if(request===detailSequence.current)setError((e as Error).message);
    }
  }
  // Paint at once from the row the feed already had; the full record fills in behind it.
  const cached = slug ? rowCache.get(slug) : undefined;
  useEffect(() => { setData(null); bumpIx(); bumpStat("opened"); if (!openedHere(slug)) window.scrollTo(0, 0); }, [slug]);
  const swipe = useHomeSwipe(slug);
  useEffect(() => {
    if (session) load();
    return ()=>{detailSequence.current++;};
  }, [slug, session?.token, user?.id]);
  const d: Deal = data?.deal || cached;
  useEffect(()=>{if(user && data?.deal?.slug)(supabase as any).rpc("rh_seen",{p_slug:data.deal.slug}).then(()=>{},()=>{});},[data?.deal?.slug,user?.id]);
  useEffect(() => { if (d?.image_urls) preloadImages(d.image_urls.slice(0, 8)); }, [d?.id]);
  useEffect(() => {
    if (!d) return;
    const where = d.location_name || d.country || "";
    document.title = `${d.price_eur != null ? money(d.price_eur) + " · " : ""}${cleanTitle(d)}${where && !cleanTitle(d).includes(where) ? " · " + where : ""} · RealHunt`;
    const desc = `${cleanTitle(d)}${d.price_eur != null ? " for " + money(d.price_eur) : ""}. Scored and ranked by RealHunt.`;
    const set = (sel: string, attr: string, key: string, val: string) => {
      let m = document.head.querySelector(sel) as HTMLMetaElement | null;
      if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
      m.setAttribute("content", val);
    };
    set('meta[name="description"]', "name", "description", desc);
    set('meta[property="og:title"]', "property", "og:title", document.title);
    set('meta[property="og:description"]', "property", "og:description", desc);
    if (d.image_urls?.[0]) set('meta[property="og:image"]', "property", "og:image", new URL(d.image_urls[0], location.origin).href);
  }, [d?.id]);
  if (/Deal not found/i.test(error)) return <UnavailableHome/>;
  if (error)
    return (
      <div className="hunt-wrap">
        <ErrorBox error={error} retry={load} />
      </div>
    );
  if (!d) return <DealSkeleton />;
  const listing = (d.has_source || safeUrl(d.source_url)) ? (
    <OriginalListingLink href={d.source_url || undefined} className="hunt-primary" target="_blank" rel="noopener noreferrer">
      {t("View listing")} <ArrowUpRight size={17} />
    </OriginalListingLink>
  ) : null;
  return (
    <div className="hunt-wrap hunt-detail hv-detail" {...swipe.handlers}>
      <DetailBar deal={d as Row} scope={scope} onChange={load} listing={listing} />
      <CatalogBack/>
      <div className="hunt-detail-grid">
        <DetailGallery key={d.id} deal={d} />
        <section>
          <span className="hunt-eyebrow">
            <Link to={`/homes/${encodeURIComponent((d.country || "").toLowerCase().replace(/ /g, "-"))}`}>{d.country}</Link>{regionOf(d) && <> · <Link to={`/homes/${encodeURIComponent((d.country || "").toLowerCase().replace(/ /g, "-"))}/${slugify(regionOf(d))}`}>{regionOf(d)}</Link></>} · {categories.find((c) => c[0] === d.category)?.[1] || d.category}
          </span>
          <h1>{cleanTitle(d)}</h1>
          <PriceHead d={d as any} />
          <StatusTags deal={d as Row} />
          <VerifiedLine deal={d as Row} />
          <AiCheckNote d={d as any} />
          {(d as any).developer && <DevBlock deal={d as Row} />}
          <p className="hv-detail-where">{FLAG_[d.country] || "📍"} {d.location_name}</p>
          <p>
            {isImported(d) ? "Spotted on" : "Found by"}{" "}
            {sourceSite(d) ? <a href={`https://www.${sourceSite(d)}/`} target="_blank" rel="noopener noreferrer nofollow">{sourceSite(d)}</a> : <Link to={`/hunter/${d.hunter_handle}`}>@{d.hunter_handle}</Link>}
            {d.is_editorial_pick ? " · ✦ RealHunt Pick" : ""}
          </p>
          <Amenities deal={d} />
          {d.why_great && <blockquote>{d.why_great}</blockquote>}
          {!isEs() && <TranslateBar text={[cleanTitle(d), d.why_great].filter(Boolean).join("\n\n")} />}
          <CheckLayer d={d as any} />
          <HomeArticle d={d} />
          <div className="hunt-detail-actions hv-detail-actions">
            {listing}
            <SaveHeart deal={d} className="hunt-save hv-save-inline" />
            <ShareButton deal={d as Row} scope={scope} label />
          </div>
          <PriceWatch d={d} />
          <div className="hv-detail-more">
            <VideoTour deal={d} />
            <BoardButton deal={d} />
            <ComparePick deal={d as Row} />
          </div>
          <p className="hunt-fine">
            {num(d.views)} {t("views")}{Number(d.saves) > 0 && <>{", "}{num(d.saves)} {t("saves")}</>}
          </p>
          <ScoreBars deal={d} />
          <DecisionFacts deal={d as Row}/><TaxPanel deal={d as Row}/><Nearby deal={d} />
          <Availability dealId={d.id} />
          <CostPanel deal={d as Row} />
          {d.price_eur ? <MortgageCalc price={d.price_eur} /> : null}
          <RemoteWorkStrip place={d.location_name || d.country} slug={d.slug} />
          {!(d as any).developer && <InfoRequest deal={d as Row} />}
          <ClaimListing deal={d as Row} />
          <p className="hunt-fine">Buying from abroad? <Link to={`/help-buying?country=${encodeURIComponent(d.country || "")}`}>Get a local lawyer, translator or survey</Link>{GUIDES[slugCountryKey(d.country)] && <> · <Link to={`/guide/${slugCountryKey(d.country)}`}>How to buy in {d.country}</Link></>}</p>
          <AdminVerify deal={d as Row} onDone={load} />
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
            <Flag size={14} /> {t("Report a problem")}
          </button>
          <p className="hunt-fine">
            Agent or owner of this home?{" "}
            <a href={`mailto:hello@realhunt.co?subject=${encodeURIComponent("Feature my listing: " + d.slug)}`}>Feature it or correct the details</a>
          </p>
        </section>
        <DetailAside deal={d as Row} listing={listing} />
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
      <HomeNav prev={swipe.prev} next={swipe.next} pos={swipe.pos} />
      <SimilarHomes slug={d.slug} />
      <section className="hunt-discussion" id="discussion">
        <h2>{t("Comments and questions")}</h2>
        <p>{t("Ask a question or share what you know about the area.")}</p>
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
          <label htmlFor="comment">{t("Your comment")}</label>
          <textarea
            id="comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            minLength={2}
            maxLength={1200}
            required
            placeholder="What should a buyer know about this home or the area?"
          />
          <button className="hunt-primary" disabled={busy}>
            {busy ? "Posting…" : "Post comment"}
          </button>
        </form>
        {!data && <p className="hunt-fine">Loading comments…</p>}
        {data && data.comments.length === 0 && (
          <p className="hunt-fine">
            {t("No comments yet. Ask the first question.")}
          </p>
        )}
        {(data?.comments || []).map((c: any) => (
          <article className="hunt-comment" key={c.id}>
            <div>
              <Link to={`/hunter/${c.handle}`}>@{c.handle || "hunter"}</Link>
              <time>{new Date(c.created_at).toLocaleDateString()}</time>
            </div>
            <p>{c.body}</p>
            {session?.admin && (
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
          "We could not import this source. Add the details below, your draft is saved.",
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
        ← Back to the ranking
      </Link>
      <span className="hunt-eyebrow">{t("Share a good find")}</span>
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
      <span className="hunt-eyebrow">{t("Meet the hunter")}</span>
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
      <span className="hunt-eyebrow">{t("The finds that rose to the top")}</span>
      <h1>
        Weekly winners <Trophy size={32} />
      </h1>
      <p>A permanent record of the community’s favourite discoveries.</p>
      <LivePodium />
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
            Vote for the best homes
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
function SubmissionPhoto({ deal }: { deal: any }) {
  const [failed, setFailed] = useState(false);
  const image = deal.image_urls?.[0];
  useEffect(() => setFailed(false), [image]);
  const content = image && !failed ? <img src={image} alt={deal.title} loading="lazy" onError={() => setFailed(true)} /> : <span className="hunt-crm-photo-empty"><Eye size={24} />Photo pending</span>;
  return <div className="hunt-crm-photo">
    {deal.status === "approved" ? <Link to={`/deal/${deal.slug}`} aria-label={`View ${deal.title}`}>{content}</Link> : safeUrl(deal.source_url) ? <a href={deal.source_url} target="_blank" rel="noopener noreferrer" aria-label={`Open source for ${deal.title}`}>{content}</a> : content}
    {deal.image_urls?.length > 1 && <span className="hunt-crm-photo-count">{deal.image_urls.length} photos</span>}
  </div>;
}
function SubmissionSource({ url }: { url?: string }) {
  if (!safeUrl(url)) return null;
  let domain = "Original listing";
  try { domain = new URL(url!).hostname.replace(/^www\./, ""); } catch { return null; }
  return <a className="hunt-crm-source" href={url} target="_blank" rel="noopener noreferrer" title={url}>{domain}<ArrowUpRight size={14} /></a>;
}
function matchesSubmission(deal: any, query: string) {
  return [deal.title, deal.country, deal.location_name, deal.source_url, deal.hunter_handle].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase());
}
function Mine() {
  const { user, session, call, requireUser, setNotice } = useCommunity();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  async function refresh() {
    setRefreshing(true); setError("");
    try { setData(await call("dashboard")); }
    catch(e) { setError((e as Error).message); }
    finally { setRefreshing(false); }
  }
  useEffect(() => { if(session && user) refresh(); }, [session?.token, user?.id]);
  const submissions = (data?.deals || []).filter((d:any) => (status === "all" || d.status === status) && matchesSubmission(d, query));
  const [guest, setGuest] = useState<GuestSave[]>(() => guestSaves());
  useEffect(() => { const on = () => setGuest(guestSaves()); window.addEventListener("rh-guest-saves", on); return () => window.removeEventListener("rh-guest-saves", on); }, []);
  if (!user && pathname.endsWith("saved") && guest.length)
    return (
      <div className="hunt-wrap hunt-profile">
        <h1>Saved homes</h1>
        <SavedSearches />
        <p className="hunt-guest-note">Saved on this device. <button className="hunt-link" onClick={requireUser}>Create a free account</button> to keep them on your phone and computer and get an email if the price drops.</p>
        <SavedHomes items={guest.map((g) => ({ id: g.id, slug: g.slug, title: g.title, price_eur: g.price_eur, image: g.image }))} />
      </div>
    );
  if (!user)
    return (
      <div className="hunt-wrap hunt-empty rh-saved-empty">
        <h1>{pathname.endsWith("saved") ? t("Saved homes") : t("My submissions")}</h1>
        <p>{t("Tap the bookmark on any home to keep it here. No account needed.")}</p>
        <div className="hunt-row">
          <Link className="hunt-primary" to="/">{t("Browse homes")}</Link>
          <button className="hunt-secondary" onClick={requireUser}>{t("Sign in")}</button>
        </div>
        <p className="hunt-fine">{t("Saved homes on another device? Sign in to see them here.")}</p>
        {pathname.endsWith("saved") && <SavedSearches />}
      </div>
    );
  return (
    <div className="hunt-wrap hunt-profile">
      <h1>{pathname.endsWith("saved") ? t("Saved homes") : t("My submissions")}</h1>
      {pathname.endsWith("saved") && <SavedSearches />}
      {pathname.endsWith("saved") && <BoardsSection />}
      {pathname.endsWith("saved") && <ShareSavedToggle />}
      <nav className="hunt-tabs">
        <Link to="/hunt/mine">My submissions</Link>
        <Link to="/hunt/saved">{t("Saved homes")}</Link>
        {session?.hunter && (
          <Link to={`/hunter/${session.hunter.handle}`}>Public profile ↗</Link>
        )}
      </nav>
      <ProfileEditor />
      {error && <ErrorBox error={error} />}{" "}
      {!data ? (
        error ? null : <Loading />
      ) : pathname.endsWith("saved") ? (
        <SavedHomes items={data.saved.map((d: any) => ({ id: d.id, slug: d.slug, title: d.title, price_eur: d.price_eur ?? null, image: d.image_urls?.[0] || null }))} empty={<p>{t("No saved homes yet. Tap the bookmark on any home to keep it here.")}</p>} />
      ) : (
        <>
          <Link className="hunt-primary" to="/submit">
            <Plus size={16} />
            {t("Post a home")}
          </Link>
          <div className="hunt-submission-summary" aria-label="Submission totals">
            <span><strong>{data.deals.length}</strong> submitted</span>
            {(["pending", "approved", "rejected"] as const).map(status => <span key={status}><strong>{data.deals.filter((d: any) => d.status === status).length}</strong> {status === "pending" ? "pending review" : status}</span>)}
          </div>
          <div className="hunt-crm-toolbar">
            <label className="hunt-crm-search"><Search size={17}/><input type="search" aria-label="Search my submissions" placeholder="Search title, location or link" value={query} onChange={e=>setQuery(e.target.value)}/></label>
            <label><span className="sr-only">Submission status</span><select aria-label="Submission status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
            <button onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button>
          </div>
          {!data.deals.length && <p>Your first great discovery starts with a link.</p>}
          {data.deals.length > 0 && !submissions.length && <p role="status">No submissions match your search.</p>}
          <div className="hunt-crm-list">
          {submissions.map((d: any) => (
            <article className="hunt-submission hunt-crm-card" key={d.id}>
              <SubmissionPhoto deal={d} />
              <div className="hunt-crm-info">
                <span className={"hunt-status " + d.status}>
                  {d.status === "pending" ? "Pending review" : d.status}
                </span>
                <h2>{d.title}</h2>
                <p className="hunt-crm-facts">{[money(d.price_eur), d.location_name || d.country, d.sqm ? `${d.sqm} m²` : null, d.bedrooms ? `${d.bedrooms} beds` : null].filter(Boolean).join(" · ") || "Details awaiting review"}</p>
                <p>Submitted {new Date(d.created_at).toLocaleDateString("en-GB")}{d.approved_at ? ` · Approved ${new Date(d.approved_at).toLocaleDateString("en-GB")}` : ""}</p>
                {d.why_great && <p>{d.why_great}</p>}
                {d.reject_reason && <p>Review note: {d.reject_reason}</p>}
                <SubmissionSource url={d.source_url} />
                {d.status === "approved" && <p>{num(d.week_score || 0)} weekly score · {num(d.lifetime_votes || 0)} lifetime votes · {num(d.views || 0)} views</p>}
              </div>
              {d.status === "approved" && (
                <div className="hunt-crm-actions">
                  <Link to={`/deal/${d.slug}`}>View live deal →</Link>
                  <button
                    onClick={() =>
                      shareDeal(
                        d,
                        `I found this property deal on RealHunt. Help it climb the ranking!`,
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
          </div>
        </>
      )}
    </div>
  );
}
function Admin() {
  const { session, call, setNotice, refreshSession } = useCommunity();
  const [query, setQuery] = useState("");
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
      <label className="hunt-crm-search hunt-crm-admin-search"><Search size={17}/><input type="search" aria-label="Search admin submissions" placeholder="Search property, source or hunter" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      {!data && !error && <Loading />}
      <h2>Pending submissions ({data?.pending.length || 0})</h2>
      {data?.pending.filter((d:any)=>matchesSubmission(d,query)).map((d: any) => (
        <article key={d.id} className="hunt-review">
          <div className="hunt-crm-review-head">
            <SubmissionPhoto deal={d} />
            <div className="hunt-crm-info">
              <span className="hunt-status pending">Pending review</span>
              <h3>{d.title}</h3>
              <p className="hunt-crm-facts">{[money(d.price_eur), d.location_name || d.country, d.sqm ? `${d.sqm} m²` : null].filter(Boolean).join(" · ")}</p>
              <p>@{d.hunter_handle} · Submitted {new Date(d.created_at).toLocaleDateString("en-GB")}</p>
              <SubmissionSource url={d.source_url} />
              {d.why_great && <p>{d.why_great}</p>}
            </div>
          </div>
          <details className="hunt-crm-edit"><summary>Edit property details</summary>
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
                placeholder="Optional"
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
          </details>
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
      {data?.pending.length > 0 && !data.pending.some((d:any)=>matchesSubmission(d,query)) && <p>No pending submissions match your search.</p>}
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
      <AiQueue approved={data?.approved || []} busy={busy} act={act} />
      <h2>RealHunt Picks</h2>
      <p>Editorial picks are independent of the community ranking.</p>
      {data?.approved.filter((d:any)=>matchesSubmission(d,query)).map((d: any) => (
        <article key={d.id} className="hunt-submission hunt-crm-card">
          <SubmissionPhoto deal={d} />
          <div className="hunt-crm-info"><span className="hunt-status approved">Approved</span><h3><Link to={`/deal/${d.slug}`}>{d.title}</Link></h3><p>{[money(d.price_eur),d.location_name || d.country].filter(Boolean).join(" · ")}</p><SubmissionSource url={d.source_url} /></div>
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
  // "/alerts/" and "/alerts" are the same page (static hosting adds the slash to folders).
  const path = location.pathname.length > 1 ? location.pathname.replace(/\/+$/, "") : location.pathname;
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
    ) : path === "/hunt/inbox" ? (
      <AdminInbox />
    ) : path.startsWith("/b/") ? (
      <BoardPage />
    ) : path.startsWith("/vs/") ? (
      <ComparePage />
    ) : path === "/me" ? (
      <ProfilePage />
    ) : path === "/insider" ? (
      <InsiderPage />
    ) : path === "/new-builds" || path.startsWith("/new-builds/") ? (
      <NewBuildsPage />
    ) : path === "/inbox" ? (
      <InboxPage />
    ) : path === "/compare" ? (
      <CompareRoute />
    ) : path === "/compare-new-builds" ? (
      <CompareBuilds />
    ) : path === "/costs" ? (
      <CostsIndex />
    ) : path.startsWith("/costs/") ? (
      <CostsPage />
    ) : path === "/research/new-builds" ? (
      <NewBuildReport />
    ) : path === "/agents" ? (
      <AgentsPage />
    ) : path === "/top" || path === "/top/" ? (
      <TopIndexPage />
    ) : path === "/top/how-we-rank" || path === "/top/how-we-rank/" ? (
      <TopMethodPage />
    ) : path === "/about" || path === "/about/" ? (
      <AboutPage />
    ) : path === "/method" ? (
      <HomeMethodPage />
    ) : path === "/new" || path === "/research/prices" || path === "/sitemap" || path.startsWith("/sitemap/") || path === "/what-100k-buys" || path === "/price-drops" || path === "/sources" || path.startsWith("/sources/") ? (
      <StaticPage />
    ) : path === "/top/mine" ? (
      <TopMinePage />
    ) : path.startsWith("/top/claim/") ? (
      <TopClaimPage />
    ) : /^\/top\/[a-z-]+\/?$/.test(path) ? (
      <TopListPage />
    ) : path.startsWith("/top/") ? (
      <TopProjectPage />
    ) : path === "/developers" ? (
      <DevLeaderboard />
    ) : path === "/blog" ? (
      <BlogIndex />
    ) : path.startsWith("/blog/") ? (
      <BlogPost />
    ) : path === "/cheap-houses" || path.startsWith("/cheap-houses/") ? (
      <ListingRoute fallback={<ListingMissing />} />
    ) : path === "/swipe" ? (
      <SwipePage />
    ) : path === "/live-search" ? (
      <Suspense fallback={<Loading />}><LiveSearchPage /></Suspense>
    ) : path === "/map" ? (
      <Suspense fallback={<div className="hunt-wrap hunt-mappage" style={{ minHeight: "100vh" }} aria-busy="true" />}><MapView /></Suspense>
    ) : path === "/leaderboard" ? (
      <LeaderboardPage />
    ) : path === "/invite" ? (
      <InvitePage />
    ) : path === "/alerts/confirm" ? (
      <AlertConfirmPage />
    ) : path === "/alerts" ? (
      <AlertsPage />
    ) : path === "/help-buying" ? (
      <ServicesPage />
    ) : path.startsWith("/find-my-home") ? (
      <FindHomePage />
    ) : path.startsWith("/extension") ? (
      <ExtensionRoute />
    ) : path === "/best" || path.startsWith("/best/") || path.startsWith("/ranking/") || path.startsWith("/homes-compare/") ? (
      <BestRoute />
    ) : path.startsWith("/guide") ? (
      <GuidePage />
    ) : path === "/can-i-buy" ? (
      <Suspense fallback={<Loading />}><CanBuyIndex /></Suspense>
    ) : path.startsWith("/can-i-buy/") ? (
      <Suspense fallback={<Loading />}><CanBuyPage /></Suspense>
    ) : path === "/buying-costs" || path.startsWith("/buying-costs/") ? (
      <Suspense fallback={<Loading />}><BuyingCostsPage /></Suspense>
    ) : path === "/countries" || path.startsWith("/countries/") ? (
      <CountriesPage />
    ) : path.startsWith("/homes/") ? (
      <ListingRoute fallback={<HomesPage />} />
    ) : path.startsWith("/c/") ? (
      <CollectionPage />
    ) : path.startsWith("/hunt/") ? (
      <Mine />
    ) : (
      <Home />
    );
  // The fallback keeps a screen of height, so the footer does not show for a moment and then jump away (layout shift).
  return <Shell><Suspense fallback={<div style={{ minHeight: "100vh" }}><Loading /></div>}>{page}</Suspense></Shell>;
}
