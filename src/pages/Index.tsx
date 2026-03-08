import { lazy, Suspense } from "react";
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
const APISection = lazy(() => import("@/components/APISection"));
const FinalCTA = lazy(() => import("@/components/FinalCTA"));
const Footer = lazy(() => import("@/components/Footer"));

const Index = () => {
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
        <APISection />
        <FinalCTA />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
