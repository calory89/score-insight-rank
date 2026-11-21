// Round n10 on the home page (21-nov-2026), loaded after the page: price history (list2 33), what the listing does not
// say (48), the plain note after 90 days (45) and the visitor's private note (37). Logic in ./logic (tested).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, History, MessageSquareText, NotebookPen, Check } from "lucide-react";
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
