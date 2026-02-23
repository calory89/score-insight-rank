import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const AlternativesSection = lazy(() => import("@/components/AlternativesSection"));
const GlobalRanking = lazy(() => import("@/components/GlobalRanking"));
const DiscoverPromo = lazy(() => import("@/components/DiscoverPromo"));
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
        <HowItWorks />
        <AlternativesSection />
        <GlobalRanking />
        <DiscoverPromo />
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
