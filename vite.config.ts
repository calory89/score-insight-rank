import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Start the current catalogue/detail page's static imports while the HTML is being
// parsed, instead of waiting for React -> router -> lazy page -> dependencies.
// Other routes and all dynamic features stay lazy; URLs come from this build.
function preloadPublicRoute() {
  return {
    name: "preload-public-route",
    transformIndexHtml: {
      order: "post" as const,
      handler(_html: string, context: import("vite").IndexHtmlTransformContext) {
        if (!context.bundle) return;
        const bundle = context.bundle;
        const routes: Record<string, string[]> = {};
        for (const page of ["Home", "FindDetail"]) {
          const entry = Object.values(bundle).find(item => item.type === "chunk" && item.facadeModuleId?.endsWith(`/pages/${page}.tsx`));
          if (!entry || entry.type !== "chunk") continue;
          const seen = new Set<string>();
          const visit = (file: string) => {
            if (seen.has(file)) return;
            const chunk = bundle[file];
            if (!chunk || chunk.type !== "chunk") return;
            seen.add(file); chunk.imports.forEach(visit);
          };
          visit(entry.fileName);
          routes[page] = [...seen].map(file => `/${file}`);
        }
        return [{ tag: "script", injectTo: "head" as const, children: `(()=>{const p=location.pathname,r=${JSON.stringify(routes)},k=p==='/'||/^\\/(country|from)\\//.test(p)?'Home':/^\\/find\\//.test(p)?'FindDetail':null;for(const href of r[k]||[]){const l=document.createElement('link');l.rel='modulepreload';l.href=href;l.crossOrigin='';document.head.appendChild(l)}})();` }];
      },
    },
  };
}

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
        const page = (url: string, title: string, desc: string, image: string, body?: string, ld?: object[]) => {
          let h = html;
          // Search engines and AI crawlers read this without running JavaScript. React replaces it on load.
          if (body) h = h.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
          if (ld?.length) h = h.replace("</head>", () => ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("") + "</head>");
          const rep = (re: RegExp, val: string) => { h = h.replace(re, val); };
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
          page(`${SITE}/deal/${d.slug}`, `${d.title} · RealHunt`, d.desc, d.image || DEF);
        }
        const countries = Array.from(new Set(deals.map((d) => String(d.country || "").toLowerCase()).filter(Boolean)));
        const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        for (const c of countries) {
          page(`${SITE}/homes/${c}`, `Homes under €100,000 in ${cap(c)} · RealHunt`, `Houses for sale under €100,000 in ${cap(c)}, found by people and ranked by votes. New homes every day.`, DEF);
          for (const p of [20000, 40000, 60000, 80000]) page(`${SITE}/homes/${c}/under-${p}`, `Homes under €${p.toLocaleString("en")} in ${cap(c)} · RealHunt`, `Houses for sale under €${p.toLocaleString("en")} in ${cap(c)}, ranked by people's votes.`, DEF);
        }
        for (const [c, n] of [["italy", "Italy"], ["spain", "Spain"], ["portugal", "Portugal"]]) page(`${SITE}/guide/${c}`, `How to buy a cheap home in ${n} as a foreigner · RealHunt`, `Steps, papers and taxes to buy a house in ${n} from abroad, in plain words.`, DEF);
        page(`${SITE}/map`, "Map of homes under €100,000 · RealHunt", "Every home under €100,000 on one map. Italy, Spain, Portugal and more.", DEF);
        page(`${SITE}/swipe`, "Swipe homes under €100,000 · RealHunt", "Swipe right to vote. The most voted homes rise to the top every week.", DEF);
        page(`${SITE}/leaderboard`, "Top hunters · RealHunt", "The people who find the best homes under €100,000.", DEF);
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
        page(`${SITE}/network/start`, "List your project free · RealHunt Network", "Paste your project link and we build your listing in seconds. Buyers for your project, 5% only if one buys. Earn 3% from leads you could not sell to.", DEF);
        page(`${SITE}/insider`, "RealHunt Insider · See new homes 48 hours early", "Invite 3 friends and see every new home 48 hours before everyone else, plus the secret weekly Top 5. Free.", DEF);
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
  plugins: [react(), preloadPublicRoute(), prerenderPages(), mode === "development" && componentTagger()].filter(Boolean),
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
