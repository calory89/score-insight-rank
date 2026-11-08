// pisos.com: a free, readable source of homes for sale in Spain (8-nov-2026, v3). Tested from realhunt-candidates:
// pisos.com search and listing pages are plain HTML that our reader can open (idealista, fotocasa detail pages,
// yaencontre, indomio, milanuncios and tucasa block it or need JavaScript). Pure helpers, unit tested in
// src/test/livesearch-core.test.ts; the edge function reads the pages with realhunt-candidates "scan".
//   pisosSearchUrls   search pages for a Spanish place: bedrooms in the URL, the budget (pisos.com shows homes up to
//                     10 % over the "hasta" price, so the URL asks for budget / 1.1 and pickPisos filters exactly),
//                     dearest first so the best homes within budget lead
//   PISOS_RX / parsePisosCard   one result card: link, price, bedrooms, bathrooms, m², place, first photo, description
//   pickPisos         the cards that fit, best value per m² against the scan's median; for "in the centre" central
//                     districts first and other towns left out (centre.ts)
//   pisosPhotos       this listing's photos only, without the portal's watermark (640 x 427)
//   PISOS_FACTS_RX / parsePisosFacts   a listing page's map position, community fee, age and condition
import { median, toEur, type LiveQuery } from "./core.ts";
import { cardPlaceText, centreFit, type Centre } from "./centre.ts";

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
/**
 * The city centre's districts on pisos.com (checked 8-nov-2026 with realhunt-candidates "scan"; a wrong slug is a 404),
 * and the districts next to it, read for the honest "closest to the centre" alternatives. Each card's own district and
 * then its map position decide whether it is central (centre.ts), never the page it came from: when a district has few
 * homes, pisos.com fills its page with the rest of the city.
 */
const CENTRE: Record<string, { centre: string[]; ring: string[] }> = {
  sevilla: { centre: ["casco_antiguo"], ring: ["triana", "los_remedios", "macarena"] },
  madrid: { centre: ["centro"], ring: ["salamanca", "retiro"] },
  barcelona: { centre: [], ring: ["eixample"] },
  valencia: { centre: ["ciutat_vella"], ring: ["eixample"] },
  malaga: { centre: ["centro"], ring: [] },
  cordoba: { centre: ["centro"], ring: [] },
  zaragoza: { centre: ["centro"], ring: [] },
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
  const page = (l: string, i: number, central: boolean) => out.push({ url: `https://www.pisos.com/venta/${type}-${l}/${filt}${i > 1 ? i + "/" : ""}`, central });
  const dist = CENTRE[loc.replace(/_capital$/, "")];
  // "in the centre": the centre's own pages (two), then one page of each district next to it; the whole city only
  // when pisos.com has no centre district for it
  if (p.central && dist && dist.centre.length + dist.ring.length) {
    for (const d of dist.centre) { page(`${loc}_${d}`, 1, true); page(`${loc}_${d}`, 2, true); }
    for (const d of dist.ring) page(`${loc}_${d}`, 1, false);
    if (!dist.centre.length) page(loc, 1, false);
    return out;
  }
  for (let i = 1; i <= pages; i++) page(loc, i, false);
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
export function pickPisos(rows: PisosRow[], p: LiveQuery, limit = 14, centre: Centre | null = null): PisosRow[] {
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
  const good = ok.filter((r) => rel(r) >= 0.5);
  if (!p.central || !centre) return good.sort((a, b) => (p.central ? Number(b.central) - Number(a.central) : 0) || rank(a) - rank(b)).slice(0, limit);
  // 8-nov-2026, "in the centre": a central district first, then one next to it, then cards of the city with no
  // district (their map position decides later); at most 4 cards of other districts of the city, for the honest
  // "closest to the centre" list; other towns never ("Camas" is not Sevilla)
  const tierOf = (r: PisosRow) => {
    const t = cardPlaceText(r.area, centre.name);
    if (!t) return 9;
    const f = centreFit(centre, { text: t });
    return f.status === "central" ? 0 : f.status === "near" ? 1 : /\bdistrito\b/.test(t) ? 3 : 2;
  };
  const tiered = good.map((r) => ({ r, t: tierOf(r) })).filter((x) => x.t < 9).sort((a, b) => a.t - b.t || rank(a.r) - rank(b.r));
  const other = tiered.filter((x) => x.t === 3).slice(0, 4);
  return [...tiered.filter((x) => x.t < 3), ...other].slice(0, limit).map((x) => x.r);
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
