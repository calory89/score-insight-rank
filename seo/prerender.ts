// Share previews and SEO for a single-page app.
//
// WhatsApp, X, Facebook, LinkedIn, search engines and AI crawlers do not run JavaScript, so every public page
// gets its own copy of index.html with its title, description, canonical, share card, structured data and a
// plain-HTML version of the content already in it. React replaces that content when it loads.
//
// The same list of pages builds the sitemap (dist/sitemap.xml and its parts), so a URL is in the sitemap only
// if it was prerendered and is worth indexing. Thin pages (a price band with fewer than MIN_LIST homes) still
// get a file, so the link works and shares well, but carry noindex and stay out of the sitemap.
//
// Data: src/data/deal-meta.json and public/data/rh-static.json (refreshed daily by rh-og-cards.yml and
// scripts/build_static.py), plus the blog, search, top and destination JSON files in src/data.
import path from "path";
import fs from "fs";
import { weatherShell } from "../src/pages/wx/shell";
import { DIMS, AMEN } from "../src/community/dims";
import { regionOf, slugify, HOME_TYPES } from "../src/community/regions";
import { homeArticle } from "../src/community/homeArticle";

const SITE = "https://realhunt.co";
const DEF = `${SITE}/og-home.jpg`;
const MIN_LIST = 3;
const PRICE_BANDS = [20000, 40000, 60000, 80000, 100000, 150000];

type Opts = { noindex?: boolean; lastmod?: string | null; group?: "pages" | "homes" | "places" | "content" | "top" };
type Entry = { url: string; lastmod: string | null; group: string };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
const eur = (n: number) => "€" + Math.round(n).toLocaleString("en");
const day = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const maxDay = (xs: (string | null | undefined)[]) => xs.map(day).filter(Boolean).sort().pop() || null;
// "in the Netherlands", "in the United States"
const the = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
const slugCountry = (c: string) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
const crumbs = (items: [string, string][]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
});
const navHtml = (items: [string, string][]) =>
  `<nav aria-label="Breadcrumb">${items.map(([n, u], i) => (i === items.length - 1 ? esc(n) : `<a href="${esc(u.replace(SITE, "") || "/")}">${esc(n)}</a>`)).join(" › ")}</nav>`;

export function prerenderPages() {
  let outDir = "dist";
  return {
    name: "rh-prerender-pages",
    apply: "build" as const,
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    closeBundle() {
      try { build(path.resolve(process.cwd(), outDir)); }
      catch (e) { console.warn("[rh-prerender-pages] skipped:", (e as Error).message); }
    },
  };
}

function build(root: string) {
  const indexFile = path.join(root, "index.html");
  if (!fs.existsSync(indexFile)) return;
  const html = fs.readFileSync(indexFile, "utf8");
  const entries: Entry[] = [{ url: `${SITE}/`, lastmod: null, group: "pages" }];
  const readJson = (f: string, d: any) => { const p = path.resolve(process.cwd(), f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
  const abs = (u: string) => (String(u || "").startsWith("http") ? u : SITE + u);

  const page = (url: string, title: string, desc: string, image: string, body?: string, ld?: object[], o: Opts = {}) => {
    let h = html;
    if (body) h = h.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
    if (ld?.length) h = h.replace("</head>", () => ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("") + "</head>");
    const rep = (re: RegExp, val: string) => { h = h.replace(re, () => val); };
    rep(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
    rep(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(desc)}" />`);
    rep(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(url)}" />`);
    rep(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}" />`);
    rep(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(desc)}" />`);
    rep(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(image)}" />`);
    rep(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(url)}" />`);
    rep(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(title)}" />`);
    rep(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(desc)}" />`);
    rep(/<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${esc(image)}" />`);
    if (o.noindex) rep(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="noindex, follow" />`);
    const rel = url.replace(/^https:\/\/realhunt\.co\/?/, "");
    const dir = path.join(root, rel);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), h);
    if (!o.noindex && !entries.some((e) => e.url === url)) entries.push({ url, lastmod: o.lastmod ?? null, group: o.group || "pages" });
  };

  // ---------- Homes ----------
  const deals: any[] = readJson("src/data/deal-meta.json", []);
  const snap: any = readJson("public/data/rh-static.json", { rows: [] });
  const rows: any[] = (snap.rows || []).filter((r: any) => r?.slug);
  const bySlug = new Map<string, any>(rows.map((r) => [r.slug, r]));
  const metaBySlug = new Map<string, any>(deals.map((d) => [d.slug, d]));
  const homeDay = (r: any) => maxDay([r?.verified_at, r?.approved_at, r?.publish_at]);
  const homeTitle = (r: any) => metaBySlug.get(r.slug)?.title || `${eur(r.price_eur)} · ${r.title}`;
  const homeImg = (r: any) => metaBySlug.get(r.slug)?.image || (r.image_urls?.[0] ? abs(r.image_urls[0]) : DEF);
  // Countries that are a real country. A few imports were tagged with a region ("Scandinavia"); they keep their
  // home pages but get no country page of their own.
  const REGIONS = new Set(["scandinavia"]);
  const ranked = rows.slice().sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9));
  const homeLi = (r: any) =>
    `<li><a href="/deal/${esc(r.slug)}"><strong>${esc(eur(r.price_eur))}</strong> · ${esc(r.title)}</a> · ${esc(r.location_name || r.country)}${r.nota != null ? ` · score ${esc(r.nota)}` : ""}${r.sqm ? ` · ${esc(r.sqm)} m²` : ""}${r.bedrooms ? ` · ${esc(r.bedrooms)} bed` : ""}</li>`;

  // Regions with enough homes for their own page: key "spain/granada".
  const regionHomes = new Map<string, { country: string; cc: string; name: string; slug: string; homes: any[] }>();
  for (const r of ranked) {
    const rg = regionOf(r); const cc = slugCountry(r.country);
    if (!rg || !cc || REGIONS.has(cc)) continue;
    const key = `${cc}/${slugify(rg)}`;
    if (!regionHomes.has(key)) regionHomes.set(key, { country: r.country, cc, name: rg, slug: slugify(rg), homes: [] });
    regionHomes.get(key)!.homes.push(r);
  }
  const regionPage = (r: any) => { const k = `${slugCountry(r?.country || "")}/${slugify(regionOf(r || {}))}`; const g = regionHomes.get(k); return g && g.homes.length >= MIN_LIST ? g : null; };

  // For the article on each home page (src/community/homeArticle.ts).
  const byCountry = new Map<string, any[]>();
  for (const r of ranked) { const k = slugCountry(r.country); if (k) (byCountry.get(k) || byCountry.set(k, []).get(k)!).push(r); }
  const destForArticle: Record<string, any> = readJson("src/data/destinations.json", {});
  const guidesForArticle: Record<string, any> = readJson("src/data/guides.json", {});
  for (const d of deals) {
    if (!d?.slug || !/^[A-Za-z0-9_-]+$/.test(d.slug)) continue;
    const r = bySlug.get(d.slug);
    const url = `${SITE}/deal/${d.slug}`;
    const cc = slugCountry(d.country || r?.country || "");
    const cName = d.country || r?.country || "";
    const trail: [string, string][] = [["RealHunt", SITE + "/"]];
    if (cc && !REGIONS.has(cc)) trail.push([`Homes in ${cName}`, `${SITE}/homes/${cc}`]);
    const rp = r ? regionPage(r) : null;
    if (rp) trail.push([rp.name, `${SITE}/homes/${rp.cc}/${rp.slug}`]);
    trail.push([d.title, url]);
    let body: string | undefined;
    const ld: object[] = [crumbs(trail)];
    if (r) {
      const dims = DIMS.filter(([k]) => r.dims?.[k] != null);
      const amen = AMEN.filter(([k]) => (r.amen || []).includes(k)).map(([, l]) => l);
      const near = r.nearby || {};
      const nearList = [["sea", "Sea"], ["lake", "Lake"], ["shop", "Shop"], ["train", "Train"], ["airport", "Airport"], ["hospital", "Hospital"]]
        .filter(([k]) => near[k]?.km != null).map(([k, l]) => `<li>${esc(l)}: ${esc(near[k].name || "")} · ${esc(near[k].km)} km</li>`).join("");
      const art = homeArticle(r, { countryHomes: byCountry.get(cc) || [r], regionHomes: rp?.homes, regionName: rp?.name, dest: destForArticle[cc] || null, hasGuide: !!guidesForArticle[cc] });
      const sameRegion = rp ? rp.homes.filter((x) => x.slug !== r.slug).slice(0, 6) : [];
      const similar = (sameRegion.length >= 3 ? sameRegion : ranked.filter((x) => x.slug !== r.slug && x.country === r.country).slice(0, 6));
      const bands = PRICE_BANDS.filter((p) => p >= r.price_eur).slice(0, 1);
      body = `<main class="rh-static"><article>${navHtml(trail)}<h1>${esc(r.title)}</h1>`
        + `<p><strong>${esc(eur(r.price_eur))}</strong> · ${esc(r.location_name || cName)}${r.sqm ? ` · ${esc(r.sqm)} m²` : ""}${r.bedrooms ? ` · ${esc(r.bedrooms)} bedrooms` : ""}${r.sqm && r.price_eur ? ` · ${esc(eur(r.price_eur / r.sqm))}/m²` : ""}</p>`
        + (r.image_urls?.[0] ? `<p><img src="${esc(r.image_urls[0])}" alt="${esc(r.title + ", " + (r.location_name || cName))}" width="760" loading="eager" style="max-width:100%;height:auto;border-radius:12px"></p>` : "")
        + (r.nota != null ? `<h2>RealHunt score: ${esc(r.nota)} / 98</h2><p>Every home on RealHunt passed a hand check first, so the grade starts at 70. The rest compares this home with every other home on the site. <a href="/method">How the score works</a>.</p><ul>${dims.map(([k, l, help]) => `<li>${esc(l)}: <strong>${esc(r.dims[k])}</strong>/100 · ${esc(help)}</li>`).join("")}</ul>` : "")
        + (r.why_great ? `<h2>Why it made the list</h2><p>${esc(r.why_great)}</p>` : "")
        + art.sections.map((x) => `<h2>${esc(x.h)}</h2>${x.p.map((t) => `<p>${esc(t)}</p>`).join("")}`).join("")
        + (guidesForArticle[cc] ? `<p><a href="/guide/${esc(cc)}">How to buy a home in ${esc(the(cName))}, step by step</a>${destForArticle[cc] ? ` · <a href="/costs/${esc(cc)}">Costs and taxes in ${esc(the(cName))}</a>` : ""}</p>` : "")
        + (amen.length ? `<h2>Features</h2><p>${esc(amen.join(", "))}</p>` : "")
        + (nearList ? `<h2>What is nearby</h2><ul>${nearList}</ul>` : "")
        + (art.faq.length ? `<h2>Questions about this home</h2>${art.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}` : "")
        + (r.source_domain ? `<p>Listed on ${esc(r.source_domain)}. RealHunt is not an estate agent and does not sell this home; sign in to open the original listing and contact the seller.</p>` : "")
        + (similar.length ? `<h2>More homes in ${esc(sameRegion.length >= 3 && rp ? rp.name : cName)}</h2><ul>${similar.map(homeLi).join("")}</ul>` : "")
        + (cc && !REGIONS.has(cc) ? `<p><a href="/homes/${esc(cc)}">All homes in ${esc(cName)}</a>${bands.length ? ` · <a href="/homes/${esc(cc)}/under-${bands[0]}">Homes under ${esc(eur(bands[0]))} in ${esc(cName)}</a>` : ""} · <a href="/costs">What it costs to buy abroad</a></p>` : "")
        + `</article></main>`;
      const images = (r.image_urls || []).slice(0, 6).map((u: string) => abs(u));
      if (art.faq.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: art.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
      ld.push({
        "@context": "https://schema.org", "@type": "RealEstateListing", url, name: r.title, description: r.why_great || d.desc,
        image: images, datePosted: day(r.publish_at || r.approved_at) || undefined,
        offers: { "@type": "Offer", price: r.price_eur, priceCurrency: "EUR", availability: "https://schema.org/InStock", url },
        about: {
          "@type": "SingleFamilyResidence", name: r.title,
          address: { "@type": "PostalAddress", addressLocality: r.location_name || undefined, addressCountry: cName || undefined },
          ...(r.lat != null && r.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng } } : {}),
          ...(r.sqm ? { floorSize: { "@type": "QuantitativeValue", value: r.sqm, unitCode: "MTK" } } : {}),
          ...(r.bedrooms ? { numberOfBedrooms: r.bedrooms } : {}),
          ...(amen.length ? { amenityFeature: amen.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })) } : {}),
        },
      });
    }
    page(url, `${d.title} · RealHunt`, d.desc, d.image || DEF, body, ld, { lastmod: homeDay(r), group: "homes" });
  }

  // Answers computed from the homes on the site and src/data/destinations.json, so they stay true after every update.
  const destAll: Record<string, any> = readJson("src/data/destinations.json", {});
  const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
  const countryFaq = (name: string, c: string, homes: any[]): [string, string][] => {
    if (homes.length < MIN_LIST) return [];
    const prices = homes.map((h) => h.price_eur);
    const ppsqm = homes.filter((h) => h.sqm > 0).map((h) => h.price_eur / h.sqm);
    const out: [string, string][] = [
      [`How much does a cheap house cost in ${name}?`, `On RealHunt the homes in ${name} start at ${eur(Math.min(...prices))}. The median price is ${eur(median(prices))}${ppsqm.length >= 3 ? ` and the median price per square metre is ${eur(median(ppsqm))}` : ""}, across ${homes.length} homes checked by a person.`],
      [`Which is the best-rated home in ${name} right now?`, `${homes[0].title}, in ${homes[0].location_name || name}, for ${eur(homes[0].price_eur)}, with a RealHunt score of ${homes[0].nota}. The list is updated as new homes pass our check.`],
    ];
    const d = destAll[c];
    if (d?.can_foreigners_buy) out.push([`Can foreigners buy a house in ${name}?`, String(d.can_foreigners_buy)]);
    if (d?.purchase_costs_pct) out.push([`What are the buying costs in ${name}?`, `Plan for about ${d.purchase_costs_pct}% on top of the price${d.purchase_costs_breakdown ? `: ${d.purchase_costs_breakdown}` : ""}. This is general information, not tax advice.`]);
    out.push([`Does RealHunt sell these homes?`, `No. RealHunt is not an estate agent. Every home links to its original listing, so you deal directly with the seller or agent.`]);
    return out;
  };

  // Country pages and price bands. Built from the homes themselves, with the real count in the copy.
  const countries = new Map<string, { name: string; homes: any[] }>();
  for (const r of ranked) {
    const k = slugCountry(r.country);
    if (!k) continue;
    if (!countries.has(k)) countries.set(k, { name: r.country, homes: [] });
    countries.get(k)!.homes.push(r);
  }
  // Countries that only exist in deal-meta (home not in the snapshot) still get their page, empty and noindex.
  for (const d of deals) { const k = slugCountry(d.country); if (k && !countries.has(k)) countries.set(k, { name: d.country, homes: [] }); }
  const countryLinks = [...countries.entries()].filter(([k, v]) => !REGIONS.has(k) && v.homes.length >= MIN_LIST)
    .sort((a, b) => b[1].homes.length - a[1].homes.length);
  for (const [c, { name, homes }] of countries) {
    const thin = homes.length < MIN_LIST || REGIONS.has(c);
    const top = homes.slice(0, 50);
    const url = `${SITE}/homes/${c}`;
    const trail: [string, string][] = [["RealHunt", SITE + "/"], [`Homes in ${name}`, url]];
    const cheapest = homes.length ? Math.min(...homes.map((h) => h.price_eur)) : 0;
    const desc = homes.length
      ? `${homes.length} homes for sale in ${name}, from ${eur(cheapest)}. Each one checked by a person, scored from 70 to 98 and ranked best first. New homes every day.`
      : `Homes for sale in ${name}, scored and ranked best first. New homes every day.`;
    const bandLinks = PRICE_BANDS.map((p) => [p, homes.filter((h) => h.price_eur <= p).length] as const).filter(([, n]) => n >= MIN_LIST);
    const regLinks = [...regionHomes.values()].filter((g) => g.cc === c && g.homes.length >= MIN_LIST).sort((a, b) => b.homes.length - a.homes.length);
    const typeLinks = Object.entries(HOME_TYPES).map(([k, v]) => [k, v, homes.filter((h) => h.category === v.cat)] as const).filter(([, , l]) => l.length >= MIN_LIST);
    const faq = countryFaq(name, c, homes);
    page(url, `Best homes for sale in ${name} (${homes.length}) · RealHunt`, desc, top[0] ? homeImg(top[0]) : DEF,
      `<main class="rh-static">${navHtml(trail)}<h1>Best homes for sale in ${esc(name)}</h1><p>${esc(desc)}</p>`
      + (bandLinks.length ? `<p>By price: ${bandLinks.map(([p, n]) => `<a href="/homes/${esc(c)}/under-${p}">under ${esc(eur(p))} (${n})</a>`).join(" · ")}</p>` : "")
      + (typeLinks.length && !thin ? `<p>By type: ${typeLinks.map(([k, v, l]) => `<a href="/homes/${esc(c)}/${k}">${esc(v.label)} (${l.length})</a>`).join(" · ")}</p>` : "")
      + (regLinks.length ? `<p>By region: ${regLinks.map((g) => `<a href="/homes/${esc(c)}/${esc(g.slug)}">${esc(g.name)} (${g.homes.length})</a>`).join(" · ")}</p>` : "")
      + `<ol>${top.map(homeLi).join("")}</ol>`
      + (faq.length ? `<h2>Questions about buying in ${esc(name)}</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}` : "")
      + `<h2>Other countries</h2><p>${countryLinks.filter(([k]) => k !== c).map(([k, v]) => `<a href="/homes/${esc(k)}">${esc(v.name)} (${v.homes.length})</a>`).join(" · ")}</p></main>`,
      [crumbs(trail), { "@context": "https://schema.org", "@type": "ItemList", name: `Best homes for sale in ${name}`, numberOfItems: homes.length,
        itemListElement: top.map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${h.slug}`, name: h.title })) },
       ...(faq.length && !thin ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] : [])],
      { noindex: thin, lastmod: maxDay(homes.map(homeDay)), group: "places" });
    for (const p of PRICE_BANDS) {
      const list = homes.filter((h) => h.price_eur <= p);
      const bUrl = `${url}/under-${p}`;
      const bTrail: [string, string][] = [...trail, [`Under ${eur(p)}`, bUrl]];
      const bDesc = list.length
        ? `${list.length} homes for sale under ${eur(p)} in ${name}, checked by a person, scored from 70 to 98 and ranked best first.`
        : `Homes for sale under ${eur(p)} in ${name}, scored and ranked best first. None right now: see all homes in ${name} or set an alert.`;
      page(bUrl, `Homes under ${eur(p)} in ${name}${list.length ? ` (${list.length})` : ""} · RealHunt`, bDesc, list[0] ? homeImg(list[0]) : DEF,
        `<main class="rh-static">${navHtml(bTrail)}<h1>Homes under ${esc(eur(p))} in ${esc(name)}</h1><p>${esc(bDesc)}</p>`
        + (list.length ? `<ol>${list.slice(0, 50).map(homeLi).join("")}</ol>` : `<p><a href="/homes/${esc(c)}">All homes in ${esc(name)}</a> · <a href="/alerts">Get an alert when one appears</a></p>`)
        + `</main>`,
        [crumbs(bTrail), ...(list.length ? [{ "@context": "https://schema.org", "@type": "ItemList", name: `Homes under ${eur(p)} in ${name}`, numberOfItems: list.length,
          itemListElement: list.slice(0, 50).map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${h.slug}`, name: h.title })) }] : [])],
        { noindex: thin || list.length < MIN_LIST, lastmod: maxDay(list.map(homeDay)), group: "places" });
    }
  }

  // ---------- Home-type pages: /homes/{country}/by-the-sea, /village-houses, /in-town ----------
  for (const [c, { name, homes }] of countries) {
    if (REGIONS.has(c)) continue;
    for (const [k, v] of Object.entries(HOME_TYPES)) {
      const list = homes.filter((h) => h.category === v.cat);
      if (list.length < MIN_LIST) continue;
      const url = `${SITE}/homes/${c}/${k}`;
      const trail: [string, string][] = [["RealHunt", SITE + "/"], [`Homes in ${name}`, `${SITE}/homes/${c}`], [v.label, url]];
      const pr = list.map((h) => h.price_eur);
      const desc = `${list.length} ${v.h1(the(name)).replace(/^Homes |^Village houses for sale /, (m) => m.toLowerCase())}, from ${eur(Math.min(...pr))}. Checked by a person, scored from 70 to 98 and ranked best first.`;
      const others = Object.entries(HOME_TYPES).filter(([k2, v2]) => k2 !== k && homes.filter((h) => h.category === v2.cat).length >= MIN_LIST);
      page(url, `${v.h1(the(name))} (${list.length}) · RealHunt`, desc, homeImg(list[0]),
        `<main class="rh-static">${navHtml(trail)}<h1>${esc(v.h1(the(name)))}</h1><p>${esc(desc)}</p><p>Median price ${esc(eur(median(pr)))}.</p>`
        + `<ol>${list.slice(0, 50).map(homeLi).join("")}</ol>`
        + `<p><a href="/homes/${esc(c)}">All ${homes.length} homes in ${esc(the(name))}</a>${others.map(([k2, v2]) => ` · <a href="/homes/${esc(c)}/${k2}">${esc(v2.h1(the(name)))}</a>`).join("")} · <a href="/alerts?country=${encodeURIComponent(name)}">Get new homes in ${esc(the(name))} by email</a></p></main>`,
        [crumbs(trail), { "@context": "https://schema.org", "@type": "ItemList", name: v.h1(the(name)), numberOfItems: list.length,
          itemListElement: list.slice(0, 50).map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${h.slug}`, name: h.title })) }],
        { lastmod: maxDay(list.map(homeDay)), group: "places" });
    }
  }

  // ---------- Region pages: /homes/{country}/{region} ----------
  for (const g of regionHomes.values()) {
    if (g.homes.length < MIN_LIST) continue;
    const url = `${SITE}/homes/${g.cc}/${g.slug}`;
    const place = `${g.name}, ${g.country}`;
    const trail: [string, string][] = [["RealHunt", SITE + "/"], [`Homes in ${g.country}`, `${SITE}/homes/${g.cc}`], [g.name, url]];
    const prices = g.homes.map((h) => h.price_eur);
    const desc = `${g.homes.length} homes for sale in ${place}, from ${eur(Math.min(...prices))}. Checked by a person, scored from 70 to 98 and ranked best first.`;
    const towns = [...new Set(g.homes.map((h) => String(h.location_name || "").split(",")[0].trim()).filter(Boolean))].slice(0, 12);
    page(url, `Homes for sale in ${place} (${g.homes.length}) · RealHunt`, desc, homeImg(g.homes[0]),
      `<main class="rh-static">${navHtml(trail)}<h1>Homes for sale in ${esc(place)}</h1><p>${esc(desc)}</p>`
      + `<p>Median price ${esc(eur(median(prices)))}${towns.length ? `. Towns: ${esc(towns.join(", "))}` : ""}.</p>`
      + `<ol>${g.homes.slice(0, 50).map(homeLi).join("")}</ol>`
      + `<p><a href="/homes/${esc(g.cc)}">All homes in ${esc(g.country)}</a> · <a href="/alerts?country=${encodeURIComponent(g.country)}">Get new homes in ${esc(g.country)} by email</a> · <a href="/method">How the score works</a></p></main>`,
      [crumbs(trail), { "@context": "https://schema.org", "@type": "ItemList", name: `Homes for sale in ${place}`, numberOfItems: g.homes.length,
        itemListElement: g.homes.slice(0, 50).map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${h.slug}`, name: h.title })) }],
      { lastmod: maxDay(g.homes.map(homeDay)), group: "places" });
  }

  // ---------- New homes (/new) and RSS feed (/feed.xml): the newest 40 homes, refreshed on every build ----------
  const newest = rows.filter((r) => r.publish_at || r.approved_at).slice().sort((a, b) => String(b.publish_at || b.approved_at).localeCompare(String(a.publish_at || a.approved_at))).slice(0, 40);
  page(`${SITE}/new`, "New homes on RealHunt, newest first", `The ${newest.length} newest homes to pass our check, newest first, with price, size and score. Also as an RSS feed.`, newest[0] ? homeImg(newest[0]) : DEF,
    `<main class="rh-static" data-rh-keep data-rh-static>${navHtml([["RealHunt", SITE + "/"], ["New homes", SITE + "/new"]])}<h1>New homes, newest first</h1><p>The newest homes to pass our check. Follow them in any feed reader: <a href="/feed.xml">RSS feed</a>, or <a href="/alerts">get them by email</a>.</p>`
    + `<ol>${newest.map((r) => homeLi(r).replace("</li>", ` · added ${esc(day(r.publish_at || r.approved_at) || "")}</li>`)).join("")}</ol></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["New homes", SITE + "/new"]])], { lastmod: maxDay(newest.map(homeDay)), group: "pages" });
  const rssDate = (s: string) => new Date(s).toUTCString();
  fs.writeFileSync(path.join(root, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>RealHunt: new homes</title><link>${SITE}/new</link><atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/><description>New homes on RealHunt, checked by a person and scored from 70 to 98.</description><language>en</language>`
    + newest.map((r) => { const u = `${SITE}/deal/${r.slug}`; const img = r.image_urls?.[0] ? abs(r.image_urls[0]) : ""; return `<item><title>${esc(`${eur(r.price_eur)} · ${r.title}`)}</title><link>${u}</link><guid isPermaLink="true">${u}</guid><pubDate>${rssDate(r.publish_at || r.approved_at)}</pubDate><description>${esc(`${r.location_name || r.country}. ${r.sqm ? r.sqm + " m². " : ""}RealHunt score ${r.nota ?? ""}. ${r.why_great || ""}`)}</description>${img ? `<enclosure url="${esc(img)}" type="image/${img.endsWith(".webp") ? "webp" : "jpeg"}" length="0"/>` : ""}</item>`; }).join("")
    + `</channel></rss>\n`);

  // ---------- Price report (/research/prices): by country, from the homes on the site ----------
  const priceRows = countryLinks.map(([k, v]) => {
    const pr = v.homes.map((h) => h.price_eur); const pm = v.homes.filter((h) => h.sqm > 0).map((h) => h.price_eur / h.sqm);
    return { k, name: v.name, n: v.homes.length, min: Math.min(...pr), med: median(pr), ppsqm: median(pm), score: median(v.homes.map((h) => h.nota || 0)) };
  }).sort((a, b) => a.ppsqm - b.ppsqm);
  const today = new Date().toISOString().slice(0, 10);
  page(`${SITE}/research/prices`, `What a cheap home costs, country by country (${today.slice(0, 7)}) · RealHunt`, `Median price, price per m² and cheapest home in ${priceRows.length} countries, from ${rows.length} homes checked by a person. Updated with every new home. Free to quote with a link.`, DEF,
    `<main class="rh-static" data-rh-keep data-rh-static>${navHtml([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"], ["Prices by country", SITE + "/research/prices"]])}<h1>What a cheap home costs, country by country</h1>`
    + `<p>From the ${rows.length} homes on RealHunt, each checked by a person. Sorted by median price per square metre, cheapest first. Updated ${today}. Free to quote with a link to this page.</p>`
    + `<div style="overflow-x:auto"><table><thead><tr><th>Country</th><th>Homes</th><th>Median €/m²</th><th>Median price</th><th>Cheapest</th><th>Median score</th></tr></thead><tbody>`
    + priceRows.map((x) => `<tr><td><a href="/homes/${esc(x.k)}">${esc(x.name)}</a></td><td>${x.n}</td><td>${x.ppsqm ? esc(eur(x.ppsqm)) : "n/a"}</td><td>${esc(eur(x.med))}</td><td>${esc(eur(x.min))}</td><td>${x.score}</td></tr>`).join("")
    + `</tbody></table></div><p>Prices are asking prices in euros on the day each home was added. They describe the homes on RealHunt, not every home in each country. <a href="/method">How homes are chosen and scored</a>.</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"], ["Prices by country", SITE + "/research/prices"]]),
     { "@context": "https://schema.org", "@type": "Dataset", name: "Cheap home prices by country on RealHunt", description: "Median asking price, median price per m² and cheapest home per country, from homes checked by a person.", url: `${SITE}/research/prices`, dateModified: today, creator: { "@type": "Organization", name: "RealHunt", url: SITE + "/" }, license: "https://creativecommons.org/licenses/by/4.0/", variableMeasured: ["median price (EUR)", "median price per m² (EUR)", "cheapest price (EUR)"] }],
    { lastmod: today, group: "content" });

  // ---------- Score method (the 70–98 home score) ----------
  page(`${SITE}/method`, "How the RealHunt score works: 11 sub-scores, graded 70 to 98 · RealHunt",
    "Every home is checked by a person, then graded from 70 to 98 against every other home on RealHunt using 11 sub-scores: price, price per m², space, condition, extras, water, weather, airport, buying costs, listing detail and buyer interest.",
    DEF,
    `<main class="rh-static">${navHtml([["RealHunt", SITE + "/"], ["How the score works", SITE + "/method"]])}<h1>How the RealHunt score works</h1>`
    + `<p>A person looks at every home before it goes up. Homes that need major work, ruins, bare land and listings with one photo are turned down. That is why the grade starts at 70: a home on RealHunt has already passed.</p>`
    + `<p>The grade then compares the home with every other home on the site, from 70 to 98. The home pages, the country pages and the front page are all ordered by this grade, best first. Votes and saves only move the buyer-interest sub-score; nobody pays to rank higher.</p>`
    + `<h2>The 11 sub-scores (0 to 100)</h2><ul>${DIMS.map(([, l, h]) => `<li><strong>${esc(l)}</strong>: ${esc(h)}</li>`).join("")}</ul>`
    + `<h2>What the score is not</h2><p>It is not a survey or a valuation. Photos can flatter and listings go out of date. Before you buy anything, get an independent inspection and a local lawyer or notary. If a home is sold or wrong, use the report button on its page.</p>`
    + `<p><a href="/blog/how-we-choose-homes">Why we say no to most cheap houses</a> · <a href="/top/how-we-rank">How the new-build Top 100 is ranked</a> · <a href="/about">Who runs RealHunt</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["How the score works", SITE + "/method"]])]);

  // ---------- Guides, tools and info pages ----------
  // (Buying guides are built further down, with the cost pages and the country comparisons.)
  page(`${SITE}/extension`, "RealHunt Score: see the real score of any home · Free Chrome extension", "Free Chrome extension. Every home on idealista, Zillow and Rightmove gets a 0–100 score: price against the area, listing quality and red flags, with the reason for every point.", DEF);
  page(`${SITE}/extension/privacy`, "RealHunt Score · Privacy policy", "What the RealHunt Score extension collects, why, and how to delete it.", DEF);
  page(`${SITE}/find-my-home`, "We find your home, where you want, at your price · RealHunt", "Free home finder. Tell us where and how much, and we send you the best real homes, checked by a person. Skip the queue by inviting friends.", DEF);
  for (const c of ["madrid", "barcelona", "valencia", "malaga", "sevilla", "lisbon", "porto", "paris", "london", "rome", "milan", "berlin"]) page(`${SITE}/find-my-home/${c}`, `We find you a home in ${cap(c)} · RealHunt`, `Tell us your budget and we find you a real home in or near ${cap(c)}, checked by a person. Free.`, DEF);
  page(`${SITE}/map`, "Map of the best homes · RealHunt", `Every home on RealHunt on one map: ${rows.length} homes in ${countryLinks.length} countries, each with its score.`, DEF,
    `<main class="rh-static"><h1>Map of the best homes</h1><p>${rows.length} homes by country:</p><ul>${countryLinks.map(([k, v]) => `<li><a href="/homes/${esc(k)}">${esc(v.name)}</a> (${v.homes.length})</li>`).join("")}</ul></main>`);
  page(`${SITE}/swipe`, "Swipe the best homes · RealHunt", "Swipe through the best-scored homes and save the ones you love.", DEF);
  page(`${SITE}/leaderboard`, "Top hunters · RealHunt", "The people who find the best homes.", DEF);
  page(`${SITE}/alerts`, "New-home alerts by email · RealHunt", "Pick a country and a budget and get the best new homes by email as soon as they pass our check. Free, one-click unsubscribe.", DEF,
    `<main class="rh-static"><h1>Get the best new homes by email</h1><p>Pick a country and a budget. When a home passes our check and fits, you get it by email. Free, and every email has a one-click unsubscribe.</p><p>Popular: ${countryLinks.slice(0, 8).map(([k, v]) => `<a href="/homes/${esc(k)}">${esc(v.name)}</a>`).join(" · ")}</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Alerts", SITE + "/alerts"]])]);
  page(`${SITE}/winners`, "Winners: the best homes each week · RealHunt", "The homes that topped RealHunt each week, with their price and score.", DEF);
  page(`${SITE}/best`, "The best homes on RealHunt, by country · RealHunt", "The top-scored homes in each country on RealHunt, checked by a person and ranked best first.", DEF,
    `<main class="rh-static"><h1>The best homes, by country</h1><ul>${countryLinks.map(([k, v]) => `<li><a href="/homes/${esc(k)}">Best homes in ${esc(v.name)}</a>: ${v.homes[0] ? `${esc(v.homes[0].title)}, ${esc(eur(v.homes[0].price_eur))}` : ""}</li>`).join("")}</ul></main>`);
  page(`${SITE}/help-buying`, "Help buying a home abroad · RealHunt", "Local lawyers, translators, surveys and tax numbers for buying a house in another country.", DEF);
  page(`${SITE}/insider`, "RealHunt Insider · The secret Top 5 of the week", "Invite 3 friends and unlock the secret weekly Top 5: the homes furthest below their country's typical price. Free.", DEF);
  page(`${SITE}/contact`, "Contact RealHunt", "Write to the RealHunt team about a home, a listing, a partnership or press.", DEF,
    `<main class="rh-static"><h1>Contact RealHunt</h1><p>Email: <!--email_off-->hello@realhunt.co<!--/email_off--></p><p>RealHunt is run by Equinox Investment Group LLC. <a href="/about">About us</a>.</p></main>`);
  for (const [k, n] of [["privacy", "Privacy policy"], ["terms", "Terms of use"], ["cookies", "Cookie policy"], ["takedown", "Listing and photo takedown requests"]] as const)
    page(`${SITE}/legal/${k}`, `${n} · RealHunt`, `${n} for RealHunt (realhunt.co), run by Equinox Investment Group LLC.`, DEF, undefined, [crumbs([["RealHunt", SITE + "/"], [n, `${SITE}/legal/${k}`]])]);

  // ---------- Research blog ----------
  const posts: any[] = readJson("src/data/blog.json", []);
  const card = (p: any) => `<li><a href="/blog/${esc(p.slug)}"><strong>${esc(p.title)}</strong></a> <span>${esc(p.desc)}</span></li>`;
  page(`${SITE}/blog`, "RealHunt Research · Data on cheap homes around the world", "Original data and plain-English guides on affordable homes: prices by country, buying rules, rent vs buy.", posts[0] ? abs(posts[0].image) : DEF,
    `<main class="rh-static"><h1>RealHunt Research</h1><p>Studies and guides built from the homes on RealHunt.</p><ul>${posts.map(card).join("")}</ul></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"]])], { lastmod: maxDay(posts.map((p) => p.date)), group: "content" });
  for (const p of posts) {
    if (!/^[a-z0-9-]+$/.test(p.slug)) continue;
    const url = `${SITE}/blog/${p.slug}`;
    page(url, `${p.title} · RealHunt`, p.desc, abs(p.image),
      `<main class="rh-static"><article><nav><a href="/">RealHunt</a> › <a href="/blog">Research</a></nav><h1>${esc(p.title)}</h1><p>${esc(p.desc)}</p><p>${esc(p.author)} · <time datetime="${esc(p.date)}">${esc(p.date)}</time></p>${p.html}</article><h2>More</h2><ul>${posts.filter((x) => x.slug !== p.slug).map(card).join("")}</ul></main>`,
      [{ "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.desc, image: [abs(p.image)], datePublished: p.date, dateModified: p.updated || p.date, mainEntityOfPage: url,
         author: { "@type": "Organization", name: p.author, url: SITE + "/blog" }, publisher: { "@type": "Organization", name: "RealHunt", logo: { "@type": "ImageObject", url: SITE + "/apple-touch-icon.png" } } },
       crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"], [p.title, url]])],
      { lastmod: day(p.updated || p.date), group: "content" });
  }

  // ---------- Cheap houses by what you want ----------
  const sp: any = readJson("src/data/search-pages.json", { pages: [], homes: {} });
  const st: Record<string, string> = readJson("src/data/search-static.json", {});
  page(`${SITE}/cheap-houses`, "Cheap houses for sale by what you want · RealHunt", "Cheap houses by the sea, near a lake, with a sauna, cabins, stone houses and homes under €30,000 or €50,000. Real listings, checked by people.", DEF, st.__index__,
    [crumbs([["RealHunt", SITE + "/"], ["Cheap houses", SITE + "/cheap-houses"]])], { group: "content" });
  for (const p of sp.pages || []) {
    if (!/^[a-z0-9-]+$/.test(p.slug)) continue;
    const url = `${SITE}/cheap-houses/${p.slug}`;
    const first = sp.homes?.[p.homes?.[0]];
    page(url, p.title, p.desc, first ? abs(first.img) : DEF, st[p.slug],
      [crumbs([["RealHunt", SITE + "/"], ["Cheap houses", SITE + "/cheap-houses"], [p.h1, url]]),
       { "@context": "https://schema.org", "@type": "ItemList", name: p.h1, numberOfItems: p.count,
         itemListElement: (p.homes || []).slice(0, 30).map((s: string, i: number) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${s}`, name: sp.homes?.[s]?.t })) },
       ...((p.faq || []).length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: (p.faq || []).map(([q, a]: [string, string]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] : [])],
      { noindex: (p.count ?? (p.homes || []).length) < MIN_LIST, lastmod: maxDay((p.homes || []).map((s: string) => homeDay(bySlug.get(s)))), group: "content" });
  }

  // ---------- New builds: Top 100 by destination ----------
  const TOPS: [string, string, number][] = [["bali", "Bali", 502], ["phuket", "Phuket", 468], ["tulum", "Tulum", 425], ["batumi", "Batumi", 563], ["samui", "Koh Samui", 89]];
  page(`${SITE}/top`, "Top 100 new builds by destination: Bali, Phuket, Tulum, Batumi, Koh Samui · RealHunt", "The best new-build projects in Bali, Phuket, Tulum, Batumi and Koh Samui, ranked by price, area and build stage, then by buyers.", `${SITE}/top/bali/og.jpg`,
    `<main class="rh-static"><h1>Top 100 new builds by destination</h1><p>New-build projects for investors and future residents, ranked separately from the resale homes on RealHunt.</p><ul>${TOPS.map(([k, n]) => `<li><a href="/top/${k}">Top new builds in ${n}</a></li>`).join("")}</ul><p><a href="/top/how-we-rank">How we rank</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Top 100 rankings", SITE + "/top"]])], { group: "top" });
  page(`${SITE}/top/how-we-rank`, "How we rank the Top 100 · RealHunt", "The exact formula behind the RealHunt Top 100 rankings, our sources and review dates, and how we make money. Nobody pays to be listed or to rank higher.", `${SITE}/top/bali/og.jpg`,
    `<main class="rh-static"><h1>How we rank</h1><p>Nobody pays to be listed or to rank higher.</p><p>Every project gets 10 scores from 0 to 100: price, value per m², location, beach, facilities, delivery, developer, space, visitor interest and listing detail. The grade is the plain average of the 10, and the ranking orders projects by it. Votes, saves and questions raise visitor interest. A verified developer gets 100 in listing detail.</p><p>Buyers pay nothing. Developers pay nothing to be listed, verify or rank. RealHunt earns 5% from the developer only if a buyer it introduced buys.</p><p>Resale homes use a different score: <a href="/method">how the home score works</a>.</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Top 100 rankings", SITE + "/top"], ["How we rank", SITE + "/top/how-we-rank"]])], { group: "top" });
  for (const [k, n, checked] of TOPS) {
    const list: any[] = readJson(`src/data/top-${k}.json`, []);
    if (!list.length) continue;
    const tUrl = `${SITE}/top/${k}`;
    const TN = list.length < 100 ? `Top ${list.length}` : "Top 100";
    page(tUrl, `${TN} new builds in ${n}, ranked by buyers · RealHunt`, `The ${list.length} best new-build villas and apartments in ${n}, from ${checked} projects checked. Ranked by price, area and build stage, then by what buyers vote, save and ask about.`, `${tUrl}/og.jpg`,
      `<main class="rh-static"><h1>${TN} new builds in ${esc(n)}</h1><p>Ranked by demand: base score from price, price per m², area and build stage, then buyer votes, saves and questions.</p><ol>${list.map((t) => `<li><a href="/top/${k}/${esc(t.slug)}">${esc(t.name)}</a>, ${esc(t.locality)}, from €${Number(t.price_eur).toLocaleString("en")} (${esc(t.developer)})</li>`).join("")}</ol></main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Top 100 rankings", SITE + "/top"], [`${n} ${TN}`, tUrl]]),
       { "@context": "https://schema.org", "@type": "ItemList", name: `${TN} new builds in ${n}`, numberOfItems: list.length, itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${tUrl}/${t.slug}`, name: t.name })) }],
      { group: "top" });
    for (const t of list) {
      if (!/^[a-z0-9-]+$/.test(t.slug)) continue;
      const u = `${tUrl}/${t.slug}`;
      page(u, `${t.name}, ${t.locality}: ${n} ${TN} · RealHunt`, `${t.blurb} Ranked in the ${n} ${TN} new builds by RealHunt buyers.`, `${u}-og.jpg`,
        `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/top/${k}">${esc(n)} ${TN}</a></nav><h1>${esc(t.name)}</h1><p>${esc(t.locality)} · from €${Number(t.price_eur).toLocaleString("en")} · ${esc(t.developer)}</p><p>${esc(t.blurb)}</p><p><a href="/top/${k}">See the full ${esc(n)} ${TN}</a> · <a href="/top/how-we-rank">How we rank</a></p></main>`,
        [crumbs([["RealHunt", SITE + "/"], [`${n} ${TN}`, tUrl], [t.name, u]])], { group: "top" });
    }
  }
  page(`${SITE}/about`, "About RealHunt: who we are and how we work", "Who runs RealHunt, the company behind it, how we make money and what you should know about our founder before you trust us.", DEF,
    `<main class="rh-static"><h1>Who we are</h1><p>RealHunt is run by Equinox Investment Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, United States. Founder: Carlos de Ory Gordillo. Contact: <!--email_off-->hello@realhunt.co<!--/email_off-->.</p><h2>How RealHunt makes money</h2><p>Buyers pay nothing. Resale homes are not for sale through RealHunt: we link to the original listing. On new builds, RealHunt earns a fee from the developer only if a buyer it introduced buys. Nobody pays to be listed or to rank higher, and sponsored cards are marked as sponsored.</p><p><a href="/method">How the score works</a> · <a href="/contact">Contact</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["About", SITE + "/about"]]),
     { "@context": "https://schema.org", "@type": "Organization", name: "RealHunt", url: SITE + "/", logo: SITE + "/apple-touch-icon.png", email: "hello@realhunt.co",
       parentOrganization: { "@type": "Organization", name: "Equinox Investment Group LLC", address: { "@type": "PostalAddress", streetAddress: "30 N Gould St Ste N", addressLocality: "Sheridan", addressRegion: "WY", postalCode: "82801", addressCountry: "US" } } }]);
  // 30-oct-2026: the Eco Beach City card is shared too; give its page its own title and picture.
  page(`${SITE}/ecobeachcity`, "€36,500 furnished cabin and plot · Sumba, Indonesia · RealHunt", "A furnished cabin on your own plot in Eco Beach City, a new beachfront eco village in Sumba, one hour from Bali. Cabin, plot and furniture for €36,500, payable in instalments.", `${SITE}/images/ebc/ebc-card.jpg`);
  page(`${SITE}/weather`, "Best places to live with good weather all year, and good homes there · RealHunt", "Compare places by good-weather days, mild winters, clean air, safety, the sea and the airport, then see the homes that score 80+ there. Mediterranean, Canaries, Mexico, Bali, Sumba and more.", `${SITE}/weather/og.jpg`,
    weatherShell(), [crumbs([["RealHunt", SITE + "/"], ["Weather", SITE + "/weather"]])]);
  page(`${SITE}/new-builds`, "New-build homes under €100,000 · RealHunt", "New-build projects with units under €100,000, payment plans and verified developers. Ask the developer directly.", DEF, undefined, undefined, { group: "top" });
  for (const [c, n] of [["indonesia", "Indonesia"], ["mexico", "Mexico"], ["albania", "Albania"], ["spain", "Spain"], ["portugal", "Portugal"], ["thailand", "Thailand"], ["turkey", "Turkey"], ["montenegro", "Montenegro"]]) page(`${SITE}/new-builds/${c}`, `New builds under €100,000 in ${n} · RealHunt`, `New-build projects in ${n} with units under €100,000, payment plans and verified developers. Ask the developer directly.`, DEF, undefined, undefined, { group: "top" });
  page(`${SITE}/developers`, "Developer ranking · RealHunt", "Developers ranked by sales, buyer ratings and how fast they answer buyers on RealHunt.", DEF, undefined, undefined, { group: "top" });

  // ---------- For developers and agents ----------
  page(`${SITE}/network`, "RealHunt Network · Free buyers for your new-build project", "List a new-build project on RealHunt for free and get qualified buyers. You pay 5% only if a buyer we introduced buys.", DEF,
    `<main class="rh-static"><h1>Free buyers for your new-build project</h1><p>List your project for free. Buyers ask you directly through RealHunt. You pay 5% only if a buyer we introduced buys.</p><p><a href="/network/start">List your project</a> · <a href="/network/example">See an example listing</a> · <a href="/network/reservation-contract">Free reservation contract</a> · <a href="/agents">For local agents</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Network", SITE + "/network"]])]);
  page(`${SITE}/network/start`, "List your project free · RealHunt Network", "Paste your project link and we build your listing in seconds. Buyers for your project, 5% only if one buys. Earn 3% from leads you could not sell to.", DEF);
  page(`${SITE}/network/agreement`, "Network agreement · RealHunt", "The agreement between RealHunt and developers listing on the RealHunt Network: fees, leads and payment.", DEF);

  // ---------- Buying guides, real costs and country comparisons ----------
  // Steps per country: src/data/guides.json. Money side (costs, taxes, rules, sources): src/data/destinations.json.
  // The app shows the same pages (src/community/extras.tsx GuidePage, v10.tsx CostsPage, countries.tsx).
  const dest: Record<string, any> = readJson("src/data/destinations.json", {});
  const guides: Record<string, { name: string; steps: [string, string][]; yearly: string }> = readJson("src/data/guides.json", {});
  const DN: Record<string, string> = { bali: "Bali", lombok: "Lombok", albania: "Albania", mexico: "Mexico", spain: "Spain", montenegro: "Montenegro", georgia: "Georgia", "northern-cyprus": "Northern Cyprus", vietnam: "Vietnam", italy: "Italy", portugal: "Portugal", bulgaria: "Bulgaria" };
  for (const k of Object.keys(guides)) DN[k] ||= guides[k].name;
  const costKeys = Object.keys(dest).filter((k) => k !== "_meta" && DN[k]).sort((a, b) => DN[a].localeCompare(DN[b]));
  const dl = (d: any) => [["Can foreigners buy?", d.can_foreigners_buy], ["Costs on top of the price", d.purchase_costs_pct ? `${d.purchase_costs_pct}% · ${d.purchase_costs_breakdown || ""}` : null], ["Yearly property tax", d.annual_property_tax], ["Tax on rental income", d.rental_income_tax], ["Holiday-rental yield", d.holiday_rental_gross_yield_pct ? `${d.holiday_rental_gross_yield_pct}% gross` : null], ["What holiday rentals earn", d.holiday_rental_yield_note], ["Long-term rent yield", d.long_term_gross_yield_pct ? `${d.long_term_gross_yield_pct}% gross` : null], ["Holiday-rental rules", d.holiday_rental_rules]].filter((r) => r[1]).map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("");
  const srcList = (d: any) => (d?.sources || []).map((u: string) => `<li><a href="${esc(u)}" rel="nofollow noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, ""))}</a></li>`).join("");
  const homesOf = (k: string) => countries.get(k)?.homes || [];
  const cmpKeys = Object.keys(guides).filter((k) => dest[k] && homesOf(k).length >= MIN_LIST).sort((a, b) => homesOf(b).length - homesOf(a).length);
  const pairUrl = (a: string, b: string) => `/countries/${[a, b].sort().join("-vs-")}`;
  const faqLd = (qa: [string, string][]) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

  page(`${SITE}/costs`, "What it really costs to buy a cheap home abroad · RealHunt", `Buying costs, property tax and tax on rent in ${costKeys.length} countries, from Spain and Italy to Denmark, Japan and Mexico. With sources.`, DEF,
    `<main class="rh-static"><nav><a href="/">RealHunt</a> › Real costs</nav><h1>What it really costs to buy abroad</h1><ul>${costKeys.map((k) => `<li><a href="/costs/${k}">${esc(DN[k])}</a>: ${esc(dest[k].purchase_costs_pct || "?")}% on top of the price</li>`).join("")}</ul><p><a href="/guide">Buying guides by country</a> · <a href="/countries">Compare two countries</a></p><p>Not legal or tax advice. Check with a local lawyer before you buy.</p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Real costs", SITE + "/costs"]])], { group: "content" });
  for (const k of costKeys) {
    const homesHere = homesOf(k);
    page(`${SITE}/costs/${k}`, `Buying a home in ${the(DN[k])}: real costs, taxes and rental yield · RealHunt`, `What you pay on top of the price in ${the(DN[k])}${dest[k].purchase_costs_pct ? ` (about ${dest[k].purchase_costs_pct}%)` : ""}, yearly property tax and tax on rental income. With sources.`, DEF,
      `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/costs">Real costs</a></nav><h1>Buying a home in ${esc(the(DN[k]))}: what it really costs</h1><dl>${dl(dest[k])}</dl>`
      + `<h2>Sources</h2><ul>${srcList(dest[k])}</ul>`
      + (homesHere.length >= MIN_LIST ? `<h2>Homes in ${esc(the(DN[k]))}</h2><ol>${homesHere.slice(0, 10).map(homeLi).join("")}</ol><p><a href="/homes/${esc(k)}">All ${homesHere.length} homes in ${esc(the(DN[k]))}</a></p>` : "")
      + (guides[k] ? `<p><a href="/guide/${k}">How to buy a home in ${esc(the(DN[k]))}, step by step</a></p>` : "")
      + `<p>Not legal or tax advice. Check with a local lawyer before you buy.</p></main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Real costs", SITE + "/costs"], [DN[k], `${SITE}/costs/${k}`]])], { lastmod: day(dest[k].updated_at || dest[k].checked_at), group: "content" });
  }

  const guideKeys = Object.keys(guides).sort((a, b) => guides[a].name.localeCompare(guides[b].name));
  page(`${SITE}/guide`, "Guides to buying a home abroad as a foreigner · RealHunt", `How to buy a house as a foreigner in ${guideKeys.length} countries: steps, papers, taxes and costs on top of the price, in plain words.`, DEF,
    `<main class="rh-static"><nav><a href="/">RealHunt</a> › Guides</nav><h1>Guides to buying a home abroad</h1><p>The steps, papers and taxes to buy a house as a foreigner, country by country, in plain words.</p><ul>${guideKeys.map((k) => `<li><a href="/guide/${k}">${esc(guides[k].name)}</a>${dest[k]?.purchase_costs_pct ? `: about ${esc(dest[k].purchase_costs_pct)}% on top of the price` : ""}</li>`).join("")}</ul><p><a href="/countries">Compare two countries</a> · <a href="/costs">Real buying costs by country</a></p></main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Guides", SITE + "/guide"]])], { group: "content" });
  for (const k of guideKeys) {
    const g = guides[k], c = dest[k] || {}, n = g.name, hs = homesOf(k);
    const qa: [string, string][] = [];
    if (c.can_foreigners_buy) qa.push([`Can foreigners buy a home in ${the(n)}?`, c.can_foreigners_buy]);
    if (c.purchase_costs_pct) qa.push([`How much are the buying costs in ${the(n)}?`, `About ${c.purchase_costs_pct}% on top of the price${c.purchase_costs_breakdown ? `: ${c.purchase_costs_breakdown}` : "."}`]);
    qa.push([`What does owning a home in ${the(n)} cost every year?`, g.yearly]);
    const others = cmpKeys.filter((x) => x !== k).slice(0, 8);
    page(`${SITE}/guide/${k}`, `How to buy a home in ${the(n)} as a foreigner: steps, taxes and costs · RealHunt`, `The steps, papers and taxes to buy a house in ${the(n)} from abroad${c.purchase_costs_pct ? `, and the ${c.purchase_costs_pct}% you pay on top of the price` : ""}. In plain words, with sources.`, DEF,
      `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/guide">Guides</a></nav><h1>How to buy a home in ${esc(the(n))} as a foreigner</h1><p>The steps, papers and taxes, in plain words. General information, not legal advice: use a local lawyer before you sign.</p>`
      + (c.can_foreigners_buy ? `<h2>Can foreigners buy?</h2><p>${esc(c.can_foreigners_buy)}</p>` : "")
      + `<h2>The steps</h2><ol>${g.steps.map(([h, b]) => `<li><strong>${esc(h)}</strong>: ${esc(b)}</li>`).join("")}</ol>`
      + (c.purchase_costs_pct ? `<h2>Costs on top of the price</h2><p>About ${esc(c.purchase_costs_pct)}%${c.purchase_costs_breakdown ? `: ${esc(c.purchase_costs_breakdown)}` : ""}</p>` : "")
      + `<h2>Every year</h2><p>${esc(g.yearly)}</p>` + (c.annual_property_tax ? `<p>Yearly property tax: ${esc(c.annual_property_tax)}</p>` : "") + (c.rental_income_tax ? `<p>Tax on rental income: ${esc(c.rental_income_tax)}</p>` : "")
      + (hs.length >= MIN_LIST ? `<h2>Best homes in ${esc(the(n))}</h2><ol>${hs.slice(0, 6).map(homeLi).join("")}</ol><p><a href="/homes/${k}">All ${hs.length} homes in ${esc(the(n))}</a></p>` : "")
      + (dest[k] ? `<p><a href="/costs/${k}">Costs, taxes and sources for ${esc(n)}</a></p>` : "")
      + (others.length && cmpKeys.includes(k) ? `<h2>Compare ${esc(n)}</h2><ul>${others.map((x) => `<li><a href="${pairUrl(k, x)}">${esc(n)} vs ${esc(guides[x].name)}</a></li>`).join("")}</ul>` : "")
      + (c.sources?.length ? `<h2>Sources</h2><ul>${srcList(c)}</ul>` : "") + `</main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Guides", SITE + "/guide"], [n, `${SITE}/guide/${k}`]]), faqLd(qa)], { group: "content" });
  }

  const cstat = (k: string) => { const hs = homesOf(k); const pr = hs.map((h) => h.price_eur); return { k, name: guides[k].name, n: hs.length, med: median(pr), ppsqm: median(hs.filter((h) => h.sqm > 0).map((h) => h.price_eur / h.sqm)), min: Math.min(...pr), score: median(hs.map((h) => h.nota || 0)), top: hs.slice(0, 3) }; };
  const pairs: [string, string][] = [];
  for (let i = 0; i < cmpKeys.length; i++) for (let j = i + 1; j < cmpKeys.length; j++) pairs.push([cmpKeys[i], cmpKeys[j]].sort() as [string, string]);
  page(`${SITE}/countries`, "Compare countries for a cheap home abroad · RealHunt", `${pairs.length} side-by-side comparisons: home prices on RealHunt, price per m², buying costs, property tax and the rules for foreign buyers.`, DEF,
    `<main class="rh-static"><nav><a href="/">RealHunt</a> › Compare countries</nav><h1>Compare two countries for a cheap home</h1><p>Prices from the homes on RealHunt, side by side with the buying rules, taxes and costs on top of the price.</p>`
    + cmpKeys.map((a) => `<h2>${esc(guides[a].name)}</h2><ul>${cmpKeys.filter((b) => b !== a).map((b) => `<li><a href="${pairUrl(a, b)}">${esc(guides[a].name)} vs ${esc(guides[b].name)}</a></li>`).join("")}</ul>`).join("") + `</main>`,
    [crumbs([["RealHunt", SITE + "/"], ["Compare countries", SITE + "/countries"]])], { group: "content" });
  for (const [ka, kb] of pairs) {
    const A = cstat(ka), B = cstat(kb), da = dest[ka], db = dest[kb];
    const ch = A.ppsqm && B.ppsqm ? (A.ppsqm < B.ppsqm ? [A, B] : [B, A]) : null;
    const gap = ch ? Math.round((ch[1].ppsqm - ch[0].ppsqm) / ch[1].ppsqm * 100) : 0;
    const lead = ch ? (gap < 3 ? `On RealHunt, homes in ${the(A.name)} and ${B.name} cost about the same per m² (${eur(A.ppsqm)} and ${eur(B.ppsqm)}), with median prices of ${eur(A.med)} and ${eur(B.med)}.` : `On RealHunt, homes in ${the(ch[0].name)} cost a median ${eur(ch[0].ppsqm)} per m², ${gap}% less than in ${the(ch[1].name)} (${eur(ch[1].ppsqm)} per m²).`)
      + (da.purchase_costs_pct && db.purchase_costs_pct ? ` Buying costs start at about ${String(da.purchase_costs_pct).split(/[-–]/)[0]}% in ${the(A.name)} and ${String(db.purchase_costs_pct).split(/[-–]/)[0]}% in ${the(B.name)}.` : "") : "";
    const tr = (l: string, a: string, b: string) => `<tr><th scope="row">${esc(l)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`;
    page(`${SITE}${pairUrl(ka, kb)}`, `${A.name} vs ${B.name}: cheap homes, prices and buying costs compared · RealHunt`, (lead || `${A.name} and ${B.name} side by side: home prices, buying costs, taxes and rules for foreign buyers.`).slice(0, 300), DEF,
      `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/countries">Compare countries</a></nav><h1>${esc(A.name)} vs ${esc(B.name)}: where is a cheap home better value?</h1>${lead ? `<p>${esc(lead)}</p>` : ""}`
      + `<div style="overflow-x:auto"><table><thead><tr><th></th><th>${esc(A.name)}</th><th>${esc(B.name)}</th></tr></thead><tbody>`
      + tr("Homes on RealHunt", String(A.n), String(B.n)) + tr("Median price", eur(A.med), eur(B.med)) + tr("Median price per m²", A.ppsqm ? eur(A.ppsqm) : "n/a", B.ppsqm ? eur(B.ppsqm) : "n/a")
      + tr("Cheapest home", eur(A.min), eur(B.min)) + tr("Median score", String(A.score), String(B.score))
      + tr("Costs on top of the price", da.purchase_costs_pct ? `${da.purchase_costs_pct}%` : "n/a", db.purchase_costs_pct ? `${db.purchase_costs_pct}%` : "n/a")
      + tr("Can foreigners buy?", da.can_foreigners_buy || "n/a", db.can_foreigners_buy || "n/a") + tr("Yearly property tax", da.annual_property_tax || "n/a", db.annual_property_tax || "n/a")
      + tr("Tax on rental income", da.rental_income_tax || "n/a", db.rental_income_tax || "n/a") + `</tbody></table></div>`
      + `<p>Prices describe the homes on RealHunt, each checked by a person, not every home in each country. Rules and taxes: general information, not legal or tax advice.</p>`
      + [A, B].map((c) => `<h2>Best homes in ${esc(the(c.name))}</h2><ol>${c.top.map(homeLi).join("")}</ol><p><a href="/homes/${c.k}">All ${c.n} homes in ${esc(the(c.name))}</a> · <a href="/guide/${c.k}">How to buy in ${esc(the(c.name))}</a> · <a href="/costs/${c.k}">Costs and sources</a></p>`).join("")
      + `</main>`,
      [crumbs([["RealHunt", SITE + "/"], ["Compare countries", SITE + "/countries"], [`${A.name} vs ${B.name}`, `${SITE}${pairUrl(ka, kb)}`]])], { group: "content" });
  }
  page(`${SITE}/research/new-builds`, "State of cheap new builds · RealHunt monthly report", "Every month: how many new-build homes under €100,000 we track, the cheapest countries and median prices. Free to quote with a link.", DEF, undefined, undefined, { group: "content" });
  page(`${SITE}/agents`, "RealHunt Agents · Earn from buyers you bring", "Local agents introduce buyers to new-build developers on RealHunt and earn 30% of RealHunt's fee when they buy.", DEF);
  page(`${SITE}/network/example`, "Example listing · RealHunt Network", "See how a new-build project looks on RealHunt and what the developer receives: qualified buyers, chat, rank and a 30-second video.", DEF);
  page(`${SITE}/network/reservation-contract`, "Free reservation contract template · RealHunt Network", "A plain-English reservation agreement for new-build units. Fill it in and print it; have a local lawyer check it.", DEF);

  // ---------- HTML sitemap (/sitemap) and llms.txt, from the pages generated above ----------
  const label = (u: string) => decodeURIComponent(u.replace(SITE, "") || "/");
  const groupNames: Record<string, string> = { pages: "Main pages", places: "Countries, regions and prices", content: "Guides, costs and research", top: "New builds: Top 100", homes: "Homes" };
  const byGroup = (g: string) => entries.filter((e) => e.group === g);
  page(`${SITE}/sitemap`, "Site map · RealHunt", "Every page on RealHunt: countries, regions, price lists, guides, cost pages, rankings and homes.", DEF,
    `<main class="rh-static" data-rh-keep data-rh-static>${navHtml([["RealHunt", SITE + "/"], ["Site map", SITE + "/sitemap"]])}<h1>Site map</h1>`
    + ["pages", "places", "content", "top", "homes"].map((g) => `<h2>${esc(groupNames[g])} (${byGroup(g).length})</h2><ul>${byGroup(g).map((e) => `<li><a href="${esc(label(e.url))}">${esc(label(e.url))}</a></li>`).join("")}</ul>`).join("")
    + `</main>`, undefined, { group: "pages" });
  fs.writeFileSync(path.join(root, "llms.txt"), `# RealHunt\n\n> RealHunt lists cheap homes for sale around the world (mostly under €100,000), each checked by a person and graded from 70 to 98 against every other home on the site. It is not an estate agent: every home links to its original listing.\n\nToday: ${rows.length} homes in ${countryLinks.length} countries. Updated ${today}.\n\n## Key pages\n\n- [Best homes](${SITE}/): all homes, best score first, with filters.\n- [How the score works](${SITE}/method): the 11 sub-scores and what the grade means.\n- [New homes](${SITE}/new) and [RSS](${SITE}/feed.xml)\n- [Prices by country](${SITE}/research/prices): median price and price per m² by country.\n- [Buying costs abroad](${SITE}/costs)\n- [Buying guides by country](${SITE}/guide)\n- [Compare two countries](${SITE}/countries)\n- [New builds Top 100](${SITE}/top): Bali, Phuket, Tulum, Batumi, Koh Samui.\n- [Research and guides](${SITE}/blog)\n- [Site map](${SITE}/sitemap)\n\n## Countries\n\n${countryLinks.map(([k, v]) => `- [${v.name}](${SITE}/homes/${k}): ${v.homes.length} homes`).join("\n")}\n`);

  // build.json: which commit is live and when it was built (check with curl https://realhunt.co/build.json).
  fs.writeFileSync(path.join(root, "build.json"), JSON.stringify({ commit: (process.env.RH_COMMIT || process.env.GITHUB_SHA || "local").slice(0, 7), built_at: new Date().toISOString(), homes: rows.length, indexable_pages: entries.length }) + "\n");

  writeSitemaps(root, entries);
  console.log(`[rh-prerender-pages] ${entries.length} indexable pages in the sitemap`);
}

// The sitemap is an index of four parts, so Search Console shows indexing per type of page.
function writeSitemaps(root: string, entries: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) { if (!groups.has(e.group)) groups.set(e.group, []); groups.get(e.group)!.push(e); }
  const parts: string[] = [];
  for (const [g, list] of groups) {
    const name = `sitemap-${g}.xml`;
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + list.map((e) => `  <url><loc>${esc(e.url)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>\n`).join("") + "</urlset>\n";
    fs.writeFileSync(path.join(root, name), xml);
    const last = list.map((e) => e.lastmod).filter(Boolean).sort().pop();
    parts.push(`  <sitemap><loc>${SITE}/${name}</loc>${last ? `<lastmod>${last}</lastmod>` : ""}</sitemap>\n`);
  }
  fs.writeFileSync(path.join(root, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + parts.join("") + "</sitemapindex>\n");
}
