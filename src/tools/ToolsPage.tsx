// The free calculators (/tools/..., /buying-costs/...). The page itself is the prerendered HTML written by
// seo/tools/ (what a search engine reads is what the visitor sees); this adds the sums in the browser. Loaded only
// when one of those addresses is opened.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { StaticPage } from "@/community/staticpage";

export default function ToolsPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let live = true;
    const run = () => {
      const secs = el.querySelectorAll<HTMLElement>("[data-tool]:not([data-mounted])");
      if (secs.length) import("./client").then((m) => { if (live) secs.forEach((s) => m.mount(s)); }).catch(() => { /* the prerendered result stays */ });
    };
    run();
    const mo = new MutationObserver(run);
    mo.observe(el, { childList: true, subtree: true });
    return () => { live = false; mo.disconnect(); };
  }, [pathname]);
  return <div ref={ref}><StaticPage /></div>;
}
