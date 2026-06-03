import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";
import { fbLead } from "@/lib/fbpixel";

const NAV_ITEMS = [
  { to: "/", label: "Score a property" },
  { to: "/rankings", label: "Rankings" },
  { to: "/for-agents", label: "For Agents" },
  { to: "/method", label: "Method" },
  { to: "/pricing", label: "Pricing" },
];

const RHNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-hairline">
      <nav className="max-w-[1140px] mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="font-display text-[22px] tracking-tight text-ink leading-none">
          RealHunt
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[14px]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <Link to="/app/brand" className="text-ink-muted hover:text-ink transition-colors">
              Brand
            </Link>
          ) : (
            <Link to="/auth/sign-in" className="text-ink-muted hover:text-ink transition-colors">
              Sign in
            </Link>
          )}
          <Link
            to={user ? "/app" : "/auth/sign-up"}
            onClick={() => { if (!user) fbLead({ content_name: "open_the_app", source: "nav_desktop" }); }}
            className="rh-btn-primary !px-5 !py-2.5 !text-[14px]"
          >
            {user ? "Open the app →" : "Open the app →"}
          </Link>
        </div>

        <button
          className="md:hidden p-2 -mr-2 text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-hairline bg-paper">
          <div className="max-w-[1140px] mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="py-3 text-ink text-[15px] hairline-b last:border-b-0"
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link to="/auth/sign-in" className="py-3 text-ink text-[15px] hairline-b">
                  Sign in
                </Link>
                <Link to="/auth/sign-up" className="py-3 text-ink text-[15px] hairline-b">
                  Sign up
                </Link>
              </>
            )}
            <Link
              to={user ? "/app" : "/auth/sign-up"}
              onClick={() => { if (!user) fbLead({ content_name: "open_the_app", source: "nav_mobile" }); }}
              className="rh-btn-primary mt-3 w-full"
            >
              Open the app →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default RHNav;
