// 26-nov-2026 (list of 1,000, batch 11: 506, 521, 544). The phone tab bar's last tab is "More": a bottom sheet with
// the content sections (countries, guides, calculators, research, blog), the profile and the language switch, which
// phones did not show anywhere before. It reuses the filter sheet's look (rh-fs-* in mobile-ux.css): Escape and the
// backdrop close it, focus goes to the close button and comes back to the tab. The Spanish words are written here.
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { isEs } from "@/lib/lang";
import { LangSwitch } from "./extras";
import "./mobile-ux.css";

const EN = { title: "More", close: "Close menu", lang: "Language", links: [["/homes", "Homes by country"], ["/new", "New homes"], ["/price-drops", "Price drops"], ["/guide", "Buying guides"], ["/tools", "Free calculators"], ["/costs", "Buying costs"], ["/research", "Research and data"], ["/blog", "Blog"], ["/me", "Profile"], ["/sitemap", "All pages"]] };
const ES: typeof EN = { title: "Más", close: "Cerrar menú", lang: "Idioma", links: [["/homes", "Casas por país"], ["/new", "Casas nuevas"], ["/price-drops", "Bajadas de precio"], ["/guide", "Guías de compra"], ["/tools", "Calculadoras gratis"], ["/costs", "Costes de compra"], ["/research", "Estudios y datos"], ["/blog", "Blog"], ["/me", "Perfil"], ["/sitemap", "Todas las páginas"]] };

export const moreLabel = () => (isEs() ? ES.title : EN.title);

export function MoreSheet({ onClose }: { onClose: () => void }) {
  const x = isEs() ? ES : EN;
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="rh-fs-root rh-more-root">
      <div className="rh-fs-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="rh-fs rh-more" role="dialog" aria-modal="true" aria-labelledby="rh-more-title">
        <span className="rh-fs-grip" aria-hidden="true" />
        <header className="rh-fs-head">
          <h2 id="rh-more-title">{x.title}</h2>
          <button ref={close} type="button" className="rh-fs-x" aria-label={x.close} onClick={onClose}><X size={20} /></button>
        </header>
        <nav className="rh-more-links" aria-label={x.title}>
          {x.links.map(([to, l]) => <Link key={to} to={to} onClick={onClose}>{l}</Link>)}
        </nav>
        <div className="rh-more-lang"><span>{x.lang}</span><LangSwitch /></div>
      </div>
    </div>
  );
}
