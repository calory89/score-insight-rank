// realhunt.co/weather (11-oct-2026): where the weather is good most of the year, and only the good homes there.
// The colours are our own estimate of comfortable days per year (daily high 18–33 °C, a dry day, light wind) from
// the CRU CL 2.0 climate normals, computed once and shipped as an image. Homes are RealHunt homes and new builds
// scoring 80+ in places with 170+ comfortable days. Grey pins are sunny places we don't cover yet.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Home = { k: "h" | "n"; s: string; dest?: string; n: number; d: number; la: number; lo: number; p?: number | null; t: string; l?: string; i?: string | null; c?: string };
type Spot = { k: "s"; t: string; c: string; la: number; lo: number; d: number };
type Data = { homes: Home[]; spots: Spot[]; ebc: { t: string; la: number; lo: number; d: number }; T: number };

const VIEWS: Record<string, { c: [number, number]; z: number; label: string }> = {
  med: { c: [37.6, 8], z: 5, label: "Mediterranean" },
  spain: { c: [37.2, -2.6], z: 7, label: "San José & SE Spain" },
  sumba: { c: [-8.8, 117], z: 6, label: "Sumba & Bali" },
  americas: { c: [12, -85], z: 3, label: "Americas" },
  world: { c: [20, 10], z: 2, label: "World" },
};
const RAMP = [[0, "#f6d4f4"], [40, "#ce96ec"], [80, "#7d78f0"], [115, "#3cafef"], [140, "#3ccd96"], [160, "#aade3c"], [175, "#ffd728"], [195, "#ff911e"], [220, "#e8371e"], [260, "#960023"]] as const;
const dayColor = (d: number) => { let c: string = RAMP[0][1]; for (const [v, col] of RAMP) if (d >= v) c = col; return c; };
const scoreColor = (n: number) => (n >= 90 ? "#0F6B34" : n >= 85 ? "#1E8A47" : "#2E9E5B");
const money = (n?: number | null) => (n == null ? "" : n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : `€${Math.round(n / 1000)}k`);
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const homeUrl = (h: Home) => (h.k === "n" ? `/top/${h.dest}/${h.s}` : `/deal/${h.s}`);
const months = (d: number) => Math.round((d / 365) * 12);
const zf = (z: number) => (typeof window !== "undefined" && window.innerWidth < 640 ? Math.max(2, z - 1) : z); // phones see a bit more

function setMeta(title: string, desc: string) {
  document.title = title;
  const m = (sel: string, attr: string, val: string) => { const e = document.querySelector(sel); if (e) e.setAttribute(attr, val); };
  m('meta[name="description"]', "content", desc); m('meta[property="og:title"]', "content", title); m('meta[property="og:description"]', "content", desc);
  m('meta[property="og:image"]', "content", "https://realhunt.co/weather/og.jpg"); m('meta[name="twitter:image"]', "content", "https://realhunt.co/weather/og.jpg");
}

export default function Weather() {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState<keyof typeof VIEWS>("med");
  const [minDays, setMinDays] = useState(150);
  const [sort, setSort] = useState<"days" | "score">("days");
  const [minScore, setMinScore] = useState(80);
  const [show, setShow] = useState({ h: true, n: true, s: true });
  const [opacity, setOpacity] = useState(0.7);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const overlay = useRef<L.ImageOverlay | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    setMeta("Good weather all year: the best homes in the sunniest places · RealHunt", "A world map of comfortable days per year (18–33 °C, dry, light wind) with only the homes that score 80+ where the weather is good most of the year. Mediterranean, Canaries, Mexico, Bali, Sumba.");
    fetch("/weather/data.json").then((r) => r.json()).then(setData).catch(() => setData({ homes: [], spots: [], ebc: { t: "Eco Beach City, Sumba", la: -9.7, lo: 119.37, d: 185 }, T: 170 }));
  }, []);

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { center: VIEWS.med.c, zoom: zf(VIEWS.med.z), minZoom: 2, maxZoom: 12, worldCopyJump: true, zoomControl: true, scrollWheelZoom: false });
    m.on("click", () => m.scrollWheelZoom.enable());
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri · climate: CRU CL 2.0", maxZoom: 16 }).addTo(m);
    m.createPane("heat"); m.getPane("heat")!.style.zIndex = "350";
    overlay.current = L.imageOverlay("/weather/overlay.webp", [[-56, -180], [72, 180]], { opacity: 0.7, pane: "heat", interactive: false }).addTo(m);
    m.createPane("labels"); m.getPane("labels")!.style.zIndex = "450"; m.getPane("labels")!.style.pointerEvents = "none";
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { pane: "labels", maxZoom: 16 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => { overlay.current?.setOpacity(opacity); }, [opacity]);
  useEffect(() => { const v = VIEWS[view]; map.current?.flyTo(v.c, zf(v.z), { duration: 0.8 }); }, [view]);

  const homes = useMemo(() => (data?.homes || []).filter((h) => h.d >= minDays && h.n >= minScore && show[h.k]).sort((a, b) => (sort === "days" ? b.d - a.d || b.n - a.n : b.n - a.n || b.d - a.d)), [data, minDays, minScore, show, sort]);
  const spots = useMemo(() => (data?.spots || []).filter((s) => s.d >= Math.min(minDays, 150) && show.s), [data, minDays, show]);

  useEffect(() => {
    const g = layer.current; if (!g || !data) return;
    g.clearLayers();
    for (const s of spots) {
      L.circleMarker([s.la, s.lo], { radius: 5, color: "#fff", weight: 1.5, fillColor: "#3a3f46", fillOpacity: 0.85 })
        .bindPopup(`<div style="font:13px system-ui;min-width:190px"><b>${esc(s.t)}</b><br><span style="color:${dayColor(s.d)};font-weight:800">☀ ${s.d}</span> comfortable days a year<br><span style="color:#5b636b">No RealHunt homes here yet.</span><br><a href="/find-my-home/${encodeURIComponent(s.t.split(",")[0].toLowerCase())}" style="color:#D4420C;font-weight:700">Find me a home here →</a></div>`)
        .bindTooltip(`${esc(s.t)} · ☀ ${s.d}`, { direction: "top", offset: [0, -4] }).addTo(g);
    }
    for (const h of homes) {
      const icon = L.divIcon({ className: "", iconSize: [34, 22], iconAnchor: [17, 11], html: `<div style="background:${scoreColor(h.n)};color:#fff;font:800 12px system-ui;border-radius:999px;padding:3px 0;width:34px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff">${h.n}</div>` });
      L.marker([h.la, h.lo], { icon }).bindPopup(`<div style="font:13px system-ui;width:220px">${h.i ? `<img src="${esc(h.i)}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:6px" loading="lazy">` : ""}<b>${esc(h.t)}</b><br><span style="color:#5b636b">${esc(h.l || "")}</span><br><b>${money(h.p)}</b> · score <b style="color:${scoreColor(h.n)}">${h.n}</b> · <span style="color:${dayColor(h.d)};font-weight:800">☀ ${h.d}</span> days<br><a href="${homeUrl(h)}" style="color:#D4420C;font-weight:700">See this home →</a></div>`).addTo(g);
    }
    const e = data.ebc;
    const star = L.divIcon({ className: "", iconSize: [150, 34], iconAnchor: [17, 17], html: `<div style="display:flex;align-items:center;gap:6px"><div style="width:30px;height:30px;border-radius:50%;background:#D4420C;color:#fff;display:grid;place-items:center;font:900 16px system-ui;border:3px solid #fff;box-shadow:0 0 0 6px rgba(212,66,12,.25),0 4px 12px rgba(0,0,0,.35)">★</div><span style="background:#fff;border-radius:8px;padding:3px 7px;font:800 12px system-ui;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap">Eco Beach City</span></div>` });
    L.marker([e.la, e.lo], { icon: star, zIndexOffset: 1000 }).bindPopup(`<div style="font:13px system-ui;width:230px"><b>Eco Beach City · Sumba, Indonesia</b><br><span style="color:${dayColor(e.d)};font-weight:800">☀ ${e.d}</span> comfortable days a year, warm all year, a dry season from May to October.<br><a href="/ecobeachcity" style="color:#D4420C;font-weight:700">See Eco Beach City →</a></div>`).addTo(g);
  }, [homes, spots, data]);

  const fly = (la: number, lo: number) => { map.current?.flyTo([la, lo], 9, { duration: 0.8 }); box.current?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const T = data?.T ?? 170;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif", color: "#14181c" }}>
      <nav style={{ fontSize: 13, color: "#5b636b", marginBottom: 10 }}><Link to="/" style={{ color: "#5b636b" }}>RealHunt</Link> › Weather</nav>
      <h1 style={{ font: "800 clamp(28px,4.6vw,46px)/1.05 system-ui", letterSpacing: "-0.02em", margin: 0 }}>Good weather most of the year. Only the good homes.</h1>
      <p style={{ fontSize: 16, color: "#3b4540", maxWidth: 760, margin: "10px 0 14px" }}>
        The colours show how many days a year are comfortable: a daily high of 18–33 °C, a dry day and light wind. The Mediterranean coast, the Canaries, Mexico's highlands and the islands of Indonesia lead. On top, only the homes that score {minScore}+ in places with {minDays}+ such days.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
          <button key={k} onClick={() => setView(k)} style={{ border: 0, borderRadius: 999, padding: "8px 14px", font: "700 13px system-ui", cursor: "pointer", background: view === k ? "#14181c" : "#eef0f2", color: view === k ? "#fff" : "#14181c" }}>{VIEWS[k].label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 13, color: "#3b4540", marginBottom: 10 }}>
        <label>☀ at least <b>{minDays}</b> days <input type="range" min={140} max={280} step={10} value={minDays} onChange={(e) => setMinDays(+e.target.value)} style={{ verticalAlign: "middle" }} /></label>
        <label>Score ≥ <select value={minScore} onChange={(e) => setMinScore(+e.target.value)}>{[80, 85, 90].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
        <label><input type="checkbox" checked={show.h} onChange={(e) => setShow({ ...show, h: e.target.checked })} /> Homes</label>
        <label><input type="checkbox" checked={show.n} onChange={(e) => setShow({ ...show, n: e.target.checked })} /> New builds</label>
        <label><input type="checkbox" checked={show.s} onChange={(e) => setShow({ ...show, s: e.target.checked })} /> Sunny places without homes yet</label>
        <label>Colours <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} style={{ verticalAlign: "middle", width: 90 }} /></label>
      </div>
      <div style={{ position: "relative" }}>
        <div ref={box} style={{ height: "min(72vh,640px)", minHeight: 380, borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.12)" }} />
        <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 500, background: "rgba(255,255,255,.94)", borderRadius: 12, padding: "8px 10px", fontSize: 11.5, boxShadow: "0 2px 8px rgba(0,0,0,.15)", pointerEvents: "none" }}>
          <b>Comfortable days per year</b>
          <div style={{ display: "flex", height: 10, width: 220, borderRadius: 4, overflow: "hidden", margin: "4px 0 2px", background: `linear-gradient(90deg,${RAMP.map(([v, c]) => `${c} ${(v / 300) * 100}%`).join(",")})` }} />
          <div style={{ display: "flex", justifyContent: "space-between", width: 220 }}><span>0</span><span>100</span><span>200</span><span>300</span></div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#5b636b", margin: "8px 0 26px" }}>
        <b style={{ color: "#14181c" }}>{homes.length}</b> homes shown · <b style={{ color: "#14181c" }}>{spots.length}</b> sunny places we don't cover yet · ★ Eco Beach City, Sumba: {data?.ebc.d ?? "…"} comfortable days, about {months(data?.ebc.d ?? 185)} months a year.
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 22 }}>
        <div>
          <h2 style={{ font: "800 22px system-ui", margin: "0 0 6px" }}>The best homes with the best weather</h2>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>{([["days", "☀ Most good days"], ["score", "★ Best score"]] as const).map(([k, l]) => <button key={k} onClick={() => setSort(k)} style={{ border: 0, borderRadius: 999, padding: "6px 12px", font: "700 12px system-ui", cursor: "pointer", background: sort === k ? "#14181c" : "#eef0f2", color: sort === k ? "#fff" : "#14181c" }}>{l}</button>)}</div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {homes.slice(0, 30).map((h, i) => (
              <li key={h.k + h.s} style={{ display: "grid", gridTemplateColumns: "26px 56px 1fr auto", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eef0f2" }}>
                <span style={{ color: "#8a9098", fontWeight: 700, fontSize: 12, textAlign: "right" }}>{i + 1}</span>
                {h.i ? <img src={h.i} alt="" loading="lazy" style={{ width: 56, height: 44, objectFit: "cover", borderRadius: 8 }} /> : <span />}
                <Link to={homeUrl(h)} style={{ color: "inherit", textDecoration: "none", minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{money(h.p)}</b> <span style={{ color: "#5b636b", fontSize: 12.5 }}>· {h.l}</span>
                  <div style={{ fontSize: 12.5, color: "#3b4540", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.t}</div>
                </Link>
                <span style={{ textAlign: "right", fontSize: 12 }}>
                  <b style={{ background: scoreColor(h.n), color: "#fff", borderRadius: 8, padding: "2px 6px" }}>{h.n}</b><br />
                  <button onClick={() => fly(h.la, h.lo)} style={{ border: 0, background: "none", color: dayColor(h.d), fontWeight: 800, cursor: "pointer", padding: 0 }}>☀ {h.d}</button>
                </span>
              </li>
            ))}
            {!homes.length && <li style={{ color: "#5b636b", padding: 12 }}>{data ? "No homes match these filters. Lower the days or the score." : "Loading…"}</li>}
          </ol>
        </div>
        <div>
          <h2 style={{ font: "800 22px system-ui", margin: "0 0 10px" }}>Sunny places we don't cover yet</h2>
          <p style={{ fontSize: 13.5, color: "#5b636b", marginTop: 0 }}>Great weather, no RealHunt homes yet. Tell us what you want and we'll find you one.</p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {spots.slice(0, 30).map((s, i) => (
              <li key={s.t} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid #eef0f2", fontSize: 14 }}>
                <span style={{ color: "#8a9098", fontWeight: 700, fontSize: 12, textAlign: "right" }}>{i + 1}</span>
                <button onClick={() => fly(s.la, s.lo)} style={{ border: 0, background: "none", textAlign: "left", cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}><b>{s.t}</b> <span style={{ color: "#8a9098", fontSize: 12 }}>{s.c}</span></button>
                <span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}><b style={{ color: dayColor(s.d) }}>☀ {s.d}</b> · <Link to={`/find-my-home/${encodeURIComponent(s.t.split(",")[0].toLowerCase())}`} style={{ color: "#D4420C", fontWeight: 700 }}>Find one →</Link></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section style={{ marginTop: 30, background: "#F4FAF5", border: "1px solid #D7EBDC", borderRadius: 16, padding: "14px 16px", fontSize: 13.5, color: "#3b4540", lineHeight: 1.55 }}>
        <b style={{ color: "#14181c" }}>How we count a comfortable day.</b> A day counts when the high is between 18 and 33 °C, it doesn't rain (under 1 mm) and the wind stays light (under 20 km/h). We estimate how often that happens each month from the long-term climate normals of the University of East Anglia's Climatic Research Unit (CRU CL 2.0, about 18 km grid), then add up the year. It's an estimate for the area, not a forecast: coasts, valleys and hills nearby can differ. Homes are RealHunt homes and new builds scoring {minScore}+ (out of 100) in places with {T}+ comfortable days (150+ by default, about five months of the year or more).
      </section>
    </main>
  );
}
