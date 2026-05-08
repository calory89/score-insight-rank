import useDocumentMeta from "@/hooks/useDocumentMeta";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const IndexNew = () => {
  useDocumentMeta({
    title: "RealHunt — The Global Off-Plan Real Estate Index",
    description:
      "Every off-plan and pre-construction project on Earth, scored 1 to 10 on the same five public dimensions. Free for verified agents.",
  });

  return (
    <div className="min-h-screen bg-[#0B1426] text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-3xl text-center space-y-8">
        <p className="text-xs tracking-[0.2em] uppercase text-[#C9A961] font-semibold">
          Coming soon · The Global Off-Plan Index
        </p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight">
          Every off-plan project on Earth. Ranked.
        </h1>
        <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto">
          We're building the new RealHunt. Independent scoring. Real commissions.
          Free forever for verified agents.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/homescoring"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#C9A961] text-[#0B1426] font-semibold hover:bg-[#d4b876] transition"
          >
            Try the legacy scoring tool <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-xs text-white/40 pt-8">
          realhunt.co · The independent off-plan index
        </p>
      </div>
    </div>
  );
};

export default IndexNew;
