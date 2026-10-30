import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import LegacyBanner from "@/components/LegacyBanner";
import Index from "./Index";

const HomeScoring = () => (
  <div className="min-h-screen bg-white">
    <RHNav />
    <LegacyBanner />
    <div className="bg-white">
      <Index embedded />
    </div>
    <RHFooter />
  </div>
);

export default HomeScoring;
