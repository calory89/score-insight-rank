import useDocumentMeta from "@/hooks/useDocumentMeta";
import Navbar from "@/components/Navbar";
import GlobalRanking from "@/components/GlobalRanking";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

const Rankings = () => {
  useDocumentMeta({
    title: "Top Properties Worldwide | RealHunt Rankings",
    description: "Real-time global property rankings by AI score. Compare ROI, risk, and demand across cities and countries.",
  });
  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="pt-16">
        <GlobalRanking />
      </div>
      <div className="hidden sm:block"><Footer /></div>
      <BottomNav />
    </div>
  );
};

export default Rankings;
