// RealHunt Score 2.0 (v0.8, 9-oct-2026): read every fact a listing shows, and estimate a fair price for each home
// from the homes around it (size, bedrooms, bathrooms, lot, age, type and exact area), instead of one median per m².
// Pure functions, no network. content.js calls RHS.enrich() on every home and RHS.scoreGroup() on every page or ranking.
(function (g) {
  const RHS = (g.RHS = g.RHS || {});
  const N = (s) => (RHS.num ? RHS.num(s) : parseFloat(String(s).replace(/[^\d.]/g, "")));
  const ACRE = 4046.86, SQFT = 0.09290304;

  // ---------------------------------------------------------------- 1. every fact the card or listing text shows
  RHS.facts = (text) => {
    const t = String(text || "").replace(/\s+/g, " ");
    const o = {};
    let m = t.match(/(\d+(?:[.,]5)?)\s*(?:full\s+)?(?:baths?|ba\b|bathrooms?|baños?|banos?|bagni|bagno|banheiros?|casas? de banho|badeværelser?|bad\b|badezimmer|salles? de bain|wc\b|kamar mandi)/i)
      || t.match(/(?:baths?|bathrooms?|baños?|bagni|banheiros?|badeværelser?|badezimmer|kamar mandi)\s*[:\-]?\s*(\d+(?:[.,]5)?)/i);
    if (m) { const v = parseFloat(m[1].replace(",", ".")); if (v > 0 && v < 20) o.baths = v; }
    m = t.match(/([\d.,]+)\s*(acres?|ac)\b(?:\s*lot)?/i);
    if (m) { const v = N(m[1]); if (v > 0 && v < 5000) o.lot = Math.round(v * ACRE); }
    if (!o.lot) { m = t.match(/([\d.,]+)\s*(?:sq\.?\s*ft|sqft)\s*lot/i) || t.match(/lot(?:\s*size)?\s*[:\-]?\s*([\d.,]+)\s*(?:sq\.?\s*ft|sqft)/i); if (m) { const v = N(m[1]); if (v > 100) o.lot = Math.round(v * SQFT); } }
    if (!o.lot) { m = t.match(/(?:grund|parcela|terreno|plot|land|lot|grundstück|terrain)\s*(?:size|de|af|:)?\s*([\d.,]+)\s*(?:m²|m2|sqm)/i) || t.match(/([\d.,]+)\s*(?:m²|m2)\s*(?:grund|parcela|de parcela|terreno|plot|grundstück|terrain|land)/i); if (m) { const v = N(m[1]); if (v > 20 && v < 5e6) o.lot = Math.round(v); } }
    m = t.match(/(?:built(?: in)?|year built|yr built|construido en|construcci[oó]n|año|opført|byggeår|baujahr|anno(?: di costruzione)?|ano de constru[cç][aã]o|construit en|bouwjaar|byggår)\s*[:\-]?\s*(1[89]\d\d|20[0-3]\d)/i);
    if (m) o.year = +m[1];
    m = t.match(/(?:hoa|community fees?|gastos de comunidad|comunidad|fællesudgift|ejerudgift|hausgeld|spese condominiali|condom[ií]nio|charges)\D{0,14}([\d.,]+)/i) || t.match(/\$\s?([\d,]+)\s*\/?\s*mo(?:nth)?\.?\s*hoa/i);
    if (m) { const v = N(m[1]); if (v > 0 && v < 100000) o.hoa = v; }
    m = t.match(/\$?\s?([\d.,]+)\s*([kKmM])?\s*(?:price\s*(?:drop|cut|reduction|reduced)|reduced)/i) || t.match(/(?:price\s*(?:drop|cut|reduced|reduction)|reduced|bajad[ao]|rebajad[ao]|prisnedsat|preis gesenkt|ribassat[oa]|baixou)\D{0,10}([\d.,]+)\s*([kKmM])?/i);
    if (m) { let v = N(m[1]); if (m[2]) v *= /m/i.test(m[2]) ? 1e6 : 1e3; if (v > 0) o.drop = v; }
    m = t.match(/(\d{1,4})\s*(?:days?|d)\s*(?:on\s*(?:zillow|market|site|realtor|redfin|homes\.com)|listed)/i) || t.match(/(?:listed|publicado hace|on the market for)\s*(\d{1,4})\s*(?:days?|días)/i) || t.match(/(\d{1,4})\s*(?:dage til salg|tage online|giorni|días publicado)/i);
    if (m) o.days = +m[1];
    // v0.10: sale or rent, and the period of the price
    const per = RHS.periodOf(t); if (per) o.period = per;
    const d = RHS.dealOf(t); if (d) o.deal = d;
    if (per === "night") o.deal = "short";
    if (/\b(room (in|for rent)|habitaci[oó]n (en|para)|chambre (en|chez|à louer)|wg[- ]zimmer|stanza (in|singola|doppia)|værelse (i|til leje)|shared (flat|house|apartment)|piso compartido|colocation)\b/i.test(t)) o.ptype0 = "room";
    m = t.match(/(\d)\s*(?:months?'?\s*(?:deposit|security)|meses de fianza|mois de caution|monatsmieten kaution|mesi di deposito|måneders depositum)/i) || t.match(/(?:deposit|fianza|caution|kaution|depositum|deposito)\D{0,12}(\d)\s*(?:months?|meses|mois|monat|mesi|måneder)/i);
    if (m) o.depositMonths = +m[1];
    // status: homes that are no longer for sale never rank
    if (/\b(pending|contingent|under contract|under offer|sale agreed|sold stc|sold(?![\s-]+(?:as|furnished|turn-?key|fully|with|separately|together|in|out|by|for|before|quickly|fast))|vendid[oa]|reservad[oa]|solgt|verkauft|venduto|vendu|verkocht|såld)\b/i.test(t) && !/\b(sold separately|recently sold homes|sold before)\b/i.test(t)) o.status = "off";
    // type of home
    o.ptype = o.ptype0 ? "room" : /\b(mobile|manufactured|trailer|caravan|mobilhome|casa m[oó]vil)\b/i.test(t) ? "mobile"
      : /\b(lot|land|plot|parcel|solar|terreno|grund(?:stück)?|terrain|tanah|kavling|acreage)\b(?![-\s]*(size|area))/i.test(t) && !/\b(bed|bd|bath|dormitor|habitaci|værelse|zimmer|room)/i.test(t) ? "land"
      : /\b(condo|apartment|flat|piso|apartamento|appartamento|appartement|wohnung|lejlighed|ejerlejlighed|lägenhet|leilighet|studio|estudio|penthouse|ático|co-?op)\b/i.test(t) ? "flat"
      : /\b(townhouse|townhome|row ?house|rækkehus|adosad[oa]|reihenhaus|villetta a schiera|maison de ville)\b/i.test(t) ? "town"
      : /\b(multi[- ]?family|duplex|triplex|fourplex|apartment building|edificio|zinshaus)\b/i.test(t) ? "multi"
      : /\b(house|home|villa|chalet|casa|maison|haus|hus|villa|bungalow|cottage|cabin|single[- ]family|detached|moradia|rumah|finca|cortijo)\b/i.test(t) ? "house" : null;
    if (/\b(new construction|new build|obra nueva|nybyg|neubau|nuova costruzione|construction neuve|nieuwbouw|pre-?construction|off[- ]plan)\b/i.test(t)) o.newBuild = true;
    // where: US zip or "City, ST", UK outward code, 4-5 digit postcodes
    m = t.match(/,\s*([A-Za-z .'-]{2,30}),\s*([A-Z]{2})\s+(\d{5})\b/);
    if (m) { o.zip = m[3]; o.city = m[1].trim(); o.region = m[2]; }
    else {
      m = t.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s+\d[A-Z]{2}\b/); if (m) o.zip = m[1];
      else { m = t.match(/\b(\d{4,5})\s+([A-ZÆØÅÄÖÜÉ][A-Za-zÆØÅæøåÄÖÜäöüßéèêáíóúñç' -]{2,28})/); if (m) { o.zip = m[1]; o.city = m[2].trim().split(/\s{2,}| - |,/)[0]; } }
    }
    return o;
  };
  // rent or sale from the words around the price; the period of a rent
  const RENT_PERIOD = /(\/\s?(?:mo|mth|month|mes|mois|monat|mese|mês|md|mdr|måned|månad|maand|bulan)\b|\bper (?:calendar )?month\b|\bpcm\b|\bp\/?m\b|€\s?\/\s?mes|al mes|par mois|pro monat|al mese|por mês|pr\.? md|om måneden|i månaden|per maand|\/bln|per bulan)/i;
  const RENT_WEEK = /(\bpw\b|\bp\/w\b|\bper week\b|\/\s?(?:week|wk|semana|semaine|woche)\b)/i;
  const RENT_YEAR = /(\bper (?:year|annum)\b|\/\s?(?:year|yr|año|an|jahr|anno|ano|år|jaar|tahun|thn)\b|\bp\.a\.(?!\w))/i;
  const NIGHT = /(\bper night\b|\/\s?(?:night|nt|noche|nuit|nacht|notte|noite|nat)\b|por noche|par nuit|pro nacht|a notte)/i;
  const RENT_W = /\b(for rent|to rent|to let|rental|alquiler|en alquiler|se alquila|alquilar|til leje|udlejes|lejebolig|zu vermieten|mietwohnung|miete|kaltmiete|warmmiete|à louer|location meublée|in affitto|affittasi|affitto|para alugar|arrendamento|arrenda-se|aluga-se|te huur|huurwoning|huurprijs|uthyres|hyresrätt|til leie|utleie|disewakan|untuk disewa)\b/i;
  const SALE_W = /\b(for sale|en venta|se vende|venta|til salg|zu verkaufen|kaufpreis|à vendre|in vendita|vendesi|à venda|vende-se|te koop|koopsom|till salu|til salgs|dijual|kontantpris)\b/i;
  RHS.periodOf = (t) => NIGHT.test(t) ? "night" : RENT_WEEK.test(t) ? "week" : RENT_PERIOD.test(t) ? "month" : RENT_YEAR.test(t) && RENT_W.test(t) ? "year" : null;
  RHS.dealOf = (t) => { if (RENT_PERIOD.test(t) || RENT_WEEK.test(t)) return "rent"; if (SALE_W.test(t)) return "sale"; if (RENT_W.test(t)) return "rent"; return null; };
  RHS.isRentText = (t) => !!(RENT_PERIOD.test(t) || RENT_WEEK.test(t) || NIGHT.test(t) || RENT_W.test(t));
  // the whole page: a rentals search or a sales search (address, title, heading)
  RHS.pageDealOf = (doc = document, url = location.href) => {
    const u = decodeURIComponent(String(url)).toLowerCase();
    if (/(\/|-|_|=)(rent|to-rent|for-rent|rentals?|let|alquiler|alquilar|til-leje|leje|mieten|miete|louer|location|affitto|alugar|arrendar|huur|hyra|leie|sewa)(\/|-|_|\?|$|&|\.)/.test(u)) return "rent";
    if (/(\/|-|_|=)(sale|for-sale|buy|kaufen|venta|comprar|til-salg|salg|acheter|vendita|venda|koop|kopen|kop|dijual)(\/|-|_|\?|$|&|\.)/.test(u)) return "sale";
    const h = [doc.title, (doc.querySelector("h1") || {}).textContent || ""].join(" ");
    return RENT_PERIOD.test(h) || RENT_W.test(h) ? "rent" : SALE_W.test(h) ? "sale" : null;
  };
  // where the search is: the heading usually says it ("Homes for sale in Lake City, FL", "Pisos en Chamberí, Madrid")
  RHS.pagePlace = (doc = document) => {
    const h = ((doc.querySelector("h1") || {}).textContent || doc.title || "").replace(/\s+/g, " ").trim();
    const m = h.match(/\b(?:in|en|i|à|a|em|te|på|di|im|nel|na|no)\s+([A-ZÀ-ÖØ-Þ][^|·–—()]{2,60})$/) || h.match(/\b(?:in|en|i|à|em|te|på|di|im)\s+([A-ZÀ-ÖØ-Þ][^|·–—(),]{2,40})/);
    return m ? m[1].replace(/\s*[-|].*$/, "").trim() : null;
  };
  // the risks a card or listing shows on top of the score.js word list
  RHS.FLAGS2 = [
    { k: "mobile", pts: 12, re: /\b(mobile home|manufactured home|manufactured housing|trailer home|single[- ]wide|double[- ]wide|casa m[oó]vil|mobilhome)\b/i, label: "Mobile or manufactured home" },
    { k: "landlease", pts: 10, re: /\b(land lease|leased land|lot rent|ground rent|space rent|park rent)\b/i, label: "Land is rented, not owned" },
    { k: "timeshare", pts: 18, re: /\b(timeshare|fractional ownership|tiempo compartido|multipropiedad|1\/\d+ share)\b/i, label: "Timeshare or a fraction of the home" },
    { k: "asis", pts: 6, re: /\b(as[- ]is|sold as is|tal cual|voetstoots)\b/i, label: "Sold as-is" },
    { k: "shortsale", pts: 6, re: /\b(short sale|pre-?foreclosure|foreclosure|bank[- ]owned|reo\b|ejecuci[oó]n hipotecaria|tvangsauktion|zwangsversteigerung)\b/i, label: "Foreclosure, bank-owned or short sale" },
    { k: "age55", pts: 4, re: /\b(55\+|55 and over|55 \+ community|over[- ]55|senior (living|community)|age[- ]restricted)\b/i, label: "Only for over-55s" },
    { k: "flood", pts: 5, re: /\b(flood zone|zona inundable|oversvømmelse|hochwassergebiet|zona alluvionale)\b/i, label: "Flood zone" },
    { k: "coop", pts: 4, re: /\b(co-?op\b|cooperative|share of freehold|andelsbolig|cooperativa)\b/i, label: "Co-op or share: you buy shares, not the home" },
  ];

  // add the facts to a home without overwriting what the site gave
  RHS.enrich = (f) => {
    if (!f || f._enriched) return f;
    const x = RHS.facts([f.title, f.desc, f.area, f.addr].filter(Boolean).join(" · "));
    for (const k in x) if (f[k] == null && x[k] != null) f[k] = x[k];
    if (!f.deal) f.deal = RHS.pageDeal || "sale";
    // a rent is compared per month: weekly and yearly prices are converted; per-night prices are holiday lets
    if (f.deal === "rent" && f.price && !f._per) { if (f.period === "week") f.price = Math.round(f.price * 52 / 12); else if (f.period === "year") f.price = Math.round(f.price / 12); f._per = true; }
    if (f.deal === "short") f.status = "short";
    // zone and city from the card title ("…, Chamberí, Madrid") or the search heading
    if (!f.zip && !f.city) {
      const tt = String(f.title || "").replace(/\s+/g, " ");
      const m2 = tt.match(/,\s*([^,\d]{2,40}),\s*([^,\d]{2,40})\s*$/), m1 = tt.match(/,\s*([^,\d]{2,40})\s*$/);
      if (m2) { f.area = f.area || m2[1].trim(); f.city = m2[2].trim(); } else if (m1) f.city = m1[1].trim();
      else if (RHS.pagePlaceV) f.city = RHS.pagePlaceV;
    }
    if (f.ptype && !/^(mobile|land|flat|town|multi|house)$/.test(f.ptype)) { const p = RHS.facts(f.ptype).ptype; if (p) f.ptype = p; }
    f.loc = f.zip ? "z:" + f.zip : f.area && f.city && f.area !== f.city ? "a:" + String(f.area).toLowerCase().slice(0, 40) + "|" + String(f.city).toLowerCase() : f.city ? "c:" + String(f.city).toLowerCase() : f.area ? "a:" + String(f.area).toLowerCase().slice(0, 40) : null;
    f.title = RHS.cleanTitle(f);
    f._enriched = true;
    return f;
  };
  // a readable line for a card: the address when there is one, never "/ 40 $172,000 2 Beds…"
  RHS.cleanTitle = (f) => {
    const t = String(f.title || "").replace(/\s+/g, " ").trim();
    const all = [t, f.desc || ""].join(" · ");
    const a = all.match(/\b\d{1,6}\s+(?:[NSEW]{1,2}\s+)?[A-Za-z][A-Za-z .'-]{1,40}?\s(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Blvd|Way|Pl|Place|Ter|Terrace|Cir|Circle|Pkwy|Hwy|Loop|Trl|Trail|Sq|Run|Pt|Point)\b\.?(?:\s*(?:#|Apt|Unit)\s*\w+)?,\s*[A-Za-z .'-]{2,30},\s*[A-Z]{2}\s*\d{5}/);
    if (a) return a[0];
    const clean = t.replace(/^[\/|·\s\d]+(?=\D)/, "").replace(/(?:€|£|\$|USD|EUR)\s?[\d.,]+\s*[kKmM]?/g, "").replace(/\d[\d.,\s]*\s?(?:kr\.?|€|EUR|DKK|SEK|NOK|£)(?=\s|$)/g, "").replace(/\b\d+\s*(?:beds?|bd|baths?|ba|sq\.?\s*ft|sqft|m²|m2|værelser|rooms?|hab\.?|habitaciones|dormitorios|zimmer|pièces|camere|quartos|soverom|sovrum)(?=\s|$|[.,·])/gi, "").replace(/\b(price drop|new|open house)\b/gi, "").replace(/\s{2,}/g, " ").replace(/^[\s·,|/-]+|[\s·,|/-]+$/g, "");
    return (clean.length >= 6 ? clean : t).slice(0, 120);
  };

  // ---------------------------------------------------------------- 2. fair price from the homes around it
  // log(price) = a + b·log(m²) + c·beds + d·baths + e·log(lot) + f·age + type + exact area   (ridge regression, 2 passes, outliers out)
  function solve(A, b) { // Gaussian elimination with partial pivoting
    const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-10) return null; [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / M[c][c]; if (k) for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  const TYPES = ["flat", "town", "mobile", "land", "multi", "room"];
  RHS.fairModel = (rows, opt = {}) => {
    const R = rows.filter((f) => f && f.price > 0 && f.status !== "off" && f.status !== "short" && (f.sqm > 0 || f.rooms > 0));
    if (R.length < 10) return null;
    const useSqm = R.filter((f) => f.sqm > 0).length >= Math.max(10, R.length * 0.6);
    const D = useSqm ? R.filter((f) => f.sqm > 0) : R.filter((f) => f.rooms > 0);
    if (D.length < 10) return null;
    const mean = (k, tf) => { const v = D.map((f) => f[k]).filter((x) => x > 0).map(tf); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
    const has = (k) => D.filter((f) => f[k] > 0).length >= D.length * 0.5;
    const useBeds = has("rooms"), useBaths = has("baths"), useLot = has("lot"), useYear = has("year");
    // v0.13: the official tax assessment, when the site shows it (US): lagged, but it knows the land, the view and the building
    const useTax = !opt.noTax && D.filter((f) => f.tax > 0).length >= D.length * 0.4; const mt = mean("tax", Math.log);
    const mb = mean("rooms", (x) => x), mba = mean("baths", (x) => x), ml = mean("lot", Math.log), my = mean("year", (x) => x);
    const types = TYPES.filter((t) => D.filter((f) => f.ptype === t).length >= 3);
    const lc = {}; for (const f of D) if (f.loc) lc[f.loc] = (lc[f.loc] || 0) + 1;
    const locs = Object.keys(lc).filter((k) => lc[k] >= 4).sort((a, b) => lc[b] - lc[a]).slice(0, 30);
    const x = (f) => {
      const v = [1];
      if (useSqm) v.push(Math.log(f.sqm));
      if (useBeds) v.push(Math.min(8, f.rooms || mb) - mb);
      if (useBaths) v.push(Math.min(6, f.baths || mba) - mba);
      if (useLot) v.push((f.lot > 0 ? Math.log(f.lot) : ml) - ml);
      if (useYear) v.push(((f.year || my) - my) / 20);
      if (useTax) { v.push(f.tax > 0 ? Math.log(f.tax) - mt : 0); v.push(f.tax > 0 ? 0 : 1); }
      for (const t of types) v.push(f.ptype === t ? 1 : 0);
      for (const l of locs) v.push(f.loc === l ? 1 : 0);
      return v;
    };
    const fit = (S) => {
      const X = S.map(x), y = S.map((f) => Math.log(f.price)); const p = X[0].length;
      const A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
      for (let i = 0; i < X.length; i++) for (let j = 0; j < p; j++) { b[j] += X[i][j] * y[i]; for (let k = 0; k < p; k++) A[j][k] += X[i][j] * X[i][k]; }
      for (let j = 1; j < p; j++) A[j][j] += j === 1 && useSqm ? 0.5 : 2; // ridge: keeps small groups (one street, one type) from running wild
      const beta = solve(A, b); if (!beta) return null;
      const res = X.map((r, i) => y[i] - r.reduce((a, v, j) => a + v * beta[j], 0));
      const med = [...res].map(Math.abs).sort((a, b2) => a - b2)[res.length >> 1] || 0.1;
      return { beta, res, sd: Math.max(0.06, med * 1.4826) };
    };
    let m = fit(D); if (!m) return null;
    const keep = D.filter((f, i) => Math.abs(m.res[i]) <= 2.5 * m.sd); // drop typos, auctions, plots sold as homes
    if (keep.length >= 10 && keep.length < D.length) { const m2 = fit(keep); if (m2) m = m2; }
    const yv = keep.map((f) => Math.log(f.price)); const ym = yv.reduce((a, b) => a + b, 0) / yv.length;
    const ss = yv.reduce((a, v) => a + (v - ym) ** 2, 0) || 1; const sr = keep.map(x).reduce((a, r, i) => a + (yv[i] - r.reduce((s, v, j) => s + v * m.beta[j], 0)) ** 2, 0);
    const r2 = Math.max(0, 1 - sr / ss);
    return {
      n: keep.length, r2, sd: m.sd, unit: useSqm ? "sqm" : "room", locs: locs.length,
      predict(f) {
        if (!(f.price > 0)) return null; if (useSqm && !(f.sqm > 0)) return null; if (!useSqm && !(f.rooms > 0)) return null;
        const fair = Math.exp(x(f).reduce((a, v, j) => a + v * m.beta[j], 0));
        return { fair, pct: Math.round((f.price / fair - 1) * 100), local: !!(f.loc && locs.includes(f.loc)) };
      },
    };
  };
  // v0.13: the fair price, sharpened. 1) one model per kind of home when there are enough of each (condos and houses
  // price differently), 2) a neighbourhood correction: how much the 12 nearest similar homes sell above or below the model
  // (what an appraiser does with "comps"), shrunk when there are few, 3) an outside second opinion when the site has one
  // (Zillow's Zestimate), corrected for how far asking prices usually sit above it in this search.
  const seg = (f) => (f.ptype === "flat" ? "flat" : f.ptype === "land" ? "land" : "home");
  RHS.fairPredictor = (rows, opt = {}) => {
    const R = rows.filter((f) => f && f.price > 0 && f.status !== "off" && f.status !== "short" && f.ptype !== "land" && !f._noFit && (f.sqm > 0 || f.rooms > 0));
    const all = RHS.fairModel(R); if (!all) return null;
    const segs = {};
    for (const k of ["flat", "home"]) { const g = R.filter((f) => seg(f) === k); if (g.length >= 60 && R.length - g.length >= 30) { const M = RHS.fairModel(g); if (M && M.r2 >= all.r2 * 0.8) segs[k] = M; } }
    const base = (f) => { const M = segs[seg(f)] || all; const p = M.predict(f); return p ? { fair: p.fair, local: p.local, M } : null; };
    // residuals of every home with a map point, for the neighbourhood correction
    const pts = [];
    for (const f of R) { if (f.lat == null || f.lng == null) continue; const b = base(f); if (!b) continue; const e = Math.max(-0.6, Math.min(0.6, Math.log(f.price / b.fair))); pts.push({ f, e, lat: f.lat, lng: f.lng, seg: seg(f), sqm: f.sqm || null }); }
    // asking price vs the outside estimate, typical for this search (asking prices usually sit a little above it)
    const zr = R.filter((f) => f._zest > 0).map((f) => Math.log(f.price / f._zest)).sort((a, b) => a - b);
    const zBias = zr.length >= 15 ? zr[zr.length >> 1] : null;
    const { K, KM, LAMBDA } = RHS._knn || { K: 8, KM: 4, LAMBDA: 1.5 };
    const predict = (f) => {
      const b = base(f); if (!b) return null;
      let adj = 0, nb = 0, wsum = 0;
      if (f.lat != null && pts.length >= 20) {
        const c = [];
        for (const p of pts) { if (p.f === f) continue; const d = RHS.km(f.lat, f.lng, p.lat, p.lng); if (d > KM) continue; let w = 1 / (d + 0.25); if (p.seg !== seg(f)) w *= 0.4; if (f.sqm && p.sqm) w *= 1 / (1 + Math.abs(Math.log(f.sqm / p.sqm)) * 2); c.push({ w, e: p.e, d }); }
        c.sort((a, b2) => b2.w - a.w); const top = c.slice(0, K); nb = top.length;
        let se = 0; for (const x of top) { se += x.w * x.e; wsum += x.w; }
        adj = wsum ? se / (wsum + LAMBDA) : 0; // few or far neighbours: the correction shrinks toward zero
      }
      let fair = b.fair * Math.exp(adj);
      let zest = null;
      if (f._zest > 0 && zBias != null) { zest = f._zest * Math.exp(zBias); fair = Math.exp(0.5 * Math.log(fair) + 0.5 * Math.log(zest)); }
      // how far off this fair price can be (log scale): the model's own spread, smaller with close neighbours and a second opinion
      const sd = (b.M && b.M.sd) || all.sd; let u = Math.max(0.08, Math.min(0.45, sd * 1.15));
      if (nb >= 6) u *= 0.88; if (zest) u *= 0.72; if (f.deep) u *= 0.95;
      return { fair, pct: Math.round((f.price / fair - 1) * 100), local: b.local || nb >= 6, nb, zest, adj, u };
    };
    const n = all.n;
    return { predict, n, r2: all.r2, sd: all.sd, unit: all.unit, M: all, segs: Object.keys(segs) };
  };
  // how much to trust the fair price: more homes and a better fit = more weight on the price difference
  RHS.modelConf = (M, local) => !M ? 0 : Math.max(0.35, Math.min(1, (0.45 + Math.min(M.n, 60) / 120) * (0.6 + 0.4 * Math.min(1, M.r2 / 0.6)) * (local ? 1 : 0.9)));

  // v0.13: what reading the whole listing adds to a home we only knew from the search results (one rule for the ranking's
  // checks, the listing page and the tests, so they can't disagree)
  RHS.mergeDeep = (f, d, bodyText) => {
    if (!f || !d) return f;
    const fx = RHS.facts([d.desc || "", bodyText || ""].join(" "));
    for (const k of ["baths", "year", "lot", "hoa", "days", "drop"]) { if (d[k] != null && d[k] !== "") f[k] = d[k]; else if (f[k] == null && fx[k] != null) f[k] = fx[k]; }
    if (!f.sqm && d.sqm) f.sqm = d.sqm; if (!f.rooms && d.rooms) f.rooms = d.rooms;
    if (d.lat != null && f.lat == null) { f.lat = d.lat; f.lng = d.lng; }
    for (const k of ["photos", "extra", "tenure", "_zest", "rentEst", "taxRate", "lastSold"]) if (d[k] != null) f[k] = d[k];
    if (d.sub && d.sub.length) f.sub = [...new Set([...(f.sub || []), ...d.sub])];
    if (d.ptype) { const p = /^(mobile|land|flat|town|multi|house|room)$/.test(d.ptype) ? d.ptype : (RHS.facts(d.ptype).ptype || null); if (p && (p === "mobile" || p === "land" || !f.ptype)) f.ptype = p; }
    // the portal's own status wins over words in the text ("sold as-is" is not sold)
    if (d.status === "off" || (d.status === undefined && !d.structured && fx.status === "off")) f.status = "off";
    if (fx.newBuild) f.newBuild = true;
    f.desc = String(d.desc && d.desc.length > 80 ? d.desc : bodyText || f.desc || "").slice(0, 6000);
    f.deep = true;
    return f;
  };

  // ---------------------------------------------------------------- learned taste: what the homes you 👍 or save have in common
  RHS.learnTaste = (notes, deal) => {
    const L = Object.values(notes || {}).filter((n) => n && n.like === 1 && n.price > 0 && (n.deal || "sale") === (deal || "sale"));
    if (L.length < 3) return null;
    const med = (a) => { const b = a.filter((x) => x > 0).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; };
    const cities = {}; for (const n of L) if (n.city) cities[n.city] = (cities[n.city] || 0) + 1;
    const top = Object.keys(cities).sort((a, b) => cities[b] - cities[a]).slice(0, 3);
    const prices = L.map((n) => n.price).sort((a, b) => a - b);
    return { learned: true, n: L.length, budget: Math.round(prices[Math.min(prices.length - 1, Math.floor(prices.length * 0.8))] * 1.1), rooms: med(L.map((n) => n.rooms)), sqm: med(L.map((n) => n.sqm)), places: top, cur: L[0].cur };
  };

  // ---------------------------------------------------------------- 3. score every home of a page or a whole ranking
  RHS.scoreGroup = (fs, ctx = {}) => {
    fs.forEach(RHS.enrich);
    // v0.10: never compare rents with sale prices, or rupiah with dollars: one model per deal and currency
    const groups = new Map();
    for (const f of fs) { const k = (f.deal || "sale") + "|" + (f.currency || ""); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
    const models = new Map();
    for (const [k, g] of groups) { const P = RHS.fairPredictor(g); models.set(k, { P, B: !P && RHS.benches ? RHS.benches(g) : null }); }
    return fs.map((f) => {
      const { P, B } = models.get((f.deal || "sale") + "|" + (f.currency || ""));
      if (P) {
        const p = P.predict(f);
        if (p) {
          const conf = Math.min(1, RHS.modelConf(P.M, p.local) + (p.nb >= 8 ? 0.08 : 0) + (p.zest ? 0.1 : 0));
          const r = RHS.score({ ...f, partial: !f.deep }, { ...ctx, loc: f._loc !== undefined ? f._loc : ctx.loc, fair: p.fair, fairN: P.n, fairSrc: p.local ? "local" : "page", conf, zest: p.zest, u: p.u });
          r.fair = p.fair; r.u = p.u; r.model = { n: P.n, r2: P.r2, unit: P.unit, nb: p.nb, zest: !!p.zest }; return r;
        }
      }
      if (B && RHS.scoreInGroup) return RHS.scoreInGroup(f, B, ctx);
      return RHS.score({ ...f, partial: !f.deep }, { ...ctx, loc: f._loc !== undefined ? f._loc : ctx.loc, bench: null });
    });
  };
})(typeof window !== "undefined" ? window : self);
