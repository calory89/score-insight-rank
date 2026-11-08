// Noise and flood block on the home page and the tiny high-risk chips on cards (8-nov-2026).
// Data: community_deals.risks (scripts/risks.py). Logic: ./risksLogic (tested).
import { Droplets, ExternalLink, Volume2 } from "lucide-react";
import { t } from "./i18n";
import { cardRiskChips, floodLevel, floodSummary, isOfficial, noiseFacts, noiseLevel, risksOf, type Level, type RiskRow } from "./risksLogic";
import "./risks.css";

const CHIP: Record<Level, string> = { high: "High", medium: "Moderate", low: "Low" };

function Chip({ l, none = "Not checked", rough = false }: { l: Level | null; none?: string; rough?: boolean }) {
  const text = l ? (rough && l === "medium" ? "Check" : CHIP[l]) : none;
  return <span className={"rh-risk-lv is-" + (l || "none")}>{t(text)}</span>;
}

/** Chips for a card: only when a risk is high. Plain spans, safe inside a link. */
export function RiskCardChips({ d }: { d: RiskRow }) {
  const chips = cardRiskChips(d);
  if (!chips.length) return null;
  return <>{chips.map((c) => (
    <span key={c.id} className="rh-chk-chip is-red rh-risk-chip" title={t(c.tip)}>
      {c.id === "noise" ? <Volume2 size={12} aria-hidden="true" /> : <Droplets size={12} aria-hidden="true" />}{t(c.label)}
    </span>
  ))}</>;
}

/** "Noise and flood" block, right after "Things to check" on the home page. */
export function RiskBlock({ d }: { d: RiskRow & { country?: string | null } }) {
  const r = risksOf(d);
  if (!r || (!r.noise && !r.flood)) return null;
  const n = r.noise, f = r.flood;
  const nl = noiseLevel(n), fl = floodLevel(f), official = isOfficial(f);
  const facts = noiseFacts(n);
  return (
    <section className="rh-chk rh-risk" aria-labelledby="rh-risk-h">
      <h2 id="rh-risk-h">{t("Noise and flood")}</h2>
      <ul className="rh-risk-rows">
        {n && <li className={"rh-risk-row is-" + (nl || "none")}>
          <span className="rh-risk-ic" aria-hidden="true"><Volume2 size={18} /></span>
          <div className="rh-risk-body">
            <div className="rh-risk-top"><strong>{t("Noise")}</strong><Chip l={nl} none={n.roads_checked ? "Not checked" : "Partly checked"} /></div>
            {facts.length > 0 && <dl className="rh-risk-facts">
              {facts.map((x) => <div key={x.k} className={x.far ? "is-far" : ""}><dt>{t(x.label)}</dt><dd>{x.value === "over 2 km" ? t("over 2 km") : x.value}</dd></div>)}
            </dl>}
            {n.airport && n.airport_km != null && n.airport_km < 30 && <p className="rh-risk-note">{t("Nearest airport:")} {n.airport}</p>}
            {!n.roads_checked && <p className="rh-risk-note">{t("Motorways and railways not checked yet for this home.")}</p>}
            <p className="rh-risk-src">{t("Straight-line distance from the map pin. Source:")} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>, <a href="https://ourairports.com/data/" target="_blank" rel="noopener noreferrer">OurAirports</a></p>
          </div>
        </li>}
        {f && <li className={"rh-risk-row is-" + (fl || "none")}>
          <span className="rh-risk-ic" aria-hidden="true"><Droplets size={18} /></span>
          <div className="rh-risk-body">
            <div className="rh-risk-top"><strong>{t("Flood")}</strong><Chip l={fl} rough={!official} /></div>
            <p className="rh-risk-sum">{t(floodSummary(f))}</p>
            {official ? (
              <>
                {f.zone && <p className="rh-risk-note">{t("FEMA flood zone")} <b>{String(f.zone).split(" (")[0]}</b>{f.note ? <>. {t(f.note)}</> : null}</p>}
                <p className="rh-risk-src">{t("Source:")} <a href="https://www.fema.gov/flood-maps/national-flood-hazard-layer" target="_blank" rel="noopener noreferrer">{t("FEMA National Flood Hazard Layer")}</a></p>
              </>
            ) : (
              <>
                <dl className="rh-risk-facts">
                  {f.elev_m != null && <div><dt>{t("Ground height")}</dt><dd>{Math.round(f.elev_m)} m</dd></div>}
                  <div className={f.coast_km == null || f.coast_km > 5 ? "is-far" : ""}><dt>{t("Sea")}</dt><dd>{f.coast_km == null || f.coast_km > 50 ? t("far away") : f.coast_km < 0.1 ? t("on the coast") : `${f.coast_km < 10 ? f.coast_km.toFixed(1) : Math.round(f.coast_km)} km`}</dd></div>
                  {f.river_km != null && f.river_km <= 10 && <div className={f.river_km > 2 ? "is-far" : ""}><dt>{t("Big river")}</dt><dd>{f.river_km < 1 ? `${Math.max(10, Math.round(f.river_km * 100) * 10)} m` : `${f.river_km.toFixed(1)} km`}</dd></div>}
                </dl>
                <p className="rh-risk-src">{t("Rough indicator from ground height and distance to water, not an official flood map. Sources:")} <a href="https://open-meteo.com/en/docs/elevation-api" target="_blank" rel="noopener noreferrer">Copernicus DEM (Open-Meteo)</a>, <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a></p>
              </>
            )}
            {f.map && <a className="rh-risk-map" href={f.map} target="_blank" rel="noopener noreferrer">
              <span>{t("Official flood map")}<small>{f.map_name}</small></span><ExternalLink size={16} aria-hidden="true" />
            </a>}
          </div>
        </li>}
      </ul>
      <p className="rh-chk-src">{t("General information from public maps, updated")} {r.updated === "2026-11" ? t("November 2026") : r.updated}. {t("Not a survey or advice: check the official maps and ask the agent before you buy.")}</p>
    </section>
  );
}
