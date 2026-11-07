// One map for every place homes are shown (6-oct-2026): the /map page, the map above the feed when
// a country is picked, and the map on a home's page. Zoom with buttons, pinch or the mouse wheel,
// drag on any device, street or satellite view, full screen, and a tap on a pin flies to the home.
// Loaded on demand so Leaflet never weighs on the first paint.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useNavigationType } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { money } from "./api";
import { feedAll, niceTitle, type Row, type FeedParams } from "./extras";
import { t } from "./i18n";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
// Price colours (6-oct-2026): strong green = very cheap, light green around €50-60k, then soft red
// for €70-100k. Never a strong red, because every home here is still a good price.
const STOPS: [number, number[]][] = [[0, [11, 107, 52]], [30000, [22, 135, 63]], [45000, [63, 164, 90]], [55000, [124, 196, 122]], [65000, [185, 221, 154]], [72000, [246, 205, 190]], [85000, [242, 172, 156]], [100000, [236, 147, 132]]];
export function priceColor(p?: number | null) {
  const v = Math.max(0, Math.min(100000, p ?? 100000));
  let i = 0; while (i < STOPS.length - 2 && v > STOPS[i + 1][0]) i++;
  const [a, ca] = STOPS[i], [b, cb] = STOPS[i + 1];
  const f = b === a ? 0 : (v - a) / (b - a);
  const c = ca.map((x, k) => Math.round(x + (cb[k] - x) * f));
  const lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  return { bg: `rgb(${c.join(",")})`, fg: lum > 0.6 ? "#1E2420" : "#fff" };
}
const short = (n?: number | null) => (n == null ? "" : n >= 999500 ? `€${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M` : n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`);
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
  // 7-nov-2026 (Carlos: "si vuelvo atrás tras ver algo en el mapa debe volver al mapa donde estaba"): the
  // view is saved on every move; coming back with the browser's back button restores it instead of
  // re-fitting the map on Europe. Only the full map page (not maps embedded in other pages) does this.
  const navType = useNavigationType();
  const VIEW_KEY = "rh-map-view:" + JSON.stringify(params || {});
  const lastView = useRef<{ lat: number; lng: number; z: number } | null>(null);
  useEffect(() => () => { if (!embedded && lastView.current) try { sessionStorage.setItem(VIEW_KEY, JSON.stringify({ ...lastView.current, left: true, t: Date.now() })); } catch { /* private mode */ } }, [VIEW_KEY]);
  const restoreView = useRef<{ lat: number; lng: number; z: number } | null>((() => {
    if (embedded || navType !== "POP") return null;
    // Only after leaving the map inside the site (marked on unmount): a fresh visit or a reload also counts
    // as "POP" but leaves no mark, so it opens normally (or on ?focus=).
    try { const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || "null"); sessionStorage.removeItem(VIEW_KEY); return v && v.left && Number.isFinite(v.lat) && Date.now() - v.t < 3600e3 ? v : null; } catch { return null; }
  })());
  // Region buttons: the map opens on Europe (most homes), so homes elsewhere (Miami, Bali, Mexico...) get a
  // visible shortcut instead of hiding off-screen until someone presses "See all homes".
  const [regions, setRegions] = useState<{ k: string; label: string; n: number; b: L.LatLngBounds }[]>([]);
  const navigate = useNavigate();
  const openSlug = useRef<string | null>(null);
  const keepOpen = useRef(false);
  // Keep the open card fully inside the map, clear of the buttons on top and the zoom buttons below.
  const fitPopup = () => {
    const m = map.current; const pop = m && ((m as any)._popup as L.Popup | undefined);
    if (!m || !pop || !m.hasLayer(pop)) return;
    pop.update();
    const node = pop.getElement(); const box = el.current?.getBoundingClientRect(); if (!node || !box) return;
    const r = node.getBoundingClientRect();
    const tools = wrap.current?.querySelector(".hm-tools") as HTMLElement | null;
    const top = box.top + (tools ? tools.offsetTop + tools.offsetHeight + 8 : 12), left = box.left + 10, right = box.right - 10, bottom = box.bottom - 44; // keep the pin under the card visible too
    let dx = 0, dy = 0;
    if (r.width > right - left) dx = r.left - left; else if (r.left < left) dx = r.left - left; else if (r.right > right) dx = r.right - right;
    if (r.top < top) dy = r.top - top; else if (r.bottom > bottom) dy = r.bottom - bottom;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) m.panBy([dx, dy], { animate: true, duration: 0.25 });
  };

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
    (m as any)._hmLayers = { street, sat };
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    m.on("popupopen", (e: any) => {
      openSlug.current = (e.popup?._source as any)?._slug || null;
      const img = e.popup.getElement()?.querySelector("img") as HTMLImageElement | null;
      if (img && !img.complete) img.addEventListener("load", () => setTimeout(fitPopup, 0), { once: true });
      setTimeout(fitPopup, 0);
    });
    m.on("popupclose", () => { if (!keepOpen.current) setTimeout(() => { if (!m.hasLayer((m as any)._popup)) openSlug.current = null; }, 0); });
    const click = (e: Event) => {
      const a = (e.target as HTMLElement).closest("a[data-slug]") as HTMLAnchorElement | null;
      if (a) { e.preventDefault(); setFull(false); navigate(`/deal/${a.dataset.slug}`); }
    };
    el.current.addEventListener("click", click);
    const ro = new ResizeObserver(() => { const n = el.current; if (n && n.isConnected && n.offsetWidth) m.invalidateSize({ animate: false }); });
    ro.observe(el.current);
    return () => { ro.disconnect(); el.current?.removeEventListener("click", click); try { m.off(); (m as any)._stop?.(); (m as any)._panAnim?.off?.(); } catch {} m.remove(); map.current = null; };
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

  // Pins. Close pins are grouped into a round counter that zooms in when tapped, so a country never
  // turns into a pile of overlapping prices; at street level every home has its own price pin.
  const sat = useRef(false);
  const [isSat, setIsSat] = useState(false);
  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g || !data) return;
    const list = data.filter((d) => d.lat != null && d.lng != null);
    onCount?.(list.length);
    const pts: L.LatLngExpression[] = list.map((d) => [d.lat!, d.lng!]);
    bounds.current = pts.length ? L.latLngBounds(pts) : null;
    setNb(pts.length);
    const REG: [string, string, (la: number, lo: number) => boolean][] = [
      ["eu", "Europe", (la, lo) => la > 27 && la < 72 && lo > -30 && lo < 45],
      ["am", "Americas", (_la, lo) => lo <= -30],
      ["as", "Asia & Pacific", (_la, lo) => lo >= 60],
      ["af", "Africa & Middle East", (la, lo) => lo > -30 && lo < 60 && !(la > 27 && la < 72 && lo < 45)],
    ];
    const regs = REG.map(([k, label, f]) => { const g = list.filter((d) => f(d.lat!, d.lng!)); return { k, label, n: g.length, b: L.latLngBounds(g.map((d) => [d.lat!, d.lng!] as L.LatLngExpression)) }; }).filter((r) => r.n > 0);
    setRegions(regs.length > 1 ? regs : []);
    let focusedMk: L.Marker | null = null;
    // 12-oct-2026 (Carlos: "when you zoom, what opens no longer fits"). The card now sits above the pin
    // (not on top of it), is re-measured when its photo loads, is kept inside the map (clear of the
    // buttons) after every zoom or move, and stays open on the same home when the pins are redrawn.
    const small = () => (wrap.current?.clientWidth || 999) < 520;
    const popW = () => (small() ? 200 : 220);
    const popHtml = (d: Row) => `<a data-slug="${esc(d.slug)}" href="/deal/${esc(d.slug)}" class="hm-pop"><img src="${esc(d.image_urls?.[0] || "")}" alt="" loading="eager" decoding="async"><b>${esc(money(d.price_eur))}</b><span>${esc(niceTitle(d))}</span><small>${esc(d.location_name || "")}</small><em>${esc(t("Open this home"))} →</em></a>`;
    const popOpts = () => ({ maxWidth: popW() + 20, minWidth: popW(), autoPan: false, closeButton: true, className: "hm-popup" } as L.PopupOptions);
    const pinFor = (d: Row) => {
      const isF = !!focus && d.slug === focus;
      const icon = L.divIcon({ className: "hm-pin-wrap", html: `<span class="hm-pin${isF ? " is-focus" : ""}" style="--pc:${priceColor(d.price_eur).bg};--pf:${priceColor(d.price_eur).fg}">${esc(short(d.price_eur))}</span>`, iconSize: [0, 0], popupAnchor: [0, isF ? -38 : -32] });
      const mk = L.marker([d.lat!, d.lng!], { icon, zIndexOffset: isF ? 1000 : 0, riseOnHover: true, keyboard: true, title: `${money(d.price_eur)} · ${d.location_name || ""}` });
      (mk as any)._slug = d.slug;
      mk.bindPopup(popHtml(d), popOpts());
      // Tap a pin: fly in so you can see exactly where it is; the card is fitted once the flight ends.
      mk.on("click", () => { const z = Math.max(m.getZoom(), 12); const h = m.getSize().y; const up = Math.min(140, h * 0.3); const c = m.unproject(m.project([d.lat!, d.lng!], z).subtract([0, up]), z); if (z !== m.getZoom() || m.getCenter().distanceTo(c) > 50) m.flyTo(c, z, { duration: 0.6 }); else fitPopup(); });
      if (isF) focusedMk = mk;
      return mk;
    };
    // Several homes on the same spot (pins show the village, not the house): one pin that opens a list.
    const listFor = (grp: Row[], at?: L.LatLng) => {
      const from = Math.min(...grp.map((d) => d.price_eur || 0));
      const icon = L.divIcon({ className: "hm-pin-wrap", html: `<span class="hm-cl" style="--pc:${priceColor(from).bg};--pf:${priceColor(from).fg}"><b>${grp.length}</b><small>${esc(t("from"))} ${esc(short(from))}</small></span>`, iconSize: [0, 0], popupAnchor: [0, -26] });
      const mk = L.marker(at || [grp[0].lat!, grp[0].lng!], { icon, title: `${grp.length} homes` });
      (mk as any)._slug = "list:" + grp.map((d) => d.slug).sort().join(",");
      const items = [...grp].sort((a, b) => (a.price_eur || 0) - (b.price_eur || 0)).slice(0, 12)
        .map((d) => `<a data-slug="${esc(d.slug)}" href="/deal/${esc(d.slug)}" class="hm-li"><img src="${esc(d.image_urls?.[0] || "")}" alt="" loading="lazy"><span><b>${esc(money(d.price_eur))}</b><small>${esc(niceTitle(d))}</small></span></a>`).join("");
      mk.bindPopup(`<div class="hm-list"><p>${esc(grp[0].location_name || "")} · ${grp.length}</p>${items}</div>`, { ...popOpts(), maxWidth: popW() + 40, minWidth: popW() + 20 });
      return mk;
    };
    const draw = () => {
      const open = openSlug.current;
      g.clearLayers(); focusedMk = null;
      const cell = 66, cells = new Map<string, Row[]>(), deep = m.getZoom() >= 13;
      for (const d of list) {
        if (focus && d.slug === focus) { g.addLayer(pinFor(d)); continue; }
        const p = m.latLngToLayerPoint([d.lat!, d.lng!]);
        const k = deep ? `${d.lat!.toFixed(4)}:${d.lng!.toFixed(4)}` : `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
        (cells.get(k) || cells.set(k, []).get(k)!).push(d);
      }
      // 30-oct-2026: neighbouring groups used to be drawn on top of each other (a "141" bubble hidden
      // under a "102" one). Groups whose pins or bubbles would overlap on screen are merged until none do.
      type G = { rows: Row[]; x: number; y: number };
      let groups: G[] = [...cells.values()].map((rows) => {
        const ps = rows.map((d) => m.latLngToLayerPoint([d.lat!, d.lng!]));
        return { rows, x: ps.reduce((a, q) => a + q.x, 0) / ps.length, y: ps.reduce((a, q) => a + q.y, 0) / ps.length };
      });
      // 7-nov-2026 (Carlos, phone screenshot of Aventura): prices overlapped at street level, where groups
      // were never merged, and the box sizes were guessed too small for "233.000 €" / "desde 246.000 €".
      // Sizes now come from the label length; a price pin sits above its point, a group is centred on it.
      {
        const charW = 7.4;
        const size = (g: G): [number, number, number] => {
          if (g.rows.length === 1) return [22 + charW * short(g.rows[0].price_eur).length, 30, -17];
          const from = Math.min(...g.rows.map((d) => d.price_eur || 0));
          return [Math.max(52, 24 + 6.4 * (t("from").length + 1 + short(from).length)), 52, 0];
        };
        for (let merged = true, guard = 0; merged && guard < 200; guard++) {
          merged = false;
          outer: for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
            const a = groups[i], b = groups[j], [wa, ha, oa] = size(a), [wb, hb, ob] = size(b);
            if (Math.abs(a.x - b.x) < (wa + wb) / 2 + 4 && Math.abs(a.y + oa - (b.y + ob)) < (ha + hb) / 2 + 4) {
              const n = a.rows.length + b.rows.length;
              groups[i] = { rows: [...a.rows, ...b.rows], x: (a.x * a.rows.length + b.x * b.rows.length) / n, y: (a.y * a.rows.length + b.y * b.rows.length) / n };
              groups.splice(j, 1); merged = true; break outer;
            }
          }
        }
      }
      let reopened: L.Marker | null = null;
      groups.map((x) => x.rows).forEach((grp) => {
        if (grp.length === 1) { const mk = pinFor(grp[0]); g.addLayer(mk); if (open && (mk as any)._slug === open) reopened = mk; return; }
        const b = L.latLngBounds(grp.map((d) => [d.lat!, d.lng!] as L.LatLngExpression));
        const same = b.getNorthEast().distanceTo(b.getSouthWest()) < 30;
        const gp0 = groups.find((x) => x.rows === grp);
        if (same || deep) { const mk = listFor(grp, gp0 ? m.layerPointToLatLng(L.point(gp0.x, gp0.y)) : undefined); g.addLayer(mk); if (open && ((mk as any)._slug === open || grp.some((d) => d.slug === open))) reopened = mk; return; }
        const from = Math.min(...grp.map((d) => d.price_eur || 0));
        const icon = L.divIcon({ className: "hm-pin-wrap", html: `<span class="hm-cl" style="--pc:${priceColor(from).bg};--pf:${priceColor(from).fg}"><b>${grp.length}</b><small>${esc(t("from"))} ${esc(short(from))}</small></span>`, iconSize: [0, 0] });
        const gp = groups.find((x) => x.rows === grp);
        const c = L.marker(gp ? m.layerPointToLatLng(L.point(gp.x, gp.y)) : b.getCenter(), { icon, title: `${grp.length} homes` });
        c.on("click", () => { const z = m.getBoundsZoom(b, false, L.point(60, 60)); if (z > m.getZoom()) m.flyToBounds(b, { padding: [60, 60], maxZoom: 15, duration: 0.6 }); else m.flyTo(b.getCenter(), Math.min(m.getZoom() + 3, 16), { duration: 0.6 }); });
        g.addLayer(c);
      });
      if (reopened) { keepOpen.current = true; (reopened as L.Marker).openPopup(); keepOpen.current = false; fitPopup(); }
      else if (open && !m.hasLayer((m as any)._popup)) openSlug.current = null;
    };
    m.on("zoomend", draw);
    const onMove = () => fitPopup();
    m.on("moveend", onMove);
    const place = () => {
      m.invalidateSize();
      const f = list.find((d) => focus && d.slug === focus);
      const rv = restoreView.current;
      if (rv) m.setView([rv.lat, rv.lng], rv.z, { animate: false });
      else if (f) m.setView([f.lat!, f.lng!], around?.zoom ?? 11);
      else if (around) m.setView([around.lat, around.lng], around.zoom ?? 11);
      else if (bounds.current) {
        // Most homes are in Europe: open on the region that holds most of them instead of a whole-world
        // view where every country is one overlapping bubble ("See all homes" still shows everything).
        const eu = list.filter((d) => d.lat! > 27 && d.lat! < 72 && d.lng! > -30 && d.lng! < 45);
        const b0 = eu.length >= Math.max(5, list.length * 0.6) && eu.length < list.length ? L.latLngBounds(eu.map((d) => [d.lat!, d.lng!] as L.LatLngExpression)) : bounds.current;
        m.fitBounds(b0, { padding: [30, 30], maxZoom: 10 });
      }
      draw();
      if (focusedMk && openFocus) { (focusedMk as L.Marker).openPopup(); fitPopup(); }
    };
    place(); const tm = setTimeout(() => { place(); restoreView.current = null; }, 250);
    const save = () => { if (embedded) return; try { const c = m.getCenter(); lastView.current = { lat: c.lat, lng: c.lng, z: m.getZoom() }; } catch { /* private mode */ } };
    m.on("moveend", save);
    return () => { clearTimeout(tm); m.off("zoomend", draw); m.off("moveend", onMove); m.off("moveend", save); };
  }, [data, focus]);

  // Street or satellite.
  const toggleSat = () => {
    const m = map.current; if (!m) return;
    const tl = (m as any)._hmLayers as { street: L.TileLayer; sat: L.TileLayer };
    sat.current = !sat.current; setIsSat(sat.current);
    if (sat.current) { m.removeLayer(tl.street); tl.sat.addTo(m); } else { m.removeLayer(tl.sat); tl.street.addTo(m); }
  };

  const fitRegion = (b: L.LatLngBounds) => { const m = map.current; if (m) m.flyToBounds(b, { padding: [30, 30], maxZoom: 11, duration: 0.6 }); };
  const fitAll = () => { const m = map.current; if (m && bounds.current) m.flyToBounds(bounds.current, { padding: [30, 30], maxZoom: 10, duration: 0.6 }); };
  const myPlace = () => {
    navigator.geolocation?.getCurrentPosition((p) => map.current?.flyTo([p.coords.latitude, p.coords.longitude], 9, { duration: 0.8 }), () => {}, { timeout: 8000 });
  };

  return (
    <>
    {regions.length > 1 && !embedded && <div className="hm-regions" role="group" aria-label={t("Go to a region")}>
      <span>{t("Go to")}</span>
      {regions.map((r) => <button key={r.k} type="button" onClick={() => fitRegion(r.b)}>{t(r.label)} <b>{r.n}</b></button>)}
    </div>}
    <div ref={wrap} className={`hm ${full ? "is-full" : ""} ${embedded ? "is-embedded" : ""} ${className}`} onClick={() => !armed && setArmed(true)}>
      <div ref={el} className="hm-map" role="region" aria-label={t("Map of homes")} />
      <div className="hm-tools">
        <button type="button" onClick={(e) => { e.stopPropagation(); setFull(!full); }} aria-pressed={full}>{full ? t("Close map") : t("Full screen")}</button>
        {nb > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); fitAll(); }}>{t("See all homes")}</button>}
        <button type="button" onClick={(e) => { e.stopPropagation(); toggleSat(); }} aria-pressed={isSat}>{isSat ? t("Map view") : t("Satellite")}</button>
        {"geolocation" in navigator && <button type="button" onClick={(e) => { e.stopPropagation(); myPlace(); }}>{t("Near me")}</button>}
      </div>
      <div className="hm-legend" aria-hidden="true"><i /><span><b>€20k</b><b>€60k</b><b>€100k+</b></span></div>
      {data === null && <div className="hm-loading">{t("Loading map…")}</div>}
      {embedded && !armed && !full && <div className="hm-hint">{touch ? t("Tap the map to move it · pinch to zoom") : t("Click the map to zoom with the mouse wheel")}</div>}
    </div>
    </>
  );
}
