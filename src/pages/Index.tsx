import { lazy, Suspense } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const SocialProofStats = lazy(() => import("@/components/SocialProofStats"));
const MediaLogos = lazy(() => import("@/components/MediaLogos"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const AlternativesSection = lazy(() => import("@/components/AlternativesSection"));
const GlobalRanking = lazy(() => import("@/components/GlobalRanking"));
const CommunityFeedPreview = lazy(() => import("@/components/CommunityFeedPreview"));
const CommunityAskCTA = lazy(() => import("@/components/CommunityAskCTA"));
const DiscoverPromo = lazy(() => import("@/components/DiscoverPromo"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const ValueProposition = lazy(() => import("@/components/ValueProposition"));
const PricingSection = lazy(() => import("@/components/PricingSection"));
const TrustSection = lazy(() => import("@/components/TrustSection"));
const MethodologyPreview = lazy(() => import("@/components/MethodologyPreview"));
const APISection = lazy(() => import("@/components/APISection"));
const FAQ = lazy(() => import("@/components/FAQ"));
const FinalCTA = lazy(() => import("@/components/FinalCTA"));
const Footer = lazy(() => import("@/components/Footer"));
const StickyMobileCTA = lazy(() => import("@/components/StickyMobileCTA"));
const LiveActivityToast = lazy(() => import("@/components/LiveActivityToast"));

const Index = () => {
  useDocumentMeta({
    title: "RealHunt — Paste Any Listing. Know If It's a Good Deal — Instantly.",
    description: "AI-powered real estate intelligence. Analyze risk, ROI, demand & liquidity for any property listing worldwide. 5 free analyses, no credit card required.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <SocialProofStats />
        <MediaLogos />
        <HowItWorks />
        <AlternativesSection />
        <GlobalRanking />
        <CommunityFeedPreview />
        <CommunityAskCTA />
        <DiscoverPromo />
        <Testimonials />
        <ValueProposition />
        <PricingSection />
        <TrustSection />
        <MethodologyPreview />
        <APISection />
        <FAQ />
        <FinalCTA />
        <Footer />
        <StickyMobileCTA />
        <LiveActivityToast />
      </Suspense>
    </div>
  );
};

export default Index;
