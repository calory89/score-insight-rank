// RealHunt Score — the "smart card" (v0.5, 9-oct-2026): everything worth knowing about one home, computed from the
// listing, the comparables and our server data. Pure functions, no network: content.js feeds them and renders blocks.
// Country figures below are typical market values used as editable starting points, always labelled as estimates.
(function (g) {
  const RHS = (g.RHS = g.RHS || {});
  // mortgage rate % · buying costs % (taxes, notary, registry) · typical gross rental yield % · loan years
  const C = {
    ES: [3.0, 10, 5.5, 25], PT: [3.3, 8, 5.5, 30], IT: [3.4, 9, 5.0, 25], FR: [3.4, 8, 4.5, 25], DE: [3.7, 10, 3.8, 25], NL: [3.9, 3, 4.5, 30],
    BE: [3.5, 12, 4.5, 25], AT: [3.6, 9, 3.8, 25], CH: [2.0, 4, 3.5, 25], DK: [4.0, 1.5, 3.8, 30], SE: [3.8, 2, 3.5, 30], NO: [5.2, 3, 3.8, 25],
    FI: [3.8, 3, 4.5, 25], IE: [4.0, 3, 6.0, 30], GB: [4.6, 4, 5.0, 25], US: [6.5, 3, 6.0, 30], CA: [4.9, 2.5, 4.5, 25], AU: [6.2, 5, 4.0, 30],
    NZ: [6.0, 1, 4.5, 30], ID: [9.0, 8, 8.0, 15], TH: [6.5, 3, 6.0, 20], PH: [8.0, 7, 6.0, 20], VN: [9.0, 4, 5.0, 20], MY: [4.5, 4, 4.5, 30], MX: [10.5, 6, 7.0, 20], CR: [8.0, 4, 7.0, 20], MA: [5.0, 6, 6.0, 20], TR: [30, 5, 6.0, 10], CY: [4.5, 6, 5.0, 25], MT: [3.6, 6, 4.5, 30], PL: [7.0, 3, 6.0, 25], GR: [4.0, 7, 5.0, 25], HR: [4.5, 5, 5.5, 25], CZ: [5.0, 2, 4.0, 30], AE: [4.8, 6, 6.5, 25],
  };
  const CUR_CC = { IDR: "ID", THB: "TH", PHP: "PH", VND: "VN", MYR: "MY", MXN: "MX", CRC: "CR", MAD: "MA", TRY: "TR", GBP: "GB", USD: "US", DKK: "DK", SEK: "SE", NOK: "NO", CHF: "CH", AUD: "AU", NZD: "NZ", CAD: "CA", PLN: "PL", CZK: "CZ", AED: "AE" };
  RHS.ccFromCur = (c) => CUR_CC[c] || null;
  RHS.countryDefaults = (cc) => { const v = C[cc] || [4.5, 6, 5.0, 25]; return { rate: v[0], costs: v[1], yield: v[2], years: v[3], known: !!C[cc] }; };

  const nice = (n) => { if (!n) return n; const step = n > 2e6 ? 10000 : n > 300000 ? 5000 : n > 50000 ? 1000 : 100; return Math.round(n / step) * step; };
  RHS.nice = nice;

  // the price per m² to compare with: nearby homes first, then the city, then the search page
  RHS.bestBench = (comps, ins) => {
    if (ins && ins.near && ins.near.n >= 5 && (!comps || !comps.bench || comps.source !== "near" || ins.near.n > (comps.n || 0))) return { bench: ins.near.median, n: ins.near.n, source: "near", km: ins.near.km };
    if (comps && comps.bench) return { bench: comps.bench, n: comps.n, source: comps.source, km: comps.km };
    if (ins && ins.city && ins.city.n >= 8 && ins.city.median) return { bench: ins.city.median, n: ins.city.n, source: "area", city: ins.city.name };
    return null;
  };

  // how much over or under the market, in money, and what to offer
  RHS.offer = (f, bench, hist, fairAbs) => {
    if (!f.price) return null;
    const fair = fairAbs || (bench && f.sqm ? bench * f.sqm : null);
    const drops = (hist || []).length > 1 && hist[hist.length - 1].price < hist[0].price;
    const stale = (f.days || 0) > 90 || drops;
    let open, max;
    if (fair) {
      if (f.price > fair) { open = Math.min(f.price * 0.95, fair * 0.98); max = Math.min(f.price, fair * 1.03); }
      else { open = f.price * 0.95; max = f.price; }
    } else { open = f.price * 0.94; max = f.price * 0.98; }
    if (stale) open *= 0.98;
    open = Math.min(open, max);
    return { fair: fair ? nice(fair) : null, diff: fair ? Math.round(f.price - fair) : null, open: nice(open), max: nice(max), stale, hasFair: !!fair };
  };

  // monthly cost with a mortgage, and the cash needed on day one
  RHS.monthly = (price, cc, o = {}) => {
    if (!price) return null;
    const d = RHS.countryDefaults(cc);
    const down = o.down != null ? o.down : 20, rate = o.rate != null ? o.rate : d.rate, years = o.years || d.years;
    const loan = price * (1 - down / 100), r = rate / 100 / 12, n = years * 12;
    const pay = r ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;
    const costs = price * d.costs / 100;
    return { pay: Math.round(pay), cash: Math.round(price * down / 100 + costs), costs: Math.round(costs), loan: Math.round(loan), down, rate, years, costsPct: d.costs, known: d.known };
  };

  // if you rent it out: typical gross yield for the country (an estimate the user can change)
  RHS.rent = (price, cc, y) => {
    if (!price) return null;
    const d = RHS.countryDefaults(cc); const yld = y || d.yield;
    return { month: nice(price * yld / 100 / 12), yield: yld, known: d.known };
  };

  // size check: rooms against m²
  RHS.sizeNote = (f) => {
    if (!f.sqm || !f.rooms) return null;
    const per = f.sqm / f.rooms;
    if (per < 14) return { k: "small", per: Math.round(per) };
    if (per > 45) return { k: "big", per: Math.round(per) };
    return null;
  };

  // questions worth asking the agent, from what the listing leaves out and what it says
  RHS.questions = (f, r) => {
    const q = [];
    for (const k of (r && r.missing) || []) q.push("q_" + k);
    const fk = new Set(((r && r.flags) || []).map((x) => x.k));
    if (fk.has("occupied")) q.push("q_occupied");
    if (fk.has("renovation")) q.push("q_renovation");
    if (fk.has("rented")) q.push("q_rented");
    if (fk.has("too_cheap") || fk.has("bare") || fk.has("auction")) q.push("q_why_cheap");
    if ((f.photos || 0) > 0 && f.photos < 8) q.push("q_photos");
    if (f.tenure && f.tenure.k === "lease") q.unshift("q_lease");
    q.push("q_taxes", "q_offers", "q_why_selling");
    return [...new Set(q)].slice(0, 7);
  };

  // one plain sentence, built from the score and the extra data
  RHS.summaryBits = (r, o) => {
    const b = [];
    if (o.offer && o.offer.diff != null && Math.abs(o.offer.diff) >= (o.f.price || 0) * 0.03) b.push({ k: o.offer.diff > 0 ? "s_over" : "s_under", v: [RHS.money(Math.abs(o.offer.diff), o.f.currency)] });
    if (o.hist && o.hist.length > 1) { const a = o.hist[0].price, z = o.hist[o.hist.length - 1].price; if (z < a) b.push({ k: "s_dropped", v: [String(Math.round((1 - z / a) * 100))] }); }
    if (o.dups && o.dups.some((d) => d.price < o.f.price * 0.99)) b.push({ k: "s_dup_cheaper", v: [] });
    if (o.size) b.push({ k: o.size.k === "small" ? "s_small" : "s_big", v: [] });
    return b;
  };

  // what to compare when a site doesn't publish m²: price per bedroom; leasehold homes per year of lease
  RHS.unitOf = (f) => {
    if (!f || !f.price) return null;
    let u = null, kind = null;
    if (f.sqm) { u = f.price / f.sqm; kind = "sqm"; } else if (f.rooms) { u = f.price / f.rooms; kind = "room"; } else return null;
    const t = f.tenure && f.tenure.k;
    if (t === "lease" && f.tenure.years) { u = u / f.tenure.years; kind += "/yr"; }
    return { u, kind, key: kind + ":" + (t || "-") + ":" + (f.currency || "") };
  };
  // one benchmark per kind of comparison (m² or bedroom, freehold or leasehold), from the homes on the page
  RHS.benches = (fs) => {
    const g = {};
    for (const f of fs) { const x = RHS.unitOf(f); if (x) (g[x.key] = g[x.key] || []).push(x.u); }
    const out = {}; for (const k in g) if (g[k].length >= 5) out[k] = { bench: RHS.median(g[k]), n: g[k].length };
    return out;
  };
  // score a card against its own group: f2 is the same home expressed in the group's unit
  RHS.scoreInGroup = (f, B, ctx) => {
    const x = RHS.unitOf(f); const b = x && B[x.key];
    if (!b) return RHS.score({ ...f, partial: true }, { ...ctx, bench: null });
    const f2 = x.kind === "sqm" ? f : { ...f, price: x.u, sqm: 1 };
    const r = RHS.score({ ...f2, partial: true }, { ...ctx, bench: b.bench, benchN: b.n, benchSource: "page" });
    r.ppsqm = f.sqm ? f.price / f.sqm : null; r.unit = x.kind;
    return r;
  };
  RHS.portalName = (p) => String(p || "").replace(/^www\./, "").replace(/\.(com|es|dk|co\.uk|de|fr|it|pt|nl)$/, "");
})(typeof window !== "undefined" ? window : self);
