import { useState, type ComponentProps } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

// Anonymous visitors never receive an outbound anchor, including via context menus.
export default function OriginalListingLink({ href, children, className, onClick, returnTo, ...props }: ComponentProps<"a"> & { returnTo?: string }) {
  const { user, loading } = useAuth();
  const route = useLocation();
  const [open, setOpen] = useState(false);
  if (user && href && /^https?:\/\//i.test(href)) {
    return <a {...props} href={href} className={className} onClick={onClick} target="_blank" rel="noopener noreferrer nofollow">{children}</a>;
  }
  return <>
    <button type="button" className={className} disabled={loading || !!user} onClick={() => setOpen(true)}>{children}</button>
    {open && <AuthModal open onClose={() => setOpen(false)} initialMode="up"
      title="Create a free account to open the original listing"
      subtitle="Already registered? Sign in below. We will bring you back to this property."
      redirect={returnTo || route.pathname + route.search + route.hash} />}
  </>;
}
