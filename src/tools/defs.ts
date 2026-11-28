// The calculators as data: the fields of each form and one pure function that turns the state into the result
// (HTML and the lines of the share image). The same function prints the worked example in the prerendered page
// (seo/tools/) and redraws the result in the browser (src/tools/client.ts), so both always agree.
import { AREA, IMT, IRNR, NOTAIRE, SCHENGEN, SDLT, affordable, convertArea, fees, imt, irnrImputed, mortgageOrCash, notaireFr, rentYears, runningCosts, schengen, sdlt, sellAndMove } from "./logic";

export type Lang = "en" | "es";
export type State = Record<string, string>;
export type Card = { title: string; big: [string, string]; lines: [string, string][] };
export type Field = { n: string; label: string; type: "number" | "select" | "check" | "date"; opts?: [string, string][]; min?: number; max?: number; step?: number; hint?: string; group?: string; nav?: boolean };
export type CountryData = { n: string; r: [number, number]; y: string; tax?: string };
export type ToolData = { c?: Record<string, CountryData>; prices?: Record<string, number[]>; today?: string };
export type Out = { html: string; card: Card };
export type Tool = { id: string; defaults: (d: ToolData) => State; fields: (k: Fmt, d: ToolData) => Field[]; render: (s: State, d: ToolData, k: Fmt) => Out };

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Numbers, money and dates in either language. */
export function fmt(lang: Lang) {
  const es = lang === "es";
  const t = (en: string, sp: string) => (es ? sp : en);
  const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, es ? "." : ",");
  const num = (n: number, d = 0) => { const [i, f] = (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).split("."); return group(i) + (f ? (es ? "," : ".") + f : ""); };
  const trim = (n: number, d = 2) => { const s = (Math.round(n * 10 ** d) / 10 ** d).toString(); const [i, f] = s.split("."); return group(i) + (f ? (es ? "," : ".") + f : ""); };
  const SYM: Record<string, string> = { EUR: "€", USD: "US$", GBP: "£" };
  const money = (n: number, ccy = "EUR", d = 0) => (ccy === "" ? num(n, d) : es ? `${num(n, d)} ${SYM[ccy] || ccy}` : `${SYM[ccy] || ccy + " "}${num(n, d)}`);
  const range = (lo: number, hi: number, ccy = "EUR") => (Math.round(lo) === Math.round(hi) ? money(lo, ccy) : `${money(lo, ccy)}${es ? " a " : " to "}${money(hi, ccy)}`);
  const pct = (n: number, d = 2) => `${trim(n, d)}${es ? "\u00a0" : ""}%`;
  const pctRange = (r: [number, number]) => (r[0] === r[1] ? pct(r[0]) : es ? `${trim(r[0])}-${pct(r[1])}` : `${trim(r[0])} to ${pct(r[1])}`);
  const M = es ? ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const date = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? (es ? `${+m[3]} de ${M[+m[2] - 1]} de ${m[1]}` : `${+m[3]} ${M[+m[2] - 1]} ${m[1]}`) : ""; };
  return { lang, es, t, num, trim, money, range, pct, pctRange, date };
}
export type Fmt = ReturnType<typeof fmt>;

const n = (v: string | undefined, d = 0) => { const x = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(x) && x >= 0 ? x : d; };
const on = (v?: string) => v === "1";
const box = (label: string, value: string, cls = "") => `<div class="rht-box${cls ? " " + cls : ""}"><small>${esc(label)}</small><b>${esc(value)}</b></div>`;
const boxes = (...b: string[]) => `<div class="rht-boxes">${b.join("")}</div>`;
const tbl = (head: string[], rows: string[][], cls = "") => `<div class="rht-scroll"><table class="rht-t${cls ? " " + cls : ""}"><thead><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td class="n">${c}</td>` : `<th scope="row">${c}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
const note = (s: string) => `<p class="rht-note">${s}</p>`;
const countryOpts = (d: ToolData, k: Fmt): [string, string][] => Object.entries(d.c || {}).map(([key, v]) => [key, v.n] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], k.lang));
const pick = (d: ToolData, key: string, fallback = "spain") => (d.c?.[key] ? key : d.c?.[fallback] ? fallback : Object.keys(d.c || {})[0] || "");

// ---------------------------------------------------------------- buying costs in one country
const costs: Tool = {
  id: "costs",
  defaults: () => ({ c: "spain", p: "150000", ccy: "EUR" }),
  fields: (k, d) => [
    { n: "c", label: k.t("Country", "País"), type: "select", opts: countryOpts(d, k), nav: true },
    { n: "p", label: k.t("Price of the home", "Precio de la casa"), type: "number", min: 0, step: 1000 },
    { n: "ccy", label: k.t("Currency", "Moneda"), type: "select", opts: [["EUR", "EUR"], ["USD", "USD"], ["GBP", "GBP"]] },
  ],
  render(s, d, k) {
    const key = pick(d, s.c), c = d.c![key], p = n(s.p), ccy = /^(EUR|USD|GBP)$/.test(s.ccy) ? s.ccy : "EUR";
    const f = fees(p, c.r);
    const html = boxes(box(`${k.t("Taxes and fees", "Impuestos y gastos")} (${k.pctRange(c.r)})`, k.range(f.lo, f.hi, ccy)), box(k.t("Total with the price", "Total con el precio"), k.range(f.totalLo, f.totalHi, ccy), "is-total"))
      + note(esc(k.t(`${c.n}: ${k.pctRange(c.r)} of the price in transfer tax or VAT, notary, land registry and lawyer. Figures as of ${c.y}. General information, not tax or legal advice.`, `${c.n}: del ${k.pctRange(c.r)} del precio en impuesto de transmisiones o IVA, notaría, registro y abogado. Cifras de ${c.y}. Información general, no asesoramiento fiscal ni jurídico.`)));
    return { html, card: { title: k.t(`Buying a ${k.money(p, ccy)} home in ${c.n}`, `Comprar una casa de ${k.money(p, ccy)} en ${c.n}`), big: [k.t("Total with taxes and fees", "Total con impuestos y gastos"), k.range(f.totalLo, f.totalHi, ccy)], lines: [[k.t("Price", "Precio"), k.money(p, ccy)], [`${k.t("Taxes and fees", "Impuestos y gastos")} (${k.pctRange(c.r)})`, k.range(f.lo, f.hi, ccy)]] } };
  },
};

// ---------------------------------------------------------------- how much home a budget buys, country by country
const budget: Tool = {
  id: "budget",
  defaults: () => ({ b: "100000" }),
  fields: (k) => [{ n: "b", label: k.t("Your total budget, in euros", "Tu presupuesto total, en euros"), type: "number", min: 0, step: 5000 }],
  render(s, d, k) {
    const b = n(s.b);
    const rows = Object.entries(d.c || {}).map(([key, c]) => { const a = affordable(b, c.r); const pr = d.prices?.[key] || []; return { key, c, a, homes: pr.filter((x) => x <= a.safe).length, all: pr.length, cheapest: pr[0] || 0 }; })
      .filter((r) => r.all > 0).sort((x, y) => y.homes - x.homes || x.c.n.localeCompare(y.c.n));
    const total = rows.reduce((a, r) => a + r.homes, 0), where = rows.filter((r) => r.homes > 0);
    const html = boxes(box(k.t("Homes that fit, costs included", "Casas que encajan, gastos incluidos"), k.num(total), "is-total"), box(k.t("Countries with at least one", "Países con al menos una"), `${where.length} ${k.t("of", "de")} ${rows.length}`))
      + tbl([k.t("Country", "País"), k.t("Highest price that fits", "Precio máximo que encaja"), k.t("Homes at or under it", "Casas hasta ese precio"), k.t("Cheapest home", "Casa más barata")],
        rows.map((r) => [`<a href="/homes/${esc(r.key)}">${esc(r.c.n)}</a>`, esc(k.money(r.a.safe)), `${k.num(r.homes)} <small>${esc(k.t("of", "de"))} ${k.num(r.all)}</small>`, esc(k.money(r.cheapest))]))
      + note(esc(k.t(`The highest price is your budget minus the top of each country's range of taxes and fees, so the total stays inside ${k.money(b)}. Homes on RealHunt on ${k.date(d.today || "")}; asking prices.`, `El precio máximo es tu presupuesto menos el extremo alto del rango de impuestos y gastos de cada país, para que el total no pase de ${k.money(b)}. Casas de RealHunt a ${k.date(d.today || "")}; precios de salida.`)));
    const top = where.slice(0, 4);
    return { html, card: { title: k.t(`What ${k.money(b)} buys, taxes and fees included`, `Qué se compra con ${k.money(b)}, impuestos y gastos incluidos`), big: [k.t("Homes that fit on RealHunt", "Casas que encajan en RealHunt"), k.num(total)], lines: top.map((r) => [r.c.n, k.t(`${k.num(r.homes)} homes up to ${k.money(r.a.safe)}`, `${k.num(r.homes)} casas hasta ${k.money(r.a.safe)}`)] as [string, string]) } };
  },
};

// ---------------------------------------------------------------- two homes in two countries, total cost side by side
const compare: Tool = {
  id: "compare",
  defaults: () => ({ a: "spain", pa: "100000", b: "italy", pb: "100000" }),
  fields: (k, d) => [
    { n: "a", label: k.t("First country", "Primer país"), type: "select", opts: countryOpts(d, k), group: "1" },
    { n: "pa", label: k.t("Price of the first home, in euros", "Precio de la primera casa, en euros"), type: "number", min: 0, step: 1000, group: "1" },
    { n: "b", label: k.t("Second country", "Segundo país"), type: "select", opts: countryOpts(d, k), group: "2" },
    { n: "pb", label: k.t("Price of the second home, in euros", "Precio de la segunda casa, en euros"), type: "number", min: 0, step: 1000, group: "2" },
  ],
  render(s, d, k) {
    const ka = pick(d, s.a), kb = pick(d, s.b, "italy"), A = d.c![ka], B = d.c![kb], pa = n(s.pa), pb = n(s.pb);
    const fa = fees(pa, A.r), fb = fees(pb, B.r);
    const midA = (fa.totalLo + fa.totalHi) / 2, midB = (fb.totalLo + fb.totalHi) / 2, diff = Math.abs(midA - midB);
    const cheaper = midA === midB ? "" : midA < midB ? A.n : B.n;
    const overlap = fa.totalLo <= fb.totalHi && fb.totalLo <= fa.totalHi;
    const verdict = !cheaper ? k.t("Both totals are the same at the middle of their ranges.", "Los dos totales coinciden en el punto medio de sus rangos.")
      : k.t(`At the middle of each range, the home in ${cheaper} costs about ${k.money(diff)} less in total.${overlap ? " The two ranges overlap, so the order can change with the real bill." : ""}`, `En el punto medio de cada rango, la casa de ${cheaper} cuesta unos ${k.money(diff)} menos en total.${overlap ? " Los dos rangos se solapan, así que el orden puede cambiar con la factura real." : ""}`);
    const col = (c: CountryData, p: number, f: ReturnType<typeof fees>) => [esc(c.n), esc(k.money(p)), esc(k.pctRange(c.r)), esc(k.range(f.lo, f.hi)), `<b>${esc(k.range(f.totalLo, f.totalHi))}</b>`];
    const a = col(A, pa, fa), b = col(B, pb, fb);
    const head = [k.t("Country", "País"), k.t("Price", "Precio"), k.t("Taxes and fees, % of price", "Impuestos y gastos, % del precio"), k.t("Taxes and fees", "Impuestos y gastos"), k.t("Total", "Total")];
    const html = `<p class="rht-verdict">${esc(verdict)}</p>` + tbl(["", k.t("First home", "Primera casa"), k.t("Second home", "Segunda casa")], head.map((h, i) => [esc(h), a[i], b[i]]), "rht-t3")
      + note(esc(k.t(`Figures as of ${A.y}${A.y !== B.y ? ` and ${B.y}` : ""}. General information, not tax or legal advice.`, `Cifras de ${A.y}${A.y !== B.y ? ` y ${B.y}` : ""}. Información general, no asesoramiento fiscal ni jurídico.`)));
    return { html, card: { title: k.t(`${A.n} or ${B.n}: total cost of buying`, `${A.n} o ${B.n}: coste total de comprar`), big: [cheaper ? k.t(`Lower total: ${cheaper}`, `Total más bajo: ${cheaper}`) : k.t("Same total", "Mismo total"), cheaper ? k.t(`about ${k.money(diff)} less`, `unos ${k.money(diff)} menos`) : ""], lines: [[`${A.n}, ${k.money(pa)}`, k.range(fa.totalLo, fa.totalHi)], [`${B.n}, ${k.money(pb)}`, k.range(fb.totalLo, fb.totalHi)]] } };
  },
};

// ---------------------------------------------------------------- yearly cost of keeping a home
const running: Tool = {
  id: "running",
  defaults: () => ({ c: "", price: "80000", tax: "400", fees: "50", insurance: "250", utilities: "90", upkeep: "800", trips: "4", trip: "250", oneoff: "0", years: "5" }),
  fields: (k, d) => [
    { n: "c", label: k.t("Country (to see its yearly property tax rule)", "País (para ver su norma del impuesto anual)"), type: "select", opts: [["", k.t("No country", "Sin país")], ...countryOpts(d, k)] },
    { n: "price", label: k.t("Price you pay for the home", "Precio que pagas por la casa"), type: "number", min: 0, step: 1000 },
    { n: "tax", label: k.t("Property tax, per year", "Impuesto sobre la propiedad, al año"), type: "number", min: 0, step: 50 },
    { n: "fees", label: k.t("Community or complex fees, per month", "Cuota de comunidad o del complejo, al mes"), type: "number", min: 0, step: 10 },
    { n: "insurance", label: k.t("Home insurance, per year", "Seguro de hogar, al año"), type: "number", min: 0, step: 50 },
    { n: "utilities", label: k.t("Power, water and internet, per month", "Luz, agua e internet, al mes"), type: "number", min: 0, step: 10 },
    { n: "upkeep", label: k.t("Repairs and upkeep, per year", "Reparaciones y mantenimiento, al año"), type: "number", min: 0, step: 50 },
    { n: "trips", label: k.t("Trips to the home, per year", "Viajes a la casa, al año"), type: "number", min: 0, step: 1 },
    { n: "trip", label: k.t("Cost of each trip (flights, car)", "Coste de cada viaje (vuelos, coche)"), type: "number", min: 0, step: 50 },
    { n: "oneoff", label: k.t("One-off bill (special assessment, new roof)", "Gasto puntual (derrama, tejado nuevo)"), type: "number", min: 0, step: 500 },
    { n: "years", label: k.t("Years to spread the one-off bill over", "Años en los que repartes el gasto puntual"), type: "number", min: 1, max: 40, step: 1 },
  ],
  render(s, d, k) {
    const r = runningCosts({ price: n(s.price), tax: n(s.tax), fees: n(s.fees), insurance: n(s.insurance), utilities: n(s.utilities), upkeep: n(s.upkeep), trips: n(s.trips), trip: n(s.trip), oneoff: n(s.oneoff), years: n(s.years, 1) });
    const m = (x: number) => k.money(x, "");
    const names: [keyof typeof r.lines, string][] = [["tax", k.t("Property tax", "Impuesto sobre la propiedad")], ["fees", k.t("Community or complex fees", "Cuota de comunidad o del complejo")], ["insurance", k.t("Insurance", "Seguro")], ["utilities", k.t("Power, water and internet", "Luz, agua e internet")], ["upkeep", k.t("Repairs and upkeep", "Reparaciones y mantenimiento")], ["travel", k.t("Travel", "Viajes")], ["oneoff", k.t("One-off bill, per year", "Gasto puntual, al año")]];
    const c = s.c && d.c?.[s.c];
    const yrs = r.yearsToPrice ? k.trim(r.yearsToPrice, 1) : "";
    const html = boxes(box(k.t("Per year", "Al año"), m(r.year), "is-total"), box(k.t("Per month", "Al mes"), m(r.month)), box(k.t("Share of the price, per year", "Parte del precio, al año"), r.pct ? k.pct(r.pct, 1) : "–"), box(k.t("Years of costs that equal the price", "Años de gastos que igualan el precio"), yrs || "–"))
      + tbl([k.t("Cost", "Gasto"), k.t("Per year", "Al año"), k.t("Share", "Parte")], names.filter(([key]) => r.lines[key] > 0).map(([key, name]) => [esc(name), esc(m(r.lines[key])), esc(k.pct(r.year ? (r.lines[key] / r.year) * 100 : 0, 0))]))
      + (c && c.tax ? note(`<b>${esc(c.n)}, ${esc(k.t("yearly property tax", "impuesto anual sobre la propiedad"))}:</b> ${esc(c.tax)} <a href="/costs/${esc(s.c)}">${esc(k.t("Sources", "Fuentes"))}</a> (${esc(c.y)}).`) : "")
      + note(esc(k.t("Your own figures, in the currency you typed. General information, not tax advice.", "Tus propias cifras, en la moneda que hayas escrito. Información general, no asesoramiento fiscal.")));
    return { html, card: { title: k.t("What this home costs to keep", "Lo que cuesta mantener esta casa"), big: [k.t("Per year", "Al año"), `${m(r.year)} (${m(r.month)} ${k.t("a month", "al mes")})`], lines: [...(r.pct ? [[k.t("Share of the price, per year", "Parte del precio, al año"), k.pct(r.pct, 1)] as [string, string]] : []), ...(yrs ? [[k.t("Years of costs that equal the price", "Años de gastos que igualan el precio"), yrs] as [string, string]] : []), ...names.filter(([key]) => r.lines[key] > 0).slice(0, 3).map(([key, name]) => [name, m(r.lines[key])] as [string, string])] } };
  },
};

// ---------------------------------------------------------------- United Kingdom: Stamp Duty Land Tax
const bandRows = (k: Fmt, lines: { from: number; to: number; rate: number; tax: number }[], ccy: string) => lines.map((l) => [esc(`${k.money(l.from, ccy)} ${k.t("to", "a")} ${k.money(l.to, ccy)}`), esc(k.pct(l.rate, 3)), esc(k.money(l.tax, ccy, l.tax % 1 ? 2 : 0))]);
const sdltTool: Tool = {
  id: "sdlt",
  defaults: () => ({ p: "250000", nr: "1", add: "0" }),
  fields: (k) => [
    { n: "p", label: k.t("Price of the home, in pounds", "Precio de la casa, en libras"), type: "number", min: 0, step: 5000 },
    { n: "nr", label: k.t("I am not resident in the UK (under 183 days there in the 12 months before buying)", "No soy residente en el Reino Unido (menos de 183 días allí en los 12 meses anteriores a la compra)"), type: "check" },
    { n: "add", label: k.t("I already own another home, anywhere in the world", "Ya tengo otra vivienda, en cualquier país"), type: "check" },
  ],
  render(s, _d, k) {
    const p = n(s.p), r = sdlt(p, { nonResident: on(s.nr), additional: on(s.add) });
    const html = boxes(box(k.t("Stamp Duty Land Tax", "Impuesto de compra (Stamp Duty Land Tax)"), k.money(r.tax, "GBP"), "is-total"), box(k.t("Share of the price", "Parte del precio"), k.pct(r.effective, 2)), box(k.t("Price plus tax", "Precio más impuesto"), k.money(p + r.tax, "GBP")))
      + tbl([k.t("Slice of the price", "Tramo del precio"), k.t("Rate", "Tipo"), k.t("Tax", "Impuesto")], bandRows(k, r.lines, "GBP"))
      + note(esc(k.t(`Rates in force since 1 April 2025 in England and Northern Ireland${r.add ? `, with ${r.add} points added to every slice (${[on(s.nr) ? "2 for non-residents" : "", on(s.add) ? "5 for an additional home" : ""].filter(Boolean).join(" and ")})` : ""}. Scotland and Wales charge their own taxes. General information, not tax advice.`, `Tipos vigentes desde el 1 de abril de 2025 en Inglaterra e Irlanda del Norte${r.add ? `, con ${r.add} puntos añadidos a cada tramo (${[on(s.nr) ? "2 por no residente" : "", on(s.add) ? "5 por vivienda adicional" : ""].filter(Boolean).join(" y ")})` : ""}. Escocia y Gales cobran sus propios impuestos. Información general, no asesoramiento fiscal.`)));
    return { html, card: { title: k.t(`Stamp duty on a ${k.money(p, "GBP")} home in England`, `Impuesto de compra de una casa de ${k.money(p, "GBP")} en Inglaterra`), big: [k.t("Stamp Duty Land Tax", "Impuesto de compra"), k.money(r.tax, "GBP")], lines: [[k.t("Share of the price", "Parte del precio"), k.pct(r.effective, 2)], [k.t("Buyer", "Comprador"), [on(s.nr) ? k.t("not UK resident", "no residente") : k.t("UK resident", "residente"), on(s.add) ? k.t("owns another home", "con otra vivienda") : k.t("only home", "única vivienda")].join(", ")]] } };
  },
};

// ---------------------------------------------------------------- Portugal: IMT
const imtTool: Tool = {
  id: "imt",
  defaults: () => ({ p: "200000", reg: "mainland", use: "other" }),
  fields: (k) => [
    { n: "p", label: k.t("Price of the home, in euros", "Precio de la casa, en euros"), type: "number", min: 0, step: 5000 },
    { n: "reg", label: k.t("Where it is", "Dónde está"), type: "select", opts: [["mainland", k.t("Mainland Portugal", "Portugal continental")], ["islands", k.t("Madeira or the Azores", "Madeira o las Azores")]] },
    { n: "use", label: k.t("How you will use it", "Qué uso le darás"), type: "select", opts: [["other", k.t("Second home, holiday home or to let", "Segunda residencia, vacaciones o alquiler")], ["own", k.t("My own permanent home", "Mi vivienda habitual y permanente")]] },
  ],
  render(s, _d, k) {
    const p = n(s.p), reg = s.reg === "islands" ? "islands" : "mainland", use = s.use === "own" ? "own" : "other";
    const r = imt(p, reg, use), stamp = Math.round(p * 0.8) / 100, total = r.tax + stamp;
    const how = r.flat ? k.t(`${k.money(p)} × ${k.pct(r.rate, 1)} (single rate on the whole price)`, `${k.money(p)} × ${k.pct(r.rate, 1)} (tipo único sobre todo el precio)`) : k.t(`${k.money(p)} × ${k.pct(r.rate, 0)} − ${k.money(r.deduct, "EUR", 2)}`, `${k.money(p)} × ${k.pct(r.rate, 0)} − ${k.money(r.deduct, "EUR", 2)}`);
    const html = boxes(box(k.t("IMT transfer tax", "Impuesto de transmisiones (IMT)"), k.money(r.tax, "EUR", 2), "is-total"), box(k.t("Stamp duty, 0.8%", "Impuesto del sello, 0,8 %"), k.money(stamp, "EUR", 2)), box(k.t("Both taxes", "Los dos impuestos"), k.money(total, "EUR", 2)), box(k.t("Share of the price", "Parte del precio"), k.pct(p ? (total / p) * 100 : 0, 2)))
      + note(`<b>${esc(k.t("How the IMT is worked out", "Cómo se calcula el IMT"))}:</b> ${esc(how)} = ${esc(k.money(r.tax, "EUR", 2))}.`)
      + note(esc(k.t(`Official ${IMT.year} tables of the Portuguese tax authority, in force since 1 January ${IMT.year}. Notary, land registry and lawyer are extra. General information, not tax advice.`, `Tablas oficiales de ${IMT.year} de la autoridad tributaria portuguesa, vigentes desde el 1 de enero de ${IMT.year}. Notaría, registro y abogado van aparte. Información general, no asesoramiento fiscal.`)));
    return { html, card: { title: k.t(`Purchase tax on a ${k.money(p)} home in Portugal`, `Impuesto de compra de una casa de ${k.money(p)} en Portugal`), big: [k.t("IMT plus stamp duty", "IMT más impuesto del sello"), k.money(total, "EUR", 2)], lines: [[k.t("IMT transfer tax", "IMT"), k.money(r.tax, "EUR", 2)], [k.t("Stamp duty, 0.8%", "Impuesto del sello, 0,8 %"), k.money(stamp, "EUR", 2)], [k.t("Use", "Uso"), use === "own" ? k.t("own permanent home", "vivienda habitual") : k.t("second home or to let", "segunda residencia o alquiler")]] } };
  },
};

// ---------------------------------------------------------------- France: notary fees on a resale home
/** From src/data/destinations.json (france.purchase_costs_breakdown): transfer duties of about 5.8%, or about 6.3%
 * in departments that raised their rate; land-registry contribution 0.10%; disbursements about €800 to €1,200. */
export const FR = { duties: [5.8, 6.3], csi: 0.1, debours: [800, 1200] as [number, number] };
const notaire: Tool = {
  id: "notaire",
  defaults: () => ({ p: "150000", d: "6.3" }),
  fields: (k) => [
    { n: "p", label: k.t("Price of the home, in euros", "Precio de la casa, en euros"), type: "number", min: 0, step: 5000 },
    { n: "d", label: k.t("Transfer duties of the department", "Derechos de transmisión del departamento"), type: "select", opts: [["6.3", k.t("About 6.3% (departments that raised their rate)", "Alrededor del 6,3 % (departamentos que subieron el tipo)")], ["5.8", k.t("About 5.8% (the others)", "Alrededor del 5,8 % (los demás)")]] },
  ],
  render(s, _d, k) {
    const p = n(s.p), d = s.d === "5.8" ? 5.8 : 6.3, r = notaireFr(p, { duties: d, csi: FR.csi, debours: FR.debours });
    const m2 = (x: number) => k.money(x, "EUR", 2);
    const html = boxes(box(k.t("Notary fees in total", "Gastos de notaría en total"), k.range(r.lo, r.hi), "is-total"), box(k.t("Share of the price", "Parte del precio"), `${k.trim(r.pctLo, 1)}${k.t(" to ", " a ")}${k.pct(r.pctHi, 1)}`), box(k.t("Price plus fees", "Precio más gastos"), k.range(p + r.lo, p + r.hi)))
      + tbl([k.t("What you pay", "Qué pagas"), k.t("Amount", "Importe")], [
        [esc(k.t(`Transfer duties, about ${k.pct(d, 1)}`, `Derechos de transmisión, alrededor del ${k.pct(d, 1)}`)), esc(m2(r.duties))],
        [esc(k.t("Notary's regulated fee, sliding scale", "Arancel regulado del notario, escala por tramos")), esc(m2(r.emol))],
        [esc(k.t("VAT on that fee, 20%", "IVA sobre ese arancel, 20 %")), esc(m2(r.vat))],
        [esc(k.t("Land-registry contribution, 0.10%", "Contribución de seguridad inmobiliaria, 0,10 %")), esc(m2(r.csi))],
        [esc(k.t("Disbursements, about", "Suplidos, alrededor de")), esc(p > 0 ? k.range(FR.debours[0], FR.debours[1]) : k.money(0))]])
      + note(esc(k.t("For a resale home in mainland France. A new build pays VAT in the price and much lower duties. General information, not tax or legal advice.", "Para una vivienda de segunda mano en la Francia continental. La obra nueva paga IVA en el precio y unos derechos mucho más bajos. Información general, no asesoramiento fiscal ni jurídico.")));
    return { html, card: { title: k.t(`Notary fees on a ${k.money(p)} home in France`, `Gastos de notaría de una casa de ${k.money(p)} en Francia`), big: [k.t("Notary fees in total", "Gastos de notaría en total"), k.range(r.lo, r.hi)], lines: [[k.t("Transfer duties", "Derechos de transmisión"), m2(r.duties)], [k.t("Notary's fee with VAT", "Arancel del notario con IVA"), m2(r.emol + r.vat)], [k.t("Share of the price", "Parte del precio"), `${k.trim(r.pctLo, 1)}${k.t(" to ", " a ")}${k.pct(r.pctHi, 1)}`]] } };
  },
};

// ---------------------------------------------------------------- Germany: real estate transfer tax by state
/** From src/data/destinations.json (germany.purchase_costs_breakdown): 3.5% to 6.5% depending on the state; 3.5% in
 * Bavaria; 6.5% in Brandenburg, North Rhine-Westphalia, Saarland and Schleswig-Holstein. The range is also stated in
 * Bundestag printed paper 21/5776 of 6 May 2026. Other states: the buyer picks the rate on the notary's draft. */
export const DE_STATES: [string, number, string, string][] = [["by", 3.5, "Bavaria", "Baviera"], ["bb", 6.5, "Brandenburg", "Brandeburgo"], ["nw", 6.5, "North Rhine-Westphalia", "Renania del Norte-Westfalia"], ["sl", 6.5, "Saarland", "Sarre"], ["sh", 6.5, "Schleswig-Holstein", "Schleswig-Holstein"]];
export const DE_RATES = [3.5, 4, 4.5, 5, 5.5, 6, 6.5];
const grest: Tool = {
  id: "grest",
  defaults: () => ({ p: "150000", st: "by" }),
  fields: (k) => [
    { n: "p", label: k.t("Price of the home, in euros", "Precio de la casa, en euros"), type: "number", min: 0, step: 5000 },
    { n: "st", label: k.t("State, or the rate on your notary's draft", "Estado federado, o el tipo que figura en el borrador del notario"), type: "select", opts: [...DE_STATES.map(([id, r, en, sp]) => [id, `${k.es ? sp : en}: ${k.pct(r, 1)}`] as [string, string]), ...DE_RATES.map((r) => [String(r), k.t(`Another state, rate ${k.pct(r, 1)}`, `Otro estado, tipo del ${k.pct(r, 1)}`)] as [string, string])] },
  ],
  render(s, _d, k) {
    const p = n(s.p), st = DE_STATES.find((x) => x[0] === s.st), rate = st ? st[1] : DE_RATES.includes(Number(s.st)) ? Number(s.st) : 3.5;
    const tax = Math.round(p * rate) / 100, lo = Math.round(p * 3.5) / 100, hi = Math.round(p * 6.5) / 100;
    const html = boxes(box(`${k.t("Transfer tax", "Impuesto de compra")} (${k.pct(rate, 1)})`, k.money(tax), "is-total"), box(k.t("Price plus tax", "Precio más impuesto"), k.money(p + tax)), box(k.t("Lowest and highest state rate", "Tipo más bajo y más alto por estado"), k.range(lo, hi)))
      + note(esc(k.t(`The tax (Grunderwerbsteuer) is a single rate on the whole price, set by each state between 3.5% and 6.5%. Notary and land registry add about 1.5% to 2%. General information, not tax advice.`, `El impuesto (Grunderwerbsteuer) es un tipo único sobre todo el precio, que fija cada estado entre el 3,5 % y el 6,5 %. Notaría y registro suman alrededor de un 1,5 % a un 2 %. Información general, no asesoramiento fiscal.`)));
    return { html, card: { title: k.t(`Transfer tax on a ${k.money(p)} home in Germany`, `Impuesto de compra de una casa de ${k.money(p)} en Alemania`), big: [`${k.t("Transfer tax", "Impuesto de compra")} (${k.pct(rate, 1)})`, k.money(tax)], lines: [[k.t("State", "Estado"), st ? (k.es ? st[3] : st[2]) : k.t(`rate ${k.pct(rate, 1)}`, `tipo del ${k.pct(rate, 1)}`)], [k.t("Price plus tax", "Precio más impuesto"), k.money(p + tax)]] } };
  },
};

// ---------------------------------------------------------------- Spain: yearly tax of a non-resident owner
const irnr: Tool = {
  id: "irnr",
  defaults: () => ({ cv: "40000", rev: "1", eea: "1", days: "365", price: "" }),
  fields: (k) => [
    { n: "cv", label: k.t("Cadastral value on your IBI bill, in euros", "Valor catastral del recibo del IBI, en euros"), type: "number", min: 0, step: 1000, hint: k.t("Leave at 0 if you do not have it yet and fill in the price below.", "Déjalo en 0 si aún no lo tienes y rellena el precio abajo.") },
    { n: "rev", label: k.t("The town revised its cadastral values in the last ten years", "El municipio revisó sus valores catastrales en los últimos diez años"), type: "check" },
    { n: "eea", label: k.t("I live in the EU, Iceland, Norway or Liechtenstein", "Vivo en la UE, Islandia, Noruega o Liechtenstein"), type: "check" },
    { n: "days", label: k.t("Days in the year you owned it and did not let it", "Días del año en que fue tuya y no estuvo alquilada"), type: "number", min: 0, max: 365, step: 1 },
    { n: "price", label: k.t("Purchase price, only if there is no cadastral value", "Precio de compra, solo si no hay valor catastral"), type: "number", min: 0, step: 1000 },
  ],
  render(s, _d, k) {
    const r = irnrImputed({ cadastral: n(s.cv), revised: on(s.rev), eea: on(s.eea), days: s.days === "" || s.days == null ? 365 : n(s.days, 365), price: n(s.price) });
    const m2 = (x: number) => k.money(x, "EUR", 2);
    const html = boxes(box(k.t("Tax for the year", "Impuesto del año"), m2(r.tax), "is-total"), box(k.t("Imputed income", "Renta imputada"), m2(r.base)), box(k.t("Tax rate", "Tipo de gravamen"), k.pct(r.rate, 0)))
      + note(`<b>${esc(k.t("How it is worked out", "Cómo se calcula"))}:</b> ${esc(`${k.money(r.value)} × ${k.pct(r.pct, 1)} × ${r.days}/365 = ${m2(r.base)}; ${m2(r.base)} × ${k.pct(r.rate, 0)} = ${m2(r.tax)}.`)}${r.noCad ? " " + esc(k.t("Without a cadastral value the base is half the purchase price, at 1.1%.", "Sin valor catastral, la base es la mitad del precio de compra, al 1,1 %.")) : ""}`)
      + note(esc(k.t("Imputed income of a home kept for your own use or empty, declared on form 210. It is separate from the council tax (IBI) and from the tax on rent. General information, not tax advice.", "Renta imputada de una vivienda de uso propio o vacía, que se declara en el modelo 210. Es distinta del IBI y del impuesto sobre el alquiler. Información general, no asesoramiento fiscal.")));
    return { html, card: { title: k.t("Non-resident owner's yearly tax in Spain", "Impuesto anual del propietario no residente en España"), big: [k.t("Tax for the year", "Impuesto del año"), m2(r.tax)], lines: [[r.noCad ? k.t("Half the purchase price", "Mitad del precio de compra") : k.t("Cadastral value", "Valor catastral"), k.money(r.value)], [k.t("Imputed income", "Renta imputada"), `${m2(r.base)} (${k.pct(r.pct, 1)})`], [k.t("Tax rate", "Tipo de gravamen"), k.pct(r.rate, 0)]] } };
  },
};

// ---------------------------------------------------------------- Schengen 90/180
export const STAYS = 6;
const schengenTool: Tool = {
  id: "schengen",
  defaults: (d) => ({ d: d.today || "", s1a: "", s1b: "" }),
  fields: (k) => [
    { n: "d", label: k.t("Day to check, or the day you plan to enter", "Día que quieres comprobar, o día en que piensas entrar"), type: "date" },
    ...Array.from({ length: STAYS }, (_x, i) => [
      { n: `s${i + 1}a`, label: k.t(`Stay ${i + 1}: day of entry`, `Estancia ${i + 1}: día de entrada`), type: "date" as const, group: `s${i + 1}` },
      { n: `s${i + 1}b`, label: k.t(`Stay ${i + 1}: day of exit`, `Estancia ${i + 1}: día de salida`), type: "date" as const, group: `s${i + 1}` },
    ]).flat(),
  ],
  render(s, d, k) {
    const stays: [string, string][] = Array.from({ length: STAYS }, (_x, i) => [s[`s${i + 1}a`] || "", s[`s${i + 1}b`] || ""] as [string, string]).filter(([a, b]) => a || b);
    const r = schengen(stays, s.d || d.today || "");
    const title = k.t("Schengen days: 90 in any 180", "Días en Schengen: 90 de cada 180");
    if (!r.ok) return { html: note(esc(k.t("Choose the day to check.", "Elige el día que quieres comprobar."))), card: { title, big: ["", ""], lines: [] } };
    const warn = (r.bad ? note(esc(k.t(`${r.bad} stay${r.bad > 1 ? "s" : ""} left out: each needs both dates, with the exit on or after the entry.`, `${r.bad} estancia${r.bad > 1 ? "s" : ""} sin contar: cada una necesita las dos fechas, con la salida igual o posterior a la entrada.`))) : "")
      + (r.overstay ? `<p class="rht-verdict is-bad">${esc(k.t(`These stays pass 90 days in a 180-day period on ${k.date(r.overstay)} (${r.peak} days at the highest point).`, `Estas estancias superan los 90 días en un periodo de 180 el ${k.date(r.overstay)} (${r.peak} días en el punto más alto).`))}</p>` : "");
    const html = boxes(box(k.t(`Days used on ${k.date(s.d || d.today || "")}`, `Días usados a ${k.date(s.d || d.today || "")}`), `${r.used} ${k.t("of", "de")} ${SCHENGEN.max}`, "is-total"), box(k.t("Days left that day", "Días que quedan ese día"), String(r.left)), box(k.t("If you enter that day, you can stay", "Si entras ese día, puedes quedarte"), r.can ? k.t(`${r.can} days, until ${k.date(r.lastDay!)}`, `${r.can} días, hasta el ${k.date(r.lastDay!)}`) : k.t("0 days", "0 días")))
      + warn
      + note(esc(k.t(`The 180 days counted run from ${k.date(r.from)} to ${k.date(s.d || d.today || "")}. Days of entry and exit both count. Stays with a residence permit or a long-stay visa are not counted. General information: the border officer's count is the one that applies.`, `Los 180 días que se cuentan van del ${k.date(r.from)} al ${k.date(s.d || d.today || "")}. Cuentan tanto el día de entrada como el de salida. No se cuentan las estancias con permiso de residencia o visado de larga duración. Información general: el cómputo que vale es el del agente de frontera.`)));
    return { html, card: { title, big: [k.t(`Days used on ${k.date(s.d || d.today || "")}`, `Días usados a ${k.date(s.d || d.today || "")}`), `${r.used} ${k.t("of", "de")} ${SCHENGEN.max}`], lines: [[k.t("Days left that day", "Días que quedan ese día"), String(r.left)], [k.t("If you enter that day, you can stay", "Si entras ese día, puedes quedarte"), r.can ? k.t(`${r.can} days, until ${k.date(r.lastDay!)}`, `${r.can} días, hasta el ${k.date(r.lastDay!)}`) : "0"]] } };
  },
};

// ---------------------------------------------------------------- area units
export const UNITS = (k: Fmt): [string, string][] => [["sqm", k.t("Square metres (m²)", "Metros cuadrados (m²)")], ["sqft", k.t("Square feet (sq ft)", "Pies cuadrados (sq ft)")], ["tsubo", k.t("Tsubo (Japan)", "Tsubo (Japón)")], ["jo", k.t("Tatami mats, jō (Japan)", "Tatamis, jō (Japón)")], ["acre", k.t("Acres", "Acres")], ["ha", k.t("Hectares", "Hectáreas")]];
const area: Tool = {
  id: "area",
  defaults: () => ({ v: "100", u: "sqm" }),
  fields: (k) => [{ n: "v", label: k.t("Size", "Superficie"), type: "number", min: 0, step: 1 }, { n: "u", label: k.t("Unit", "Unidad"), type: "select", opts: UNITS(k) }],
  render(s, _d, k) {
    const u = s.u in AREA ? s.u : "sqm", v = n(s.v), r = convertArea(v, u), names = Object.fromEntries(UNITS(k));
    const f = (x: number) => (x >= 100 ? k.num(x, 0) : x >= 1 ? k.trim(x, 2) : k.trim(x, 4));
    const others = Object.keys(AREA).filter((x) => x !== u);
    const html = boxes(...others.slice(0, 3).map((x, i) => box(names[x], f(r[x]), i === 0 ? "is-total" : ""))) + tbl([k.t("Unit", "Unidad"), k.t("Value", "Valor")], others.map((x) => [esc(names[x]), esc(f(r[x]))]))
      + note(esc(k.t("One tsubo is 400/121 m² (about 3.306). One tatami mat is counted as 1.62 m², the minimum Japanese property adverts must use; real mats vary by region.", "Un tsubo son 400/121 m² (unos 3,306). Un tatami se cuenta como 1,62 m², el mínimo que deben usar los anuncios inmobiliarios japoneses; los tatamis reales varían según la región.")));
    return { html, card: { title: `${f(v)} ${names[u]}`, big: [names[others[0]], f(r[others[0]])], lines: others.slice(1, 5).map((x) => [names[x], f(r[x])] as [string, string]) } };
  },
};

// ---------------------------------------------------------------- mortgage or cash
const mortgage: Tool = {
  id: "mortgage",
  defaults: () => ({ p: "80000", down: "30", rate: "4", years: "20", setup: "0" }),
  fields: (k) => [
    { n: "p", label: k.t("Price of the home", "Precio de la casa"), type: "number", min: 0, step: 1000 },
    { n: "down", label: k.t("Down payment, % of the price", "Entrada, % del precio"), type: "number", min: 0, max: 100, step: 5 },
    { n: "rate", label: k.t("Interest rate the bank offers you, % a year", "Tipo de interés que te ofrece el banco, % anual"), type: "number", min: 0, max: 25, step: 0.1 },
    { n: "years", label: k.t("Years of the loan", "Años del préstamo"), type: "number", min: 1, max: 40, step: 1 },
    { n: "setup", label: k.t("Cost of setting up the loan (valuation, fees)", "Gastos de abrir el préstamo (tasación, comisiones)"), type: "number", min: 0, step: 100 },
  ],
  render(s, _d, k) {
    const r = mortgageOrCash({ price: n(s.p), down: n(s.down), rate: n(s.rate), years: n(s.years, 20) || 20, setup: n(s.setup) });
    const m = (x: number) => k.money(x, "");
    const html = boxes(box(k.t("Monthly payment", "Cuota mensual"), m(r.monthly), "is-total"), box(k.t("Extra cost of the loan", "Coste extra del préstamo"), m(r.extra)), box(k.t("Cash you keep at the start", "Dinero que conservas al principio"), m(r.kept)))
      + tbl(["", k.t("With a mortgage", "Con hipoteca"), k.t("In cash", "Al contado")], [
        [esc(k.t("Paid on the day you buy", "Pagado el día de la compra")), esc(m(r.deposit + r.setup)), esc(m(r.totalCash))],
        [esc(k.t("Paid over the years, loan and interest", "Pagado a lo largo de los años, préstamo e intereses")), esc(m(r.totalMortgage - r.deposit - r.setup)), esc(m(0))],
        [esc(k.t("Of which interest", "De ello, intereses")), esc(m(r.interest)), esc(m(0))],
        [`<b>${esc(k.t("Total paid for the home", "Total pagado por la casa"))}</b>`, `<b>${esc(m(r.totalMortgage))}</b>`, `<b>${esc(m(r.totalCash))}</b>`]], "rht-t3")
      + note(esc(k.t("Fixed rate for the whole loan, in the currency you typed. Taxes and fees of the purchase are the same either way and are left out. Banks often refuse loans on very cheap homes or to non-residents. General information, not financial advice.", "Tipo fijo durante todo el préstamo, en la moneda que hayas escrito. Los impuestos y gastos de la compra son iguales en los dos casos y no se incluyen. Los bancos suelen negar préstamos para casas muy baratas o a no residentes. Información general, no asesoramiento financiero.")));
    return { html, card: { title: k.t(`Mortgage or cash for a ${m(n(s.p))} home`, `Hipoteca o contado para una casa de ${m(n(s.p))}`), big: [k.t("Monthly payment", "Cuota mensual"), m(r.monthly)], lines: [[k.t("Extra cost of the loan", "Coste extra del préstamo"), m(r.extra)], [k.t("Total with a mortgage", "Total con hipoteca"), m(r.totalMortgage)], [k.t("Total in cash", "Total al contado"), m(r.totalCash)]] } };
  },
};

// ---------------------------------------------------------------- years of your rent
const rentTool: Tool = {
  id: "rent",
  defaults: () => ({ p: "80000", rent: "1000", costs: "10" }),
  fields: (k) => [
    { n: "p", label: k.t("Price of the home", "Precio de la casa"), type: "number", min: 0, step: 1000 },
    { n: "rent", label: k.t("Rent you pay now, per month", "Alquiler que pagas ahora, al mes"), type: "number", min: 0, step: 50 },
    { n: "costs", label: k.t("Taxes and fees of the purchase, % of the price", "Impuestos y gastos de la compra, % del precio"), type: "number", min: 0, max: 60, step: 0.5 },
  ],
  render(s, _d, k) {
    const r = rentYears({ price: n(s.p), rent: n(s.rent), costsPct: n(s.costs) });
    const m = (x: number) => k.money(x, "");
    const none = k.t("Type your rent", "Escribe tu alquiler");
    const html = boxes(box(k.t("Years of your rent", "Años de tu alquiler"), r.years ? k.trim(r.years, 1) : none, "is-total"), box(k.t("Months of rent", "Meses de alquiler"), r.months ? k.num(r.months) : none), box(k.t("Home with taxes and fees", "Casa con impuestos y gastos"), m(r.total)))
      + tbl(["", k.t("Amount", "Importe")], [
        [esc(k.t("Price of the home", "Precio de la casa")), esc(m(n(s.p)))],
        [esc(k.t("Taxes and fees of the purchase", "Impuestos y gastos de la compra")), esc(m(r.costs))],
        [`<b>${esc(k.t("Total to buy", "Total para comprar"))}</b>`, `<b>${esc(m(r.total))}</b>`],
        [esc(k.t("Your rent in one year", "Tu alquiler en un año")), esc(m(r.year))]])
      + note(esc(k.t("In the currency you typed. It compares two amounts of money and nothing else: an owner also pays yearly taxes, insurance and repairs, and a tenant keeps the freedom to leave. General information, not financial advice.", "En la moneda que hayas escrito. Compara dos cantidades de dinero y nada más: un propietario también paga impuestos anuales, seguro y reparaciones, y un inquilino conserva la libertad de irse. Información general, no asesoramiento financiero.")));
    return { html, card: { title: k.t(`A ${m(n(s.p))} home in years of rent`, `Una casa de ${m(n(s.p))} en años de alquiler`), big: [k.t("Years of your rent", "Años de tu alquiler"), r.years ? k.trim(r.years, 1) : "-"], lines: [[k.t("Rent per month", "Alquiler al mes"), m(n(s.rent))], [k.t("Home with taxes and fees", "Casa con impuestos y gastos"), m(r.total)], [k.t("Months of rent", "Meses de alquiler"), r.months ? k.num(r.months) : "-"]] } };
  },
};

// ---------------------------------------------------------------- sell your home and buy a cheaper one
const moveTool: Tool = {
  id: "move",
  defaults: () => ({ v: "300000", debt: "0", sell: "5", p: "80000", buy: "10" }),
  fields: (k) => [
    { n: "v", label: k.t("What your home would sell for", "Por cuánto se vendería tu casa"), type: "number", min: 0, step: 5000 },
    { n: "debt", label: k.t("Mortgage still owed on it", "Hipoteca que te queda por pagar"), type: "number", min: 0, step: 1000 },
    { n: "sell", label: k.t("Costs of selling, % of the sale price", "Gastos de vender, % del precio de venta"), type: "number", min: 0, max: 60, step: 0.5 },
    { n: "p", label: k.t("Price of the home you would buy", "Precio de la casa que comprarías"), type: "number", min: 0, step: 1000 },
    { n: "buy", label: k.t("Taxes and fees of the purchase, % of the price", "Impuestos y gastos de la compra, % del precio"), type: "number", min: 0, max: 60, step: 0.5 },
  ],
  render(s, _d, k) {
    const r = sellAndMove({ value: n(s.v), debt: n(s.debt), sellPct: n(s.sell), price: n(s.p), buyPct: n(s.buy) });
    const m = (x: number) => (x < 0 ? "−" : "") + k.money(Math.abs(x), "");
    const html = boxes(box(r.enough ? k.t("Left over after buying", "Te sobra después de comprar") : k.t("Short by", "Te falta"), m(Math.abs(r.left)), "is-total"), box(k.t("Cash from the sale", "Dinero de la venta"), m(r.cash)), box(k.t("New home with taxes and fees", "Casa nueva con impuestos y gastos"), m(r.total)))
      + tbl(["", k.t("Amount", "Importe")], [
        [esc(k.t("Sale price of your home", "Precio de venta de tu casa")), esc(m(n(s.v)))],
        [esc(k.t("Costs of selling", "Gastos de vender")), esc(m(-r.sellCosts))],
        [esc(k.t("Mortgage paid off", "Hipoteca cancelada")), esc(m(-n(s.debt)))],
        [`<b>${esc(k.t("Cash from the sale", "Dinero de la venta"))}</b>`, `<b>${esc(m(r.cash))}</b>`],
        [esc(k.t("Price of the new home", "Precio de la casa nueva")), esc(m(-n(s.p)))],
        [esc(k.t("Taxes and fees of the purchase", "Impuestos y gastos de la compra")), esc(m(-r.buyCosts))],
        [`<b>${esc(r.enough ? k.t("Left over", "Te sobra") : k.t("Short by", "Te falta"))}</b>`, `<b>${esc(m(Math.abs(r.left)))}</b>`]])
      + note(esc(k.t("In the currency you typed. Tax on the gain of the sale is not included: it depends on your country, on how long you owned the home and on whether you lived in it. General information, not financial or tax advice.", "En la moneda que hayas escrito. No incluye el impuesto sobre la ganancia de la venta: depende de tu país, de cuántos años hayas tenido la casa y de si vivías en ella. Información general, no asesoramiento financiero ni fiscal.")));
    return { html, card: { title: k.t(`Sell a ${m(n(s.v))} home, buy one for ${m(n(s.p))}`, `Vender una casa de ${m(n(s.v))} y comprar una de ${m(n(s.p))}`), big: [r.enough ? k.t("Left over after buying", "Te sobra después de comprar") : k.t("Short by", "Te falta"), m(Math.abs(r.left))], lines: [[k.t("Cash from the sale", "Dinero de la venta"), m(r.cash)], [k.t("New home with taxes and fees", "Casa nueva con impuestos y gastos"), m(r.total)]] } };
  },
};

export const TOOLS: Record<string, Tool> = { costs, budget, compare, running, sdlt: sdltTool, imt: imtTool, notaire, grest, irnr, schengen: schengenTool, area, mortgage, rent: rentTool, move: moveTool };

/** The state of a form: the defaults, then what the address carries. Unknown names are dropped. */
export function readState(tool: Tool, data: ToolData, k: Fmt, query: string, base: State = {}): State {
  const s: State = { ...tool.defaults(data), ...base };
  const q = new URLSearchParams(query);
  for (const f of tool.fields(k, data)) { const v = q.get(f.n); if (v != null && v.length <= 40) s[f.n] = f.type === "check" ? (v === "1" ? "1" : "0") : v; }
  return s;
}
/** The part of the state that differs from `base` (the defaults of the page), as a query string, so a plain address
 * means the defaults. */
export function writeQuery(s: State, base: State, skip: string[] = []): string {
  const q = new URLSearchParams();
  for (const [key, v] of Object.entries(s)) if (!skip.includes(key) && v !== (base[key] ?? "")) q.set(key, v);
  const t = q.toString();
  return t ? "?" + t : "";
}

/** The form, as HTML. Every control has a visible label and a name; the browser script only reads names. */
export function formHtml(tool: Tool, data: ToolData, k: Fmt, s: State, idp = "rht"): string {
  const fs = tool.fields(k, data); let out = "", open = "";
  for (const f of fs) {
    const id = `${idp}-${tool.id}-${f.n}`, v = s[f.n] ?? "";
    if ((f.group || "") !== open) { if (open) out += "</div>"; if (f.group) out += `<div class="rht-group">`; open = f.group || ""; }
    if (f.type === "check") out += `<label class="rht-check" for="${id}"><input type="checkbox" id="${id}" name="${f.n}"${v === "1" ? " checked" : ""}> <span>${esc(f.label)}</span></label>`;
    else if (f.type === "select") out += `<label class="rht-f" for="${id}"><span>${esc(f.label)}</span><select id="${id}" name="${f.n}"${f.nav ? " data-nav" : ""}>${(f.opts || []).map(([val, lab]) => `<option value="${esc(val)}"${val === v ? " selected" : ""}>${esc(lab)}</option>`).join("")}</select></label>`;
    else out += `<label class="rht-f" for="${id}"><span>${esc(f.label)}</span><input id="${id}" name="${f.n}" type="${f.type}"${f.type === "number" ? ` inputmode="decimal"${f.min != null ? ` min="${f.min}"` : ""}${f.max != null ? ` max="${f.max}"` : ""}${f.step != null ? ` step="${f.step}"` : ""}` : ""} value="${esc(v)}">${f.hint ? `<small>${esc(f.hint)}</small>` : ""}</label>`;
  }
  if (open) out += "</div>";
  return `<form class="rht-form" data-tool-form novalidate>${out}</form>`;
}
