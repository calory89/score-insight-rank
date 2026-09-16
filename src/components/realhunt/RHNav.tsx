import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, Heart, Bell, MessageSquare, User, LogOut, ChevronDown } from "lucide-react";
import { fbLead } from "@/lib/fbpixel";
import AuthModal from "@/components/realhunt/AuthModal";
import CookieBanner from "@/components/realhunt/CookieBanner";

const NAV_ITEMS = [
  { to: "/", label: "Deals" },
  { to: "/network", label: "For developers" },
];
const DEALS_PATHS = ["/", "/find", "/ecobeachcity", "/account", "/saved", "/country", "/from", "/fit", "/map", "/swipe", "/guide", "/sell", "/legal", "/compare-homes", "/c/", "/network"];
const MENU = [["/account/profile", "Profile", User], ["/account/saved", "Saved homes", Heart], ["/account/alerts", "Alerts", Bell], ["/account/requests", "My requests", MessageSquare]] as const;

const RHNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const onDeals = DEALS_PATHS.some((p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)));
  const initial = (user?.user_metadata?.full_name || user?.email || "?").slice(0, 1).toUpperCase();
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname]);
  useEffect(() => { const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const signOut = async () => { await supabase.auth.signOut(); nav("/"); };

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-hairline">
      <nav className="max-w-[1240px] mx-auto flex items-center justify-between px-4 md:px-6 h-16">
        <Link to="/" className="inline-flex items-center gap-2.5 font-display text-[22px] tracking-tight text-ink leading-none"><svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#141414" /><path d="M14 35 L32 17 L50 35" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="32" cy="43.5" r="6.5" fill="#0EA5E9" /></svg>RealHunt</Link>

        <div className="hidden md:flex items-center gap-7 text-[14px]">
          {NAV_ITEMS.map((item) => <Link key={item.to} to={item.to} className="text-ink-muted hover:text-ink transition-colors">{item.label}</Link>)}
          {!onDeals && <Link to={user ? "/app" : "/auth/sign-up"} onClick={() => { if (!user) fbLead({ content_name: "open_the_app", source: "nav_desktop" }); }} className="rh-btn-primary !px-5 !py-2.5 !text-[14px]">Open the app →</Link>}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((v) => !v)} className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-hairline bg-white hover:border-ink">
                {avatar ? <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" /> : <span className="h-8 w-8 rounded-full bg-ink text-paper inline-flex items-center justify-center text-[13px] font-medium">{initial}</span>}
                <ChevronDown size={14} className="text-ink-muted" />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-hairline bg-white shadow-xl p-2 z-50">
                  <p className="px-3 py-2 text-[12px] text-ink-muted truncate">{user.email}</p>
                  {MENU.map(([to, l, I]) => <Link key={to} to={to} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] hover:bg-paper"><I size={15} className="text-ink-muted" /> {l}</Link>)}
                  <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] hover:bg-paper text-left"><LogOut size={15} className="text-ink-muted" /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAuth(true)} className="px-4 py-2 rounded-full border border-ink text-[14px] font-medium hover:bg-ink hover:text-paper transition-colors">Sign in</button>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          {user ? <Link to="/account/saved" aria-label="Account" className="p-1">{avatar ? <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" /> : <span className="h-8 w-8 rounded-full bg-ink text-paper inline-flex items-center justify-center text-[13px]">{initial}</span>}</Link> : <button onClick={() => setAuth(true)} className="px-3 py-1.5 rounded-full border border-ink text-[13px] font-medium">Sign in</button>}
          <button className="p-2 -mr-2 text-ink" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-hairline bg-paper">
          <div className="max-w-[1240px] mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => <Link key={item.to} to={item.to} className="py-3 text-ink text-[15px] hairline-b">{item.label}</Link>)}
            {user && MENU.map(([to, l, I]) => <Link key={to} to={to} className="py-3 text-ink text-[15px] hairline-b inline-flex items-center gap-2"><I size={15} className="text-ink-muted" /> {l}</Link>)}
            {user ? <button onClick={signOut} className="py-3 text-ink text-[15px] text-left inline-flex items-center gap-2"><LogOut size={15} className="text-ink-muted" /> Sign out</button> : <button onClick={() => setAuth(true)} className="py-3 text-ink text-[15px] hairline-b text-left">Sign in</button>}
            {!onDeals && <Link to={user ? "/app" : "/auth/sign-up"} className="rh-btn-primary mt-3 w-full">Open the app →</Link>}
          </div>
        </div>
      )}
      <CookieBanner />
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Sign in to RealHunt" subtitle="Free. Save homes, set alerts and get everything about any home by email." />
    </header>
  );
};

export default RHNav;
