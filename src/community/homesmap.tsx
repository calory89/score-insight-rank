// One map for every place homes are shown (6-oct-2026): the /map page, the map above the feed when
// a country is picked, and the map on a home's page. Zoom with buttons, pinch or the mouse wheel,
// drag on any device, street or satellite view, full screen, and a tap on a pin flies to the home.
// Loaded on demand so Leaflet never weighs on the first paint.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { money } from "./api";
import { feedAll, niceTitle, type Row, type FeedParams } from "./extras";
import { t } from "./i18n";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const short = (n?: number | null) => (n == null ? "" : n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`);
const touch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

type Props = {
  params?: FeedParams;          // load the homes with these feed filters
  rows?: Row[];                 // or pass them already loaded
  focus?: string | null;        // slug to centre on and open
  around?: { lat: number; lng: number; zoom?: number }; // centre without a pin of its own
  embedded?: boolean;           // inside a page: wheel zoom only after a click
  openFocus?: boolean;          // open the focused home's card (off on the home's own page)
  className?: string;
  onCount?: (n: number) => void;
};

export default function HomesMap({ params, rows, focus, around, embedded = false, openFocus = true, className = "", onCount }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const bounds = useRef<L.LatLngBounds | null>(null);
  const [full, setFull] = useState(false);
  const [armed, setArmed] = useState(!embedded);
  const [data, setData] = useState<Row[] | null>(rows || null);
  const [nb, setNb] = useState(0);
  const navigate = useNavigate();

  // Map, layers and controls: created once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      zoomControl: false, worldCopyJump: true, scrollWheelZoom: !embedded, dragging: !(embedded && touch), touchZoom: true,
      doubleClickZoom: true, tapTolerance: 18, zoomSnap: 0.5, minZoom: 2, maxZoom: 19,
    }).setView(around ? [around.lat, around.lng] : [44, 8], around?.zoom ?? 4);
    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 });
    const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Imagery © Esri", maxZoom: 19 });
    street.addTo(m);
    L.control.zoom({ position: "bottomright", zoomInTitle: t("Zoom in"), zoomOutTitle: t("Zoom out") }).addTo(m);
    L.control.layers({ [t("Map")]: street, [t("Satellite")]: sat }, undefined, { position: "topright", collapsed: false }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const click = (e: Event) => {
      const a = (e.target as HTMLElement).closest("a[data-slug]") as HTMLAnchorElement | null;
      if (a) { e.preventDefault(); setFull(false); navigate(`/deal/${a.dataset.slug}`); }
    };
    el.current.addEventListener("click", click);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); el.current?.removeEventListener("click", click); m.remove(); map.current = null; };
  }, []);

  // Wheel zoom inside a page only after the visitor clicks the map, so the page still scrolls.
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (armed || full) m.scrollWheelZoom.enable(); else m.scrollWheelZoom.disable();
    // On a phone an embedded map moves with one finger only after a tap, so the page still scrolls.
    if (armed || full || !touch) m.dragging.enable(); else m.dragging.disable();
  }, [armed, full]);

  // Full screen: Esc closes it, the page behind does not scroll.
  useEffect(() => {
    document.documentElement.classList.toggle("hm-lock", full);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    if (full) window.addEventListener("keydown", k);
    setTimeout(() => map.current?.invalidateSize(), 60);
    return () => { window.removeEventListener("keydown", k); document.documentElement.classList.remove("hm-lock"); };
  }, [full]);

  // Homes to show.
  useEffect(() => {
    if (rows) { setData(rows); return; }
    if (!params) return;
    let live = true;
    setData(null);
    feedAll(params).then((d) => { if (live) setData(d.rows || []); }).catch(() => live && setData([]));
    return () => { live = false; };
  }, [JSON.stringify(params), rows]);

  // Pins.
  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g || !data) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    let focused: L.Marker | null = null;
    const list = data.filter((d) => d.lat != null && d.lng != null);
    onCount?.(list.length);
    list.forEach((d) => {
      const isF = focus && d.slug === focus;
      const icon = L.divIcon({ className: "hm-pin-wrap", html: `<span class="hm-pin${isF ? " is-focus" : ""}">${esc(short(d.price_eur))}</span>`, iconSize: [0, 0] });
      const mk = L.marker([d.lat!, d.lng!], { icon, zIndexOffset: isF ? 1000 : 0, riseOnHover: true, keyboard: true, title: `${money(d.price_eur)} · ${d.location_name || ""}` });
      mk.bindPopup(
        `<a data-slug="${esc(d.slug)}" href="/deal/${esc(d.slug)}" class="hm-pop"><img src="${esc(d.image_urls?.[0] || "")}" alt="" loading="lazy"><b>${esc(money(d.price_eur))}</b><span>${esc(niceTitle(d))}</span><small>${esc(d.location_name || "")}</small><em>${esc(t("Open this home"))} →</em></a>`,
        { maxWidth: 240, minWidth: 220, autoPanPadding: [24, 24], closeButton: true }
      );
      // Tap a pin: fly in so you can see exactly where it is.
      mk.on("click", () => { const z = Math.max(m.getZoom(), 12); m.flyTo([d.lat!, d.lng!], z, { duration: 0.6 }); });
      mk.addTo(g); pts.push([d.lat!, d.lng!]);
      if (isF) focused = mk;
    });
    bounds.current = pts.length ? L.latLngBounds(pts) : null;
    setNb(pts.length);
    const place = () => {
      m.invalidateSize();
      if (focused) { m.setView((focused as L.Marker).getLatLng(), around?.zoom ?? 11); if (openFocus) (focused as L.Marker).openPopup(); }
      else if (around) m.setView([around.lat, around.lng], around.zoom ?? 11);
      else if (bounds.current) m.fitBounds(bounds.current, { padding: [30, 30], maxZoom: 10 });
    };
    place(); setTimeout(place, 250);
  }, [data, focus]);

  const fitAll = () => { const m = map.current; if (m && bounds.current) m.flyToBounds(bounds.current, { padding: [30, 30], maxZoom: 10, duration: 0.6 }); };
  const myPlace = () => {
    navigator.geolocation?.getCurrentPosition((p) => map.current?.flyTo([p.coords.latitude, p.coords.longitude], 9, { duration: 0.8 }), () => {}, { timeout: 8000 });
  };

  return (
    <div ref={wrap} className={`hm ${full ? "is-full" : ""} ${embedded ? "is-embedded" : ""} ${className}`} onClick={() => !armed && setArmed(true)}>
      <div ref={el} className="hm-map" role="region" aria-label={t("Map of homes")} />
      <div className="hm-tools">
        <button type="button" onClick={(e) => { e.stopPropagation(); setFull(!full); }} aria-pressed={full}>{full ? t("Close map") : t("Full screen")}</button>
        {nb > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); fitAll(); }}>{t("See all homes")}</button>}
        {"geolocation" in navigator && <button type="button" onClick={(e) => { e.stopPropagation(); myPlace(); }}>{t("Near me")}</button>}
      </div>
      {data === null && <div className="hm-loading">{t("Loading map…")}</div>}
      {embedded && !armed && !full && <div className="hm-hint">{touch ? t("Tap the map to move it · pinch to zoom") : t("Click the map to zoom with the mouse wheel")}</div>}
    </div>
  );
}
