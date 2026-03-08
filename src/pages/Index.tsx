import { lazy, Suspense } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const SocialProofStats = lazy(() => import("@/components/SocialProofStats"));
const MediaLogos = lazy(() => import("@/components/MediaLogos"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const ScorePreview = lazy(() => import("@/components/ScorePreview"));
const ExampleReportsCarousel = lazy(() => import("@/components/ExampleReportsCarousel"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const ValueProposition = lazy(() => import("@/components/ValueProposition"));
const AlternativesSection = lazy(() => import("@/components/AlternativesSection"));
const PricingSection = lazy(() => import("@/components/PricingSection"));
const DiscoverPromo = lazy(() => import("@/components/DiscoverPromo"));
const CommunityAskCTA = lazy(() => import("@/components/CommunityAskCTA"));
const CommunityFeedPreview = lazy(() => import("@/components/CommunityFeedPreview"));
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
        {/* Product preview sections moved from hero */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Example Report Preview</p>
            </div>
            <div className="max-w-3xl mx-auto">
              <ScorePreview />
            </div>
          </div>
        </section>
        <section className="py-12 md:py-16" id="example-reports">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Reports Searched by Real Users</p>
            </div>
            <div className="max-w-5xl mx-auto">
              <ExampleReportsCarousel />
            </div>
          </div>
        </section>
        <Testimonials />
        <ValueProposition />
        <AlternativesSection />
        <PricingSection />
        <DiscoverPromo />
        <CommunityFeedPreview />
        <CommunityAskCTA />
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
