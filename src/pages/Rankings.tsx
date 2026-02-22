import Navbar from "@/components/Navbar";
import GlobalRanking from "@/components/GlobalRanking";
import Footer from "@/components/Footer";

const Rankings = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <GlobalRanking />
      </div>
      <Footer />
    </div>
  );
};

export default Rankings;
