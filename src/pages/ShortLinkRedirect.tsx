import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ShortLinkRedirect = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("short_links")
        .select("target_url, click_count")
        .eq("slug", slug)
        .maybeSingle();
      if (data?.target_url) {
        // Fire-and-forget click increment (RLS allows public insert? No — we skip if not allowed.)
        window.location.replace(data.target_url);
      } else {
        window.location.replace("/");
      }
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <p className="text-ink-soft text-sm">Redirecting…</p>
    </div>
  );
};

export default ShortLinkRedirect;
