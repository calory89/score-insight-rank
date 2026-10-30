// RealHunt Score — generic listing reader (9-oct-2026).
// Works on most property sites in the world without site-specific code, by reading what portals publish for search
// engines (schema.org JSON-LD, Open Graph / meta tags, embedded app state like __NEXT_DATA__), the embedded map, and,
// as a last resort, the visible text. Site recipes (served from our server) can override any field with CSS selectors.
(function (g) {
  const RHS = (g.RHS = g.RHS || {});
  const $ = (s, r = document) => { try { return r.querySelector(s); } catch { return null; } };
  const $$ = (s, r = document) => { try { return [...r.querySelectorAll(s)]; } catch { return []; } };
  const txt = (el) => (el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : "");
  // text with a space between elements (textContent glues "115 m2" and "8.495.000 kr." into "115 m28.495.000 kr.")
  const stxt = (el) => { if (!el) return ""; const parts = []; const w = (el.ownerDocument || document).createTreeWalker(el, 4); let n; while ((n = w.nextNode())) { const v = n.nodeValue; if (!v || !v.trim()) continue; const p = n.parentElement; if (p && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) continue; if (p && p.tagName === "SUP") parts.push(v.trim()); else parts.push(" " + v); } return parts.join("").replace(/\s+/g, " ").trim(); };
  const noArea = (t) => t.replace(/\d[\d.,  ]*\s*(m²|m2|㎡|mq|sqm|sq\.?\s*ft|sqft|ft²|kvm|qm|m\b)/gi, " ");
  RHS.stxt = stxt;
  // leasehold or freehold, and the years left (Bali, Thailand, UK...)
  RHS.tenure = (t) => { const s = String(t || ""); const lease = /\b(leasehold|hak sewa|sewa)\b/i.test(s), free = /\b(freehold|hak milik|shm)\b/i.test(s);
    const y = s.match(/\b(\d{1,3})\s*(?:years?|yrs|tahun)\b/i); return lease && !free ? { k: "lease", years: y ? +y[1] : null } : free && !lease ? { k: "free" } : null; };
  const meta = (doc, ...names) => { for (const n of names) { const e = $(`meta[property="${n}"],meta[name="${n}"],meta[itemprop="${n}"]`, doc); if (e && e.content) return e.content; } return null; };

  // ---------------------------------------------------------------- money and size in many languages
  const CUR = [
    [/€|\bEUR\b|euros?\b/i, "EUR"], [/£|\bGBP\b/i, "GBP"], [/\bUS\$|\bUSD\b|(?<![A-Z])\$(?!\s?[A-Z])/, "USD"], [/\bCHF\b|\bFr\.\s/i, "CHF"],
    [/\bDKK\b|\bkr\.?(?=\s|$)|\bkroner\b/i, "DKK"], [/\bSEK\b/i, "SEK"], [/\bNOK\b/i, "NOK"], [/\bzł|\bPLN\b/i, "PLN"], [/\bKč|\bCZK\b/i, "CZK"],
    [/\bFt\b|\bHUF\b/i, "HUF"], [/\blei\b|\bRON\b/i, "RON"], [/\bлв|\bBGN\b/i, "BGN"], [/₺|\bTL\b|\bTRY\b/, "TRY"], [/R\$|\bBRL\b/, "BRL"],
    [/\bA\$|\bAUD\b/, "AUD"], [/\bC\$|\bCAD\b/, "CAD"], [/\bNZ\$|\bNZD\b/, "NZD"], [/\bAED\b|د\.إ/, "AED"], [/\bSAR\b|ر\.س/, "SAR"], [/₪|\bILS\b|\bNIS\b/, "ILS"],
    [/\bZAR\b|\bR\s?\d/, "ZAR"], [/₹|\bINR\b|\bRs\.?/, "INR"], [/\bRp\b|\bIDR\b/, "IDR"], [/฿|\bTHB\b/, "THB"], [/\bRM\b|\bMYR\b/, "MYR"], [/\bS\$|\bSGD\b/, "SGD"],
    [/₱|\bPHP\b/, "PHP"], [/₫|\bVND\b/, "VND"], [/¥|円|\bJPY\b/, "JPY"], [/₩|원|\bKRW\b/, "KRW"], [/\bHK\$|\bHKD\b/, "HKD"], [/\bNT\$|\bTWD\b/, "TWD"],
    [/\bMXN\b|\bMX\$/, "MXN"], [/\bARS\b|\bUSD\b/, "ARS"], [/\bCLP\b|\bUF\b/, "CLP"], [/\bCOP\b/, "COP"], [/\bS\/\.?|\bPEN\b/, "PEN"], [/\bEGP\b|ج\.م/, "EGP"], [/\bMAD\b|\bDH\b/, "MAD"],
  ];
  const TLD_CUR = { dk: "DKK", se: "SEK", no: "NOK", pl: "PLN", cz: "CZK", hu: "HUF", ro: "RON", bg: "BGN", tr: "TRY", br: "BRL", au: "AUD", ca: "CAD", nz: "NZD", ae: "AED", sa: "SAR", il: "ILS", za: "ZAR", in: "INR", id: "IDR", th: "THB", my: "MYR", sg: "SGD", ph: "PHP", vn: "VND", jp: "JPY", kr: "KRW", hk: "HKD", tw: "TWD", mx: "MXN", ar: "ARS", cl: "CLP", co: "COP", pe: "PEN", eg: "EGP", ma: "MAD", ch: "CHF", uk: "GBP", us: "USD", com: null };
  const TLD_COUNTRY = { dk: "DK", se: "SE", no: "NO", fi: "FI", de: "DE", at: "AT", ch: "CH", fr: "FR", be: "BE", nl: "NL", es: "ES", pt: "PT", it: "IT", ie: "IE", uk: "GB", pl: "PL", cz: "CZ", hu: "HU", ro: "RO", gr: "GR", hr: "HR", bg: "BG", tr: "TR", ee: "EE", lv: "LV", lt: "LT", cy: "CY", mt: "MT", ca: "CA", mx: "MX", br: "BR", ar: "AR", cl: "CL", co: "CO", pe: "PE", au: "AU", nz: "NZ", ae: "AE", sa: "SA", il: "IL", za: "ZA", eg: "EG", ma: "MA", in: "IN", id: "ID", th: "TH", my: "MY", sg: "SG", ph: "PH", vn: "VN", jp: "JP", kr: "KR", hk: "HK", tw: "TW" };
  RHS.tld = (host = location.hostname) => host.split(".").pop();
  RHS.siteCountry = (host = location.hostname) => TLD_COUNTRY[RHS.tld(host)] || null;
  RHS.curFrom = (s, host = location.hostname) => { const t = String(s || ""); const tl = RHS.tld(host);
    if (/\bkr\.?(?=\s|$)|\bkroner\b/i.test(t) && (tl === "se" || tl === "no")) return tl === "se" ? "SEK" : "NOK";
    for (const [re, c] of CUR) if (re.test(t)) return c; return TLD_CUR[RHS.tld(host)] || (TLD_COUNTRY[RHS.tld(host)] && "EUR") || null; };

  // number parser that understands 1.250.000 / 1,250,000 / 1 250 000 / 1'250'000 / 1.250,50 / 2,5 mio / 1.2M / 3.5 lakh / 2 crore
  RHS.amount = (s) => {
    if (s == null) return null;
    if (typeof s === "number") return isFinite(s) ? s : null;
    const t = String(s).replace(/[   ]/g, " ");
    const m = t.match(/(\d{1,3}([ .,'’])\d{3}(?:\2\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d+)?)\s*(mio\.?|mill?(?:ion(?:en|es|i)?)?|mn|m(?![²2³\w])|k\b|tusind|mil\b|lakh|lac|crore|cr\b|万|億|억)?/i);
    if (!m) return null;
    let x = m[1];
    if (/^\d{1,3}([ .,'’]\d{3})+$/.test(x)) x = x.replace(/[ .,'’]/g, "");
    else if (/^\d{1,3}([ .,'’]\d{3})+[.,]\d{1,2}$/.test(x)) { const dec = x.slice(-3); x = x.slice(0, -3).replace(/[ .,'’]/g, "") + "." + dec.slice(1); }
    else x = x.replace(",", ".");
    let v = parseFloat(x); const u = (m[3] || "").toLowerCase();
    if (/^(mio|mill|million|mn|m$)/.test(u) && v < 10000) v *= 1e6; else if (u === "k" || u === "tusind") v *= 1e3; else if (u === "mil" && v < 1000) v *= 1e3;
    else if (/lakh|lac/.test(u)) v *= 1e5; else if (/crore|cr/.test(u)) v *= 1e7; else if (u === "万") v *= 1e4; else if (u === "億" || u === "억") v *= 1e8;
    return isFinite(v) ? v : null;
  };
  const AREA_UNIT = /(m²|m2|㎡|mq|sqm|sq\.?\s*m(?:etres?|eters?)?|kvm|kvadratmeter|m\b|metros?|mètres?|quadratmeter|qm|㎡|평|坪|sq\.?\s*ft|sqft|ft²|ft2|square feet)/i;
  RHS.area = (s) => {
    if (s == null) return null;
    if (typeof s === "number") return s;
    const t = String(s).replace(/[  ]/g, " ");
    const re = /(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d+)?)\s*(m²|m2|㎡|mq|sqm|sq\.?\s*m\b|kvm|qm|m\b|평|坪|sq\.?\s*ft|sqft|ft²|ft2|square\s*feet)/gi;
    let m, best = null;
    while ((m = re.exec(t))) {
      let raw = m[1]; if (/^\d{1,2} \d{3}$/.test(raw)) raw = raw.split(" ")[1]; // "4 110 m²" is 4 rooms + 110 m², not 4,110 m²
      let v = RHS.amount(raw); const u = m[2].toLowerCase();
      if (/ft|feet/.test(u)) v = v * 0.09290304; else if (u === "평") v = v * 3.3058; else if (u === "坪") v = v * 3.3058;
      if (v >= 12 && v <= 5000) { best = Math.round(v); break; }
    }
    return best;
  };
  RHS.rooms = (s) => { const lab = String(s || "").match(/\b(?:bed(?:room)?s?|dormitorios?|habitaciones?|kamar(?: tidur)?|chambres?|camere|quartos?|zimmer|værelser|slaapkamers|sovrum|soverom)\s*[:\-]?\s*(\d{1,2})\b/i); if (lab && +lab[1] < 40) return +lab[1]; const it = String(s || "").match(/\b(mono|bi|tri|quadri|penta|pluri)locale\b/i); const m = String(s || "").match(/(?<![\d.,])(\d{1,2})\s*(hab|dorm|bed|bd|rooms?|værelser|vær|zimmer|zi\.|pièces|pi[eè]ce|chambres?|locali|camere|quartos?|kamers|slaapkamers|rum|sov|pokoj|pok|szob|oda|chambre|habitaciones|bdr|br\b|LDK|DK|K\b)/i); if (m) return +m[1]; const tp = String(s || "").match(/\bT([0-9])(?:\+\d)?\b/); if (tp) return +tp[1] || 1; if (it) return { mono: 1, bi: 2, tri: 3, quadri: 4, penta: 5, pluri: 5 }[it[1].toLowerCase()] || null; return null; };

  // v0.14: number words ("three-bedroom", "tres dormitorios") and bathrooms
  const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, single: 1, double: 2, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, um: 1, "duas": 2, "três": 3, quatro: 4, due: 2, tre: 3, quattro: 4, cinque: 5, deux: 2, trois: 3, quatre: 4, cinq: 5, zwei: 2, drei: 3, vier: 4, fünf: 5, to: 2, tre_: 3, fire: 4, fem: 5 };
  const wnum = (w) => { const x = String(w || "").toLowerCase(); return /^\d{1,2}$/.test(x) ? +x : NUMW[x] || null; };
  const NW = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|due|tre|quattro|cinque|deux|trois|quatre|cinq|zwei|drei|vier)";
  const BED_W = new RegExp("\\b" + NW + "[\\s-]+(?:double\\s+|spacious\\s+|large\\s+)?(?:bed(?:room)?s?|dormitorios?|habitaciones?|chambres?|camere|quartos?|schlafzimmer)\\b", "i");
  const _rooms0 = RHS.rooms;
  RHS.rooms = (s) => { const r = _rooms0(s); if (r) return r; const m = String(s || "").match(BED_W); return m ? wnum(m[1]) : null; };
  RHS.baths = (s) => { const t = String(s || ""); const lab = t.match(/\b(?:bath(?:room)?s?|baños?|bagni|casas? de banho|badezimmer|salles? de bains?)\s*[:\-]?\s*(\d{1,2})\b/i); if (lab && +lab[1] < 20) return +lab[1];
    const m = t.match(new RegExp("\\b" + NW + "[\\s-]+(?:en[- ]suite\\s+)?(?:bath(?:room)?s?|baños?|bagni|casas? de banho|salles? de bains?)\\b", "i")); return m ? wnum(m[1]) : null; };
  // the description: the block of text that reads like a home (not the cookie banner, the menu or the privacy notice)
  const COOKIE = /(cookies?|consent|technical storage|privacy policy|pol[ií]tica de privacidad|protecci[oó]n de datos|gdpr|datenschutz|personal data|subpoena)/i;
  const HOMEW = /(bed(room)?s?|bath(room)?s?|kitchen|living|lounge|terrace|garden|pool|views?|m²|m2|sq\.? ?ft|dormitorio|habitaci[oó]n|baño|cocina|sal[oó]n|terraza|jard[ií]n|piscina|vistas|cuarto|camera|cucina|soggiorno|quarto|cozinha|chambre|cuisine|séjour|zimmer|küche|værelse|køkken|stue)/gi;
  RHS.bestDesc = (doc = document) => {
    const seen = new Set(), cands = [];
    const add = (el) => { if (!el || seen.has(el)) return; seen.add(el); if (el.closest && el.closest("nav,header,footer,form,[class*=cookie i],[id*=cookie i],[class*=consent i],[id*=consent i],[class*=cmplz i],[class*=gdpr i]")) return; cands.push(el); };
    $$("[class*=description i], [id*=description i], [data-testid*=description i], [class*=beskrivelse i], [class*=descripcion i], [class*=comment i], [class*=beschreibung i], [itemprop=description]", doc).forEach(add);
    $$("p", doc).forEach((p) => add(p.parentElement));
    let best = null, bs = 0;
    for (const el of cands) {
      const t = txt(el); if (t.length < 120 || t.length > 25000) continue;
      const bad = (t.match(new RegExp(COOKIE.source, "gi")) || []).length, good = (t.match(HOMEW) || []).length;
      const sc = good * 40 + Math.min(t.length, 3000) / 15 - bad * 400 - Math.max(0, t.length - 6000) / 20;
      if (good >= 2 && sc > bs) { bs = sc; best = t; }
    }
    return best;
  };
  // "Label : value" spec lines many agency sites print under the description
  RHS.specText = (doc = document) => {
    const rows = [];
    for (const el of $$("li, dl > div, tr, [class*=feature i] > *, [class*=spec i] > *, [class*=detail i] > *", doc).slice(0, 600)) {
      if (el.closest && el.closest("nav,header,footer,form")) continue;
      const t = txt(el); if (t.length < 4 || t.length > 160 || COOKIE.test(t)) continue;
      if (/^[A-Za-zÀ-ÿ ]{3,30}\s*:\s*\S/.test(t)) rows.push(t);
      if (rows.length >= 40) break;
    }
    return [...new Set(rows)].join(" · ");
  };

  // ---------------------------------------------------------------- structured data
  RHS.ld = (doc = document) => {
    const out = [];
    for (const s of $$('script[type="application/ld+json"]', doc)) {
      let j; try { j = JSON.parse(s.textContent.trim().replace(/^﻿/, "")); } catch { continue; }
      const walk = (o) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) return o.forEach(walk); out.push(o); if (o["@graph"]) walk(o["@graph"]); if (o.mainEntity) walk(o.mainEntity); if (o.itemOffered) walk(o.itemOffered); if (o.about) walk(o.about); };
      walk(j);
    }
    return out;
  };
  const typeOf = (o) => [].concat(o["@type"] || []).join(" ").toLowerCase();
  const HOME_T = /(residence|apartment|house|singlefamily|accommodation|realestatelisting|place|product|offer|landmarksorhistoricalbuildings|room|suite)/;
  function fromLd(list) {
    const f = {};
    for (const o of list) {
      const t = typeOf(o);
      if (!HOME_T.test(t) && !o.offers && !o.floorSize && !o.geo) continue;
      const offer = [].concat(o.offers || [])[0] || (/offer/.test(t) ? o : null);
      if (offer) {
        const p = offer.price ?? (offer.priceSpecification && offer.priceSpecification.price) ?? offer.lowPrice;
        if (f.price == null && p != null) f.price = RHS.amount(p);
        if (!f.currency && (offer.priceCurrency || (offer.priceSpecification || {}).priceCurrency)) f.currency = offer.priceCurrency || offer.priceSpecification.priceCurrency;
      }
      const fs = o.floorSize || (o.itemOffered || {}).floorSize;
      if (f.sqm == null && fs) { const v = RHS.amount(fs.value ?? fs); const u = String(fs.unitCode || fs.unitText || "").toUpperCase(); f.sqm = v ? Math.round(/FTK|FT|SQFT/.test(u) ? v * 0.09290304 : v) : null; }
      if (f.rooms == null) { const rv = o.numberOfBedrooms ?? o.numberOfRooms; const r = RHS.amount(rv && typeof rv === "object" ? (rv.value ?? rv.maxValue) : rv); f.rooms = r && r < 40 ? r : null; }
      const geo = o.geo || (o.location || {}).geo || (o.containedInPlace || {}).geo;
      if (geo && f.lat == null && geo.latitude != null) { f.lat = +geo.latitude; f.lng = +geo.longitude; }
      const a = o.address || o.Address || (o.location || {}).address;
      if (a && typeof a === "object" && !f.area) { f.area = a.addressLocality || a.addressRegion || ""; f.city = a.addressLocality || ""; f.province = a.addressRegion || ""; if (a.streetAddress) f.addr = [a.streetAddress, a.addressLocality, a.postalCode].filter(Boolean).join(", "); if (a.addressCountry) f.country = String(a.addressCountry.name || a.addressCountry).slice(0, 2).toUpperCase(); }
      if (!f.desc && o.description) f.desc = String(o.description);
      if (!f.title && o.name) f.title = String(o.name);
      if (!f.photos && o.image) f.photos = [].concat(o.image).length;
      if (!f.ptype && /apartment|house|singlefamily|residence/.test(t)) f.ptype = (t.match(/apartment|singlefamilyresidence|house|residence/) || [""])[0];
    }
    return f;
  }

  // embedded app state (__NEXT_DATA__, __NUXT__, __INITIAL_STATE__, apollo…): look for the object that is clearly "the listing"
  const PRICE_K = /^(price|prices?|listPrice|askingPrice|salePrice|priceValue|priceAmount|purchasePrice|amount|pris|kontantpris|preis|kaufpreis|prix|prezzo|preco|preço|precio|cena|ar|fiyat)$/i;
  const AREA_K = /^(livingArea|living_area|floorArea|area|size|surface|surfaceArea|sqm|squareMeters|m2|boligareal|livingSpace|wohnflaeche|wohnfläche|superficie|metratura|plotArea|usableArea|floorSize|areaM2)$/i;
  const LAT_K = /^(lat|latitude)$/i, LNG_K = /^(lng|lon|long|longitude)$/i;
  function scanState(root, maxNodes = 40000) {
    const best = { score: 0 }; let n = 0;
    const visit = (o, depth, inList) => {
      if (!o || typeof o !== "object" || depth > 18 || ++n > maxNodes) return;
      if (Array.isArray(o)) { for (const x of o) visit(x, depth + 1, true); return; }
      let price = null, area = null, lat = null, lng = null, ft = false;
      for (const k in o) { if (/unit/i.test(k) && typeof o[k] === "string" && /feet|sq\.?\s*ft|sqft|^ftk$|^ft2?$/i.test(o[k])) ft = true; }
      for (const k in o) {
        const v = o[k];
        if (PRICE_K.test(k)) { const p = typeof v === "object" && v ? (v.amount ?? v.value ?? v.price ?? v.primaryPrice) : v; const a = RHS.amount(p); if (a && a > 500) price = a; }
        else if (AREA_K.test(k)) { const a = typeof v === "object" && v ? RHS.amount(v.value ?? v.amount ?? v.size) : RHS.amount(v); if (a && a >= 12 && a < 100000) area = a; }
        else if (LAT_K.test(k) && typeof v === "number") lat = v; else if (LNG_K.test(k) && typeof v === "number") lng = v;
      }
      // v0.14: the size often sits one level down ({ price, features: { surface } }): look into direct children too
      if (price && !area) for (const k in o) { const c = o[k]; if (!c || typeof c !== "object" || Array.isArray(c)) continue; for (const k2 in c) { if (AREA_K.test(k2) || /^(surface|surfaceTotal|constructedArea|builtArea)$/i.test(k2)) { const a = RHS.amount(typeof c[k2] === "object" && c[k2] ? c[k2].value : c[k2]); if (a && a >= 12 && a < 100000) { area = a; break; } } } if (area) break; }
      // homes inside a list are usually "similar homes", not the one on the page
      const sc = (price ? 2 : 0) + (area ? 1 : 0) + (lat != null ? 1 : 0) - (inList ? 0.5 : 0);
      if (sc > best.score) Object.assign(best, { score: sc, o, price, area, lat, lng, ft });
      for (const k in o) if (o[k] && typeof o[k] === "object") visit(o[k], depth + 1, inList || Array.isArray(o[k]));
    };
    visit(root, 0, false);
    return best.score >= 1.5 ? best : null;
  }
  const jsUnquote = (s) => { let o = ""; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch !== "\\") { o += ch; continue; } const n = s[++i];
    if (n === "n") o += "\n"; else if (n === "t") o += "\t"; else if (n === "r") o += "\r"; else if (n === "u") { o += String.fromCharCode(parseInt(s.substr(i + 1, 4), 16)); i += 4; } else if (n === "x") { o += String.fromCharCode(parseInt(s.substr(i + 1, 2), 16)); i += 2; } else o += n; } return o; };
  RHS.appState = (doc = document) => {
    const out = [];
    for (const s of $$("script:not([src])", doc)) {
      const ty = (s.getAttribute("type") || "").toLowerCase(); if (ty === "application/ld+json") continue;
      const t = s.textContent; if (t.length < 200 || t.length > 6e6) continue;
      const tt = t.trim();
      if ((tt[0] === "{" || tt[0] === "[") && (ty.includes("json") || s.id || tt.length > 2000)) { try { out.push(JSON.parse(tt)); continue; } catch { /* not plain json */ } }
      const q = t.match(/=\s*JSON\.parse\(\s*(['"])([\s\S]*?)\1\s*\)\s*;?\s*(?:$|window\.|var |let |const |<\/script>)/);
      if (q && q[2].length > 200) { try { out.push(JSON.parse(jsUnquote(q[2]))); continue; } catch { /* not json */ } }
      const m = t.match(/(?:__INITIAL_STATE__|__PRELOADED_STATE__|__APOLLO_STATE__|__NUXT__|window\.__data|__STATE__|__INITIAL_DATA__|__INITIAL_PROPS__)\s*=\s*(\{[\s\S]*\})\s*;?\s*(?:<\/script>|$|window\.)/);
      if (m) { try { out.push(JSON.parse(m[1])); } catch { /* js object, not json */ } }
    }
    return out;
  };


  // map point from embedded maps or attributes
  RHS.geoFromPage = (doc = document) => {
    const lat = meta(doc, "place:location:latitude", "og:latitude", "geo.position", "ICBM");
    if (lat && /[,;]/.test(lat)) { const [a, b] = lat.split(/[,;]/).map(Number); if (isFinite(a) && isFinite(b)) return [a, b]; }
    if (lat) { const lng = meta(doc, "place:location:longitude", "og:longitude"); if (lng) return [+lat, +lng]; }
    const el = $("[data-lat][data-lng],[data-lat][data-lon],[data-latitude][data-longitude]", doc);
    if (el) { const a = +(el.dataset.lat ?? el.dataset.latitude), b = +(el.dataset.lng ?? el.dataset.lon ?? el.dataset.longitude); if (isFinite(a) && isFinite(b) && a && b) return [a, b]; }
    const html = doc.documentElement ? doc.documentElement.innerHTML.slice(0, 2_500_000) : "";
    const pats = [/(?:center|ll|q|query|daddr|destination)=(-?\d{1,2}\.\d{3,})(?:%2C|,|%20|\s)+(-?\d{1,3}\.\d{3,})/, /"lat(?:itude)?"\s*:\s*"?(-?\d{1,2}\.\d{3,})"?\s*,\s*"(?:lng|lon|long|longitude)"\s*:\s*"?(-?\d{1,3}\.\d{3,})/, /@(-?\d{1,2}\.\d{4,}),(-?\d{1,3}\.\d{4,}),\d+z/,
      // v0.9: more map embeds — Google embed (!3d lat !4d lng), Leaflet/Google JS, Mapbox, Apple, reversed key order
      /!3d(-?\d{1,2}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/, /LatLng\(\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/, /(?:marker|setView|circle|center|flyTo)\(\s*\[\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/,
      /maps\.apple\.com\/\?[^"'<>]*?(?:ll|q|sll)=(-?\d{1,2}\.\d{3,}),(-?\d{1,3}\.\d{3,})/, /"(?:geoLat|map_lat|mapLat|latitud|latitude_value|gps_lat)"\s*:\s*"?(-?\d{1,2}\.\d{3,})"?[^}]{0,120}?"(?:geoLng|geoLon|map_lng|mapLng|map_lon|longitud|longitude_value|gps_lng|gps_lon)"\s*:\s*"?(-?\d{1,3}\.\d{3,})/,
      /(?:lat|latitude)["']?\s*[:=]\s*["']?(-?\d{1,2}\.\d{4,})["']?\s*[,;]\s*["']?(?:lng|lon|long|longitude)["']?\s*[:=]\s*["']?(-?\d{1,3}\.\d{4,})/i];
    const rev = html.match(/"(?:lng|lon|longitude)"\s*:\s*"?(-?\d{1,3}\.\d{3,})"?\s*,\s*"(?:lat|latitude)"\s*:\s*"?(-?\d{1,2}\.\d{3,})/);
    if (rev) { const a = +rev[2], b = +rev[1]; if (Math.abs(a) <= 90 && Math.abs(b) <= 180 && a && b) return [a, b]; }
    const ifr = $$("iframe[src*='maps'],iframe[data-src*='maps'],a[href*='maps.google'],a[href*='google.com/maps'],img[src*='staticmap']", doc).map((e) => e.getAttribute("src") || e.getAttribute("data-src") || e.getAttribute("href") || "").join(" ");
    const im = ifr.match(/(?:q|ll|center|query|daddr)=(-?\d{1,2}\.\d{3,})(?:%2C|,)\s*(-?\d{1,3}\.\d{3,})/) || ifr.match(/!3d(-?\d{1,2}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/);
    if (im) return [+im[1], +im[2]];
    for (const p of pats) { const m = html.match(p); if (m) { const a = +m[1], b = +m[2]; if (Math.abs(a) <= 90 && Math.abs(b) <= 180 && (a || b)) return [a, b]; } }
    return null;
  };

  // ---------------------------------------------------------------- one listing (detail page)
  RHS.genericDetail = (doc = document, url = location.href, recipe = null) => {
    const host = new URL(url).hostname;
    const f = fromLd(RHS.ld(doc));
    if (!f.price || !f.sqm || f.lat == null) {
      const ftPage = (() => { const t = ((doc.body && doc.body.textContent) || "").slice(0, 60000); return /\b(sq\.?\s?ft|sqft|square feet)\b/i.test(t) && !/m²|\bsqm\b|\bm2\b/i.test(t); })();
      for (const st of RHS.appState(doc)) { const b = scanState(st); if (b) { f.price = f.price || b.price; f.sqm = f.sqm || (b.area ? Math.round(b.ft || ftPage ? b.area * 0.09290304 : b.area) : null); if (f.lat == null && b.lat != null) { f.lat = b.lat; f.lng = b.lng; } break; } }
    }
    const ogP = meta(doc, "product:price:amount", "og:price:amount", "price"); if (!f.price && ogP) f.price = RHS.amount(ogP);
    if (!f.currency) f.currency = meta(doc, "product:price:currency", "og:price:currency", "priceCurrency");
    const ogt = meta(doc, "og:title", "twitter:title") || ""; const title = f.title || ogt || doc.title || ""; const allT = [title, ogt, doc.title || ""].join(" · ");
    const mdesc = meta(doc, "og:description", "description", "twitter:description") || "";
    const h1 = txt($("h1", doc));
    // visible text near the top of the page, for the last-resort regexes
    const main = $("main", doc) || $("article", doc) || doc.body;
    const body = txt(main).slice(0, 30000);
    if (!f.price) { const m = (h1 + " " + title + " " + body.slice(0, 6000)).match(/((?:€|£|\$|USD|EUR|GBP|IDR|AUD|THB|MYR|SGD|AED|PHP|VND|MXN|BRL|CAD|NZD|ZAR|INR|CHF|SEK|NOK|DKK|PLN|TRY|HKD|US\$|kr\.?|zł|R\$|₹|¥|₩|฿|Rp\.?|RM|S\$|HK\$|NT\$)\s?(?:\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{1,3}(?:'\d{3})+|\d{3,})(?:[.,]\d{1,2})?|(?:\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{1,3}(?:'\d{3})+|\d{3,})(?:[.,]\d{1,2})?\s?(?:€|EUR|£|kr\.?|DKK|SEK|NOK|zł|PLN|Kč|Ft|lei|лв|TL|₺|CHF|AED|SAR|₪|円|원|万円|USD|\$))/); if (m) f.price = RHS.amount(m[1]); f.currency = f.currency || (m ? RHS.curFrom(m[1], host) : null); }
    if (!f.sqm) f.sqm = RHS.area(allT + " " + mdesc) || RHS.area(h1) || RHS.area(body.slice(0, 8000));
    if (f.rooms == null) f.rooms = RHS.rooms(allT + " " + mdesc + " " + body.slice(0, 4000));
    if (!f.tenure) f.tenure = RHS.tenure(allT + " " + mdesc + " " + body.slice(0, 6000));
    if (f.lat == null) { const gpt = RHS.geoFromPage(doc); if (gpt) { f.lat = gpt[0]; f.lng = gpt[1]; } }
    f.currency = (f.currency || RHS.curFrom(title + " " + body.slice(0, 3000), host) || "EUR").toUpperCase();
    f.country = f.country || RHS.siteCountry(host);
    f.title = title; f.desc = (f.desc && f.desc.length > 120 && !COOKIE.test(f.desc) ? f.desc : "") || RHS.bestDesc(doc) || mdesc || body.slice(0, 3000);
    // v0.14: the spec lines of the page ("Setting: Close To Sea", "Condition: Restoration Required", "Views: Sea") count too
    { const specs = RHS.specText(doc); if (specs && !f.desc.includes(specs.slice(0, 60))) f.desc += " · " + specs; }
    if (f.rooms == null) f.rooms = RHS.rooms(f.desc.slice(0, 3000));
    if (f.baths == null) f.baths = RHS.baths(allT + " " + mdesc + " " + f.desc.slice(0, 3000));
    if (!f.photos) f.photos = Math.max($$("[class*=gallery i] img, [class*=slider i] img, [class*=carousel i] img", doc).length, 0) || null;
    if (!f.area) { const bc = RHS.ld(doc).find((o) => /breadcrumblist/.test(typeOf(o))); const items = bc ? [].concat(bc.itemListElement || []).map((i) => String(i.name || (i.item && i.item.name) || "").trim()).filter(Boolean) : []; if (items.length >= 3) { const c = items.slice(-3).reverse().map((x) => x.replace(/\b\d{4,5}\b/g, "").replace(/\s+/g, " ").trim()).filter((x) => x.length > 1 && x.length <= 30 && !/\d/.test(x)); f.area = c[0] || ""; } }
    // v0.14: "Penthouse for sale in Casares Playa" / "Piso en venta en Nerja": the place is in the title
    if (!f.area) { const m = (h1 + " · " + title).match(/\b(?:for sale|for rent|to rent|en venta|en alquiler|se vende|à vendre|à louer|zu verkaufen|zu vermieten|in vendita|in affitto|à venda|para venda|til salg|te koop|till salu)\s+(?:in|en|à|a|i|em|ad|at|on)\s+([^,|·–\-()0-9]{3,40})/i); if (m) f.area = m[1].trim(); }
    if (!f.area) { const site = host.replace(/^www\./, "").split(".")[0]; f.area = (title.split(/[,–\-|·]/).map((x) => x.trim()).filter((x) => x && x.length > 2 && x.length < 50 && !/\d{2,}|m²|€|\$|£/.test(x) && !new RegExp(site, "i").test(x)).slice(1, 2)[0] || ""); }
    // recipe overrides
    if (recipe && recipe.detail) {
      const R = recipe.detail; const pick = (sel) => (sel ? txt($(sel, doc)) : "");
      if (R.price) { const v = RHS.amount(pick(R.price)); if (v) f.price = v; }
      if (R.sqm) { const v = RHS.area(pick(R.sqm)) || RHS.amount(pick(R.sqm)); if (v) f.sqm = Math.round(v); }
      if (R.rooms) { const v = RHS.rooms(pick(R.rooms)) || RHS.amount(pick(R.rooms)); if (v) f.rooms = v; }
      if (R.area) { const v = pick(R.area); if (v) f.area = v.split(",")[0].trim(); }
      if (R.desc) { const v = pick(R.desc); if (v) f.desc = v; }
      if (R.currency) f.currency = R.currency;
    }
    if (f.rooms != null && !(f.rooms > 0 && f.rooms < 40)) f.rooms = null;
    f.portal = host.replace(/^www\./, "");
    // v0.10: a rent of €980/month is a real home too
    const rentish = RHS.isRentText && RHS.isRentText([doc.title, f.title, (f.desc || "").slice(0, 600), url].join(" "));
    if (!f.price || f.price < 30 || (f.price < 1000 && !rentish)) return null;
    if (rentish && RHS.dealOf && !f.deal) f.deal = RHS.dealOf([doc.title, f.title, (f.desc || "").slice(0, 600)].join(" ")) || "rent";
    return f;
  };

  // ---------------------------------------------------------------- many listings (search page): repeated cards with a price and a link
  // listings described as data (JSON-LD list or app state array) -> cards matched to the links on the page
  const URL_K = /^(url|link|href|detailUrl|detailURL|detail_url|permalink|canonicalUrl|path|uri|slug|detail|detailLink|adUrl|listingUrl|propertyUrl|shareUrl|seoUrl)$/i;
  function dataCards(doc, base) {
    const host = new URL(base).hostname, out = [];
    // shallow-first search inside one listing object (immobiliare: results[].realEstate.properties[0].surface)
    const flat = (o) => {
      const r = {}; const q = [[o, 0]]; let n = 0;
      while (q.length && n++ < 400) { const [x, d] = q.shift(); if (!x || typeof x !== "object") continue;
        if (Array.isArray(x)) { if (d < 4) for (const y of x.length <= 40 ? x : x.slice(0, 1)) if (y && typeof y === "object") q.push([y, d + 1]); continue; }
        const kv = typeof x.key === "string" && x.value != null && typeof x.value !== "object" ? { [x.key]: x.value } : null;
        for (const k in (kv || x)) { const v = (kv || x)[k];
          if (r.url == null && URL_K.test(k) && v && typeof v === "object" && !Array.isArray(v)) { const sv = Object.values(v).find((z) => typeof z === "string" && /^(https?:|\/)/.test(z)); if (sv) { r.url = sv; continue; } }
          if (v && typeof v === "object" && !Array.isArray(v) && (PRICE_K.test(k) || AREA_K.test(k))) { const inner = v.amount ?? v.value ?? v.price ?? v.size ?? v.formattedValue ?? v.raw; if (inner != null) { if (PRICE_K.test(k) && r.price == null) r.price = inner; if (AREA_K.test(k) && r.area == null) r.area = inner; } }
          if (v == null || typeof v === "object") { if (v && d < 4) q.push([v, d + 1]); continue; }
          if (r.url == null && URL_K.test(k) && typeof v === "string" && /^(https?:|\/)/.test(v) && v.length > 5) r.url = v;
          else if (r.price == null && PRICE_K.test(k)) r.price = v;
          else if (r.area == null && AREA_K.test(k)) r.area = v;
          else if (r.lat == null && LAT_K.test(k) && typeof v === "number") r.lat = v;
          else if (r.lng == null && LNG_K.test(k) && typeof v === "number") r.lng = v;
          else if (r.rooms == null && /^(rooms|numberOfRooms|bedrooms|numberOfBedrooms|beds|roomCount|rooms?Number|værelser|zimmer|vani|locali|pieces|pièces|habitaciones|dormitorios)$/i.test(k)) r.rooms = v;
          else if (r.cur == null && /^(currency|priceCurrency|currencyCode)$/i.test(k) && typeof v === "string") r.cur = v;
          else if (r.title == null && /^(name|title|headline)$/i.test(k) && typeof v === "string") r.title = v;
        } }
      return r;
    };
    const push = (o) => {
      const offer = [].concat(o.offers || [])[0] || {}; const fl = flat(o);
      const u = o.url || offer.url || fl.url;
      const price = RHS.amount(offer.price ?? fl.price); const fs = o.floorSize; let sqm = RHS.amount(fs ? (fs.value ?? fs) : fl.area); if (sqm && fs && /FTK|FT|SQFT|feet/i.test(String(fs.unitCode || fs.unitText || ""))) sqm = sqm * 0.09290304;
      if (!u || !price || price < 30) return;
      let href; try { href = new URL(u, base).href; } catch { return; }
      const geo = o.geo || {}; const lat = geo.latitude ?? fl.lat ?? null, lng = geo.longitude ?? fl.lng ?? null; const rooms = RHS.amount(o.numberOfRooms ?? o.numberOfBedrooms ?? fl.rooms);
      out.push({ url: href, price, sqm: sqm && sqm >= 12 && sqm < 100000 ? Math.round(sqm) : null, rooms: rooms && rooms < 40 ? rooms : null, lat, lng, currency: offer.priceCurrency || fl.cur || null, title: String(o.name || fl.title || "").slice(0, 140) });
    };
    for (const o of listingLd(doc)) push(o);
    const fromLdOut = out.splice(0);
    {
      let n = 0; const pagePaths = new Set($$("a[href]", doc).map((a) => { try { return new URL(a.getAttribute("href"), base).pathname; } catch { return ""; } }));
      let best = [], bestScore = 0;
      const visit = (o, d) => { if (!o || typeof o !== "object" || d > 14 || ++n > 400000) return;
        if (Array.isArray(o)) { const objs = o.filter((x) => x && typeof x === "object" && !Array.isArray(x));
          if (objs.length >= 3) { const save = out.splice(0); objs.forEach(push); const got = out.splice(0); out.push(...save);
            if (got.length >= 3 && got.length >= objs.length * 0.5) { const sc = got.length + 3 * got.filter((c) => pagePaths.has(new URL(c.url).pathname)).length + got.filter((c) => c.sqm).length; if (sc > bestScore) { bestScore = sc; best = got; } return; } }
          o.forEach((x) => visit(x, d + 1)); return; }
        for (const k in o) if (o[k] && typeof o[k] === "object") visit(o[k], d + 1); };
      for (const st of RHS.appState(doc)) visit(st, 0);
      // merge: page data fills what the JSON-LD left out
      const k = (u) => { try { const x = new URL(u); return x.pathname.replace(/\/$/, ""); } catch { return u; } };
      const m = new Map(best.map((c) => [k(c.url), c]));
      for (const c of fromLdOut) { const b = m.get(k(c.url)); if (b) { m.delete(k(c.url)); out.push({ ...b, ...Object.fromEntries(Object.entries(c).filter(([, v]) => v != null && v !== "")) }); } else out.push(c); }
      for (const c of m.values()) out.push(c);
    }
    // attach each to its card element on the page (closest repeated ancestor of the link)
    const anchors = $$("a[href]", doc); const byPath = new Map();
    for (const a of anchors) { try { const p = new URL(a.getAttribute("href"), base).pathname; if (!byPath.has(p)) byPath.set(p, a); } catch { /* bad href */ } }
    return out.filter((c, i, arr) => arr.findIndex((x) => x.url === c.url) === i).map((c) => {
      const a = byPath.get(new URL(c.url).pathname); let el = a || null;
      if (a) { el = a; for (let i = 0; i < 6 && el.parentElement; i++) { const p = el.parentElement; if ($$("a[href]", p).some((x) => { try { const q = new URL(x.getAttribute("href"), base).pathname; return q !== new URL(c.url).pathname && byPath.get(q) === x && DETAIL_PATH.test(q); } catch { return false; } })) break; el = p; } }
      return { el, mount: el, url: c.url, lat: c.lat, lng: c.lng, f: { portal: host.replace(/^www\./, ""), price: c.price, currency: (c.currency || RHS.curFrom(el ? stxt(el) : "", host) || "EUR").toUpperCase(), sqm: c.sqm || (el ? RHS.area(stxt(el)) : null), rooms: c.rooms || (el ? RHS.rooms(stxt(el)) : null), title: c.title || (a ? txt(a).slice(0, 140) : ""), desc: el ? stxt(el).slice(0, 400) : "", area: "", country: RHS.siteCountry(host), photos: null } };
    });
  }
  RHS.dataCards = dataCards;

  // the card's link to the listing (not the agent, the favourite button or the photo counter)
  const NOT_LISTING = /(inmobiliaria|agencia|agent|agency|makler|maegler|mægler|broker|profil|profile|agence|agenzia|immobiliare\/agenzie|estate-agents|login|signin|favorit|favourite|contact|kontakt|newsletter|javascript:|#)/i;
  function pickLink(el, base, host) {
    const h = host.replace(/^www\./, ""); let best = null, bs = -1;
    for (const a of $$("a[href]", el)) {
      let u; try { u = new URL(a.getAttribute("href"), base); } catch { continue; }
      if (!u.hostname.endsWith(h)) continue;
      let sc = u.pathname.length / 20 + u.pathname.split("/").length;
      if (DETAIL_PATH.test(u.pathname)) sc += 5; if (NOT_LISTING.test(u.pathname + u.hash)) sc -= 20; if (/\d{5,}|[0-9a-f]{8}-[0-9a-f]{4}/i.test(u.pathname)) sc += 3;
      if (sc > bs) { bs = sc; best = a; }
    }
    return best || $("a[href]", el);
  }
  RHS.genericCards = (doc = document, base = location.href, recipe = null) => {
    const host = new URL(base).hostname;
    const dc = recipe && recipe.cards && recipe.cards.card ? [] : dataCards(doc, base);
    let groups;
    if (recipe && recipe.cards && recipe.cards.card) {
      groups = [$$(recipe.cards.card, doc)];
    } else {
      const PRICE_RE = /((?:€|£|\$|USD|EUR|GBP|IDR|AUD|THB|MYR|SGD|AED|PHP|VND|MXN|BRL|CAD|NZD|ZAR|INR|CHF|SEK|NOK|DKK|PLN|TRY|HKD|JPY|KRW|US\$|A\$|S\$|HK\$|kr\.?|zł|R\$|₹|¥|₩|฿|Rp\.?|RM)\s?(?:\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{1,3}(?:'\d{3})+|\d{3,})(?:[.,]\d{1,2})?|(?:\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{1,3}(?:'\d{3})+|\d{3,})(?:[.,]\d{1,2})?\s?(?:€|EUR|£|kr\.?|DKK|SEK|NOK|zł|Kč|Ft|lei|лв|TL|₺|CHF|AED|₪|円|万円|원|\$))/;
      const leaves = $$("a[href]", doc).filter((a) => !/^(#|javascript:|mailto:|tel:)/.test(a.getAttribute("href") || ""));
      const byAnc = new Map();
      for (const a of leaves) {
        let el = a; for (let i = 0; i < 7 && el; i++, el = el.parentElement) { const t0 = el.textContent || ""; if (t0.length > 1500) break; const t = stxt(el); if (PRICE_RE.test(t) && (AREA_UNIT.test(t) || (t.length >= 60 && new Set($$("a[href]", el).map((x) => x.getAttribute("href"))).size <= 6))) {
            if (!AREA_UNIT.test(t)) { let up = el.parentElement; for (let k = 0; k < 3 && up; k++, up = up.parentElement) { const tu = stxt(up); if (tu.length > 2500) break; if ((tu.match(new RegExp(PRICE_RE.source, "g")) || []).length > 2) break; if (AREA_UNIT.test(tu)) { el = up; break; } } } const sig = el.tagName + "." + [...el.classList].slice(0, 2).join("."); if (!byAnc.has(sig)) byAnc.set(sig, new Set()); byAnc.get(sig).add(el); break; } }
      }
      groups = [...byAnc.values()].map((s) => [...s]).filter((g) => g.length >= 4).sort((a, b) => b.length - a.length);
    }
    const cards = (groups[0] || []).map((el) => {
      const t = stxt(el); const tp = noArea(t);
      const R = (recipe && recipe.cards) || {};
      const link = (R.link && $(R.link, el)) || (el.tagName === "A" && el.getAttribute("href") ? el : null) || pickLink(el, base, host);
      const price = RHS.amount(R.price ? txt($(R.price, el)) : (tp.match(/((?:€|£|\$|USD|EUR|GBP|IDR|AUD|THB|MYR|SGD|AED|PHP|VND|MXN|BRL|CAD|NZD|ZAR|INR|CHF|SEK|NOK|DKK|PLN|TRY|HKD|JPY|KRW|US\$|A\$|S\$|HK\$|kr\.?|zł|R\$|₹|¥|₩|฿|Rp\.?|RM)\s?(?:\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{1,3}(?:'\d{3})+|\d{3,})(?:[.,]\d{1,2})?|(?:\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{1,3}(?:'\d{3})+|\d{3,})(?:[.,]\d{1,2})?\s?(?:€|EUR|£|kr\.?|DKK|SEK|NOK|zł|Kč|Ft|lei|лв|TL|₺|CHF|AED|₪|円|万円|원|\$))/) || [])[1]);
      const sqm = R.sqm ? (RHS.area(txt($(R.sqm, el))) || RHS.amount(txt($(R.sqm, el)))) : RHS.area(t);
      // v0.10: rents are small numbers (€850/month): keep them when the card says it is a rent
      if (!price || !link || price < 30 || (price < 1000 && !(RHS.isRentText && RHS.isRentText(t)))) return null;
      return { el, mount: (R.mount && $(R.mount, el)) || el, url: new URL(link.getAttribute("href"), base).href,
        f: { portal: host.replace(/^www\./, ""), price, currency: (R.currency || RHS.curFrom(t, host) || "EUR").toUpperCase(), sqm: sqm ? Math.round(sqm) : null, rooms: RHS.rooms(t), tenure: RHS.tenure(t), title: txt(link).slice(0, 140), desc: t.slice(0, 400), area: "", country: RHS.siteCountry(host), photos: null } };
    }).filter(Boolean).filter((c, i, arr) => arr.findIndex((x) => x.url === c.url) === i);
    // merge with the listings found in the page data: data wins for numbers, the page wins for where to draw the badge
    if (dc.length) {
      const key = (u) => { try { const x = new URL(u); return x.hostname + x.pathname.replace(/\/$/, ""); } catch { return u; } };
      const byUrl = new Map(cards.map((c) => [key(c.url), c]));
      const fewOnPage = cards.length < 3;
      for (const d of dc) { const c = byUrl.get(key(d.url)); if (c) { c.f.price = d.f.price || c.f.price; c.f.sqm = d.f.sqm || c.f.sqm; c.f.rooms = d.f.rooms || c.f.rooms; if (d.lat != null) { c.lat = d.lat; c.lng = d.lng; } } else if (dc.length >= 3 && fewOnPage) { byUrl.set(key(d.url), d); cards.push(d); } }
    }
    // area for cards: the most common place word is unknown generically; use the search location from the URL/title
    return cards;
  };

  // is this page one listing, or a list of listings?
  const DETAIL_PATH = /\/(inmueble|immobile|imovel|annonce|expose|bolig|homedetails|properties|property|listing|detail|details|anuncio|ilan|objekt|object|annonces?|fiche|kaufen\/[^/]+\/\d)|\d{6,}/i;
  const LIST_PATH = /(search|suche|recherche|resultat|results|zoeken|sog|sok|buscar|ricerca|comprar|venta|kaufen|acheter|vendita|koop|for-sale|til-salg|alquiler|todas-las-zonas|\/l(\/\d+)?$|\/lista)/i;
  const listingLd = (doc) => RHS.ld(doc).filter((o) => /residence|apartment|house|singlefamily|realestatelisting|product|offer/.test(typeOf(o)) && (o.offers || o.price || o.floorSize || o.url));
  RHS.genericIsDetail = (doc = document, recipe = null, url = location.href) => {
    const loc = new URL(url); const path = loc.pathname + loc.search;
    if (recipe && recipe.isDetail) { try { return new RegExp(recipe.isDetail).test(path); } catch { /* bad pattern */ } }
    const ld = RHS.ld(doc);
    if (ld.some((o) => /itemlist|searchresultspage|collectionpage/.test(typeOf(o)))) return false;
    // several different listings described on the page => it is a results page
    const L = listingLd(doc); const urls = new Set(L.map((o) => o.url || (o.offers && [].concat(o.offers)[0] && [].concat(o.offers)[0].url) || JSON.stringify(o.offers || o.price)).filter(Boolean));
    if (urls.size >= 3) return false;
    // many links that look like listing pages, and this URL does not look like one
    const links = new Set($$("a[href]", doc).map((a) => { try { const u = new URL(a.getAttribute("href"), url); return u.origin === loc.origin && u.pathname !== loc.pathname && DETAIL_PATH.test(u.pathname) ? u.pathname : null; } catch { return null; } }).filter(Boolean));
    const looksDetail = DETAIL_PATH.test(loc.pathname) && (!LIST_PATH.test(loc.pathname) || /\/\d{6,}(\/|$|\.)|[-_]\d{6,}/.test(loc.pathname));
    // v0.7: a listing page that shows "similar homes" links to its own siblings (same folder, same depth): still a listing page
    const segs = (p) => p.split("/").filter(Boolean); const me = segs(loc.pathname); const last = me[me.length - 1] || "";
    const slugLike = /\d{3,}/.test(last) || (last.match(/[-_]/g) || []).length >= 3;
    const sibs = (paths) => paths.filter((p) => { const x = segs(p); const k = Math.max(1, me.length - 2); return x.length === me.length && x.slice(0, k).join("/") === me.slice(0, k).join("/"); }).length;
    const ownSibling = (paths, max) => me.length >= 2 && slugLike && paths.length <= max && sibs(paths) >= 2;
    if (links.size >= 8 && !looksDetail && !ownSibling([...links], 16)) return false;
    if (/\b\d[\d.,  ]*\s+(resultados|results|boliger|homes|biens|annonces|immobili|objekte|woningen|imóveis|viviendas|pisos|casas)\b/i.test(doc.title) && !looksDetail) return false;
    if (L.length && urls.size <= 1) return true;
    if (meta(doc, "og:type") && /product|realestate|place/.test(meta(doc, "og:type"))) return true;
    if (looksDetail) return true;
    try {
      const cs = RHS.genericCards(doc, url);
      if (cs.length < 3) return true;
      const paths = cs.map((c) => { try { return new URL(c.url, url).pathname; } catch { return ""; } }).filter(Boolean);
      return ownSibling(paths, 12);
    } catch { return false; }
  };


  // Is this a page about homes for sale or rent? Cheap check that runs on every site before anything else.
  // Nothing is read, scored or sent on pages that fail it.
  const PROP_WORDS = /\b(for sale|for rent|to rent|property|properties|real estate|realty|villa|villas|apartment|apartments|condo|townhouse|house|houses|home for sale|bedrooms?|bathrooms?|sq\.? ?ft|sqm|m²|m2|freehold|leasehold|listing|en venta|se vende|venta|alquiler|piso|pisos|casa|casas|chalet|vivienda|inmueble|habitaciones|dormitorios|à vendre|a vendre|appartement|maison|immobilier|zu verkaufen|wohnung|haus|immobilie|kaufen|in vendita|vendita|appartamento|immobile|à venda|venda|apartamento|moradia|imóvel|imovel|te koop|woning|huis|til salg|bolig|boliger|lejlighed|lejligheder|værelser|rækkehus|hus|villa|till salu|bostad|dijual|disewakan|rumah|til leje|lejebolig|zu vermieten|mietwohnung|à louer|in affitto|affittasi|para alugar|arrendamento|te huur|huurwoning|uthyres|til leie|to let|per month|pcm|tanah|properti|kamar tidur|ขาย|บ้าน|คอนโด)\b/gi;
  const NOT_PROP_HOST = /(^|\.)(google|youtube|facebook|instagram|twitter|x|tiktok|linkedin|whatsapp|wikipedia|amazon|ebay|netflix|spotify|github|gitlab|stackoverflow|reddit|openai|chatgpt|claude|anthropic|microsoft|office|live|outlook|apple|icloud|yahoo|bing|duckduckgo|zoom|slack|notion|figma|canva|dropbox|paypal|stripe|shopify|booking|airbnb|expedia|tripadvisor|lovable|supabase|vercel|netlify|cloudflare)\.[a-z.]+$/i;
  RHS.bodyText = (doc = document, max = 20000) => {
    if (!doc.body) return ""; const w = doc.createTreeWalker(doc.body, 4); let out = "", n;
    while ((n = w.nextNode()) && out.length < max) { const p = n.parentElement; if (p && /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG)$/i.test(p.tagName)) continue; const v = n.nodeValue; if (v && v.trim()) out += v + " "; }
    return out.slice(0, max);
  };
  // v0.14.3: strict. Before, any page with a few words like "house", "casa" or "venta" and one price woke the
  // extension up (shops, news, blogs). Now a page counts only when it is clearly a home listing:
  //   1. structured data says it is a home listing with an offer / price, or og:type says real estate; or
  //   2. the title / h1 / URL talk about a home for sale or rent AND the page itself gives a home price AND m² or rooms; or
  //   3. it is a list with at least 4 cards that each have a price AND m² or rooms, and the heading talks about homes.
  // Articles, blogs and big non-property sites never count.
  const STRONG = /\b(for sale|for rent|to rent|to let|real estate|realty|property for|properties for|villa|apartment|condo|townhouse|penthouse|bungalow|cottage|chalet|duplex|studio flat|flat for|house for|homes? for sale|en venta|se vende|se alquila|en alquiler|piso|pisos|ático|atico|adosado|vivienda|viviendas|inmueble|inmobiliaria|à vendre|a vendre|à louer|appartement|maison|immobilier|zu verkaufen|zu vermieten|wohnung|einfamilienhaus|immobilie|immobilien|in vendita|in affitto|vendesi|affittasi|appartamento|immobile|immobiliare|bilocale|trilocale|villetta|rustico|à venda|para alugar|moradia|imóvel|imovel|te koop|te huur|woning|til salg|til leje|lejlighed|rækkehus|parcelhus|fritidshus|ejerlejlighed|villa|till salu|bostadsrätt|lägenhet|til leie|dijual|disewakan|rumah|properti|tanah dijual)\b/i;
  const PRICE_RE = /(?:€|£|\$|USD|EUR|GBP|IDR|AUD|THB|AED|CHF|Rp\.?|kr\.?|DKK|SEK|NOK)\s?(\d[\d.,' ]{3,})|(\d[\d.,' ]{3,})\s?(?:€|EUR|USD|IDR|kr\.?|DKK|SEK|NOK|CHF|£)/g;
  RHS.looksLikeProperty = (doc = document, url = location.href) => {
    let u; try { u = new URL(url); } catch { return false; }
    if (NOT_PROP_HOST.test(u.hostname)) return false;
    if (!/^https?:$/.test(u.protocol)) return false;
    const ld = RHS.ld(doc);
    const og = meta(doc, "og:type") || "";
    if (/^article$/i.test(og) || ld.some((o) => /newsarticle|blogposting|^article$|reportage|recipe|jobposting|course/.test(typeOf(o)))) return false;
    if (/\/(blog|news|noticias|nieuws|nyheder|nachrichten|actualites|magazine|guia|guide|articles?|post|tag|category|wiki|help|support|faq|cart|checkout|login|signin|account)(\/|$)/i.test(u.pathname)) return false;
    // 1. structured data
    const homeLd = ld.filter((o) => /realestatelisting|singlefamilyresidence|apartment|house|residence/.test(typeOf(o)) && !/lodgingbusiness|hotel|vacationrental|accommodation/.test(typeOf(o)));
    if (homeLd.some((o) => o.offers || o.price || /realestatelisting/.test(typeOf(o)))) return true;
    if (/real.?estate|property/i.test(og)) return true;
    // 2 and 3 need homes in the heading or the URL
    const head = [doc.title, (doc.querySelector("h1") || {}).textContent || "", decodeURIComponent(u.pathname).replace(/[-_/]+/g, " ")].join(" ");
    if (!STRONG.test(head)) return false;
    // 2. one home with a real price and size or rooms
    try {
      const f = RHS.genericDetail(doc, url);
      if (f && f.price && (f.price >= 5000 || (RHS.isRentText && RHS.isRentText(head))) && (f.sqm || f.rooms)) return true;
    } catch { /* ignore */ }
    // 3. a list of homes
    try {
      const body = RHS.bodyText(doc, 20000);
      if ((body.match(PRICE_RE) || []).length < 4) return false;
      if (RHS.genericCards(doc, url).filter((c) => c.f && c.f.price && (c.f.sqm || c.f.rooms)).length >= 4) return true;
    } catch { /* ignore */ }
    return false;
  };

  // next page of a search, for "rank the whole search"
  RHS.nextPageUrl = (doc = document, base = location.href) => {
    const rel = $('link[rel="next"], a[rel="next"]', doc); if (rel && rel.getAttribute("href")) return new URL(rel.getAttribute("href"), base).href;
    // a link that is this URL with the page number + 1
    const cur = new URL(base); const PK = /^(page|pagenr|pagina|pag|p|side|seite|pg|pn|o|sida|strona|stranica|sayfa|pageNumber|pagenumber|currentPage|pn|pageno|page_number|pagenum|sivu)$/i;
    let curN = 1; for (const [k, v] of cur.searchParams) if (PK.test(k) && /^\d+$/.test(v)) curN = +v;
    const pm = cur.pathname.match(/(?:\/|-|_)(?:page|pagina|pag|side|seite|p)?[-_/]?(\d{1,3})\/?$/i); if (pm && /page|pagina|pag|side|seite|\/p[-_/]?\d|\/l\/\d/i.test(cur.pathname)) curN = +pm[1];
    for (const x of $$("a[href]", doc)) {
      let u; try { u = new URL(x.getAttribute("href"), base); } catch { continue; } if (u.origin !== cur.origin) continue;
      if (u.pathname.replace(/\/$/, "") === cur.pathname.replace(/\/$/, "")) for (const [k, v] of u.searchParams) if (PK.test(k) && +v === curN + 1) return u.href;
      const stem = (pth) => pth.replace(/\/$/, "").replace(/(?:\/|-|_)(?:page|pagina|pag|side|seite|p)?[-_/]?\d{1,3}$/i, "");
      const nm = u.pathname.replace(/\/$/, "").match(/(\d{1,3})$/);
      if (nm && +nm[1] === curN + 1 && stem(u.pathname) === stem(cur.pathname) && u.pathname !== cur.pathname) return u.href;
    }
    const a = $$("a[href]", doc).find((x) => /^(?:.{0,12}\b)?(next|siguiente|næste|nästa|neste|seuraava|weiter|nächste|suivant|suivante|successiva|avanti|próxima|seguinte|volgende|następna|další|következő|următoare|sonraki|›|»|→|>)(?:\b.{0,12})?$/i.test((x.getAttribute("aria-label") || x.title || txt(x)).trim().slice(0, 30)) && !/prev|anterior|forrige|zurück|précédente/i.test(x.getAttribute("aria-label") || txt(x)) || /next|pagination-next|page-next/i.test(x.className));
    if (a) return new URL(a.getAttribute("href"), base).href;
    for (const [k, v] of cur.searchParams) if (PK.test(k) && /^\d+$/.test(v)) { cur.searchParams.set(k, String(+v + 1)); return cur.href; }
    return null;
  };
})(typeof window !== "undefined" ? window : self);
