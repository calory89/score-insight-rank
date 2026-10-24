import useDocumentMeta from "@/hooks/useDocumentMeta";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import GlobalRanking from "@/components/GlobalRanking";
import { useSearchParams } from "react-router-dom";

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  all: {
    title: "Top Real-Estate Deals Worldwide · RealHunt Rankings",
    description:
      "Live leaderboard of the best real-estate listings worldwide, ranked by the RealHunt forensic score. Filter by country, €/m², ROI and beachfront.",
  },
  beachfront: {
    title: "Beachfront: Best value by €/m² | RealHunt",
    description:
      "True beachfront real-estate ranked by €/m². Eco Beach City leads on price-per-square-meter. Independently scored, no sponsors.",
  },
  price: {
    title: "Cheapest properties by RH score | RealHunt",
    description: "Lowest-priced properties scored by the RealHunt forensic engine.",
  },
  ppsm: {
    title: "Best €/m² deals worldwide | RealHunt",
    description: "Properties ranked by price-per-square-meter. Filter beachfront and city categories.",
  },
  roi: {
    title: "Highest projected ROI listings | RealHunt",
    description: "Properties ranked by projected 5-year ROI under our standard underwriting assumptions.",
  },
};

const Rankings = () => {
  const [params] = useSearchParams();
  const cat = (params.get("cat") || "all") as keyof typeof CATEGORY_META;
  const meta = CATEGORY_META[cat] || CATEGORY_META.all;

  useDocumentMeta({
    title: meta.title,
    description: meta.description,
    canonicalUrl: `https://realhunt.co/rankings${cat !== "all" ? `?cat=${cat}` : ""}`,
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="pt-2">
        <GlobalRanking />
      </main>
      <RHFooter />
    </div>
  );
};

export default Rankings;
