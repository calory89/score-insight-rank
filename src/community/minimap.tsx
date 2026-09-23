// Small map on a home page. Loaded on demand so Leaflet never weighs on the page.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export default function MiniMap({ lat, lng, zoom = 11 }: { lat: number; lng: number; zoom?: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, attributionControl: true }).setView([lat, lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 16 }).addTo(m);
    L.circle([lat, lng], { radius: zoom >= 10 ? 1800 : 22000, color: "#0EA5E9", weight: 2, fillColor: "#0EA5E9", fillOpacity: 0.18 }).addTo(m);
    L.circleMarker([lat, lng], { radius: 7, color: "#fff", weight: 3, fillColor: "#16150F", fillOpacity: 1 }).addTo(m);
    setTimeout(() => m.invalidateSize(), 200);
    return () => { m.remove(); };
  }, [lat, lng, zoom]);
  return <div ref={el} className="hv-minimap" />;
}
