// What the app adds to a prerendered listing page once it is on screen (see listing.ts): a share row (WhatsApp,
// email, copy link), a comparison table that sorts when a column heading is tapped, and the memory that makes
// "previous / next" and "back to your results" on a home's page follow this listing.
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Check, Link2, Mail, MessageCircle } from "lucide-react";
import { saveOrder } from "../v5";
import { storage } from "../buyer-state";
import { isEs } from "@/lib/lang";
import { cellValue, listingSlugs, shareLinks, sortOrder } from "./listing";
import Helpful from "./Helpful";
import "./n9.css";

const ev = (name: string) => { try { (window as any).clarity?.("event", name); } catch { /* blocked */ } };

export default function ListingTools({ host, path, spanish }: { host: RefObject<HTMLElement>; path: string; spanish: boolean }) {
  const es = spanish || isEs();
  const [copied, setCopied] = useState(false);
  // the share row sits at the end of the page's own article (inside the static HTML), not under its bottom margin
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const box = document.createElement("div");
    (root.querySelector("[data-rh-static]") || root).appendChild(box);
    setSlot(box);
    return () => { box.remove(); setSlot(null); };
  }, [host, path]);
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    // previous / next and the way back follow this listing
    const remember = (e: Event) => {
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || !/^(\/es)?\/deal\//.test(a.getAttribute("href") || "")) return;
      // the cards in the order shown, then any home only named in the text or the table
      saveOrder(listingSlugs([...root.querySelectorAll("a.ls-card[href]"), ...root.querySelectorAll("a[href]")].map((x) => x.getAttribute("href") || "")));
      storage.set("rh.catalog.return", path);
      storage.set("rh.listing.y", { path, y: Math.round(window.scrollY) });
    };
    // back from a home: the listing opens where the visitor left it (once)
    const was = storage.get<{ path?: string; y?: number } | null>("rh.listing.y", null);
    if (was && was.path === path && typeof was.y === "number" && was.y > 0) { storage.set("rh.listing.y", null); requestAnimationFrame(() => window.scrollTo(0, was.y!)); }
    root.addEventListener("click", remember, true);
    // sortable comparison table
    const offs: (() => void)[] = [];
    root.querySelectorAll("table").forEach((table) => {
      const body = table.tBodies[0]; const heads = [...(table.tHead?.rows[0]?.cells || [])];
      if (!body || body.rows.length < 3) return;
      heads.forEach((th, col) => {
        th.classList.add("n9-sort"); th.tabIndex = 0; th.setAttribute("role", "columnheader");
        th.title = es ? "Ordenar por esta columna" : "Sort by this column";
        const go = () => {
          const dir: 1 | -1 = th.getAttribute("aria-sort") === "ascending" ? -1 : 1;
          const rows = [...body.rows];
          const vals = rows.map((r) => { const c = r.cells[col]; return c ? cellValue(c.textContent || "", c.querySelector("time")?.getAttribute("datetime")) : null; });
          sortOrder(vals, dir).forEach((i) => body.appendChild(rows[i]));
          heads.forEach((h) => h.removeAttribute("aria-sort"));
          th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
          ev("listing_sort");
        };
        const key = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
        th.addEventListener("click", go); th.addEventListener("keydown", key);
        offs.push(() => { th.removeEventListener("click", go); th.removeEventListener("keydown", key); });
      });
    });
    return () => { root.removeEventListener("click", remember, true); offs.forEach((f) => f()); };
  }, [host, path, es]);
  const url = typeof location !== "undefined" ? location.origin + location.pathname : "";
  const title = typeof document !== "undefined" ? document.title.replace(/\s*[·|]\s*RealHunt\s*$/, "") : "";
  const s = shareLinks(title, url);
  if (!slot) return null;
  return createPortal(<>
    <div className="n9-ltools" translate="no">
      <span>{es ? "Compartir esta lista" : "Share this list"}</span>
      <a href={s.whatsapp} target="_blank" rel="noopener noreferrer nofollow" onClick={() => ev("listing_share_wa")}><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a>
      <a href={s.email} onClick={() => ev("listing_share_mail")}><Mail size={16} aria-hidden="true" /> {es ? "Correo" : "Email"}</a>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ } ev("listing_share_copy"); }}>
        {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />} <span aria-live="polite">{copied ? (es ? "Enlace copiado" : "Link copied") : (es ? "Copiar enlace" : "Copy link")}</span>
      </button>
    </div>
    <Helpful id={"list" + path} />
  </>, slot);
}
