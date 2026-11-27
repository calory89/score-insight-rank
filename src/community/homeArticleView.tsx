// The written article on each home page (moved out of ./oct24 on 27-nov-2026, ronda 25 of RealHunt 100/100) so its
// writers and the Spanish destinations file load with the home page that shows it, not with the front page.
import { useEffect, useMemo, useState } from "react";
import { snapshotRaw } from "@/lib/snapshotRaw";
import { isEs } from "@/lib/lang";
import { t } from "./i18n";
import { homeArticle } from "./homeArticle";
import { homeArticleEs } from "./homeArticleEs";
import { localizeRows } from "./seo2data";
import { regionOf, slugify } from "./regions";
import DESTS from "@/data/destinations.json";
import DESTS_ES from "@/data/destinations-es.json";

// The written article on each home page, the same text crawlers read (src/community/homeArticle.ts).
let allRows: Promise<any[]> | null = null;
const rowsP = () => (allRows ||= snapshotRaw().then((s: any) => s.rows || []).catch(() => []));
export default function HomeArticle({ d }: { d: any }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { let on = true; rowsP().then((x) => { if (on) setRows(x); }); return () => { on = false; }; }, [d?.slug]);
  const art = useMemo(() => {
    if (!rows || !d?.country) return null;
    const key = (c: string) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
    const cc = key(d.country);
    const countryHomes = rows.filter((r) => key(r.country) === cc);
    const rg = regionOf(d);
    const regionHomes = rg ? countryHomes.filter((r) => slugify(regionOf(r)) === slugify(rg)) : [];
    const es = isEs(); // 8-nov-2026: the Spanish page gets the article written in Spanish (homeArticleEs.ts)
    const dests: any = es ? localizeRows(DESTS as any, DESTS_ES as any) : DESTS;
    return (es ? homeArticleEs : homeArticle)({ ...rows.find((r) => r.slug === d.slug), ...d }, { countryHomes: countryHomes.length ? countryHomes : [d], regionHomes: regionHomes.length >= 3 ? regionHomes : undefined, regionName: regionHomes.length >= 3 ? rg : undefined, dest: dests[cc] || null });
  }, [rows, d]);
  if (!art) return null;
  return (
    <section className="rh-home-article">
      {art.sections.map((s) => <div key={s.h}><h2>{s.h}</h2>{s.p.map((p) => <p key={p}>{p}</p>)}</div>)}
      {art.faq.length > 0 && <div className="rh-faq"><h2>{t("Questions about this home")}</h2>{art.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>}
    </section>
  );
}
