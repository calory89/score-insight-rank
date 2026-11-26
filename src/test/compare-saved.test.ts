// Batch 18 of the list of 1,000 (26-nov-2026): saved homes, compare and alerts helpers.
import { beforeEach, describe, expect, it } from "vitest";
import { areaMedian, regionOf, savedState, sortSaved, toCsv, visitIcs, vsMedian } from "@/community/compareSaved";
import { GUEST_MAX, guestSaves, guestSavesFull, keepGuestSaves, mergeGuestSaves, savedNotice, toggleGuestSave, type GuestSave } from "@/community/guestSaves";
import { priceChange, rememberSavedPrice, savedPrices } from "@/community/savedPrice";

const DAY = 86400000;
const NOW = Date.parse("2026-11-26T12:00:00Z");
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

describe("what happened to a saved home", () => {
  it("claims nothing before the snapshot arrives", () => expect(savedState(undefined, false, NOW)).toBe("ok"));
  it("a home missing from the snapshot was removed", () => expect(savedState(undefined, true, NOW)).toBe("removed"));
  it("a home whose advert was reported gone", () => expect(savedState({ sold_reports: 2, available_reports: 0 }, true, NOW)).toBe("gone"));
  it("a home not confirmed for 30+ days", () => expect(savedState({ src_last: "blocked", src_ok_at: iso(45), publish_at: iso(90) }, true, NOW)).toBe("unconfirmed"));
  it("a home confirmed last week is fine", () => expect(savedState({ src_last: "ok", src_ok_at: iso(7) }, true, NOW)).toBe("ok"));
});

describe("saved page order", () => {
  const items = [{ s: "a", p: 300, n: 80 }, { s: "b", p: null, n: 95 }, { s: "c", p: 100, n: null }, { s: "d", p: 200, n: 80 }];
  const ids = (xs: typeof items) => xs.map((x) => x.s).join("");
  const P = (x: (typeof items)[0]) => x.p, N = (x: (typeof items)[0]) => x.n;
  it("keeps the saved order", () => expect(ids(sortSaved(items, "saved", P, N))).toBe("abcd"));
  it("cheapest first, unknown price last", () => expect(ids(sortSaved(items, "price", P, N))).toBe("cdab"));
  it("dearest first, unknown price last", () => expect(ids(sortSaved(items, "price-desc", P, N))).toBe("adcb"));
  it("best score first, ties keep the saved order", () => expect(ids(sortSaved(items, "score", P, N))).toBe("badc"));
  it("does not change the input", () => { const copy = items.slice(); sortSaved(items, "price", P, N); expect(items).toEqual(copy); });
});

describe("CSV", () => {
  it("quotes, escapes and defuses formulas", () => {
    const csv = toCsv(["Title", "Price"], [["House, \"big\"", 38000], ["=HYPERLINK(\"x\")", -5], [null, "line\nbreak"]]);
    expect(csv.startsWith("﻿Title,Price\r\n")).toBe(true);
    expect(csv).toContain('"House, ""big"""' + ",38000");
    expect(csv).toContain("\"'=HYPERLINK(\"\"x\"\")\",-5");
    expect(csv).toContain(',"line\nbreak"');
  });
});

describe("price per m² against the area", () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => ({ slug: "r" + i, country: "Italy", location_name: `Town ${i}, Lake Como, Italy`, price_eur: 100000 + i * 10000, sqm: 100 })),
    ...Array.from({ length: 4 }, (_, i) => ({ slug: "s" + i, country: "Italy", location_name: `Town ${i}, Sicily, Italy`, price_eur: 50000, sqm: 100 })),
    { slug: "tiny", country: "Italy", location_name: "X, Sicily, Italy", price_eur: 9000, sqm: 5 },
  ];
  it("reads the region from the location", () => {
    expect(regionOf("Peglio, Lake Como, Italy")).toBe("Lake Como");
    expect(regionOf("Lisbon, Portugal")).toBeNull();
    expect(regionOf(null)).toBeNull();
  });
  it("uses the region with five homes", () => expect(areaMedian(rows[0], rows)).toEqual({ scope: "Lake Como", median: 1200, n: 5 }));
  it("falls back to the country when the region has fewer than five (and ignores tiny areas)", () => expect(areaMedian(rows[5], rows)).toEqual({ scope: "Italy", median: 1000, n: 9 }));
  it("gives nothing for a country with too few homes", () => expect(areaMedian({ country: "Peru", location_name: "Lima, Peru", price_eur: 1, sqm: 50 }, rows)).toBeNull());
  it("percent against the median", () => { expect(vsMedian(620, 1000)).toBe(-38); expect(vsMedian(1500, 1000)).toBe(50); expect(vsMedian(null, 1000)).toBeNull(); });
});

describe("visit calendar file", () => {
  it("is an all-day event with escaped text", () => {
    const ics = visitIcs({ slug: "it-como-1", title: "House; lake, view", url: "https://realhunt.co/deal/it-como-1", day: "2026-12-31", where: "Peglio, Italy", stamp: new Date(NOW) })!;
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101");
    expect(ics).toContain("SUMMARY:Visit: House\\; lake\\, view");
    expect(ics).toContain("LOCATION:Peglio\\, Italy");
    expect(ics).toContain("DTSTAMP:20261126T120000Z");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
  it("refuses a bad date", () => expect(visitIcs({ slug: "a", title: "a", url: "u", day: "31/12/2026" })).toBeNull());
});

describe("moving saves into the account", () => {
  const g = (id: string): GuestSave => ({ id, slug: "s-" + id, title: id, price_eur: 1, image: null, at: 1 });
  it("keeps the ones that failed and drops the ones that no longer exist", async () => {
    const r = await mergeGuestSaves([g("a"), g("b"), g("c"), g("a"), g("d")], ["d"], async (id) => {
      if (id === "b") throw new Error("Network error");
      if (id === "c") throw new Error("Home not found");
    });
    expect(r.moved).toEqual(["a", "d"]);
    expect(r.failed.map((x) => x.id)).toEqual(["b"]);
    expect(r.gone).toEqual(["c"]);
  });
});

describe("saves on this device", () => {
  beforeEach(() => localStorage.clear());
  it("keeps only what is given, and knows when it is full", () => {
    toggleGuestSave({ id: "1", slug: "one" }); toggleGuestSave({ id: "2", slug: "two" });
    expect(guestSaves().map((x) => x.id)).toEqual(["2", "1"]);
    keepGuestSaves(guestSaves().filter((x) => x.id === "1"));
    expect(guestSaves().map((x) => x.id)).toEqual(["1"]);
    expect(guestSavesFull()).toBe(false);
    for (let i = 0; i < GUEST_MAX + 5; i++) toggleGuestSave({ id: "n" + i, slug: "n" + i });
    expect(guestSaves().length).toBe(GUEST_MAX);
    expect(guestSavesFull()).toBe(true);
  });
  it("ignores broken entries", () => { localStorage.setItem("rh_guest_saves", JSON.stringify([null, { id: 1 }, { id: "x", slug: "y" }])); expect(guestSaves().map((x) => x.id)).toEqual(["x"]); });
  it("warns when saving a home that may be sold or is not confirmed", () => {
    expect(savedNotice({ sold_reports: 1 }, true)).toMatch(/no longer online/);
    expect(savedNotice({ src_last: "blocked", src_ok_at: iso(400), publish_at: iso(500) }, false)).toMatch(/could not confirm/);
    expect(savedNotice({ src_last: "ok" }, true)).toMatch(/^Saved on this device/);
    expect(savedNotice({}, false)).toMatch(/^Saved ✓/);
  });
  it("price since saved for a removed home stays unknown", () => {
    rememberSavedPrice("gone-home", 50000);
    expect(savedPrices()["gone-home"].p).toBe(50000);
    expect(priceChange(savedPrices()["gone-home"].p, undefined)).toBeNull();
    expect(priceChange(50000, 45000)).toEqual({ diff: -5000, pct: -10 });
  });
});
