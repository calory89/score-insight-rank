import Navbar from "@/components/Navbar";
import GlobalRanking from "@/components/GlobalRanking";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

const Rankings = () => {
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
