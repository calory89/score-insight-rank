import { describe, expect, it } from "vitest";
import {
  parseQuery, buildPlaces, suggestPlaces, editDistance, countryOf, applyParsed, describeParams, describeParamsWithPlaces, removeChip,
  canonicalSearch, paramsToFeed, LIFESTYLES, lifestyleOn, toggleLifestyle, addSaved, markOpened, removeSaved, countNew, loadSaved, storeSaved,
  alertsLink, wordMatches, SAVED_KEY,
} from "@/community/smartsearch";

const ROWS = [
  ...Array.from({ length: 12 }, (_, i) => ({ country: "Portugal", location_name: `Town${i}, Algarve`, approved_at: "2026-10-01T00:00:00Z" })),
  { country: "Italy", location_name: "Castellina, Tuscany", approved_at: "2026-11-05T00:00:00Z" },
  { country: "Italy", location_name: "Peglio, Lake Como, Italy", approved_at: "2026-11-06T00:00:00Z" },
  { country: "Italy", location_name: "San Siro, Lake Como", approved_at: "2026-09-01T00:00:00Z" },
  { country: "United States", location_name: "Aventura, Miami-Dade, Florida" },
  { country: "United States", location_name: "Miami Beach, Florida" },
  { country: "Spain", location_name: "Árchez, Málaga" },
];
const PLACES = buildPlaces(ROWS);
const P = (s: string) => parseQuery(s, PLACES);

describe("parseQuery (English)", () => {
  it("3 bedroom house near the sea under 200k in Portugal", () => {
    const p = P("3 bedroom house near the sea under 200k in Portugal");
    expect(p.min_beds).toBe(3); expect(p.category).toBe("beach"); expect(p.max_price).toBe(200000); expect(p.country).toEqual(["Portugal"]); expect(p.words).toEqual([]);
  });
  it("apartment Miami under $300k 2 bed converts dollars", () => {
    const p = P("apartment Miami under $300k 2 bed");
    expect(p.max_price).toBe(Math.round(300000 * 0.896)); expect(p.min_beds).toBe(2); expect(p.place).toBe("Miami"); expect(p.words).toEqual(["apartment"]);
  });
  it("cheap farmhouse Tuscany", () => {
    const p = P("cheap farmhouse Tuscany");
    expect(p.sort).toBe("price_asc"); expect(p.words).toEqual(["farm"]); expect(p.place).toBe("Tuscany"); expect(p.structured).toBe(true);
  });
  it("pounds and millions", () => {
    expect(P("villa under £1.5m").max_price).toBe(Math.round(1.5e6 * 1.17));
    expect(P("homes over 250,000 euros").min_price).toBe(250000);
  });
  it("price ranges", () => {
    const a = P("between 100k and 200k Spain");
    expect([a.min_price, a.max_price]).toEqual([100000, 200000]); expect(a.country).toEqual(["Spain"]);
    const b = P("100-150k garden");
    expect([b.min_price, b.max_price]).toEqual([100000, 150000]); expect(b.need).toEqual(["garden"]);
  });
  it("bare budget with currency is a max price", () => {
    expect(P("€80,000 cottage in France").max_price).toBe(80000);
    expect(P("lake house 90k").max_price).toBe(90000);
    expect(P("lake house 90k").vibe).toEqual(["lake"]);
  });
  it("amenities map to existing fields", () => {
    const p = P("house with a pool and garden, mountain views");
    expect(p.need.sort()).toEqual(["garden", "pool", "views"]); expect(p.words).toEqual(["mountain"]);
  });
  it("typos in countries", () => {
    expect(P("cabin in Itlay").country).toEqual(["Italy"]);
    expect(P("Swedne lake").country).toEqual(["Sweden"]);
    expect(countryOf("Portgual")).toBe("Portugal");
    expect(countryOf("house")).toBeNull();
    expect(countryOf("us")).toBe("United States");
  });
  it("typos in regions from the data", () => {
    expect(P("Algrave 2 bedrooms").place).toBe("Algarve");
  });
  it("multi-word countries and places", () => {
    expect(P("condo in the United States").country).toEqual(["United States"]);
    expect(P("flat on Lake Como").place).toBe("Lake Como");
    expect(P("flat on Lake Como").vibe).toEqual([]);
  });
  it("ready to move in and two-word bedrooms", () => {
    const p = P("two bedroom ready to move in Greece");
    expect(p.min_beds).toBe(2); expect(p.dmin).toEqual({ condition: 88 }); expect(p.country).toEqual(["Greece"]);
  });
  it("plain words are not structured", () => {
    const p = P("sauna");
    expect(p.need).toEqual(["sauna"]);
    expect(P("castle").structured).toBe(false);
    expect(P("castle").words).toEqual(["castle"]);
  });
  it("drops words no listing contains when given a known check", () => {
    const corpus = "stone house with views in a quiet village";
    const p = parseQuery("peaceful stone house with a view", PLACES, (w) => corpus.includes(w));
    expect(p.words).toEqual(["stone"]); expect(p.ignored).toEqual(["peaceful"]); expect(p.need).toEqual(["views"]);
  });
  it("strips notes in brackets from place names", () => {
    expect(buildPlaces([{ country: "Italy", location_name: "Pisa, Tuscany (between Florence and Pisa)" }]).map((p) => p.name)).toContain("Tuscany");
  });
  it("does not read years or m² as prices", () => {
    expect(P("built 1990 stone house").max_price).toBeNull();
    expect(P("100 m² flat").max_price).toBeNull();
  });
});

describe("parseQuery (Spanish)", () => {
  it("casa con jardín en Italia por menos de 100.000", () => {
    const p = P("casa con jardín en Italia por menos de 100.000");
    expect(p.need).toEqual(["garden"]); expect(p.country).toEqual(["Italy"]); expect(p.max_price).toBe(100000); expect(p.words).toEqual([]);
  });
  it("piso en España hasta 150 mil euros 3 habitaciones", () => {
    const p = P("piso en España hasta 150 mil euros 3 habitaciones");
    expect(p.country).toEqual(["Spain"]); expect(p.max_price).toBe(150000); expect(p.min_beds).toBe(3); expect(p.words).toEqual(["apartment"]);
  });
  it("casa cerca del mar en Grecia desde 50.000", () => {
    const p = P("casa cerca del mar en Grecia desde 50.000");
    expect(p.category).toBe("beach"); expect(p.country).toEqual(["Greece"]); expect(p.min_price).toBe(50000);
  });
  it("finca barata con piscina", () => {
    const p = P("finca barata con piscina");
    expect(p.words).toEqual(["farm"]); expect(p.sort).toBe("price_asc"); expect(p.need).toEqual(["pool"]);
  });
  it("dos dormitorios en Estados Unidos por menos de $250.000", () => {
    const p = P("dos dormitorios en Estados Unidos por menos de $250.000");
    expect(p.min_beds).toBe(2); expect(p.country).toEqual(["United States"]); expect(p.max_price).toBe(Math.round(250000 * 0.896));
  });
  it("entre 1,2 millones y 2 millones", () => {
    const p = P("villa entre 1,2 millones y 2 millones");
    expect([p.min_price, p.max_price]).toEqual([1200000, 2000000]);
  });
  it("casa en el campo lista para entrar a vivir", () => {
    const p = P("casa en el campo lista para entrar a vivir");
    expect(p.category).toBe("village"); expect(p.dmin).toEqual({ condition: 88 });
  });
  it("style words are wishes, not part of the place (owner's screenshot, 8-nov)", () => {
    const places = buildPlaces([...ROWS, ...Array.from({ length: 4 }, () => ({ country: "Spain", location_name: "Madrid, Comunidad de Madrid" })), ...Array.from({ length: 4 }, () => ({ country: "Italy", location_name: "Modena, Emilia-Romagna" }))]);
    const p = parseQuery("Casas en madrid moderna 3 habitaciones por menos de 200.000", places);
    expect(p.place).toBe("Madrid"); expect(p.min_beds).toBe(3); expect(p.max_price).toBe(200000);
    expect(p.style).toEqual(["moderna"]); expect(p.words).toEqual([]);
    const q = parseQuery("modern renovated flat in Madrid", places);
    expect(q.place).toBe("Madrid"); expect(q.style).toEqual(["modern", "renovated"]); expect(q.words).toEqual(["apartment"]);
    // with the feed's "does any listing say it" check, a Spanish style word becomes the English word listings use
    const k = parseQuery("casa moderna y luminosa en Madrid", places, (w) => "a modern villa".includes(w));
    expect(k.place).toBe("Madrid"); expect(k.words).toEqual(["modern"]); expect(k.ignored).toEqual(["luminosa"]);
    expect(parseQuery("piso de lujo centrico bonita", places).place).toBe(null);
  });
});

describe("URL params and chips", () => {
  it("applies a parse onto the URL and keeps other filters", () => {
    const base = new URLSearchParams("tab=x&need=views&q=old");
    const next = applyParsed(base, P("3 bedroom house near the sea under 200k in Portugal"));
    expect(next.get("country")).toBe("Portugal"); expect(next.get("price")).toBe("200000"); expect(next.get("beds")).toBe("3"); expect(next.get("type")).toBe("beach");
    expect(next.get("need")).toBe("views"); expect(next.get("q")).toBeNull(); expect(next.get("tab")).toBe("x");
  });
  it("describes the chips in reading order and removes one at a time", () => {
    const sp = new URLSearchParams("country=Portugal&price=200000&beds=3&type=beach");
    const chips = describeParams(sp);
    expect(chips.map((c) => c.label).join(" · ")).toBe("Portugal · under €200,000 · 3+ bedrooms · near the sea");
    const after = removeChip(sp, chips[1]);
    expect(after.get("price")).toBeNull(); expect(after.get("country")).toBe("Portugal");
  });
  it("keeps place names together as one chip", () => {
    const sp = new URLSearchParams("q=Lake Como apartment");
    const chips = describeParamsWithPlaces(sp, PLACES);
    expect(chips.map((c) => c.label)).toEqual(["Lake Como", "apartments"]);
    expect(removeChip(sp, chips[0]).get("q")).toBe("apartment");
  });
  it("removes one value from a list param", () => {
    const sp = new URLSearchParams("need=garden,pool&country=Spain,Italy");
    const chips = describeParams(sp);
    const pool = chips.find((c) => c.id === "need:pool")!;
    expect(removeChip(sp, pool).get("need")).toBe("garden");
    expect(removeChip(sp, chips[0]).get("country")).toBe("Italy");
  });
  it("canonical key ignores order and unrelated params", () => {
    expect(canonicalSearch(new URLSearchParams("price=1&country=Spain&utm=x"))).toBe(canonicalSearch(new URLSearchParams("country=Spain&price=1")));
    expect(canonicalSearch(new URLSearchParams("order=score"))).toBe("");
  });
  it("paramsToFeed mirrors the home feed", () => {
    const f = paramsToFeed(new URLSearchParams("country=Spain&price=100000&vibe=lake&dmin=condition:88&need=pool"), { lake: "lake" });
    expect(f).toMatchObject({ country: "Spain", max_price: 100000, terms: ["lake"], dim_min: { condition: 88 }, need: ["pool"], sort: "score" });
  });
  it("synonyms widen search words", () => {
    expect(wordMatches("Two-bed condo in Doral", "apartment")).toBe(true);
    expect(wordMatches("Stone farmhouse", "farm")).toBe(true);
    expect(wordMatches("Village house", "apartment")).toBe(false);
  });
});

describe("autocomplete", () => {
  it("edit distance counts swaps as one", () => {
    expect(editDistance("itlay", "italy")).toBe(1);
    expect(editDistance("algrave", "algarve")).toBe(1);
    expect(editDistance("abc", "xyz")).toBe(3);
  });
  it("suggests places with counts and tolerates typos", () => {
    const alg = suggestPlaces("Algrave", PLACES)[0];
    expect(alg.name).toBe("Algarve"); expect(alg.n).toBe(12); expect(alg.country).toBe("Portugal");
    expect(suggestPlaces("Itlay", PLACES)[0].name).toBe("Italy");
    expect(suggestPlaces("mia", PLACES).map((s) => s.name)).toContain("Miami Beach");
    expect(suggestPlaces("mal", PLACES).map((s) => s.name)).toContain("Málaga");
    expect(suggestPlaces("x", PLACES)).toEqual([]);
  });
  it("countries come before towns with the same match", () => {
    const s = suggestPlaces("port", PLACES);
    expect(s[0].kind).toBe("country");
  });
});

describe("lifestyle chips", () => {
  it("toggle on and off", () => {
    let sp = new URLSearchParams("country=Spain");
    for (const l of LIFESTYLES) { sp = toggleLifestyle(sp, l); expect(lifestyleOn(sp, l)).toBe(l.param === "type" ? true : true); }
    expect(sp.get("country")).toBe("Spain");
    const lake = LIFESTYLES.find((l) => l.k === "lake")!;
    sp = toggleLifestyle(sp, lake); expect(lifestyleOn(sp, lake)).toBe(false);
    const mountain = LIFESTYLES.find((l) => l.k === "mountain")!;
    sp = toggleLifestyle(sp, mountain); expect(sp.get("q")).toBeNull();
  });
  it("type chips replace each other", () => {
    const beach = LIFESTYLES.find((l) => l.k === "beach")!, city = LIFESTYLES.find((l) => l.k === "city")!;
    const sp = toggleLifestyle(toggleLifestyle(new URLSearchParams(), beach), city);
    expect(sp.get("type")).toBe("city"); expect(lifestyleOn(sp, beach)).toBe(false);
  });
});

describe("saved searches", () => {
  it("adds once, marks opened, removes", () => {
    const t0 = new Date("2026-11-01T00:00:00Z");
    let l = addSaved([], "country=Italy", "Italy", t0);
    l = addSaved(l, "country=Italy", "Italy", t0);
    expect(l).toHaveLength(1);
    expect(countNew(ROWS, l[0].opened)).toBe(2);
    l = markOpened(l, "country=Italy", new Date("2026-11-07T00:00:00Z"));
    expect(countNew(ROWS, l[0].opened)).toBe(0);
    expect(removeSaved(l, "country=Italy")).toEqual([]);
  });
  it("storage failures never throw", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
    expect(loadSaved(broken)).toEqual([]);
    expect(() => storeSaved([], broken)).not.toThrow();
    const mem: Record<string, string> = {};
    const ok = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; } };
    storeSaved(addSaved([], "q=x", "x"), ok);
    expect(JSON.parse(mem[SAVED_KEY])).toHaveLength(1);
    expect(loadSaved(ok)[0].qs).toBe("q=x");
  });
  it("alerts link carries one country and a max price", () => {
    expect(alertsLink(new URLSearchParams("country=Spain&price=80000"))).toBe("/alerts?country=Spain&max=80000");
    expect(alertsLink(new URLSearchParams("country=Spain,Italy"))).toBe("/alerts");
  });
});

describe("parseQuery tolerates misspelt bedroom words (8-nov-2026)", () => {
  it("reads 3 habtiacioens, 2 habitacines, tres dormitoros and 4 bedromms", async () => {
    const { parseQuery } = await import("@/community/smartsearch");
    expect(parseQuery("casa 3 habtiacioens").min_beds).toBe(3);
    expect(parseQuery("piso 2 habitacines").min_beds).toBe(2);
    expect(parseQuery("tres dormitoros").min_beds).toBe(3);
    expect(parseQuery("4 bedromms house").min_beds).toBe(4);
    expect(parseQuery("house in bedford").min_beds).toBe(null);
  });
});

