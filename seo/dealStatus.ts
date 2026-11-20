// The state of a home in its prerendered page (15-nov-2026), with the same rules as the app (src/community/n9/status.ts):
//  - when the nightly check stopped finding the original advert, the page stays and says so, with the way on to
//    similar homes and an alert, and its structured data stops saying "in stock";
//  - the date of the last check by a person or by the AI check when the data has one, and since when the home is listed.
// English and Spanish are written here by hand (the Spanish home pages do not go through seo/es-templates.json).
import { isGone, isUnconfirmed, lastCheck, listedAt, alertHref, dayLabel, type StatusRow } from "../src/community/n9/status";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** schema.org availability of the offer: SoldOut once the advert is gone. When nobody could confirm the advert for 30
 * days (isUnconfirmed) the availability is unknown, and schema.org has no value for "unknown": the property is left
 * out (idea 24) instead of claiming "in stock". "" means: leave it out. */
export const dealAvailability = (r: StatusRow) => (isGone(r) ? "https://schema.org/SoldOut" : isUnconfirmed(r) ? "" : "https://schema.org/InStock");

export function dealStatusHtml(r: StatusRow, lang: "en" | "es"): string {
  const es = lang === "es";
  const out: string[] = [];
  if (isGone(r)) {
    const alert = esc((es ? "/es" : "") + alertHref(r));
    out.push(es
      ? `<p><strong>El anuncio original ya no está publicado.</strong> Nuestra revisión nocturna no lo encontró dos días distintos, o un visitante avisó de que ya no está: lo más probable es que la casa se haya vendido o retirado. Mantenemos esta página para que puedas comparar el precio y la zona. Más abajo tienes casas parecidas, y puedes <a href="${alert}">recibir un correo cuando entren casas así</a>.</p>`
      : `<p><strong>The original advert is no longer online.</strong> Our nightly check could not find it on two different days, or a visitor reported it gone: the home has probably been sold or withdrawn. We keep this page so you can compare the price and the area. Similar homes are listed below, and you can <a href="${alert}">get an email when homes like it arrive</a>.</p>`);
  }
  if (isUnconfirmed(r)) {
    const ok = r.src_ok_at ? esc(dayLabel(r.src_ok_at, lang)) : "";
    out.push(es
      ? `<p><strong>No hemos podido confirmar que siga a la venta.</strong> El portal donde se anuncia no deja que nuestra revisión nocturna lea el anuncio${ok ? `; la última vez que lo vimos publicado fue el ${ok}` : ""}. Pregunta a la agencia antes de organizar una visita.</p>`
      : `<p><strong>We could not confirm this home is still for sale.</strong> The portal that lists it does not let our nightly check read the advert${ok ? `; it was last confirmed online on ${ok}` : ""}. Ask the agent before you plan a visit.</p>`);
  }
  const c = lastCheck(r); const since = dayLabel(listedAt(r), lang);
  const bits: string[] = [];
  if (c) {
    const d = esc(dayLabel(c.iso, lang)); const iso = esc(new Date(c.iso).toISOString().slice(0, 10));
    bits.push(c.by === "person"
      ? (es ? `Comprobada por una persona el <time datetime="${iso}">${d}</time>: precio y fotos cotejados con el anuncio publicado ese día.` : `Checked by a person on <time datetime="${iso}">${d}</time>: price and photos compared with the live advert that day.`)
      : (es ? `Comprobada por nuestra IA el <time datetime="${iso}">${d}</time>: leyó el anuncio y miró las fotos.` : `Checked by our AI on <time datetime="${iso}">${d}</time>: it read the advert and looked at the photos.`));
  }
  // idea 94: a dated check on every home that has one. Without a check by a person or the AI, the last night our
  // check found the original advert online (src_ok_at); a home that is unconfirmed or gone already says it above.
  if (!c && r.src_ok_at && !isGone(r) && !isUnconfirmed(r)) {
    const d = esc(dayLabel(r.src_ok_at, lang)); const iso = esc(new Date(r.src_ok_at).toISOString().slice(0, 10));
    if (d) bits.push(es ? `Comprobada el <time datetime="${iso}">${d}</time>: nuestra revisión nocturna encontró el anuncio original publicado.` : `Checked on <time datetime="${iso}">${d}</time>: our nightly check found the original advert online.`);
  }
  if (since) bits.push(es ? `En RealHunt desde el ${esc(since)}.` : `On RealHunt since ${esc(since)}.`);
  if (bits.length) out.push(`<p>${bits.join(" ")}</p>`);
  return out.join("");
}
