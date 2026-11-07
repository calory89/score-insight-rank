import { useWebVitals } from "@/hooks/useWebVitals";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollKeeper from "./components/realhunt/ScrollKeeper";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import React, { Suspense, useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import OfflineBanner from "@/components/OfflineBanner";

// Everything is lazy: the first paint only ships React, the router, auth and the page you asked for.
// v11-oct: after a new deploy, an open tab asks for old page files that no longer exist ("Failed to fetch dynamically
// imported module"). Reload once to get the new ones instead of showing an error screen.
const L = (f: () => Promise<any>) => React.lazy(() => f().catch((e) => {
  try { const k = "rh_chunk_reload", last = Number(sessionStorage.getItem(k) || 0); if (Date.now() - last > 60000) { sessionStorage.setItem(k, String(Date.now())); location.reload(); return new Promise(() => {}); } } catch { /* storage blocked */ }
  throw e;
}));
const Home = L(() => import("./pages/Home"));
const Community = L(() => import("./community/Community"));
const IndexNew = L(() => import("./pages/IndexNew"));
const HomeScoring = L(() => import("./pages/HomeScoring"));
const Apply = L(() => import("./pages/Apply"));
const ProjectDetail = L(() => import("./pages/ProjectDetail"));
const Method = L(() => import("./pages/Method"));
const Pricing = L(() => import("./pages/Pricing"));
const ForAgents = L(() => import("./pages/ForAgents"));
const SignIn = L(() => import("./pages/auth/SignIn"));
const SignUp = L(() => import("./pages/auth/SignUp"));
const Callback = L(() => import("./pages/auth/Callback"));
const Brand = L(() => import("./pages/app/Brand"));
const ShortLinkRedirect = L(() => import("./pages/ShortLinkRedirect"));
const Dashboard = L(() => import("./pages/Dashboard"));
const Analysis = L(() => import("./pages/Analysis"));
const Compare = L(() => import("./pages/Compare"));
const Settings = L(() => import("./pages/Settings"));
const Admin = L(() => import("./pages/Admin"));
const Rankings = L(() => import("./pages/Rankings"));
const Leads = L(() => import("./pages/Leads"));
const Tickets = L(() => import("./pages/Tickets"));
const Discover = L(() => import("./pages/Discover"));
const Deals = L(() => import("./pages/Deals"));
const Profile = L(() => import("./pages/Profile"));
const Game = L(() => import("./pages/Game"));
const SearchPage = L(() => import("./pages/Search"));
const Privacy = L(() => import("./pages/Privacy"));
const Terms = L(() => import("./pages/Terms"));
const LegalPrivacy = L(() => import("./pages/legal/Privacy"));
const LegalTerms = L(() => import("./pages/legal/Terms"));
const Contact = L(() => import("./pages/Contact"));
const ResetPassword = L(() => import("./pages/ResetPassword"));
const InvestorQuiz = L(() => import("./pages/InvestorQuiz"));
const Portfolio = L(() => import("./pages/Portfolio"));
const MarketDirectory = L(() => import("./pages/MarketDirectory"));
const MarketPulse = L(() => import("./pages/MarketPulse"));
const Weather = L(() => import("./pages/Weather"));
const BestDealsCountry = L(() => import("./pages/BestDealsCountry"));
const MarketCity = L(() => import("./pages/MarketCity"));
const NotFound = L(() => import("./pages/NotFound"));
const Fit = L(() => import("./pages/Fit"));
const Ebc = L(() => import("./pages/Ebc"));
const Como = L(() => import("./pages/Como"));
const Saved = L(() => import("./pages/Saved"));
const Account = L(() => import("./pages/Account"));
const MapPage = L(() => import("./pages/MapPage"));
const Swipe = L(() => import("./pages/Swipe"));
const CompareHomes = L(() => import("./pages/CompareHomes"));
const Guide = L(() => import("./pages/Guide"));
const Sell = L(() => import("./pages/Sell"));
const Collection = L(() => import("./pages/Collection"));
const LegalPage = L(() => import("./pages/legal/Legal"));
const Network = L(() => import("./pages/Network"));
const NetworkApp = L(() => import("./pages/NetworkApp"));
const NetworkAgreement = L(() => import("./pages/NetworkAgreement"));
const NetworkStart = L(() => import("./pages/NetworkStart"));
const ClaimPage = L(() => import("./pages/ClaimPage"));
const NetworkAdmin = L(() => import("./pages/NetworkAdmin"));
const NetworkInvoice = L(() => import("./pages/NetworkInvoice"));
const NetworkExample = L(() => import("./pages/NetworkExample"));
const ReservationContract = L(() => import("./pages/ReservationContract"));
const DevPublic = L(() => import("./pages/DevPublic"));
const Finds = L(() => import("./pages/Finds"));
const AdminActivity = L(() => import("./pages/AdminActivity"));
const AdminExtension = L(() => import("./pages/AdminExtension"));
const FindDetail = L(() => import("./pages/FindDetail"));
const CommandPalette = L(() => import("@/components/CommandPalette"));
const KeyboardShortcutsModal = L(() => import("@/components/KeyboardShortcutsModal"));
const OnboardingWizard = L(() => import("@/components/OnboardingWizard"));
const EmailCapture = L(() => import("@/components/realhunt/EmailCapture"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000, retry: 2, refetchOnWindowFocus: false } } });

const PageTracker = ({ children }: { children: React.ReactNode }) => { usePageTracking(); useReferralCapture(); useWebVitals(); return <>{children}</>; };

// Pages whose prerendered HTML is a real first paint (marked data-rh-keep, e.g. /weather) stay on screen
// while their code loads, instead of being swapped for a blank box and then the page (a visible flash).
const bootStatic = (() => { try { const r = document.getElementById("root"); return r && r.querySelector("[data-rh-keep]") ? { path: location.pathname, html: r.innerHTML } : null; } catch { return null; } })();
const SuspenseFallback = () => bootStatic && location.pathname === bootStatic.path
  ? <div dangerouslySetInnerHTML={{ __html: bootStatic.html }} />
  : <div className="min-h-[60vh] bg-paper" aria-busy="true" />;

// Power-user extras load only once the browser is idle, never before the page you came for.
const Extras = () => {
  const [on, setOn] = useState(false);
  const { enabled } = useFeatureFlag("onboarding_tour");
  useEffect(() => { const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 2500)); idle(() => setOn(true)); }, []);
  if (!on) return null;
  return <Suspense fallback={null}><CommandPalette /><KeyboardShortcutsModal />{enabled && <OnboardingWizard />}</Suspense>;
};

const CookieBanner = L(() => import("@/components/realhunt/CookieBanner"));
const CommunityEmailCapture = () => {
  const { pathname } = useLocation();
  if (/^\/(submit|hunt|alerts)(\/|$)/.test(pathname)) return null;
  return <EmailCapture />;
};

// One site, one feed (23-sep-2026): the old catalogue at /browse and its country pages now open the
// same ranked feed as the home page, with their filters carried over.
const toFeed = (search: string, extra: Record<string, string> = {}) => {
  const p = new URLSearchParams(search);
  const out = new URLSearchParams();
  if (p.get("country") && p.get("country") !== "All") out.set("country", p.get("country")!);
  if (p.get("beach") === "1") out.set("type", "beach");
  const max = Number(p.get("max") || p.get("price")); if (max > 0 && max < 100000) out.set("price", String(max));
  if (p.get("q")) out.set("q", p.get("q")!);
  const sort = p.get("sort") || p.get("order");
  if (sort) out.set("order", sort === "cheapest" || sort === "price" ? "price_asc" : sort === "newest" || sort === "new" ? "new" : sort);
  Object.entries(extra).forEach(([k, v]) => v && out.set(k, v));
  const qs = out.toString();
  return "/" + (qs ? "?" + qs : "");
};
const CommunityRoot = () => {
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  return ["beach", "max", "sort"].some(k => p.has(k))
    ? <Navigate to={toFeed(search)} replace /> : <Community />;
};
const ToFeed = () => { const { search } = useLocation(); return <Navigate to={toFeed(search)} replace />; };
const CountryToFeed = () => {
  const { pathname, search } = useLocation();
  const raw = decodeURIComponent(pathname.split("/")[2] || "");
  const name = raw.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/^Usa$|^Us$/, "United States");
  return <Navigate to={toFeed(search, { country: name })} replace />;
};
const FindToDeal = () => { const { pathname } = useLocation(); return <Navigate to={"/deal/" + pathname.split("/")[2]} replace />; };

const AppRoutes = () => (
  <Suspense fallback={<SuspenseFallback />}>
    <Routes>
      <Route path="/" element={<CommunityRoot />} />
      <Route path="/browse" element={<ToFeed />} />
      <Route path="/submit" element={<Community />} />
      <Route path="/deal/:slug" element={<Community />} />
      <Route path="/hunter/:handle" element={<Community />} />
      <Route path="/winners" element={<Community />} />
      <Route path="/hunt/:section" element={<Community />} />
      <Route path="/score" element={<IndexNew />} />
      <Route path="/homescoring" element={<HomeScoring />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/projects/:slug" element={<ProjectDetail />} />
      <Route path="/method" element={<Community />} />
      <Route path="/method/analysis" element={<Method />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/for-agents" element={<ForAgents />} />
      <Route path="/auth/sign-in" element={<SignIn />} />
      <Route path="/auth/sign-up" element={<SignUp />} />
      <Route path="/auth/callback" element={<Callback />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/app" element={<Dashboard />} />
      <Route path="/app/brand" element={<Brand />} />
      <Route path="/s/:slug" element={<ShortLinkRedirect />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis/loading" element={<Analysis />} />
      <Route path="/analysis/:id" element={<Analysis />} />
      <Route path="/r/:slug" element={<Analysis />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/tickets" element={<Tickets />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/deals" element={<Deals />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:userId" element={<Profile />} />
      <Route path="/game" element={<Game />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/legal/privacy" element={<LegalPrivacy />} />
      <Route path="/legal/terms" element={<LegalTerms />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/quiz" element={<InvestorQuiz />} />
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/market" element={<MarketDirectory />} />
      <Route path="/market/:country/:city" element={<MarketPulse />} />
      <Route path="/market/:city" element={<MarketCity />} />
      <Route path="/best-deals/:country" element={<BestDealsCountry />} />
      <Route path="/heatmap" element={<Navigate to="/weather" replace />} />
      <Route path="/weather" element={<Weather />} />
      <Route path="/fit" element={<Fit />} />
      <Route path="/ecobeachcity" element={<Ebc />} />
      <Route path="/lake-como" element={<Como />} />
      <Route path="/saved" element={<Saved />} />
      <Route path="/country/:country" element={<CountryToFeed />} />
      <Route path="/from/:account" element={<Home />} />
      <Route path="/account" element={<Account />} />
      <Route path="/account/:tab" element={<Account />} />
      <Route path="/map" element={<Community />} />
      <Route path="/top" element={<Community />} />
      <Route path="/about" element={<Community />} />
      <Route path="/top/:dest" element={<Community />} />
      <Route path="/top/:dest/:slug" element={<Community />} />
      <Route path="/swipe" element={<Community />} />
      <Route path="/compare-homes" element={<CompareHomes />} />
      <Route path="/guide/:country" element={<Community />} />
      <Route path="/guide" element={<Community />} />
      <Route path="/countries" element={<Community />} />
      <Route path="/countries/:pair" element={<Community />} />
      <Route path="/can-i-buy" element={<Community />} />
      <Route path="/can-i-buy/:slug" element={<Community />} />
      <Route path="/buying-costs" element={<Community />} />
      <Route path="/buying-costs/:country" element={<Community />} />
      <Route path="/leaderboard" element={<Community />} />
      <Route path="/invite" element={<Community />} />
      <Route path="/alerts" element={<Community />} />
      <Route path="/alerts/confirm" element={<Community />} />
      <Route path="/help-buying" element={<Community />} />
      <Route path="/homes/:country" element={<Community />} />
      <Route path="/homes/:country/:cap" element={<Community />} />
      <Route path="/sell" element={<Sell />} />
      <Route path="/c/:handle" element={<Community />} />
      <Route path="/b/:slug" element={<Community />} />
      <Route path="/vs/:a/:b" element={<Community />} />
      <Route path="/me" element={<Community />} />
      <Route path="/insider" element={<Community />} />
      <Route path="/new-builds" element={<Community />} />
      <Route path="/new-builds/:country" element={<Community />} />
      <Route path="/developers" element={<Community />} />
      <Route path="/claim/:code" element={<ClaimPage />} />
      <Route path="/network/admin" element={<NetworkAdmin />} />
      <Route path="/network/invoice/:id" element={<NetworkInvoice />} />
      <Route path="/network/example" element={<NetworkExample />} />
      <Route path="/network/reservation-contract" element={<ReservationContract />} />
      <Route path="/inbox" element={<Community />} />
      <Route path="/compare-new-builds" element={<Community />} />
      <Route path="/costs" element={<Community />} />
      <Route path="/new" element={<Community />} />
      <Route path="/research/prices" element={<Community />} />
      <Route path="/sitemap" element={<Community />} />
      <Route path="/costs/:slug" element={<Community />} />
      <Route path="/research/new-builds" element={<Community />} />
      <Route path="/agents" element={<Community />} />
      <Route path="/blog" element={<Community />} />
      <Route path="/blog/:slug" element={<Community />} />
      <Route path="/cheap-houses" element={<Community />} />
      <Route path="/cheap-houses/:slug" element={<Community />} />
      <Route path="/legal/cookies" element={<LegalPage page="cookies" />} />
      <Route path="/legal/takedown" element={<LegalPage page="takedown" />} />
      <Route path="/network" element={<Network />} />
      <Route path="/network/agreement" element={<NetworkAgreement />} />
      <Route path="/network/start" element={<NetworkStart />} />
      <Route path="/dev/:slug" element={<DevPublic />} />
      <Route path="/network/app" element={<NetworkApp />} />
      <Route path="/network/app/:tab" element={<NetworkApp />} />
      <Route path="/finds" element={<ToFeed />} />
      <Route path="/find-my-home" element={<Community />} />
      <Route path="/find-my-home/:city" element={<Community />} />
      <Route path="/extension" element={<Community />} />
      <Route path="/best" element={<Community />} />
      <Route path="/best/:cc/:city" element={<Community />} />
      <Route path="/ranking/:id" element={<Community />} />
      <Route path="/homes-compare/:id" element={<Community />} />
      <Route path="/extension/privacy" element={<Community />} />
      <Route path="/find/:shortcode" element={<FindToDeal />} />
      <Route path="/admin/extension" element={<AdminExtension />} />
      <Route path="/admin/activity" element={<AdminActivity />} />
      <Route path="/admin/activity/:tab" element={<AdminActivity />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg">Skip to content</a>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} storageKey="realhunt-theme">
        <AuthProvider>
          <SubscriptionProvider>
            <TooltipProvider delayDuration={300}>
              <OfflineBanner />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollKeeper />
                <Extras />
                <PageTracker>
                  <main id="main-content"><AppRoutes /></main>
                </PageTracker>
                <Suspense fallback={null}><CookieBanner /><CommunityEmailCapture /></Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

