// 7-oct-2026 (Carlos): "Te encontramos la casa al precio que quieras, donde quieras". Free home-finder requests
// (lead capture) with a minimum budget for the top cities, instant matches from RealHunt, a queue you skip by
// inviting friends, and a public board of what people are hunting. Data: hunt_requests via security-definer RPCs.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { money } from "./api";
import { t } from "./i18n";
import { RankRow } from "./scores";

type Min = { city: string | null; min: number; min_city?: number; min_near?: number };
type Status = { code: string; place: string; max_price: number; near_city: boolean; referrals: number; position: number; total: number };

// Same rules as the database (hunt_city_mins); the server has the final word.
export const TOP_CITIES: [string, number, number][] = [
  ["Madrid", 250000, 120000], ["Barcelona", 250000, 130000], ["Valencia", 150000, 60000], ["Málaga", 220000, 90000],
  ["Sevilla", 130000, 60000], ["Lisbon", 280000, 120000], ["Porto", 200000, 90000], ["Paris", 350000, 150000],
  ["London", 350000, 180000], ["Rome", 220000, 90000], ["Milan", 250000, 100000], ["Berlin", 280000, 150000],
];
const MUST: [string, string][] = [["garden", "Garden"], ["pool", "Pool"], ["sea", "Near the sea"], ["ready", "Move-in ready"], ["office", "Room to work from home"], ["views", "Views"], ["land", "Land"]];
const PRICES = [40000, 60000, 80000, 100000, 120000, 150000, 180000, 220000, 250000, 300000, 400000];
const RA = (fn: string, args: any) => (supabase.rpc as any)(fn, args);
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

function localMin(place: string, near: boolean): Min {
  const p = place.toLowerCase();
  const hit = TOP_CITIES.find(([c]) => p.includes(c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")) || p.includes(c.toLowerCase()));
  return hit ? { city: hit[0], min: near ? hit[2] : hit[1], min_city: hit[1], min_near: hit[2] } : { city: null, min: 30000 };
}
const ago = (iso: string) => { const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };

export function shareFind(code: string | null, place?: string, price?: number) {
  const url = `${location.origin}/find-my-home${code ? `?ref=${code}` : ""}`;
  const text = place && price
    ? `${t("I asked RealHunt to find me a home")} ${place} ${t("under")} ${money(price)}. ${t("Free. Ask for yours:")}`
    : t("RealHunt finds you a home where you want, at your price. Free:");
  return { url, text };
}

// Small call-to-action used on the home page, in empty searches and in the ranking.
export function FindHomeCTA({ place, compact }: { place?: string; compact?: boolean }) {
  const href = `/find-my-home${place ? `/${encodeURIComponent(place.toLowerCase())}` : ""}`;
  return (
    <Link to={href} className={"fh-cta" + (compact ? " is-compact" : "")}>
      <span className="fh-cta-badge">{t("Free")}</span>
      <span className="fh-cta-text"><b>{place ? `${t("We'll find you a home in")} ${place}` : t("We'll find your home. Where you want, at your price.")}</b>
        <small>{t("Tell us where and how much. We send you the best real homes, checked by a person.")}</small></span>
      <span className="fh-cta-go">{t("Start")}</span>
    </Link>
  );
}

export function WantedBoard() {
  const [b, setB] = useState<any>(null);
  useEffect(() => { RA("hunt_wanted_board", { p_limit: 12 }).then(({ data }: any) => setB(data)).catch(() => {}); }, []);
  if (!b?.rows?.length) return null;
  return (
    <section className="fh-board">
      <div className="fh-board-head"><strong>{t("What people are hunting right now")}</strong><small>{`${b.week} ${t("requests this week")}`}</small></div>
      <ul>
        {b.rows.map((r: any, i: number) => (
          <li key={i}><b>{r.near ? `${t("Near")} ${r.place}` : r.place}</b><span>{`${t("up to")} ${money(r.max)}`}</span>
            {r.must?.length ? <em>{r.must.map((m: string) => t(MUST.find(([k]) => k === m)?.[1] || m)).join(" · ")}</em> : null}<small>{ago(r.at)}</small></li>
        ))}
      </ul>
      <p className="hunt-fine">{t("Agent, developer or owner with a home that fits?")} <Link to="/submit">{t("Send it to us")}</Link></p>
    </section>
  );
}

function Matches({ place, near, max }: { place: string; near: boolean; max: number }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    let on = true; setRows(null);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=en&q=${encodeURIComponent(place)}`)
      .then((r) => r.json())
      .then(async (g: any[]) => {
        const p = g?.[0]; if (!p) { if (on) setRows([]); return; }
        const { data } = await RA("community_near", { p: { lat: Number(p.lat), lng: Number(p.lon), limit: 12 } });
        const fit = (data?.rows || []).filter((r: any) => r.price_eur <= max && (!near || r.km <= 110));
        if (on) setRows(fit.slice(0, 5));
      }).catch(() => on && setRows([]));
    return () => { on = false; };
  }, [place, near, max]);
  if (!rows) return <p className="hunt-fine">{t("Looking for homes that already fit…")}</p>;
  if (!rows.length) return <p className="fh-note">{t("Nothing on RealHunt fits yet. That is exactly what this request is for: we go and look.")}</p>;
  return (
    <div className="fh-matches">
      <strong>{`${rows.length} ${t("homes on RealHunt already fit")}`}</strong>
      <div className="rk-list">{rows.map((r, i) => <RankRow key={r.id} deal={r} pos={i + 1} km={r.km} near={place} />)}</div>
    </div>
  );
}

function Done({ st, onAgain }: { st: Status; onAgain: () => void }) {
  const { url, text } = shareFind(st.code, st.near_city ? `${t("near")} ${st.place}` : `${t("in")} ${st.place}`, st.max_price);
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <section className="fh-done">
      <h2>{t("Request received.")}</h2>
      <p>{`${t("We are looking for a home")} ${st.near_city ? t("near") : t("in")} ${st.place} ${t("up to")} ${money(st.max_price)}. ${t("We email you the best real homes we find, checked by a person.")}`}</p>
      <div className="fh-queue">
        <div><b>#{st.position}</b><small>{t("your place in the queue")}</small></div>
        <div><b>{st.referrals}</b><small>{t("friends who joined with your link")}</small></div>
      </div>
      <p className="fh-skip"><b>{t("Skip the queue:")}</b> {t("every friend who asks for a home with your link moves you up 3 places.")}</p>
      <div className="fh-share">
        <a className="hunt-primary" href={`https://wa.me/?text=${enc(text + " " + url)}`} target="_blank" rel="noopener">WhatsApp</a>
        <a className="hunt-secondary" href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`} target="_blank" rel="noopener">X</a>
        <a className="hunt-secondary" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener">Facebook</a>
        <button type="button" className="hunt-secondary" onClick={() => { navigator.clipboard?.writeText(`${text} ${url}`); setCopied(true); }}>{copied ? t("Link copied") : t("Copy link")}</button>
        {(navigator as any).share && <button type="button" className="hunt-secondary" onClick={() => (navigator as any).share({ title: "RealHunt", text, url }).catch(() => {})}>{t("Share")}</button>}
      </div>
      <Matches place={st.place} near={st.near_city} max={st.max_price} />
      <button type="button" className="hunt-link" onClick={onAgain}>{t("Ask for another place")}</button>
    </section>
  );
}

export function FindHomePage() {
  const location = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(location.search);
  const slugCity = decodeURIComponent(location.pathname.split("/")[2] || "").replace(/-/g, " ");
  const cityName = slugCity ? slugCity.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  const ref = params.get("ref") || store.get("rh.find.ref") || "";
  useEffect(() => { if (params.get("ref")) store.set("rh.find.ref", params.get("ref")!); }, []);
  const [place, setPlace] = useState(cityName);
  const [near, setNear] = useState(params.get("near") === "1");
  const [price, setPrice] = useState<number>(Number(params.get("price")) || 0);
  const [must, setMust] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [st, setSt] = useState<Status | null>(null);
  const min = useMemo(() => localMin(place, near), [place, near]);
  useEffect(() => {
    const title = cityName ? `${t("We find you a home in")} ${cityName} · RealHunt` : `${t("We find your home, where you want, at your price")} · RealHunt`;
    document.title = title;
  }, [cityName]);
  useEffect(() => {
    const code = params.get("code") || store.get("rh.find.code");
    if (code) RA("hunt_request_status", { p_code: code }).then(({ data }: any) => { if (data?.code && params.get("code")) setSt(data); }).catch(() => {});
  }, []);
  const low = !!price && price < min.min;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!place.trim()) return setErr(t("Tell us where."));
    if (!price) return setErr(t("Pick your budget."));
    if (low) return setErr(t("Your budget is under the minimum for this place."));
    if (!consent) return setErr(t("Tick the box so we can email you the homes."));
    setBusy(true);
    const { data, error } = await RA("hunt_request_create", { p: { email, place: place.trim(), near_city: near, max_price: price, must, ref, lang: document.documentElement.lang || "en", consent } });
    setBusy(false);
    if (error || !data) return setErr(t("Something went wrong. Try again in a minute."));
    if (data.error) return setErr(data.error === "email" ? t("That email does not look right.") : data.error === "min" ? `${t("The minimum here is")} ${money(data.min?.min)}.` : data.error === "limit" ? t("Too many requests today from this email.") : t("Something went wrong. Try again in a minute."));
    store.set("rh.find.code", data.code);
    try { (window as any).fbq?.("track", "Lead", { content_name: "find-my-home", value: 0, currency: "EUR" }); } catch { /* no pixel */ }
    setSt(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (st) return <div className="hunt-wrap fh-page"><Done st={st} onAgain={() => { setSt(null); nav("/find-my-home"); }} /><WantedBoard /></div>;
  return (
    <div className="hunt-wrap fh-page">
      <section className="fh-hero">
        <span className="hunt-eyebrow">{t("FREE HOME FINDER")}</span>
        <h1>{cityName ? `${t("We'll find you a home in")} ${cityName}.` : t("We'll find your home. Where you want, at your price.")}</h1>
        <p>{t("Tell us where and how much. We search every listing site, check each home by hand and send you only the best ones, scored like everything on RealHunt.")}</p>
      </section>
      <form className="fh-form" onSubmit={submit}>
        <label className="fh-field"><span>{t("Where?")}</span>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("A city, a region or a country")} maxLength={120} autoComplete="off" />
        </label>
        <div className="fh-chips">{TOP_CITIES.slice(0, 8).map(([c]) => <button type="button" key={c} aria-pressed={place === c} onClick={() => setPlace(c)}>{c}</button>)}</div>
        {min.city && (
          <div className="fh-near">
            <button type="button" aria-pressed={!near} onClick={() => setNear(false)}>{`${t("In")} ${min.city}`}<small>{`${t("from")} ${money(min.min_city)}`}</small></button>
            <button type="button" aria-pressed={near} onClick={() => setNear(true)}>{`${t("Up to 1 hour from")} ${min.city}`}<small>{`${t("from")} ${money(min.min_near)}`}</small></button>
          </div>
        )}
        <label className="fh-field"><span>{t("Your maximum budget")}</span>
          <select value={price || ""} onChange={(e) => setPrice(Number(e.target.value))}>
            <option value="">{t("Choose")}</option>
            {PRICES.map((p) => <option key={p} value={p} disabled={p < min.min}>{`${t("Up to")} ${money(p)}`}</option>)}
          </select>
        </label>
        {low && min.city && (
          <p className="fh-warn">{`${t("In")} ${min.city} ${t("we start at")} ${money(min.min)}.`}{!near && min.min_near ? <> {`${t("Within 1 hour of")} ${min.city} ${t("we find homes from")} ${money(min.min_near)}.`} <button type="button" className="hunt-link" onClick={() => setNear(true)}>{t("Switch to 1 hour away")}</button></> : null}</p>
        )}
        <div className="fh-field"><span>{t("Must have (optional)")}</span>
          <div className="fh-chips">{MUST.map(([k, l]) => <button type="button" key={k} aria-pressed={must.includes(k)} onClick={() => setMust(must.includes(k) ? must.filter((x) => x !== k) : [...must, k])}>{t(l)}</button>)}</div>
        </div>
        <label className="fh-field"><span>{t("Your email")}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
        </label>
        <label className="fh-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t("Email me homes that fit this request. I can unsubscribe at any time.")} <Link to="/privacy">{t("Privacy")}</Link></span></label>
        {err && <p className="fh-err" role="alert">{err}</p>}
        <button className="hunt-primary fh-submit" disabled={busy}>{busy ? t("Sending…") : t("Find my home")}</button>
        <p className="hunt-fine">{t("Free. No agents calling you. We only send real homes that fit.")}</p>
      </form>
      <WantedBoard />
    </div>
  );
}
