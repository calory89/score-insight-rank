import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import AlternativesSection from "@/components/AlternativesSection";
import GlobalRanking from "@/components/GlobalRanking";
import ValueProposition from "@/components/ValueProposition";
import PricingSection from "@/components/PricingSection";
import TrustSection from "@/components/TrustSection";
import APISection from "@/components/APISection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <AlternativesSection />
      <GlobalRanking />
      <ValueProposition />
      <PricingSection />
      <TrustSection />
      <APISection />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
