import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Share previews and SEO for a single-page app: WhatsApp, X, Facebook and LinkedIn do not run
// JavaScript, so every listing gets its own copy of index.html with its title, description and
// share card already in the <head>. Data comes from src/data/deal-meta.json, refreshed daily by
// .github/workflows/rh-og-cards.yml. Browsers load the same app as always.
function prerenderPages() {
  let outDir = "dist";
  const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return {
    name: "rh-prerender-pages",
    apply: "build" as const,
    configResolved(c: any) { outDir = c.build.outDir; },
    closeBundle() {
      try {
        const root = path.resolve(__dirname, outDir);
        const indexFile = path.join(root, "index.html");
        if (!fs.existsSync(indexFile)) return;
        const html = fs.readFileSync(indexFile, "utf8");
        const page = (url: string, title: string, desc: string, image: string, body?: string, ld?: object[], robots = "index, follow") => {
          let h = html;
          // Search engines and AI crawlers read this without running JavaScript. React replaces it on load.
          if (body) h = h.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
          if (ld?.length) h = h.replace("</head>", () => ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("") + "</head>");
          const rep = (re: RegExp, val: string) => { h = h.replace(re, val); };
          rep(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
          rep(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(desc)}" />`);
          rep(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${esc(robots)}" />`);
          rep(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(url)}" />`);
          rep(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}" />`);
          rep(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(desc)}" />`);
          rep(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(image)}" />`);
          rep(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(url)}" />`);
          rep(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(title)}" />`);
          rep(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(desc)}" />`);
          rep(/<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${esc(image)}" />`);
          const rel = url.replace(/^https:\/\/realhunt\.co\/?/, "");
          const dir = path.join(root, rel);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, "index.html"), h);
        };
        const SITE = "https://realhunt.co";
        const DEF = `${SITE}/og-default-100k.jpg`;
        const metaFile = path.resolve(__dirname, "src/data/deal-meta.json");
        const deals: any[] = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : [];
        for (const d of deals) {
          if (!d?.slug || !/^[A-Za-z0-9_-]+$/.test(d.slug)) continue;
          const dealUrl = `${SITE}/deal/${d.slug}`;
          page(dealUrl, `${d.title} · RealHunt`, d.desc, d.image || DEF, undefined, [{
            "@context": "https://schema.org", "@type": "RealEstateListing", name: d.title,
            description: d.desc, url: dealUrl, image: d.image ? [d.image] : [DEF]
          }]);
        }
        const countries = Array.from(new Set(deals.map((d) => String(d.country || "").toLowerCase()).filter(Boolean)));
        const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        for (const c of countries) {
          page(`${SITE}/homes/${c}`, `Homes under €100,000 in ${cap(c)} · RealHunt`, `Houses for sale under €100,000 in ${cap(c)}, found by people and ranked by votes. New homes every day.`, DEF);
          for (const p of [20000, 40000, 60000, 80000]) page(`${SITE}/homes/${c}/under-${p}`, `Homes under €${p.toLocaleString("en")} in ${cap(c)} · RealHunt`, `Houses for sale under €${p.toLocaleString("en")} in ${cap(c)}, ranked by people's votes.`, DEF);
        }
        for (const [c, n] of [["italy", "Italy"], ["spain", "Spain"], ["portugal", "Portugal"]]) {
          const guideUrl = `${SITE}/guide/${c}`;
          page(guideUrl, `How to buy a cheap home in ${n} as a foreigner · RealHunt`, `Steps, papers and taxes to buy a house in ${n} from abroad, in plain words.`, DEF, undefined, [{
            "@context": "https://schema.org", "@type": "Article", headline: `How to buy a cheap home in ${n} as a foreigner`,
            description: `Steps, papers and taxes to buy a house in ${n} from abroad.`, mainEntityOfPage: guideUrl,
            author: { "@type": "Organization", name: "RealHunt" }, publisher: { "@type": "Organization", name: "RealHunt" }
          }]);
        }
        page(`${SITE}/map`, "Map of homes under €100,000 · RealHunt", "Every home under €100,000 on one map. Italy, Spain, Portugal and more.", DEF);
        page(`${SITE}/swipe`, "Swipe homes under €100,000 · RealHunt", "Swipe right to vote. The most voted homes rise to the top every week.", DEF);
        page(`${SITE}/leaderboard`, "Top hunters · RealHunt", "The people who find the best homes under €100,000.", DEF);
        page(`${SITE}/alerts`, "Property alerts under €100,000 · RealHunt", "Create a free alert for affordable homes matching your country, budget and property preferences.", DEF);
        page(`${SITE}/submit`, "Submit a home under €100,000 · RealHunt", "Share a property listing. RealHunt checks it before the community votes.", DEF);
        page(`${SITE}/network`, "RealHunt Network · Buyer introductions for approved projects", `Performance-based buyer introductions for approved real-estate projects. No upfront platform fee; 5% applies only to an eligible completed sale under signed terms.`, DEF);
        page(`${SITE}/network/app`, "Developer panel · RealHunt Network", "Private RealHunt Network workspace.", DEF, undefined, undefined, "noindex, nofollow");
        page(`${SITE}/account`, "Your account · RealHunt", "Your private RealHunt account.", DEF, undefined, undefined, "noindex, nofollow");
        page(`${SITE}/account/saved`, "Saved homes · RealHunt", "Your private saved homes.", DEF, undefined, undefined, "noindex, nofollow");
        // v7: blog, search pages, insider
        const readJson = (f: string, d: any) => { const p = path.resolve(__dirname, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };
        const abs = (u: string) => (u.startsWith("http") ? u : SITE + u);
        const crumbs = (items: [string, string][]) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) });
        const posts: any[] = readJson("src/data/blog.json", []);
        const card = (p: any) => `<li><a href="/blog/${esc(p.slug)}"><strong>${esc(p.title)}</strong></a> <span>${esc(p.desc)}</span></li>`;
        page(`${SITE}/blog`, "RealHunt Research · Data on cheap homes around the world", "Original data and plain-English guides on homes under €100,000: prices by country, buying rules, rent vs buy.", posts[0] ? abs(posts[0].image) : DEF,
          `<main class="rh-static"><h1>RealHunt Research</h1><p>Studies and guides built from the homes on RealHunt.</p><ul>${posts.map(card).join("")}</ul></main>`,
          [crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"]])]);
        for (const p of posts) {
          if (!/^[a-z0-9-]+$/.test(p.slug)) continue;
          const url = `${SITE}/blog/${p.slug}`;
          page(url, `${p.title} · RealHunt`, p.desc, abs(p.image),
            `<main class="rh-static"><article><nav><a href="/">RealHunt</a> › <a href="/blog">Research</a></nav><h1>${esc(p.title)}</h1><p>${esc(p.desc)}</p><p>${esc(p.author)} · ${esc(p.date)}</p>${p.html}</article><h2>More</h2><ul>${posts.filter((x) => x.slug !== p.slug).map(card).join("")}</ul></main>`,
            [{ "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.desc, image: [abs(p.image)], datePublished: p.date, dateModified: p.date, mainEntityOfPage: url,
               author: { "@type": "Organization", name: p.author, url: SITE + "/blog" }, publisher: { "@type": "Organization", name: "RealHunt", logo: { "@type": "ImageObject", url: SITE + "/apple-touch-icon.png" } } },
             crumbs([["RealHunt", SITE + "/"], ["Research", SITE + "/blog"], [p.title, url]])]);
        }
        const sp: any = readJson("src/data/search-pages.json", { pages: [], homes: {} });
        const st: Record<string, string> = readJson("src/data/search-static.json", {});
        page(`${SITE}/cheap-houses`, "Cheap houses for sale by what you want · RealHunt", "Cheap houses by the sea, near a lake, with a sauna, cabins, stone houses and homes under €30,000 or €50,000. Real listings, checked by people.", DEF, st.__index__,
          [crumbs([["RealHunt", SITE + "/"], ["Cheap houses", SITE + "/cheap-houses"]])]);
        for (const p of sp.pages || []) {
          if (!/^[a-z0-9-]+$/.test(p.slug)) continue;
          const url = `${SITE}/cheap-houses/${p.slug}`;
          const first = sp.homes?.[p.homes?.[0]];
          page(url, p.title, p.desc, first ? abs(first.img) : DEF, st[p.slug],
            [crumbs([["RealHunt", SITE + "/"], ["Cheap houses", SITE + "/cheap-houses"], [p.h1, url]]),
             { "@context": "https://schema.org", "@type": "ItemList", name: p.h1, numberOfItems: p.count,
               itemListElement: (p.homes || []).slice(0, 30).map((s: string, i: number) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/deal/${s}`, name: sp.homes?.[s]?.t })) },
             { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: (p.faq || []).map(([q, a]: [string, string]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }]);
        }
        page(`${SITE}/new-builds`, "New-build homes under €100,000 · RealHunt", "New-build projects with units under €100,000, payment plans and verified developers. Ask the developer directly.", DEF);
        for (const [c, n] of [["indonesia", "Indonesia"], ["mexico", "Mexico"], ["albania", "Albania"], ["spain", "Spain"], ["portugal", "Portugal"], ["thailand", "Thailand"], ["turkey", "Turkey"], ["montenegro", "Montenegro"]]) page(`${SITE}/new-builds/${c}`, `New builds under €100,000 in ${n} · RealHunt`, `New-build projects in ${n} with units under €100,000, payment plans and verified developers. Ask the developer directly.`, DEF);
        page(`${SITE}/developers`, "Developer ranking · RealHunt", "Developers ranked by sales, buyer ratings and how fast they answer buyers on RealHunt.", DEF);
        page(`${SITE}/network/start`, "List your project free · RealHunt Network", "Paste your project link and we build your listing in seconds. Buyers for your project, 5% only if one buys. Earn 3% from leads you could not sell to.", DEF);
        page(`${SITE}/insider`, "RealHunt Insider · See new homes 48 hours early", "Invite 3 friends and see every new home 48 hours before everyone else, plus the secret weekly Top 5. Free.", DEF);
        // v10: real costs by destination, monthly report, agents, developer example and contract
        const dest: Record<string, any> = readJson("src/data/destinations.json", {});
        const DN: Record<string, string> = { bali: "Bali", lombok: "Lombok", albania: "Albania", mexico: "Mexico", spain: "Spain", montenegro: "Montenegro", georgia: "Georgia", "northern-cyprus": "Northern Cyprus", vietnam: "Vietnam", italy: "Italy", portugal: "Portugal", bulgaria: "Bulgaria" };
        const dl = (d: any) => [["Can foreigners buy?", d.can_foreigners_buy], ["Costs on top of the price", d.purchase_costs_pct ? `${d.purchase_costs_pct}% · ${d.purchase_costs_breakdown || ""}` : null], ["Yearly property tax", d.annual_property_tax], ["Tax on rental income", d.rental_income_tax], ["Holiday-rental yield", d.holiday_rental_gross_yield_pct ? `${d.holiday_rental_gross_yield_pct}% gross` : null], ["What holiday rentals earn", d.holiday_rental_yield_note], ["Long-term rent yield", d.long_term_gross_yield_pct ? `${d.long_term_gross_yield_pct}% gross` : null], ["Holiday-rental rules", d.holiday_rental_rules]].filter((r) => r[1]).map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("");
        page(`${SITE}/costs`, "What it really costs to buy a cheap home abroad · RealHunt", "Buying costs, property tax, rental tax and holiday-rental yields in Bali, Albania, Mexico, Spain, Georgia, Vietnam and more. With sources.", DEF,
          `<main class="rh-static"><h1>What it really costs to buy abroad</h1><ul>${Object.keys(DN).filter((k) => dest[k]).map((k) => `<li><a href="/costs/${k}">${esc(DN[k])}</a>: ${esc(dest[k].purchase_costs_pct || "?")}% on top of the price</li>`).join("")}</ul></main>`,
          [crumbs([["RealHunt", SITE + "/"], ["Real costs", SITE + "/costs"]])]);
        for (const k of Object.keys(DN)) if (dest[k]) page(`${SITE}/costs/${k}`, `Buying a home in ${DN[k]}: real costs, taxes and rental yield · RealHunt`, `What you pay on top of the price in ${DN[k]}, yearly property tax, tax on rental income and what holiday rentals earn. With sources.`, DEF,
          `<main class="rh-static"><nav><a href="/">RealHunt</a> › <a href="/costs">Real costs</a></nav><h1>Buying a home in ${esc(DN[k])}: what it really costs</h1><dl>${dl(dest[k])}</dl><h2>Sources</h2><ul>${(dest[k].sources || []).map((u: string) => `<li><a href="${esc(u)}" rel="nofollow">${esc(u)}</a></li>`).join("")}</ul></main>`,
          [crumbs([["RealHunt", SITE + "/"], ["Real costs", SITE + "/costs"], [DN[k], `${SITE}/costs/${k}`]])]);
        page(`${SITE}/research/new-builds`, "State of cheap new builds · RealHunt monthly report", "Every month: how many new-build homes under €100,000 we track, the cheapest countries and median prices. Free to quote with a link.", DEF);
        page(`${SITE}/agents`, "RealHunt Agents · Earn from buyers you bring", "Local agents introduce buyers to new-build developers on RealHunt and earn 30% of RealHunt's fee when they buy.", DEF);
        page(`${SITE}/network/example`, "Example listing · RealHunt Network", "See how a new-build project looks on RealHunt and what the developer receives: qualified buyers, chat, rank and a 30-second video.", DEF);
        page(`${SITE}/network/reservation-contract`, "Free reservation contract template · RealHunt Network", "A plain-English reservation agreement for new-build units. Fill it in and print it; have a local lawyer check it.", DEF);
        page(`${SITE}/help-buying`, "Help buying a home abroad · RealHunt", "Local lawyers, translators, surveys and tax numbers for buying a house in another country.", DEF);
      } catch (e) {
        console.warn("[rh-prerender-pages] skipped:", (e as Error).message);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), prerenderPages(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: the browser keeps React and Supabase cached across deploys.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react";
          if (id.includes("@supabase")) return "supabase";
        },
      },
    },
  },
}));
