// Round n10 on the home page (21-nov-2026), loaded after the page: price history (list2 33), what the listing does not
// say (48), the plain note after 90 days (45) and the visitor's private note (37). Logic in ./logic (tested).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, HelpCircle, History, MessageSquareText, NotebookPen, Check, Plane } from "lucide-react";
import { isEs } from "@/lib/lang";
import { money } from "../api";
import { dayLabel, type StatusRow } from "../n9/status";
import { usePreference } from "../buyer-state";
import { NOTES_KEY, cleanNotes, offerHintDays, priceSteps, setNote, unknowns, type LogEvent, type UnknownId, type UnknownRow } from "./logic";
import "./n10.css";

const L = (en: string, es: string) => (isEs() ? es : en);
const ev = (name: string) => { try { (window as any).clarity?.("event", name); } catch { /* blocked */ } };

// ------------------------------------------------------------------------------------------ change log (one read)
let logP: Promise<LogEvent[]> | null = null;
export function changeLog(): Promise<LogEvent[]> {
  return (logP ||= fetch("/research/removed-homes.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : { events: [] }))
    .then((j: any) => (Array.isArray(j?.events) ? j.events : [])).catch(() => { logP = null; return []; }));
}

/** "Price history": every dated change of the asking price on RealHunt. Nothing shows when the price never changed. */
export function PriceHistory({ slug, price }: { slug: string; price?: number | null }) {
  const [steps, setSteps] = useState<ReturnType<typeof priceSteps> | null>(null);
  useEffect(() => { let on = true; setSteps(null); changeLog().then((e) => { if (on) setSteps(priceSteps(e, slug)); }); return () => { on = false; }; }, [slug]);
  if (!steps?.length) return null;
  const es = isEs();
  return (
    <section className="n10-box n10-history" aria-labelledby="n10-hist-h">
      <h2 id="n10-hist-h"><History size={18} aria-hidden="true" /> {L("Price history", "Historial de precio")}</h2>
      <ol>
        {steps.map((s) => (
          <li key={s.date + s.to}>
            <time dateTime={s.date}>{dayLabel(s.date, es ? "es" : "en")}</time>
            <span>{money(s.from)} → <b>{money(s.to)}</b></span>
            <small className={s.diff < 0 ? "is-down" : "is-up"}>{s.diff < 0 ? "−" : "+"}{money(Math.abs(s.diff))} ({s.diff < 0 ? "−" : "+"}{Math.abs(s.pct).toString().replace(".", es ? "," : ".")}%)</small>
          </li>
        ))}
      </ol>
      {price != null && <p className="n10-fine">{L(`Asking price today: ${money(price)}. Changes come from the advert itself, read by our nightly check on two different days, or from a correction by a person.`, `Precio de hoy: ${money(price)}. Los cambios salen del propio anuncio, leído por nuestra revisión nocturna en dos días distintos, o de una corrección hecha por una persona.`)}{" "}
        <Link className="hunt-link" to={es ? "/es/corrections" : "/corrections"}>{L("All changes", "Todos los cambios")}</Link></p>}
    </section>
  );
}

const UNKNOWN_TEXT: Record<UnknownId, [string, string, string, string]> = {
  year: ["Year built", "When was the house built, and when was it last renovated?", "Año de construcción", "¿En qué año se construyó la casa y cuándo se reformó por última vez?"],
  size: ["Floor area", "What is the living area in m², and is that the house or the plot?", "Superficie", "¿Cuántos m² útiles tiene la vivienda, y es la casa o la parcela?"],
  beds: ["Bedrooms", "How many bedrooms and bathrooms does it have?", "Dormitorios", "¿Cuántos dormitorios y baños tiene?"],
  fee: ["Community fee", "Is there a monthly community or owners' fee, and how much is it?", "Cuota de comunidad", "¿Hay cuota mensual de comunidad y de cuánto es?"],
  tax: ["Yearly property tax", "How much is the yearly property tax and the waste tax?", "Impuesto anual", "¿Cuánto se paga al año de impuesto sobre la propiedad y de basuras?"],
  energy: ["Energy certificate", "Does it have an energy certificate, and what is its rating?", "Certificado energético", "¿Tiene certificado energético y qué calificación tiene?"],
};
/** "What we do not know about this home": the facts the listing leaves out, each as a question to ask. */
export function Unknowns({ d }: { d: UnknownRow }) {
  const ids = unknowns(d);
  if (!ids.length) return null;
  const es = isEs();
  return (
    <section className="n10-box n10-unknown" aria-labelledby="n10-unk-h">
      <h2 id="n10-unk-h"><HelpCircle size={18} aria-hidden="true" /> {L("What we do not know about this home", "Lo que no sabemos de esta casa")}</h2>
      <p className="n10-fine">{L("The advert does not give these facts. Ask the agent before you visit; the questions above can go in the same email.", "El anuncio no da estos datos. Pregúntalos al agente antes de visitarla; puedes incluirlos en el mismo correo de las preguntas de arriba.")}</p>
      <ul>{ids.map((id) => { const x = UNKNOWN_TEXT[id]; return <li key={id}><b>{es ? x[2] : x[0]}</b><span>{es ? x[3] : x[1]}</span></li>; })}</ul>
    </section>
  );
}

/** After 90 days on RealHunt, a plain suggestion to ask about an offer. No countdown, no pressure. */
export function OfferHint({ d }: { d: StatusRow }) {
  const days = offerHintDays(d);
  if (days == null) return null;
  return (
    <p className="n10-offer"><MessageSquareText size={16} aria-hidden="true" /> <span>{L(
      `This home has been on RealHunt for ${days} days. When a home has been for sale for some time, it is normal to ask the agent whether the seller would consider an offer.`,
      `Esta casa lleva ${days} días en RealHunt. Cuando una casa lleva tiempo a la venta, es normal preguntar al agente si el vendedor aceptaría una oferta.`)}</span></p>
  );
}

/** A private note per home ("visit in May"), kept in this browser only and shown on the saved homes page. */
export function HomeNote({ slug }: { slug: string }) {
  const [raw, setRaw] = usePreference<unknown>(NOTES_KEY, {});
  const notes = cleanNotes(raw);
  const saved = notes[slug]?.text || "";
  const [text, setText] = useState(saved);
  const [open, setOpen] = useState(!!saved);
  const [done, setDone] = useState(false);
  useEffect(() => { setText(notes[slug]?.text || ""); setOpen(!!notes[slug]); }, [slug]);
  useEffect(() => { if (!done) return; const t0 = setTimeout(() => setDone(false), 2000); return () => clearTimeout(t0); }, [done]);
  const id = "n10-note-" + slug;
  if (!open) return <button type="button" className="hunt-link n10-note-add" onClick={() => setOpen(true)}><NotebookPen size={15} aria-hidden="true" /> {L("Add a private note", "Añadir una nota privada")}</button>;
  return (
    <form className="n10-note" onSubmit={(e) => { e.preventDefault(); setRaw(setNote(notes, slug, text)); setDone(true); ev("home_note_saved"); }}>
      <label htmlFor={id}><NotebookPen size={15} aria-hidden="true" /> {L("Your private note", "Tu nota privada")} <small>{L("only on this device", "solo en este dispositivo")}</small></label>
      <textarea id={id} rows={2} maxLength={600} value={text} placeholder={L("For example: visit in May, ask about the roof", "Por ejemplo: visitar en mayo, preguntar por el tejado")} onChange={(e) => setText(e.target.value)} />
      <div>
        <button type="submit" className="hunt-secondary" disabled={text === saved}>{done ? <><Check size={15} aria-hidden="true" /> {L("Saved", "Guardada")}</> : L("Save note", "Guardar nota")}</button>
        {saved && <button type="button" className="hunt-link" onClick={() => { setRaw(setNote(notes, slug, "")); setText(""); setOpen(false); }}>{L("Delete note", "Borrar nota")}</button>}
      </div>
    </form>
  );
}

/** "In your numbers" (28-nov-2026): the price in years of the visitor's own rent, the sale of their own home against
 * this one, and flights to the nearest airport. The rent stays in this browser only. */
export function YourNumbers({ d }: { d: { slug: string; price_eur?: number | null; nearby?: any } }) {
  const [rent, setRent] = usePreference<unknown>("rh_my_rent", "");
  const price = Number(d.price_eur) || 0;
  if (!price) return null;
  const es = isEs(), pre = es ? "/es" : "";
  const r = Number(String(rent ?? "").replace(",", "."));
  const years = r > 0 ? price / (r * 12) : 0;
  const ap = d.nearby?.airport, code = typeof ap?.code === "string" && /^[A-Z]{3}$/.test(ap.code) ? ap.code : "";
  const one = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", es ? "," : ".");
  return (
    <section className="n10-box n10-yours" aria-labelledby="n10-yours-h">
      <h2 id="n10-yours-h"><Calculator size={18} aria-hidden="true" /> {L("This home in your numbers", "Esta casa en tus números")}</h2>
      <label className="n10-yours-rent" htmlFor={"n10-rent-" + d.slug}>{L("Rent you pay now, per month", "Alquiler que pagas ahora, al mes")}
        <input id={"n10-rent-" + d.slug} type="number" inputMode="decimal" min={0} step={50} value={String(rent ?? "")} placeholder="1000" onChange={(e) => setRent(e.target.value.slice(0, 9))} onBlur={() => { if (r > 0) ev("home_rent_years"); }} />
      </label>
      {years > 0 && <p className="n10-yours-out" aria-live="polite"><b>{one(years)}</b> {L(`years of your rent pay the asking price of ${money(price)}.`, `años de tu alquiler pagan el precio de ${money(price)}.`)}</p>}
      <ul className="n10-yours-links">
        <li><a className="hunt-link" href={`${pre}/tools/years-of-rent?p=${price}${r > 0 ? `&rent=${r}` : ""}`}>{L("Count it with taxes and fees", "Calcúlalo con impuestos y gastos")}</a></li>
        <li><a className="hunt-link" href={`${pre}/tools/sell-and-move?p=${price}`}>{L("What is left if you sell your home and buy this one", "Lo que te sobra si vendes tu casa y compras esta")}</a></li>
        {code && <li><a className="hunt-link" href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights to ${code}`)}`} target="_blank" rel="noopener nofollow" onClick={() => ev("home_flights")}><Plane size={15} aria-hidden="true" /> {L(`Flights to ${ap.name || code} (${code})`, `Vuelos a ${ap.name || code} (${code})`)}{ap.km != null ? L(`, ${Math.round(ap.km)} km from the home`, `, a ${Math.round(ap.km)} km de la casa`) : ""}</a></li>}
      </ul>
      <p className="n10-fine">{L("Your rent stays on this device. It compares two amounts of money and is not advice: an owner also pays yearly taxes, insurance and repairs.", "Tu alquiler se queda en este dispositivo. Compara dos cantidades de dinero y no es un consejo: un propietario también paga impuestos anuales, seguro y reparaciones.")}</p>
    </section>
  );
}
