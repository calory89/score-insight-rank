import { lazy, Suspense } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
const MethodologyPreview = lazy(() => import("@/components/MethodologyPreview"));
const PropertyFinder = lazy(() => import("@/components/PropertyFinder"));
const FAQ = lazy(() => import("@/components/FAQ"));
const FinalCTA = lazy(() => import("@/components/FinalCTA"));
const Footer = lazy(() => import("@/components/Footer"));
const StickyMobileCTA = lazy(() => import("@/components/StickyMobileCTA"));
const LiveActivityToast = lazy(() => import("@/components/LiveActivityToast"));

const scrollToHero = () => window.scrollTo({ top: 0, behavior: "smooth" });

const Index = () => {
  useDocumentMeta({
    title: "RealHunt — Paste Any Listing. Know If It's a Good Deal — Instantly.",
    description: "AI-powered real estate intelligence. Analyze risk, ROI, demand & liquidity for any property listing worldwide. 5 free analyses, no credit card required.",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "name": "RealHunt",
            "url": "https://score-insight-rank.lovable.app",
            "logo": "https://score-insight-rank.lovable.app/images/logo.png",
            "description": "AI-powered real estate intelligence platform. Analyze risk, ROI, demand & liquidity for any property listing worldwide.",
            "sameAs": []
          },
          {
            "@type": "WebApplication",
            "name": "RealHunt",
            "url": "https://score-insight-rank.lovable.app",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "5 free analyses per month"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "120"
            }
          }
        ]
      }) }} />
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <SocialProofStats />
        <MediaLogos />
        <HowItWorks />

        {/* Game CTA Promo */}
        <section className="py-16 md:py-24 border-b border-border/30">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Think You Can Spot a Good Deal?</h2>
            <p className="text-sm text-muted-foreground mb-6">Swipe through real properties and guess: good deal or bad deal? Test your instincts and share your score.</p>
            <Button variant="hero" size="lg" onClick={() => window.location.href = "/game"}>
              Play Deal or No Deal <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Score Preview with CTA */}
        <section id="score-preview" className="py-16 md:py-24 border-b border-border/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">See What a Report Looks Like</h2>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Example Report Preview</p>
            </div>
            <div className="max-w-3xl mx-auto">
              <ScorePreview />
            </div>
            <div className="text-center mt-8">
              <Button variant="hero" size="lg" onClick={scrollToHero}>
                Try It With Your Property <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Example Reports */}
        <section className="py-16 md:py-24 border-b border-border/30" id="example-reports">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Real Reports from Real Properties</h2>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Searched by Real Users</p>
            </div>
            <div className="max-w-5xl mx-auto">
              <ExampleReportsCarousel />
            </div>
          </div>
        </section>

        <Testimonials />
        <ValueProposition />
        <AlternativesSection />
        <PropertyFinder />
        <PricingSection />
        <DiscoverPromo />
        <MethodologyPreview />
        
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
