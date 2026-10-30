// Site adapters. Each portal is one object; adding a portal = adding one adapter.
// Each tries structured data first (embedded JSON), then DOM selectors, then plain-text regex, and returns null
// instead of throwing when the layout changes.
(function (g) {
  const RHS = g.RHS;
  const $ = (s, r = document) => { try { return r.querySelector(s); } catch { return null; } };
  const $$ = (s, r = document) => { try { return [...r.querySelectorAll(s)]; } catch { return []; } };
  const txt = (el) => (el ? (el.innerText || el.textContent || "").trim() : "");
  const first = (...sels) => { for (const s of sels) { const e = $(s); if (e && txt(e)) return e; } return null; };
  const json = (sel) => { const e = $(sel); if (!e) return null; try { return JSON.parse(e.textContent); } catch { return null; } };
  const jsonLd = () => $$('script[type="application/ld+json"]').map((e) => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter(Boolean).flat();
  const findKey = (o, key, depth = 0) => {
    if (!o || typeof o !== "object" || depth > 12) return null;
    if (Array.isArray(o)) { for (const x of o) { const r = findKey(x, key, depth + 1); if (r) return r; } return null; }
    if (key in o && o[key] && !(Array.isArray(o[key]) && !o[key].length)) return o[key];
    for (const k in o) { const r = findKey(o[k], key, depth + 1); if (r) return r; }
    return null;
  };
  const metaDesc = () => ($('meta[name="description"]') || {}).content || "";

  // ---------------------------------------------------------------- idealista (ES / PT / IT)
  const idealista = {
    id: "idealista",
    match: (h) => /(^|\.)idealista\.(com|pt|it)$/.test(h),
    currency: () => "EUR",
    country: () => (location.hostname.endsWith(".pt") || location.pathname.startsWith("/pt/") ? "PT" : location.hostname.endsWith(".it") ? "IT" : "ES"),
    isDetail: () => /\/(inmueble|immobile|imovel)\/\d+/.test(location.pathname),
    detail() {
      const price = RHS.num(txt(first(".info-data-price .txt-bold", ".info-data-price", ".price-features__container")));
      const feats = $$(".info-features span, .details-property_features li, .details-property-feature-one li, .details-property-feature-two li").map(txt).join(" · ");
      const sqm = RHS.sqm(feats) || RHS.sqm(txt($(".info-features")));
      const rooms = RHS.num((feats.match(/(\d+)\s*(hab|quart|locali|camere|dorm)/i) || [])[1]);
      const desc = txt(first(".comment .adCommentsLanguage", ".comment", ".adCommentsLanguage", "[class*=comment] p")) || metaDesc();
      const picBtn = $("[data-button-type=pics]");
      const photos = RHS.num((picBtn && (picBtn.getAttribute("aria-label") || txt(picBtn))) || "") || RHS.num(txt(first(".main-image_counter"))) || $$("#main-multimedia img, .detail-image-gallery img").length;
      const minor = txt(first(".main-info__title-minor")) || "";
      const area = minor.split(",")[0].trim() || (txt(first("#headerMap li:nth-child(2)")) || "").replace(/^(Barrio|Bairro|Quartiere)\s+/i, "");
      // the exact point comes from the static map the page itself embeds
      const g = document.documentElement.innerHTML.match(/staticmap\?[^"'<>]*?center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/);
      if (!price) return null;
      const prov = ($$("#headerMap li, .header-map-list li").map(txt).slice(-1)[0] || "").split(",").slice(-1)[0].trim();
      return { portal: "idealista", price, currency: "EUR", sqm, rooms, area, city: minor.split(",").slice(-1)[0].trim(), province: prov, country: idealista.country(),
        ptype: (txt($(".main-info__title-main")).match(/^(\w+)/) || [])[1] || "", desc: desc + " · " + feats, title: txt($(".main-info__title-main")), photos, days: null,
        lat: g ? +g[1] : null, lng: g ? +g[2] : null,
        extra: { floor: /planta|piano|andar|bajo/i.test(feats), energy: !!$("[class*=icon-energy], .energy-certificate-dropdown"), orientation: /orientaci[oó]n|orienta[cç]/i.test(feats), year: /construido en|anno di costruzione|constru[ií]do em/i.test(feats) } };
    },
    cards() {
      return $$("article.item, article[data-element-id], .item-multimedia-container").map((el) => el.closest("article") || el).filter((v, i, a) => a.indexOf(v) === i).map((el) => {
        const price = RHS.num(txt($(".item-price", el)));
        const details = $$(".item-detail, .item-detail-char span", el).map(txt).join(" ");
        const sqm = RHS.sqm(details);
        const link = $("a.item-link, a[href*='/inmueble/'], a[href*='/immobile/'], a[href*='/imovel/']", el);
        if (!price || !link) return null;
        return { el, mount: $(".item-info-container", el) || el, url: link.href, f: { portal: "idealista", price, currency: "EUR", sqm, title: txt(link), desc: txt($(".item-description", el)) + " · " + details, area: (() => { const ps = txt(link).split(","); return (ps.length >= 3 ? ps[ps.length - 2] : ps[0].replace(/^.*?\s(en|em|in)\s+/i, "")).trim(); })(), city: (txt(link).split(",").slice(-1)[0] || "").trim(), country: idealista.country(),
          photos: RHS.num(txt($(".item-multimedia-pictures__counter span:last-child", el))) } };
      }).filter(Boolean);
    },
    areaKey: () => (location.pathname.split("/").filter(Boolean)[1] || "").replace(/-/g, " "),
  };

  // ---------------------------------------------------------------- Zillow (US)
  const zillow = {
    id: "zillow",
    match: (h) => /(^|\.)zillow\.com$/.test(h),
    currency: () => "USD",
    country: () => "US",
    isDetail: () => /\/homedetails\/|\/apartments\/[^/]+\/[^/]+\/[A-Za-z0-9]+\/?$|\/b\/[^/]+/.test(location.pathname),
    nextData: (d) => { const e = (d || document).querySelector("script#__NEXT_DATA__"); if (!e) return null; try { return JSON.parse(e.textContent); } catch { return null; } },
    // v0.13: the listing's full record (also from a listing page fetched in the background, to check the top homes)
    property(d) {
      try { let gc = findKey(zillow.nextData(d), "gdpClientCache"); if (typeof gc === "string") gc = JSON.parse(gc); for (const k in gc || {}) if (gc[k] && gc[k].property) return gc[k].property; } catch { /* layout changed */ }
      return null;
    },
    fromProperty(p) {
      if (!p || !p.price) return null;
      const rf = p.resoFacts || {};
      const sqm = p.livingArea ? Math.round(p.livingArea * 0.09290304) : null;
      const rent = /RENT/i.test(p.homeStatus || "");
      const hoa = p.monthlyHoaFee || RHS.num(rf.hoaFee) || (rf.hoaFeeTotal ? RHS.num(rf.hoaFeeTotal) : null) || null;
      const facts = [];
      for (const k of ["propertySubType", "specialListingConditions", "propertyCondition", "isSeniorCommunity", "seniorCommunityYN", "landLeaseAmount", "waterfrontFeatures", "view", "architecturalStyle", "furnished"]) { const v = rf[k]; if (v != null && v !== false && v !== "") facts.push(k.replace(/([A-Z])/g, " $1").toLowerCase() + ": " + (Array.isArray(v) ? v.join(", ") : v === true ? "yes" : v)); }
      if (rf.isSeniorCommunity || rf.seniorCommunityYN) facts.push("55+ age restricted community");
      if (rf.landLeaseAmount) facts.push("land lease");
      const lot = p.lotAreaValue > 0 ? Math.round(p.lotAreaValue * (/acre/i.test(p.lotAreaUnits || p.lotAreaUnit || "") ? 4046.86 : 0.09290304)) : null;
      const sub = Object.keys(p.listing_sub_type || p.listingSubType || {}).filter((k) => (p.listing_sub_type || p.listingSubType)[k] === true);
      if (p.isPreforeclosureAuction) sub.push("is_preforeclosureAuction");
      return { portal: "zillow", structured: true, status: /PENDING|CONTINGENT|SOLD|OFF_MARKET|RECENTLY_SOLD/i.test(p.homeStatus || "") ? "off" : null, deal: rent ? "rent" : "sale", baths: p.bathrooms || null, zip: p.zipcode || null, city: p.city || "", price: p.price, currency: "USD", sqm, rooms: p.bedrooms, area: [p.city, p.state].filter(Boolean).join(", "), country: "US",
        ptype: (p.homeType || "").toLowerCase().replace(/_/g, " "), desc: [p.description || "", (p.whatILove || ""), ((rf.atAGlanceFacts) || []).map((x) => x.factLabel + " " + x.factValue).join(" · "), facts.join(" · ")].filter(Boolean).join(" \n "),
        lat: p.latitude, lng: p.longitude, title: p.streetAddress ? [p.streetAddress, p.city, p.state + " " + (p.zipcode || "")].join(", ") : document.title, photos: Math.max(p.photoCount || 0, (p.photos || []).length, (p.originalPhotos || []).length, (p.responsivePhotos || []).length), days: p.daysOnZillow != null && p.daysOnZillow >= 0 ? p.daysOnZillow : null,
        year: p.yearBuilt || rf.yearBuilt || null, hoa, lot, _zest: rent ? p.rentZestimate || null : p.zestimate || null, rentEst: !rent ? p.rentZestimate || null : null, taxRate: p.propertyTaxRate || null, sub,
        lastSold: p.lastSoldPrice ? { price: p.lastSoldPrice, date: p.dateSoldString || null } : null,
        drop: p.priceChange && p.priceChange < 0 ? Math.abs(p.priceChange) : null,
        extra: { year: !!(p.yearBuilt || rf.yearBuilt), fees: hoa != null, energy: false, floor: true, orientation: false } };
    },
    detailFrom(doc) { const f = zillow.fromProperty(zillow.property(doc)); return f; },
    detail() {
      const f0 = zillow.fromProperty(zillow.property(document));
      if (f0) return f0;
      const price = RHS.num(txt(first('[data-testid="price"]', ".ds-summary-row span", "span[data-testid=price]")));
      if (!price) { try { const g = RHS.genericDetail(document, location.href, null); if (g) { g.portal = "zillow"; if (/\/apartments\/|\/b\//.test(location.pathname) || /\/mo\b/.test(document.body.innerText.slice(0, 3000))) g.deal = "rent"; return g; } } catch { /* nothing to read */ } return null; }
      const facts = txt(first('[data-testid="bed-bath-sqft-facts"]', ".ds-bed-bath-living-area-container"));
      return { portal: "zillow", price, currency: "USD", sqm: RHS.sqm(facts), rooms: RHS.num((facts.match(/(\d+)\s*bd/) || [])[1]), area: txt($("h1")).split(",").slice(1).join(",").trim(), country: "US",
        desc: txt(first('[data-testid="description"]', ".ds-overview-section")) || metaDesc(), title: txt($("h1")), photos: $$("ul.media-stream img, [data-testid=media-stream] img").length, days: null };
    },
    _list: null,
    _api: {}, // v0.12: every home Zillow's own search answered (map moves don't refresh __NEXT_DATA__)
    noAutoDeep: true, // v0.12: never open dozens of Zillow listings on our own (their bot shield); only when asked
    // one Zillow search result (page data, list or map answer) -> our facts
    fromApi(r) {
      if (!r || !r.detailUrl) return null;
      const units = Array.isArray(r.units) ? r.units.filter((u) => RHS.num(u.price)) : [];
      const unit = units.length ? units.reduce((a, b) => (RHS.num(b.price) < RHS.num(a.price) ? b : a)) : null; // a building: its cheapest unit
      const hi = (r.hdpData && r.hdpData.homeInfo) || {};
      const price = unit ? RHS.num(unit.price) : r.unformattedPrice || hi.price || RHS.num(r.price);
      if (!price) return null;
      const rent = /RENT/i.test(r.statusType || hi.homeStatus || "") || /\/mo/.test(String(r.price || "")) || !!unit;
      let sqft = unit ? null : r.area || hi.livingArea || null;
      if (sqft && sqft > 15000 && !(+(r.beds ?? hi.bedrooms) >= 6)) sqft = null; // that's the plot, not the home
      const beds = unit ? (/studio/i.test(String(unit.beds)) ? 1 : RHS.num(unit.beds)) : r.beds ?? hi.bedrooms;
      const baths = unit ? null : r.baths ?? hi.bathrooms;
      let url = r.detailUrl; try { url = new URL(r.detailUrl, "https://www.zillow.com").href; } catch { /* keep */ }
      const city = r.addressCity || hi.city || "";
      const st = r.addressState || hi.state || "";
      const ll = r.latLong || {};
      return { url, f: { portal: "zillow", price, currency: "USD", deal: rent ? "rent" : "sale", sqm: sqft ? Math.round(sqft * 0.09290304) : null, rooms: beds != null && beds !== "" ? +beds || null : null, baths: baths || null,
        title: r.address || [r.streetAddress || hi.streetAddress, city].filter(Boolean).join(", ") || r.buildingName || "", desc: [r.statusText, r.flexFieldText, typeof r.price === "string" ? r.price : ""].filter(Boolean).join(" · "),
        area: city, city, st, zip: r.addressZipcode || hi.zipcode || null, country: "US", photos: r.photoCount || null, img: r.imgSrc || null,
        lat: ll.latitude ?? hi.latitude ?? null, lng: ll.longitude ?? hi.longitude ?? null, days: hi.daysOnZillow != null && hi.daysOnZillow >= 0 ? hi.daysOnZillow : null, // Zillow says -1 when it doesn't know
        drop: hi.priceChange && hi.priceChange < 0 ? Math.abs(hi.priceChange) : null,
        // v0.13: what the search already tells before opening the home
        lot: hi.lotAreaValue > 0 ? Math.round(hi.lotAreaValue * (/acre/i.test(hi.lotAreaUnit || "") ? 4046.86 : 0.09290304)) : null,
        tax: !rent && hi.taxAssessedValue > 1000 ? hi.taxAssessedValue : null,
        _zest: rent ? (hi.rentZestimate || null) : (hi.zestimate || r.zestimate || null), rentEst: !rent ? hi.rentZestimate || null : null,
        sub: Object.keys(hi.listing_sub_type || {}).filter((k) => hi.listing_sub_type[k]).concat(hi.isPreforeclosureAuction ? ["is_preforeclosureAuction"] : [], hi.newConstructionType ? ["is_newHome"] : []),
        status: /PENDING|CONTINGENT|SOLD|OFF_MARKET/i.test(hi.homeStatus || r.statusType || "") ? "off" : undefined,
        // auctions (starting bids) and "coming soon" are not market prices: shown, but not used to learn the fair price
        _noFit: !!(hi.listing_sub_type && (hi.listing_sub_type.is_forAuction || hi.listing_sub_type.is_comingSoon)) || !!hi.isPreforeclosureAuction,
        ptype: hi.homeType ? String(hi.homeType).toLowerCase().replace(/_/g, " ") : unit || r.isBuilding ? "flat" : null } };
    },
    // the search being shown (it changes every time you move the map or a filter)
    queryState() {
      try { const q = new URLSearchParams(location.search).get("searchQueryState"); if (q) return JSON.parse(q); } catch { /* not in the address */ }
      const q = findKey(zillow.nextData(), "queryState"); return q ? JSON.parse(JSON.stringify(q)) : null;
    },
    // v0.12: rank the whole area the way Zillow's own map does: one request gives every home on the map (up to 500),
    // then the list pages. No page is opened, nothing is clicked.
    async apiPage(qs, page, withMap) {
      const q = JSON.parse(JSON.stringify(qs)); if (page > 1) q.pagination = { currentPage: page }; else delete q.pagination;
      let res; try { res = await fetch(location.origin + "/async-create-search-page-state", { method: "PUT", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ searchQueryState: q, wants: withMap ? { cat1: ["listResults", "mapResults"], cat2: ["total"] } : { cat1: ["listResults"] }, requestId: 2 + page, isDebugRequest: false }) }); } catch { return { err: "net" }; }
      if (res.status === 403 || res.status === 429) return { blocked: true };
      if (!res.ok) return { err: res.status };
      let j; try { j = await res.json(); } catch { return { blocked: true }; } // a challenge page instead of data
      const sr = (j.cat1 && j.cat1.searchResults) || {};
      const raw = [...(sr.listResults || []), ...(withMap ? sr.mapResults || [] : [])];
      for (const r of raw) if (r && (r.zpid || r.detailUrl)) zillow._api[String(r.zpid || r.detailUrl)] = r;
      const tot = j.categoryTotals && j.categoryTotals.cat1 && j.categoryTotals.cat1.totalResultCount;
      const pg = j.cat1 && j.cat1.searchList;
      return { items: raw.map(zillow.fromApi).filter(Boolean), total: tot ?? (pg && pg.totalResultCount) ?? null, pages: (pg && pg.totalPages) || null, place: q.usersSearchTerm || "" };
    },
    cards() {
      if (!zillow._list) { const nd = zillow.nextData(); zillow._list = {}; for (const r of findKey(nd, "listResults") || []) zillow._list[String(r.zpid)] = r; }
      // v0.11: Zillow lists rentals and whole buildings too (links to /apartments/ or /b/, ids like "30.73--86.54")
      return $$("article[data-testid='property-card'], article[data-test='property-card'], article.property-card").map((el) => {
        const link = $("a[data-testid='property-card-title-link'], a[href*='/homedetails/'], a[href*='/apartments/'], a[href*='/b/'], a[href*='/community/']", el); if (!link) return null;
        const zpid = (el.id || "").replace(/^zpid_/, "") || (link.href.match(/(\d+)_zpid/) || [])[1];
        const r = zillow._api[zpid] || zillow._list[zpid] || zillow._list[(link.href.match(/(\d+)_zpid/) || [])[1]];
        // v0.12: the card's own price wins (after a map move the page data can be from the first search)
        const ptxt = txt($("[data-test='property-card-price'], [data-testid='property-card-price']", el));
        const x = r && zillow.fromApi(r);
        if (x && (!RHS.num(ptxt) || Math.abs(RHS.num(ptxt) - x.f.price) / x.f.price < 0.02 || r.units)) return { el, url: link.href, f: x.f };
        const price = RHS.num(ptxt); if (!price) return null;
        const t = txt(el);
        const sqft = RHS.num((t.match(/([\d,]+)\s*sqft/) || [])[1]);
        const rent = /\/mo\b/.test(ptxt) || /for-?rent|rentals|apartments/.test(location.pathname + link.href);
        const beds = RHS.num((t.match(/(\d+)\s*(bds?|beds?)/i) || [])[1]);
        const baths = RHS.num((t.match(/([\d.]+)\s*(ba|baths?)\b/i) || [])[1]);
        const addr = el.getAttribute("aria-label") || txt($("address", el)) || txt(link);
        const img = ($("img", el) || {}).src || null;
        return { el, url: link.href, f: { portal: "zillow", price, currency: "USD", deal: rent ? "rent" : "sale", sqm: sqft ? Math.round(sqft * 0.09290304) : null, rooms: beds || (/studio/i.test(t) ? 1 : null), baths: baths || null,
          title: addr, desc: ptxt, area: (addr.split(",").slice(-2, -1)[0] || "").trim(), city: (addr.split(",").slice(-2, -1)[0] || "").trim(), zip: (addr.match(/\b(\d{5})\b\s*$/) || [])[1] || null, country: "US", photos: null, img, lat: null, lng: null, days: null, ptype: null } };
      }).filter(Boolean);
    },
    areaKey: () => { let q = null; try { q = zillow.queryState(); } catch { /* none */ } if (q && q.usersSearchTerm) return q.usersSearchTerm; const r = Object.values(zillow._api).concat(Object.values(zillow._list || {}))[0]; return r ? [r.addressCity || (r.hdpData && r.hdpData.homeInfo && r.hdpData.homeInfo.city), r.addressState || (r.hdpData && r.hdpData.homeInfo && r.hdpData.homeInfo.state)].filter(Boolean).join(", ") : ""; },
  };

  // ---------------------------------------------------------------- Rightmove (UK)
  const devalue = (data) => { // Rightmove serialises its page model as a flat "devalue" array
    const arr = typeof data === "string" ? JSON.parse(data) : data;
    const h = (i, d = 0) => { if (typeof i !== "number" || i < 0 || d > 40) return null; const v = arr[i];
      if (Array.isArray(v)) return v.length && typeof v[0] === "string" && ["Date", "Set", "Map"].includes(v[0]) ? v : v.map((x) => h(x, d + 1));
      if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = h(v[k], d + 1); return o; } return v; };
    return h(0);
  };
  const rmModel = () => {
    for (const s of $$("script:not([src])")) {
      const t = s.textContent; const i = t.indexOf("window.__PAGE_MODEL = ");
      if (i < 0) continue;
      try { const start = i + 22; let depth = 0, j = start; for (; j < t.length; j++) { const c = t[j]; if (c === "{") depth++; else if (c === "}") { depth--; if (!depth) break; } else if (c === '"') { j++; while (j < t.length && t[j] !== '"') { if (t[j] === "\\") j++; j++; } } }
        const m = JSON.parse(t.slice(start, j + 1)); return m.data ? devalue(m.data) : m; } catch { return null; }
    }
    return null;
  };
  const rightmove = {
    id: "rightmove",
    match: (h) => /(^|\.)rightmove\.co\.uk$/.test(h),
    currency: () => "GBP",
    country: () => "GB",
    isDetail: () => /\/properties\/\d+/.test(location.pathname),
    detail() {
      const m = rmModel(); const pd = m && m.propertyData;
      if (pd && pd.prices) {
        const size = (pd.sizings || []).find((x) => x && x.unit === "sqm") || (pd.sizings || [])[0];
        let sqm = size ? (size.unit === "sqft" ? Math.round((size.minimumSize || size.maximumSize) * 0.09290304) : size.minimumSize || size.maximumSize) : null;
        if (!sqm) sqm = RHS.sqm((pd.keyFeatures || []).join(" ") + " " + ((pd.text || {}).description || ""));
        const added = ((pd.listingHistory || {}).listingUpdateReason || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
        const days = added ? Math.round((Date.now() - new Date(`${added[3]}-${added[2]}-${added[1]}`).getTime()) / 864e5) : null;
        const desc = ((pd.text || {}).description || "").replace(/<[^>]+>/g, " ") + " " + (pd.keyFeatures || []).join(". ");
        const addr = (pd.address || {}).displayAddress || "";
        return { portal: "rightmove", price: RHS.num(pd.prices.primaryPrice), currency: "GBP", sqm, rooms: pd.bedrooms, area: (pd.address || {}).outcode || addr.split(",").slice(-2, -1)[0]?.trim() || addr, country: "GB",
          ptype: (pd.propertySubType || "").toLowerCase(), desc, title: addr, photos: (pd.images || []).length, days,
          lat: pd.location ? pd.location.latitude : null, lng: pd.location ? pd.location.longitude : null,
          extra: { energy: (pd.epcGraphs || []).length > 0, fees: !!(pd.livingCosts && (pd.livingCosts.annualServiceCharge || pd.livingCosts.councilTaxBand)), floor: true, year: false },
          flagsExtra: (pd.tenure && pd.tenure.tenureType === "LEASEHOLD" && pd.tenure.yearsRemainingOnLease && pd.tenure.yearsRemainingOnLease < 85) ? " short lease " : "" };
      }
      const price = RHS.num(txt(first("article [data-testid=price] span", "span[class*=price]", "._1gfnqJ3Vtd1z40MlC0MzXu span")));
      if (!price) return null;
      return { portal: "rightmove", price, currency: "GBP", sqm: RHS.sqm(txt(document.body).slice(0, 20000)), area: txt($("h1")), country: "GB", desc: metaDesc(), title: txt($("h1")), photos: null };
    },
    _list: null,
    cards() {
      if (!rightmove._list) { const nd = json("script#__NEXT_DATA__"); rightmove._list = {}; for (const p of findKey(nd, "properties") || []) rightmove._list[String(p.id)] = p; }
      return $$("[data-testid^='propertyCard-']:not([data-testid*='vrt'])").map((el) => {
        const anchor = el.parentElement && $("a[id^='prop']", el.parentElement); const id = anchor ? anchor.id.replace("prop", "") : (($("a[href*='/properties/']", el) || {}).href || "").match(/properties\/(\d+)/)?.[1];
        if (!id) return null;
        const p = rightmove._list[id];
        const price = p ? p.price.amount : RHS.num(txt($("[class*=Price_price], [data-testid=property-price]", el)));
        if (!price) return null;
        const sqm = p ? RHS.sqm(p.displaySize) : RHS.sqm(txt(el));
        return { el, mount: el, url: `https://www.rightmove.co.uk/properties/${id}`,
          f: { portal: "rightmove", price, currency: "GBP", sqm, title: p ? p.displayAddress : "", desc: p ? (p.summary || "") : "", area: p ? (p.displayAddress || "").split(",").slice(-1)[0].trim() : "", country: "GB", photos: p ? p.numberOfImages : null,
            lat: p && p.location ? p.location.latitude : null, lng: p && p.location ? p.location.longitude : null } };
      }).filter(Boolean);
    },
    areaKey: () => (new URLSearchParams(location.search).get("searchLocation") || document.title.split(" in ")[1] || "").split(/[,|]/)[0].trim(),
  };

  // every other property site: the generic reader (src/generic.js) plus an optional recipe from our server
  // General classifieds sites run only on their property sections.
  const CLASSIFIEDS = /(^|\.)(olx\.\w+|subito\.it|kleinanzeigen\.de|leboncoin\.fr|sahibinden\.com|avito\.ma|dubizzle\.com|mudah\.my|chotot\.com|yapo\.cl|ss\.lv|njuskalo\.hr|bazaraki\.com|finn\.no|willhaben\.at|yad2\.co\.il|vivanuncios\.com\.mx|mercadolibre\.com\.\w+)$/;
  const PROPERTY_PATH = /(immobil|nieruchomo|real-?estate|propert|emlak|bolig|eiendom|nekretnin|inmueble|imovei|imóve|immo|casa|appartament|wohnung|haus|immobilier|ventes_immobilieres|apartment|homes?\b|houses?|nadlan|realestate|vivienda|departamento|piso|nemovitost|ingatlan|kinnisvara|dzivokl|asunto|bostad|lejlighed|condo|property|estate|דירות|נדל)/i;
  const generic = {
    id: "",
    match: () => true,
    allowed: () => !CLASSIFIEDS.test(location.hostname) || PROPERTY_PATH.test(decodeURIComponent(location.pathname + location.search)),
    isDetail: () => g.RHS.genericIsDetail(document, g.RHS.recipe || null),
    detail: () => g.RHS.genericDetail(document, location.href, g.RHS.recipe || null),
    cards: () => g.RHS.genericCards(document, location.href, g.RHS.recipe || null).map((c) => ({ ...c, f: { ...c.f, lat: c.lat ?? c.f.lat ?? null, lng: c.lng ?? c.f.lng ?? null } })),
    // cards from another page of the same search (fetched in the background for "rank the whole search")
    cardsFrom: (doc, url) => g.RHS.genericCards(doc, url, g.RHS.recipe || null).map((c) => ({ url: c.url, f: { ...c.f, lat: c.lat ?? c.f.lat ?? null, lng: c.lng ?? c.f.lng ?? null } })),
    areaKey: () => { const h1 = (document.querySelector("h1") || {}).textContent || ""; return (h1 || document.title).replace(/\s+/g, " ").trim().slice(0, 80); },
  };
  g.RHS.adapters = [idealista, zillow, rightmove];
  g.RHS.adapterFor = (host) => {
    const a = g.RHS.adapters.find((x) => x.match(host));
    if (a) { if (!a.cardsFrom) a.cardsFrom = generic.cardsFrom; return a; }
    if (!g.RHS.genericIsDetail) return null;
    generic.id = host.replace(/^www\./, "");
    return generic.allowed() ? generic : null;
  };
  g.RHS._devalue = devalue;
})(typeof window !== "undefined" ? window : self);
