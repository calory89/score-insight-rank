import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur, IG, track } from "@/lib/rh";

const load = () => new Promise<any>((res) => {
  const w = window as any; if (w.L && w.L.markerClusterGroup) return res(w.L);
  const add = (h: string) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = h; document.head.appendChild(l); };
  add("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"); add("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"); add("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css");
  const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = () => { const c = document.createElement("script"); c.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"; c.onload = () => res(w.L); document.head.appendChild(c); }; document.head.appendChild(s);
});

const MapPage = () => {
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const [n, setN] = useState(0);
  useEffect(() => {
    document.title = "Map of the best homes, ranked by score · RealHunt"; track("map_view");
    let map: any;
    Promise.all([load(), db.from("ig_finds").select("shortcode,lat,lng,price_eur,location_name,hook,image_urls").neq("status", "hidden").not("lat", "is", null).lte("price_eur", 100000)]).then(([L, { data }]: any) => {
      if (!ref.current) return;
      map = L.map(ref.current, { worldCopyJump: true }).setView([45, 20], 3);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(map);
      const g = L.markerClusterGroup({ maxClusterRadius: 40 });
      const items: IG[] = data || []; setN(items.length);
      items.forEach((f) => {
        const icon = L.divIcon({ className: "", html: `<div style="background:#141414;color:#fff;font:600 12px Inter,system-ui;padding:4px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)">${f.price_eur ? eur(f.price_eur) : "?"}</div>`, iconAnchor: [30, 12] });
        const m = L.marker([f.lat, f.lng], { icon });
        m.bindPopup(`<a href="/find/${f.shortcode}" style="display:block;width:200px;text-decoration:none;color:#141414"><img src="${f.image_urls?.[0] || ""}" style="width:200px;height:140px;object-fit:cover;border-radius:10px;display:block"><b style="display:block;margin-top:6px">${f.price_eur ? eur(f.price_eur) : ""} · ${f.location_name || ""}</b><span style="font-size:12px;color:#555">${f.hook || ""}</span></a>`);
        g.addLayer(m);
      });
      map.addLayer(g);
      const eb = L.marker([-9.4, 119.6], { icon: L.divIcon({ className: "", html: `<div style="background:#d4420c;color:#fff;font:600 12px Inter,system-ui;padding:4px 8px;border-radius:999px;white-space:nowrap">€36,500 furnished cabin</div>`, iconAnchor: [50, 12] }) });
      eb.on("click", () => nav("/ecobeachcity")); eb.addTo(map);
    });
    return () => { try { map && map.remove(); } catch {} };
  }, []);
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <RHNav />
      <div className="max-w-[1240px] w-full mx-auto px-4 md:px-6 pt-4 pb-2 flex items-baseline justify-between"><h1 className="font-display text-[26px] tracking-tight">{n} homes on the map</h1><span className="text-[13px] text-ink-muted">Tap a price to open the home</span></div>
      <div ref={ref} className="flex-1 min-h-[70vh] z-0" />
    </div>
  );
};
export default MapPage;
