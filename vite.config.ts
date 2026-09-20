import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), preloadPublicRoute(), mode === "development" && componentTagger()].filter(Boolean),
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
