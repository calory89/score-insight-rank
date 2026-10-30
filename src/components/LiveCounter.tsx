import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache the count for the session so we don't refetch on every render.
let cached: number | null = null;

const LiveCounter = ({ className = "" }: { className?: string }) => {
  const [count, setCount] = useState<number | null>(cached);

  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    (async () => {
      const { count: c } = await supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .not("global_score", "is", null);
      if (!alive) return;
      const safe = Math.max(c || 0, 0);
      cached = safe;
      setCount(safe);
    })();
    return () => { alive = false; };
  }, []);

  if (count === null) return null;
  const rounded = count >= 1000 ? `${Math.floor(count / 100) / 10}k` : count.toLocaleString();
  return (
    <span className={className}>
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1E6B4F] mr-1.5 align-middle">
        <span className="absolute inset-0 rounded-full bg-[#1E6B4F] animate-ping opacity-60" />
      </span>
      <span className="tabular font-medium text-ink">{rounded}+</span>
      <span className="text-ink-soft"> listings scored</span>
    </span>
  );
};

export default LiveCounter;
