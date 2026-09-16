import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, Heart } from "lucide-react";
import { fbLead } from "@/lib/fbpixel";
import AuthModal from "@/components/realhunt/AuthModal";

const NAV_ITEMS = [
  { to: "/", label: "Deals" },
  { to: "/network", label: "For developers" },
];
const DEALS_PATHS = ["/", "/find", "/ecobeachcity", "/saved", "/country", "/from", "/fit"];

const RHNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState(false);
  const onDeals = DEALS_PATHS.some((p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)));

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const SaveLink = ({ mobile }: { mobile?: boolean }) =>
    user ? (
      <Link to="/saved" className={mobile ? "py-3 text-ink text-[15px] hairline-b inline-flex items-center gap-2" : "text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"}><Heart size={15} /> Saved</Link>
    ) : (
      <button onClick={() => setAuth(true)} className={mobile ? "py-3 text-ink text-[15px] hairline-b text-left inline-flex items-center gap-2" : "text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"}><Heart size={15} /> Save homes</button>
    );

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-hairline">
      <nav className="max-w-[1240px] mx-auto flex items-center justify-between px-4 md:px-6 h-16">
        <Link to="/" className="inline-flex items-center gap-2.5 font-display text-[22px] tracking-tight text-ink leading-none"><svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#141414" /><path d="M14 35 L32 17 L50 35" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="32" cy="43.5" r="6.5" fill="#0EA5E9" /></svg>RealHunt</Link>

        <div className="hidden md:flex items-center gap-8 text-[14px]">
          {NAV_ITEMS.map((item) => <Link key={item.to} to={item.to} className="text-ink-muted hover:text-ink transition-colors">{item.label}</Link>)}
          <SaveLink />
          {!onDeals && (
            <Link to={user ? "/app" : "/auth/sign-up"} onClick={() => { if (!user) fbLead({ content_name: "open_the_app", source: "nav_desktop" }); }} className="rh-btn-primary !px-5 !py-2.5 !text-[14px]">Open the app →</Link>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          {user ? <Link to="/saved" aria-label="Saved" className="p-2 text-ink"><Heart size={20} /></Link> : <button onClick={() => setAuth(true)} aria-label="Save homes" className="p-2 text-ink"><Heart size={20} /></button>}
          <button className="p-2 -mr-2 text-ink" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-hairline bg-paper">
          <div className="max-w-[1240px] mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => <Link key={item.to} to={item.to} className="py-3 text-ink text-[15px] hairline-b">{item.label}</Link>)}
            <SaveLink mobile />
            {!user && <button onClick={() => setAuth(true)} className="py-3 text-ink text-[15px] hairline-b text-left">Sign in</button>}
            {!onDeals && <Link to={user ? "/app" : "/auth/sign-up"} className="rh-btn-primary mt-3 w-full">Open the app →</Link>}
          </div>
        </div>
      )}
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Save homes and get alerts" subtitle="Free. Heart the homes you like, we tell you when similar ones appear." />
    </header>
  );
};

export default RHNav;
