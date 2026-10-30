import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";

// Shown for paths that are not a page. The server already answers these with noindex.
const COUNTRIES: [string, string][] = [["spain", "Spain"], ["italy", "Italy"], ["denmark", "Denmark"], ["sweden", "Sweden"], ["france", "France"], ["united-states", "United States"], ["japan", "Japan"], ["greece", "Greece"]];

const NotFound = () => {
  const location = useLocation();
  const [q, setQ] = useState("");
  useEffect(() => { document.title = "Page not found · RealHunt"; }, [location.pathname]);
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-xl">
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">This page does not exist, but the homes do.</h1>
        <p className="mt-3 text-muted-foreground">The link may be old or mistyped. Search for a place, or start from one of these.</p>
        <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); window.location.href = "/?q=" + encodeURIComponent(q.trim()); }}>
          <label htmlFor="nf-q" className="sr-only">Search a country, town or region</label>
          <input id="nf-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a country, town or region" className="flex-1 min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-base" />
          <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Search</button>
        </form>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/" className="rounded-full border border-input px-4 py-2 text-sm font-medium">Best homes</Link>
          <Link to="/new" className="rounded-full border border-input px-4 py-2 text-sm font-medium">New homes</Link>
          {COUNTRIES.map(([k, l]) => <Link key={k} to={`/homes/${k}`} className="rounded-full border border-input px-4 py-2 text-sm font-medium">{l}</Link>)}
          <Link to="/sitemap" className="rounded-full border border-input px-4 py-2 text-sm font-medium">Site map</Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
