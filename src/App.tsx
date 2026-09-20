import { useWebVitals } from "@/hooks/useWebVitals";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
const L = (f: () => Promise<any>) => React.lazy(f);
const Home = L(() => import("./pages/Home"));
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
const Heatmap = L(() => import("./pages/Heatmap"));
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
const Finds = L(() => import("./pages/Finds"));
const AdminActivity = L(() => import("./pages/AdminActivity"));
const FindDetail = L(() => import("./pages/FindDetail"));
const CommandPalette = L(() => import("@/components/CommandPalette"));
const KeyboardShortcutsModal = L(() => import("@/components/KeyboardShortcutsModal"));
const OnboardingWizard = L(() => import("@/components/OnboardingWizard"));
const EmailCapture = L(() => import("@/components/realhunt/EmailCapture"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000, retry: 2, refetchOnWindowFocus: false } } });

const PageTracker = ({ children }: { children: React.ReactNode }) => { usePageTracking(); useReferralCapture(); useWebVitals(); return <>{children}</>; };

const SuspenseFallback = () => <div className="min-h-[60vh] bg-paper" aria-busy="true" />;

// Power-user extras load only once the browser is idle, never before the page you came for.
const Extras = () => {
  const [on, setOn] = useState(false);
  const { enabled } = useFeatureFlag("onboarding_tour");
  useEffect(() => { const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 2500)); idle(() => setOn(true)); }, []);
  if (!on) return null;
  return <Suspense fallback={null}><CommandPalette /><KeyboardShortcutsModal />{enabled && <OnboardingWizard />}</Suspense>;
};

const AppRoutes = () => (
  <Suspense fallback={<SuspenseFallback />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/score" element={<IndexNew />} />
      <Route path="/homescoring" element={<HomeScoring />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/projects/:slug" element={<ProjectDetail />} />
      <Route path="/method" element={<Method />} />
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
      <Route path="/heatmap" element={<Heatmap />} />
      <Route path="/fit" element={<Fit />} />
      <Route path="/ecobeachcity" element={<Ebc />} />
      <Route path="/lake-como" element={<Como />} />
      <Route path="/saved" element={<Saved />} />
      <Route path="/country/:country" element={<Home />} />
      <Route path="/from/:account" element={<Home />} />
      <Route path="/account" element={<Account />} />
      <Route path="/account/:tab" element={<Account />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/swipe" element={<Swipe />} />
      <Route path="/compare-homes" element={<CompareHomes />} />
      <Route path="/guide/:country" element={<Guide />} />
      <Route path="/sell" element={<Sell />} />
      <Route path="/c/:username" element={<Collection />} />
      <Route path="/legal/cookies" element={<LegalPage page="cookies" />} />
      <Route path="/legal/takedown" element={<LegalPage page="takedown" />} />
      <Route path="/network" element={<Network />} />
      <Route path="/network/agreement" element={<NetworkAgreement />} />
      <Route path="/network/app" element={<NetworkApp />} />
      <Route path="/network/app/:tab" element={<NetworkApp />} />
      <Route path="/finds" element={<Finds />} />
      <Route path="/find/:shortcode" element={<FindDetail />} />
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
                <Extras />
                <PageTracker>
                  <main id="main-content"><AppRoutes /></main>
                </PageTracker>
                <Suspense fallback={null}><EmailCapture /></Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

