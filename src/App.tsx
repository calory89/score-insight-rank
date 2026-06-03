import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { AnimatePresence, motion } from "framer-motion";
import React, { Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import OnboardingWizard from "@/components/OnboardingWizard";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import OfflineBanner from "@/components/OfflineBanner";
import IndexNew from "./pages/IndexNew";
import HomeScoring from "./pages/HomeScoring";
import Apply from "./pages/Apply";
import ProjectDetail from "./pages/ProjectDetail";
import Method from "./pages/Method";
import Pricing from "./pages/Pricing";
import ForAgents from "./pages/ForAgents";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import Callback from "./pages/auth/Callback";
import Brand from "./pages/app/Brand";
import ShortLinkRedirect from "./pages/ShortLinkRedirect";

// Lazy-loaded routes for code splitting
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Analysis = React.lazy(() => import("./pages/Analysis"));
const Compare = React.lazy(() => import("./pages/Compare"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Rankings = React.lazy(() => import("./pages/Rankings"));
const Leads = React.lazy(() => import("./pages/Leads"));
const Tickets = React.lazy(() => import("./pages/Tickets"));
const Discover = React.lazy(() => import("./pages/Discover"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Game = React.lazy(() => import("./pages/Game"));
const SearchPage = React.lazy(() => import("./pages/Search"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const LegalPrivacy = React.lazy(() => import("./pages/legal/Privacy"));
const LegalTerms = React.lazy(() => import("./pages/legal/Terms"));
const Contact = React.lazy(() => import("./pages/Contact"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const InvestorQuiz = React.lazy(() => import("./pages/InvestorQuiz"));
const Portfolio = React.lazy(() => import("./pages/Portfolio"));
const MarketDirectory = React.lazy(() => import("./pages/MarketDirectory"));
const MarketPulse = React.lazy(() => import("./pages/MarketPulse"));
const Heatmap = React.lazy(() => import("./pages/Heatmap"));
const BestDealsCountry = React.lazy(() => import("./pages/BestDealsCountry"));
const MarketCity = React.lazy(() => import("./pages/MarketCity"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — avoid redundant fetches
      gcTime: 15 * 60 * 1000,         // 15 min garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const PageTracker = ({ children }: { children: React.ReactNode }) => {
  usePageTracking();
  return <>{children}</>;
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.div>
);

const SuspenseFallback = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
    <div className="relative">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
    <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
  </div>
);

const FeatureGatedOnboarding = () => {
  const { enabled } = useFeatureFlag("onboarding_tour");
  if (!enabled) return null;
  return <OnboardingWizard />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><IndexNew /></PageTransition>} />
          <Route path="/homescoring" element={<PageTransition><HomeScoring /></PageTransition>} />
          <Route path="/apply" element={<PageTransition><Apply /></PageTransition>} />
          <Route path="/projects/:slug" element={<PageTransition><ProjectDetail /></PageTransition>} />
          <Route path="/method" element={<PageTransition><Method /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/for-agents" element={<PageTransition><ForAgents /></PageTransition>} />
          <Route path="/auth/sign-in" element={<PageTransition><SignIn /></PageTransition>} />
          <Route path="/auth/sign-up" element={<PageTransition><SignUp /></PageTransition>} />
          <Route path="/auth/callback" element={<PageTransition><Callback /></PageTransition>} />
          <Route path="/auth/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/app" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/app/brand" element={<PageTransition><Brand /></PageTransition>} />
          <Route path="/s/:slug" element={<ShortLinkRedirect />} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/analysis/loading" element={<PageTransition><Analysis /></PageTransition>} />
          <Route path="/analysis/:id" element={<PageTransition><Analysis /></PageTransition>} />
          <Route path="/r/:slug" element={<PageTransition><Analysis /></PageTransition>} />
          <Route path="/compare" element={<PageTransition><Compare /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
          <Route path="/rankings" element={<PageTransition><Rankings /></PageTransition>} />
          <Route path="/leads" element={<PageTransition><Leads /></PageTransition>} />
          <Route path="/tickets" element={<PageTransition><Tickets /></PageTransition>} />
          <Route path="/discover" element={<PageTransition><Discover /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/profile/:userId" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/game" element={<PageTransition><Game /></PageTransition>} />
          <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/legal/privacy" element={<PageTransition><LegalPrivacy /></PageTransition>} />
          <Route path="/legal/terms" element={<PageTransition><LegalTerms /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/quiz" element={<PageTransition><InvestorQuiz /></PageTransition>} />
          <Route path="/portfolio" element={<PageTransition><Portfolio /></PageTransition>} />
          <Route path="/market" element={<PageTransition><MarketDirectory /></PageTransition>} />
          <Route path="/market/:country/:city" element={<PageTransition><MarketPulse /></PageTransition>} />
          <Route path="/market/:city" element={<PageTransition><MarketCity /></PageTransition>} />
          <Route path="/best-deals/:country" element={<PageTransition><BestDealsCountry /></PageTransition>} />
          <Route path="/heatmap" element={<PageTransition><Heatmap /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg">
      Skip to content
    </a>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} storageKey="realhunt-theme">
        <AuthProvider>
          <SubscriptionProvider>
          <TooltipProvider delayDuration={300}>
            <OfflineBanner />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <CommandPalette />
              <KeyboardShortcutsModal />
              <FeatureGatedOnboarding />
              <PageTracker>
                <main id="main-content">
                  <AnimatedRoutes />
                </main>
              </PageTracker>
            </BrowserRouter>
          </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
