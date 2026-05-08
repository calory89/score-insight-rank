import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const RHNav = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        scrolled
          ? "bg-rh-navy/85 backdrop-blur-xl border-b border-rh-line"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl text-white">
          <span className="text-rh-gold">◆</span> RealHunt
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <Link to="/browse" className="hover:text-white transition">Browse</Link>
          <Link to="/countries" className="hover:text-white transition">Countries</Link>
          <Link to="/methodology" className="hover:text-white transition">Methodology</Link>
          <Link to="/for-developers" className="hover:text-white transition">For Developers</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-white/70 hover:text-white hidden sm:inline">Sign in</Link>
          <Link
            to="/apply"
            className="text-sm font-semibold px-4 py-2 rounded-md bg-rh-gold text-rh-navy hover:bg-rh-gold-soft transition"
          >
            Apply as agent
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default RHNav;
