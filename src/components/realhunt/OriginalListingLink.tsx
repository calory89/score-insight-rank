import { useEffect, useState, type ComponentProps } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

// Anonymous visitors never receive an outbound anchor, including via context menus.
export default function OriginalListingLink({ href, children, className, onClick, returnTo, ...props }: ComponentProps<"a"> & { returnTo?: string }) {
  const { user, loading } = useAuth();
  const route = useLocation();
  const [open, setOpen] = useState(false);
  // After signing in from this button, bring the person straight back to it, highlighted, so the
  // listing is one tap away instead of hidden in the page they came back to.
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (!user) return;
    try {
      if (sessionStorage.getItem("rh_open_listing") === route.pathname) {
        sessionStorage.removeItem("rh_open_listing"); setFresh(true);
        setTimeout(() => document.querySelector(".hunt-open-now")?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
      }
    } catch { /* storage blocked */ }
  }, [user?.id]);
  if (user && href && /^https?:\/\//i.test(href)) {
    return <a {...props} href={href} className={(className || "") + (fresh ? " hunt-open-now" : "")} onClick={onClick} target="_blank" rel="noopener noreferrer nofollow">{children}</a>;
  }
  return <>
    <button type="button" className={className} disabled={loading || !!user} onClick={() => { try { sessionStorage.setItem("rh_open_listing", route.pathname); } catch { /* ignore */ } setOpen(true); }}>{children}</button>
    {open && <AuthModal open onClose={() => setOpen(false)} initialMode="up"
      title="Create a free account to open the original listing"
      subtitle="Already registered? Sign in below. We will bring you back to this property."
      redirect={returnTo || route.pathname + route.search + route.hash} />}
  </>;
}
