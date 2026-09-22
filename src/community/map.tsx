// Map of every ranked home. Loaded on demand so Leaflet never weighs on the home page.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { money } from "./api";
import { feedAll, niceTitle, type Row, Filters, type FeedParams } from "./extras";
import { t } from "./i18n";

const esc = (s: string) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export default function MapView() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [f, setF] = useState<FeedParams>({ scope: "all" });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [n, setN] = useState<number | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Map of homes under €60,000 · RealHunt";
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, worldCopyJump: true }).setView([40.5, 3], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 17 }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const click = (e: Event) => {
      const a = (e.target as HTMLElement).closest("a[data-slug]") as HTMLAnchorElement | null;
      if (a) { e.preventDefault(); navigate(`/deal/${a.dataset.slug}`); }
    };
    el.current.addEventListener("click", click);
    return () => { el.current?.removeEventListener("click", click); map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    feedAll(f).then((data) => {
      setCounts(data.countries_count || {});
      const rows = data.rows.filter((r: Row) => r.lat != null && r.lng != null);
      setN(rows.length);
      if (!layer.current || !map.current) return;
      layer.current.clearLayers();
      const pts: L.LatLngExpression[] = [];
      rows.forEach((d) => {
        const m = L.circleMarker([d.lat!, d.lng!], { radius: 8, color: "#fff", weight: 2, fillColor: "#16150F", fillOpacity: 0.9 });
        m.bindTooltip(esc(money(d.price_eur)), { direction: "top", offset: [0, -6], className: "hunt-pin-tip" });
        m.bindPopup(`<a data-slug="${esc(d.slug)}" href="/deal/${esc(d.slug)}" class="hunt-pin-pop"><img src="${esc(d.image_urls?.[0] || "")}" alt=""><b>${esc(money(d.price_eur))}</b><span>${esc(niceTitle(d))}</span><small>${esc(d.location_name || "")} · approximate location</small></a>`);
        m.addTo(layer.current!); pts.push([d.lat!, d.lng!]);
      });
      map.current.invalidateSize();
      if (pts.length) { const fit = () => { if (!map.current) return; map.current.invalidateSize(); map.current.fitBounds(L.latLngBounds(pts), { padding: [6, 6], maxZoom: 9 }); }; fit(); setTimeout(fit, 250); }
    }).catch(() => setN(0));
  }, [JSON.stringify(f)]);
  return (
    <div className="hunt-wrap hunt-mappage">
      <h1>{t("Map")}</h1>
      <Filters countries={counts} value={f} onChange={(v) => setF({ ...v, scope: "all" })} />
      <p className="hunt-fine">{n === null ? "Loading…" : `${n} homes. Pins show the village, not the exact house.`}</p>
      <div ref={el} className="hunt-map" />
    </div>
  );
}
