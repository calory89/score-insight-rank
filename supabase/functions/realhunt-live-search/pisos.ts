// pisos.com: a free, readable source of homes for sale in Spain (8-nov-2026, v3). Tested from realhunt-candidates:
// pisos.com search and listing pages are plain HTML that our reader can open (idealista, fotocasa detail pages,
// yaencontre, indomio, milanuncios and tucasa block it or need JavaScript). Pure helpers, unit tested in
// src/test/livesearch-core.test.ts; the edge function reads the pages with realhunt-candidates "scan".
//   pisosSearchUrls   search pages for a Spanish place: bedrooms in the URL, the budget (pisos.com shows homes up to
//                     10 % over the "hasta" price, so the URL asks for budget / 1.1 and pickPisos filters exactly),
//                     dearest first so the best homes within budget lead
//   PISOS_RX / parsePisosCard   one result card: link, price, bedrooms, bathrooms, m², place, first photo, description
//   pickPisos         the cards that fit, central ones first when asked, best value per m² against the scan's median
//   pisosPhotos       this listing's photos only, without the portal's watermark (640 x 427)
//   PISOS_FACTS_RX / parsePisosFacts   a listing page's map position, community fee, age and condition
import { median, toEur, type LiveQuery } from "./core.ts";

const norm = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
/** HTML entities as pisos.com writes them (&#xF1; &amp; &#xB2;...). */
export const decode = (s: string) => String(s || "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

// Provincial capitals: pisos.com calls the city "<name>_capital" (the province is "<name>").
const CAPITALS = new Set(("a_coruna,albacete,alicante,almeria,avila,badajoz,barcelona,bilbao,burgos,caceres,cadiz,castellon,ciudad_real,cordoba,cuenca,girona,granada," +
  "guadalajara,huelva,huesca,jaen,las_palmas_de_gran_canaria,leon,lleida,logrono,lugo,madrid,malaga,murcia,ourense,oviedo,palencia,palma_de_mallorca,pamplona," +
  "pontevedra,salamanca,san_sebastian,santa_cruz_de_tenerife,santander,segovia,sevilla,soria,tarragona,teruel,toledo,valencia,valladolid,vitoria,zamora,zaragoza").split(","));
const ALIAS: Record<string, string> = { seville: "sevilla", la_coruna: "a_coruna", donostia: "san_sebastian", palma: "palma_de_mallorca", las_palmas: "las_palmas_de_gran_canaria", xabia: "javea", cordova: "cordoba" };
/** The city centre's district on pisos.com, where we checked it exists (8-nov-2026). */
const CENTRE: Record<string, string> = {
  sevilla: "sevilla_capital_casco_antiguo", madrid: "madrid_capital_centro", valencia: "valencia_capital_ciutat_vella", malaga: "malaga_capital_centro",
  cordoba: "cordoba_capital_centro", zaragoza: "zaragoza_capital_centro",
};
/** pisos.com's name for a Spanish place ("Sevilla" -> "sevilla_capital", "Marbella" -> "marbella"). */
export function pisosLoc(place: string | null | undefined): string | null {
  let s = slug(place || "");
  if (!s || s.length < 3) return null;
  s = ALIAS[s] || s;
  return CAPITALS.has(s) ? s + "_capital" : s;
}

export function pisosSearchUrls(p: LiveQuery, pages = 3): { url: string; central: boolean }[] {
  if (p.kind !== "buy" || p.country !== "Spain") return [];
  const loc = pisosLoc(p.place);
  if (!loc) return [];
  // "casa" in Spanish usually means any home: flats count unless a house word was used ("chalet", "adosado")
  const type = p.ptype === "apartment" ? "piso" : p.ptype === "house" && !p.ptype_soft ? "casas" : "pisos";
  const filt = [p.min_beds ? `con-${Math.min(p.min_beds, 4)}-habitaciones/` : "", p.max_eur ? `hasta-${Math.floor(p.max_eur / 1.1 / 1000) * 1000}/` : "", p.max_eur ? "precio-desc/" : ""].join("");
  const out: { url: string; central: boolean }[] = [];
  const centre = CENTRE[loc.replace(/_capital$/, "")];
  // the centre's own page first (when it has few homes pisos.com fills it with the rest of the city, so each card's
  // district decides whether it is central, not the page it came from)
  if (p.central && centre) out.push({ url: `https://www.pisos.com/venta/${type}-${centre}/${filt}`, central: true });
  for (let i = 1; i <= pages; i++) out.push({ url: `https://www.pisos.com/venta/${type}-${loc}/${filt}${i > 1 ? i + "/" : ""}`, central: false });
  return out;
}

/** One result card, from its link to just before the next card's link. */
export const PISOS_RX = '(data-lnk-href="/comprar/(?:(?!data-lnk-href=)[\\s\\S]){0,7000})';
export type PisosRow = {
  id: string; url: string; price: number; beds: number | null; baths: number | null; sqm: number | null; type: string; title: string; area: string;
  desc: string; photo: string | null; photos: number | null; central: boolean;
};
/** A card's district that is the city centre: "San Vicente (Distrito Casco Antiguo. Sevilla Capital)", "Sol (Distrito Centro...". */
const CENTRAL_AREA = /\b(distrito (casco antiguo|centro|ciutat vella|casco historico)|casco antiguo|centro historico|centro ciudad|zona centro)\b/;
// "apps" is the biggest size without the portal's own watermark (640 x 427; h700 is 1050 x 700 but carries a big
// "pisos.com" mark across the photo, which the photo check rightly marks down)
const imgBig = (u: string) => u.replace(/fotos\.imghs\.net\/[a-z0-9-]+-wp\//, "fotos.imghs.net/apps-wp/");
export function parsePisosCard(m: string): PisosRow | null {
  const href = m.match(/data-lnk-href="(\/comprar\/[^"]+)"/)?.[1];
  const priceTxt = m.match(/ad-preview__price">\s*([\d.]+)\s*€/)?.[1];
  if (!href || !priceTxt) return null;
  const price = Number(priceTxt.replace(/\./g, ""));
  if (!Number.isFinite(price) || price < 1000) return null;
  const chars = [...m.matchAll(/ad-preview__char[^>]*>([^<]+)/g)].map((x) => decode(x[1]).trim());
  const num = (re: RegExp) => { for (const c of chars) { const v = c.match(re); if (v) return Number(v[1].replace(/\./g, "").replace(",", ".")); } return null; };
  const photo = m.match(/https:\/\/fotos\.imghs\.net\/[a-z0-9-]+-wp\/[^"\s]+?\.(?:jpe?g|webp|png)/i)?.[0] || null;
  const id = href.match(/-(\d+_\d+)\/?$/)?.[1] || href;
  const type = href.match(/^\/comprar\/([a-z_]+)-/)?.[1] || "";
  const desc = decode(m.match(/ad-preview__description">([^<]*)/)?.[1] || "").replace(/\s+/g, " ").trim();
  return {
    id, url: "https://www.pisos.com" + href, price, beds: num(/^(\d+)\s*habs?\.?/i), baths: num(/^(\d+)\s*ba(?:ñ|n)os?/i), sqm: num(/^([\d.,]+)\s*m²/i), type,
    title: decode(m.match(/ad-preview__title">([^<]+)/)?.[1] || "").trim(), area: decode(m.match(/ad-preview__subtitle">([^<]+)/)?.[1] || "").trim(),
    desc, photo: photo ? imgBig(photo) : null, photos: Number(m.match(/data-counter=(\d+)/)?.[1]) || null,
    central: CENTRAL_AREA.test(norm(decode(m.match(/ad-preview__subtitle">([^<]+)/)?.[1] || ""))) || /\b(casco antiguo|casco historico)\b/.test(norm(desc)),
  };
}
/** "Bellavista (Distrito Bellavista-La Palmera. Sevilla Capital)" -> "Bellavista, Sevilla". */
export function pisosArea(area: string, place: string | null): string {
  const hood = String(area || "").split("(")[0].trim();
  const city = String(place || "").trim();
  return [hood && norm(hood) !== norm(city) ? hood : "", city].filter(Boolean).join(", ");
}
const HOUSE_TYPES = /^(casa|chalet|casa_adosada|casa_pareada|chalet_adosado|chalet_pareado|casa_rustica|casa_unifamiliar|villa)/;
const NOT_HOMES = /^(finca_rustica|garaje|local|oficina|terreno|trastero|nave|edificio|parcela)/;
/** Text that rules a listing out before any check: squatted or bare ownership, auctions, shares. */
const BAD_TEXT = /\b(ocupad[ao] (ilegalmente|sin titulo)|okupad[ao]s?|vivienda ocupada|inmueble ocupado|sin posesion|no se puede visitar|nuda propiedad|subasta|cesion de remate|proindiviso|pro indiviso|participacion del \d+)/;
export const pisosBadText = (t: string) => BAD_TEXT.test(norm(t));

/** € per m² of the scanned cards that have a size: the same-city comparables for the value score. */
export const pisosPpm = (rows: PisosRow[]) => rows.filter((r) => r.sqm && r.sqm >= 25).map((r) => r.price / r.sqm!);

/**
 * Cards that fit the search: within budget (exactly), enough bedrooms, the kind of home asked for, a home (not a garage
 * or land), no squatters or auctions, 8 photos or more where pisos.com says how many. Central ones first when the
 * centre was asked for, then best value per m² against the median of all scanned cards; under half the median is left
 * out (nearly always a share, a squat or a typo).
 */
export function pickPisos(rows: PisosRow[], p: LiveQuery, limit = 14): PisosRow[] {
  const seen = new Set<string>();
  const ok = rows.filter((r) => {
    if (seen.has(r.id)) return false; seen.add(r.id);
    if (NOT_HOMES.test(r.type) || pisosBadText(r.desc + " " + r.title)) return false;
    const eur = toEur(r.price, "EUR")!;
    if (p.max_eur && eur > p.max_eur) return false;
    if (p.min_eur && eur < p.min_eur) return false;
    if (p.min_beds && (r.beds == null || r.beds < p.min_beds)) return false;
    if (p.ptype === "apartment" && HOUSE_TYPES.test(r.type)) return false;
    if (p.ptype === "house" && !p.ptype_soft && !HOUSE_TYPES.test(r.type)) return false;
    if (r.photos != null && r.photos < 8) return false;
    return true;
  });
  const m = median(pisosPpm(ok.length >= 8 ? ok : rows));
  const rel = (r: PisosRow) => (r.sqm && r.sqm >= 25 && m ? r.price / r.sqm / m : 1.2);
  // many photos usually means an agency's professional set, which is what passes the photo check: 40 photos count
  // like a 25 % better price
  const rank = (r: PisosRow) => rel(r) - Math.min(r.photos ?? 10, 40) / 160;
  return ok.filter((r) => rel(r) >= 0.5)
    .sort((a, b) => (p.central ? Number(b.central) - Number(a.central) : 0) || rank(a) - rank(b))
    .slice(0, limit);
}

/** This listing's photos only (listing pages also show other homes), the biggest size without the portal's watermark. */
export function pisosPhotos(images: string[], firstPhoto: string | null): string[] {
  // "1089/012/1089_XA963-2421012_3_2026...jpg": the part before "_<n>_<date>" names the listing; agencies that upload
  // "1005/<date as hex>/<uuid>.jpg" are told apart by their folder
  const keyOf = (u: string) => u.match(/fotos\.imghs\.net\/[a-z0-9-]+-wp\/(.+?)_\d+_\d+\.(?:jpe?g|webp|png)/i)?.[1]
    || u.match(/fotos\.imghs\.net\/[a-z0-9-]+-wp\/(.+)\/[^/]+$/i)?.[1] || null;
  const key = firstPhoto ? keyOf(firstPhoto) : null;
  const seen = new Set<string>(); const out: string[] = [];
  for (const u of [firstPhoto || "", ...images]) {
    if (!/fotos\.imghs\.net\/[a-z0-9-]+-wp\//.test(u) || /\/(prof|appswm)-wp\//.test(u)) continue;
    if (key && keyOf(u) !== key) continue;
    const big = imgBig(u.split("?")[0]);
    const file = big.split("/").pop()!;
    if (seen.has(file)) continue;
    seen.add(file); out.push(big);
  }
  return out;
}

export const PISOS_FACTS_RX = '(features__label">[^<]{1,60}</span>\\s*(?:<span class="features__value">[^<]{0,160})?|latitude=-?[\\d.]+&amp;longitude=-?[\\d.]+)';
export type PisosFacts = { lat: number | null; lng: number | null; fee: number | null; age: string; condition: string; baths: number | null; text: string };
export function parsePisosFacts(matches: string[] | null | undefined): PisosFacts {
  const m = (Array.isArray(matches) ? matches : []).map(decode);
  const pos = m.map((x) => x.match(/latitude=(-?[\d.]+)&longitude=(-?[\d.]+)/)).find(Boolean);
  const facts = m.filter((x) => /features__label/.test(x)).map((x) => x.replace(/features__label">/, "").replace(/<\/span>\s*(<span class="features__value">)?/, " ").replace(/\s+/g, " ").trim());
  const get = (re: RegExp) => facts.find((f) => re.test(norm(f)))?.replace(/^[^:]+:\s*/, "") || "";
  const fee = Number(get(/^gastos de comunidad/).replace(/[^\d]/g, "")) || null;
  const lat = pos ? Number(pos[1]) : null, lng = pos ? Number(pos[2]) : null;
  return {
    lat: lat && Math.abs(lat) > 0.01 ? lat : null, lng: lng && Math.abs(lng) > 0.01 ? lng : null, fee: fee && fee < 5000 ? fee : null,
    age: get(/^antiguedad/), condition: get(/^conservacion/), baths: Number(get(/^banos/)) || null, text: facts.join("; ").slice(0, 900),
  };
}
