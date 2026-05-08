import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const RHNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-slate-200"
          : "bg-white border-b border-slate-100"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl text-slate-900">
          <span className="text-amber-600">◆</span> RealHunt
        </Link>
        <div className="hidden md:flex items-center gap-7 text-sm text-slate-600">
          <Link to="/" className="hover:text-slate-900 transition">Index</Link>
          <Link to="/homescoring" className="hover:text-slate-900 transition">Home Score</Link>
          <Link to="/methodology" className="hover:text-slate-900 transition">Methodology</Link>
          <Link to="/for-developers" className="hover:text-slate-900 transition">For Developers</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="text-sm text-slate-700 hover:text-slate-900">Dashboard</Link>
          ) : (
            <Link to="/apply" className="text-sm text-slate-700 hover:text-slate-900 hidden sm:inline">Sign in</Link>
          )}
          <Link
            to="/apply"
            className="text-sm font-semibold px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Apply as agent
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default RHNav;
