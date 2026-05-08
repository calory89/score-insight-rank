import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LegacyBanner = () => (
  <div className="w-full bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-100 text-xs sm:text-sm">
    <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-center flex-wrap">
      <span>This is the legacy scoring tool.</span>
      <Link
        to="/"
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline"
      >
        Visit the new RealHunt homepage <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <span className="hidden sm:inline">for the full off-plan index.</span>
    </div>
  </div>
);

export default LegacyBanner;
