import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { prerenderPages } from "./seo/prerender";
import { fileBudget } from "./seo/budget";
import { polishPages } from "./seo/polish";
import { techChecks } from "./seo/tech/plugin";
import { langPages } from "./seo/langs/build";
import { reachAfter } from "./seo/reach";

// 9-nov-2026 speed: the Spanish copies of every home's texts (about 60 KB compressed, a fifth of the snapshot) are
// only needed by Spanish visitors. The committed public/data/rh-static.json keeps them (other scripts read it); the
// PUBLISHED copy is split here: dist/data/rh-static.json without *_es (flag es:"split") and
// dist/data/rh-static-es.json = { slug: [title_es, why_great_es, why_cheap_es] }. src/lib/static-db.ts joins them
// back for Spanish before any home is shown.
function splitSpanishTexts() {
  return {
    name: "split-spanish-texts",
    apply: "build" as const,
    closeBundle() {
      const file = path.resolve(__dirname, "dist/data/rh-static.json");
      if (!fs.existsSync(file)) return;
      const snap = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!Array.isArray(snap.rows) || snap.es === "split") return;
      const es: Record<string, (string | null)[]> = {};
      for (const r of snap.rows) {
        const t = [r.title_es ?? null, r.why_great_es ?? null, r.why_cheap_es ?? null];
        if (r.slug && t.some(Boolean)) es[r.slug] = t;
        delete r.title_es; delete r.why_great_es; delete r.why_cheap_es;
      }
      snap.es = "split";
      fs.writeFileSync(file, JSON.stringify(snap));
      fs.writeFileSync(path.resolve(__dirname, "dist/data/rh-static-es.json"), JSON.stringify(es));
      console.log(`[split-spanish-texts] ${Object.keys(es).length} homes with Spanish texts`);
    },
  };
}


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
        // 9-nov-2026: "/" and the main public pages render community/Community.tsx (not pages/Home.tsx any more),
        // so that is the chunk to start downloading early; Home stays for /from/<account>.
        // 15-nov-2026: "Map" is the chain behind /map (the page, the map itself and Leaflet), three lazy steps deep.
        // Each step used to be discovered only after the one before had downloaded and run; now all of them start
        // with the HTML, together with the connection to the tile server. Measured: on a slow line (1.6 Mbit/s) the
        // map's first tile still arrives at about 5.6 s, because what limits it there is the 460 KB of scripts and
        // the 205 KB of data in front of it; the gain is on lines where the round trips are what costs.
        const styles: Record<string, string[]> = {};
        for (const page of ["Community", "Home", "FindDetail", "Weather", "Map"]) {
          const want = page === "Community" ? "/community/Community.tsx" : page === "Map" ? "/community/homesmap.tsx" : `/pages/${page}.tsx`;
          const entry = Object.values(bundle).find(item => item.type === "chunk" && item.facadeModuleId?.endsWith(want))
            || Object.values(bundle).find(item => item.type === "chunk" && Object.keys(item.modules).some(m => m.endsWith(want)));
          if (!entry || entry.type !== "chunk") continue;
          const seen = new Set<string>(), css = new Set<string>();
          const visit = (file: string) => {
            if (seen.has(file)) return;
            const chunk = bundle[file];
            if (!chunk || chunk.type !== "chunk") return;
            seen.add(file); chunk.imports.forEach(visit);
            for (const c of (chunk as any).viteMetadata?.importedCss || []) css.add(c);
          };
          visit(entry.fileName);
          if (page === "Map") { const mapPage = Object.values(bundle).find(item => item.type === "chunk" && (item.facadeModuleId?.endsWith("/community/map.tsx") || Object.keys(item.modules).some(m => m.endsWith("/community/map.tsx")))); if (mapPage) visit(mapPage.fileName); }
          routes[page] = [...seen].map(file => `/${file}`);
          if (page === "Map") styles[page] = [...css].map(file => `/${file}`);
        }
        // 10-nov-2026: a Spanish URL (/es/deal/x) is treated like /deal/x; data-lang is already "es" there (index.html).
        return [{ tag: "script", injectTo: "head" as const, children: `(()=>{const p=location.pathname.replace(/^\\/es(?=\\/|$)/,'')||'/',r=${JSON.stringify(routes)},k=p==='/'||/^\\/(deal|map|top|live-search|homes|hunt|compare|score|blog|guide|costs|can-i-buy|buying-costs)(\\/|$)/.test(p)?'Community':/^\\/from\\//.test(p)?'Home':/^\\/find\\//.test(p)?'FindDetail':/^\\/weather\\/?$/.test(p)?'Weather':null,m=p==='/map',add=function(rel,href,as){const l=document.createElement('link');l.rel=rel;l.href=href;if(as)l.as=as;if(rel==='modulepreload')l.crossOrigin='';document.head.appendChild(l)};if(m)add('preconnect','https://tile.openstreetmap.org');for(const href of (r[k]||[]).concat(m?r.Map||[]:[]))add('modulepreload',href);if(m)for(const href of ${JSON.stringify(styles.Map || [])})add('preload',href,'style');if(p==='/'||/^\\/(deal|map|homes|compare|live-search)(\\/|$)/.test(p)){try{window.__rhSnap=fetch('/data/rh-static.json',{cache:'no-cache'}).then(function(x){if(!x.ok)throw 0;return x.json()});window.__rhSnap.catch(function(){});if(document.documentElement.getAttribute('data-lang')==='es'){window.__rhSnapEs=fetch('/data/rh-static-es.json',{cache:'no-cache'}).then(function(x){if(!x.ok)throw 0;return x.json()});window.__rhSnapEs.catch(function(){})}}catch(e){}}})();` }];
      },
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
  plugins: [react(), preloadPublicRoute(), prerenderPages(), polishPages(), langPages(), reachAfter(), splitSpanishTexts(), techChecks(), fileBudget()].filter(Boolean),
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
          // 7-nov-2026: every lucide icon was its own file (~60 tiny requests on the home page). One icons file instead.
          if (id.includes("lucide-react")) return "icons";
        },
        // Merge chunks under ~6 KB into their importer so a page needs fewer round trips on a phone.
        experimentalMinChunkSize: 6000,
      },
    },
  },
}));
