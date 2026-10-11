// Map view for /weather. Loaded only when someone opens the map, so Leaflet never slows the first paint.
// Pins that would sit on top of each other are merged into the best one with a "+n" badge; tapping it zooms in.
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { overall, scoreBg, RAMP, type Place } from "./score";
import type { WX_TEXT } from "./text";

export default function MapView({ list, onOpen, S }: { list: Place[]; onOpen: (id: string) => void; S: typeof WX_TEXT.en }) {
  const box = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null), ov = useRef<L.ImageOverlay | null>(null);
  const listRef = useRef(list); listRef.current = list;
  const [opacity, setOpacity] = useState(0.65);

  const draw = () => {
    const m = map.current, g = layer.current; if (!m || !g) return;
    g.clearLayers();
    const items = listRef.current.map((p) => ({ p, s: overall(p), pt: m.latLngToLayerPoint([p.la, p.lo]) }))
      .sort((a, b) => (b.p.kind === "ebc" ? 1 : 0) - (a.p.kind === "ebc" ? 1 : 0) || (b.p.n ? 1 : 0) - (a.p.n ? 1 : 0) || b.s - a.s);
    const kept: { p: Place; s: number; pt: L.Point; more: Place[] }[] = [];
    for (const it of items) {
      const near = kept.find((k) => Math.abs(k.pt.x - it.pt.x) < (k.p.kind === "ebc" ? 120 : 36) && Math.abs(k.pt.y - it.pt.y) < 26);
      if (near && it.p.kind !== "ebc") near.more.push(it.p); else kept.push({ ...it, more: [] });
    }
    for (const k of kept) {
      const { p, s, more } = k;
      const html = p.kind === "ebc"
        ? `<div class="wx-pin ebc">★ Eco Beach City</div>`
        : `<div class="wx-pin${p.n ? "" : " empty"}${more.length ? " more" : ""}" style="--c:${scoreBg(s)}"><b>${s}</b>${more.length ? `<i>+${more.length}</i>` : ""}</div>`;
      const w = p.kind === "ebc" ? 130 : more.length ? 54 : 34;
      const icon = L.divIcon({ className: "", html, iconSize: [w, 24], iconAnchor: p.kind === "ebc" ? [14, 14] : [w / 2, 12] });
      const tip = S.tip(p.name, p.days, p.n) + (more.length ? `<br>${S.moreHere(more.length)}` : "");
      L.marker([p.la, p.lo], { icon, zIndexOffset: p.kind === "ebc" ? 1000 : p.n ? 100 : 0, keyboard: true, title: p.name })
        .bindTooltip(tip, { direction: "top", offset: [0, -10] })
        .on("click", () => {
          if (more.length && m.getZoom() < 9) m.fitBounds(L.latLngBounds([p, ...more].map((x) => [x.la, x.lo] as [number, number])).pad(0.6), { maxZoom: Math.min(m.getZoom() + 4, 11) });
          else onOpen(p.id);
        }).addTo(g);
    }
  };

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { center: [30, 15], zoom: 2, minZoom: 2, maxZoom: 12, worldCopyJump: true, scrollWheelZoom: false, zoomSnap: 0.5 });
    m.on("click", () => m.scrollWheelZoom.enable());
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri · climate: CRU CL 2.0", maxZoom: 16 }).addTo(m);
    m.createPane("heat"); m.getPane("heat")!.style.zIndex = "350";
    ov.current = L.imageOverlay("/weather/overlay.webp", [[-56, -180], [72, 180]], { opacity: 0.65, pane: "heat", interactive: false }).addTo(m);
    m.createPane("labels"); m.getPane("labels")!.style.zIndex = "450"; m.getPane("labels")!.style.pointerEvents = "none";
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { pane: "labels", maxZoom: 16 }).addTo(m);
    layer.current = L.layerGroup().addTo(m); map.current = m;
    m.on("zoomend", draw);
    return () => { m.remove(); map.current = null; };
  }, []);
  useEffect(() => { ov.current?.setOpacity(opacity); }, [opacity]);
  // show exactly the places that match: fit the map to them, then draw the pins
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (list.length) {
      const b = L.latLngBounds(list.map((p) => [p.la, p.lo] as [number, number]));
      m.fitBounds(b.pad(0.15), { maxZoom: list.length === 1 ? 8 : 6, animate: false });
    }
    draw();
  }, [list]);

  return (
    <section className="wx-mapwrap">
      <div ref={box} className="wx-map" />
      <div className="wx-maphint">{S.mapHint}</div>
      <div className="wx-legend">
        <b>{S.legend}</b>
        <div className="wx-ramp" style={{ background: `linear-gradient(90deg,${RAMP.map(([v, c]) => `${c} ${(v / 300) * 100}%`).join(",")})` }} />
        <div className="wx-ticks"><span>0</span><span>100</span><span>200</span><span>300</span></div>
        <label>{S.colours} <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} /></label>
      </div>
    </section>
  );
}
