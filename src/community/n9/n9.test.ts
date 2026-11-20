import { describe, expect, it } from "vitest";
import { isGone, isUnconfirmed, lastCheck, listedDays, alertHref, streetViewHref, dayLabel, listedAt } from "./status";
import { nextVisit, newSince, VISIT_GAP } from "./visit";
import { listingSlugs, cellValue, sortOrder, shareLinks } from "./listing";
import { shouldNudge } from "./SaveNudge";

describe("home status", () => {
  it("is gone only with more 'gone' reports than 'still available' ones", () => {
    expect(isGone({ sold_reports: 1, available_reports: 0 })).toBe(true);
    expect(isGone({ sold_reports: 1, available_reports: 1 })).toBe(false);
    expect(isGone({ sold_reports: 0, available_reports: 0 })).toBe(false);
    expect(isGone({})).toBe(false);
    expect(isGone(null)).toBe(false);
  });
  it("takes the later of the person check and the AI check", () => {
    expect(lastCheck({})).toBeNull();
    expect(lastCheck({ verified_at: "2026-10-02T19:36:22Z" })).toEqual({ iso: "2026-10-02T19:36:22Z", by: "person" });
    expect(lastCheck({ ai_checked_at: "2026-11-08T12:11:26Z" })).toEqual({ iso: "2026-11-08T12:11:26Z", by: "ai" });
    expect(lastCheck({ verified_at: "2026-10-02T00:00:00Z", ai_checked_at: "2026-11-08T00:00:00Z" })?.by).toBe("ai");
    expect(lastCheck({ verified_at: "2026-11-10T00:00:00Z", ai_checked_at: "2026-11-08T00:00:00Z" })?.by).toBe("person");
    expect(lastCheck({ verified_at: "not a date" })).toBeNull();
  });
  it("counts whole days on RealHunt from the publication date", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    expect(listedDays({ publish_at: "2026-11-15T08:00:00Z" }, now)).toBe(0);
    expect(listedDays({ approved_at: "2026-09-29T10:47:26Z" }, now)).toBe(47);
    expect(listedDays({ publish_at: "2026-12-01T00:00:00Z" }, now)).toBeNull();
    expect(listedDays({}, now)).toBeNull();
    expect(listedAt({ publish_at: null, approved_at: "2026-09-29T10:47:26Z" })).toBe("2026-09-29T10:47:26Z");
  });
  it("opens the alert form with the country and the budget step that covers the price", () => {
    expect(alertHref({ country: "Italy", price_eur: 29000 })).toBe("/alerts?country=Italy&max=30000");
    expect(alertHref({ country: "United States", price_eur: 250000 })).toBe("/alerts?country=United+States");
    expect(alertHref({})).toBe("/alerts");
  });
  it("links to Street View only with a real point", () => {
    expect(streetViewHref({ lat: 46.1605, lng: 9.2935 })).toBe("https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=46.16050,9.29350");
    expect(streetViewHref({ lat: null, lng: 9 })).toBeNull();
    expect(streetViewHref({ lat: 120, lng: 9 })).toBeNull();
  });
  it("writes the same day in English and Spanish", () => {
    expect(dayLabel("2026-10-02T19:36:22.637257+00:00")).toBe("2 Oct 2026");
    expect(dayLabel("2026-09-08T12:00:00Z", "es")).toBe("8 sept 2026");
    expect(dayLabel(null)).toBe("");
  });
});

describe("visits", () => {
  const t0 = 1_800_000_000_000;
  it("has no earlier visit the first time", () => { expect(nextVisit({ now: null, prev: null }, t0)).toEqual({ now: t0, prev: null }); });
  it("keeps the same visit within the gap", () => { expect(nextVisit({ now: t0, prev: 5 }, t0 + VISIT_GAP - 1)).toEqual({ now: t0, prev: 5 }); });
  it("starts a new visit after the gap and remembers the one before", () => { expect(nextVisit({ now: t0, prev: 5 }, t0 + VISIT_GAP)).toEqual({ now: t0 + VISIT_GAP, prev: t0 }); });
  it("ignores a clock that went backwards", () => { expect(nextVisit({ now: t0 + 10, prev: 5 }, t0)).toEqual({ now: t0, prev: null }); });
  it("lists homes published after the visit, newest first", () => {
    const rows = [{ id: "a", publish_at: "2026-11-10T00:00:00Z" }, { id: "b", approved_at: "2026-11-14T00:00:00Z" }, { id: "c", publish_at: "2026-11-12T00:00:00Z" }, { id: "d" }];
    expect(newSince(rows, Date.parse("2026-11-11T00:00:00Z")).map((r) => r.id)).toEqual(["b", "c"]);
  });
});

describe("listing pages", () => {
  it("reads the homes of a listing in order, once each", () => {
    expect(listingSlugs(["/homes/italy", "/deal/a-1", "/es/deal/b_2?tab=all", "/deal/a-1", "https://x.test/deal/zz", "/deal/"])).toEqual(["a-1", "b_2"]);
  });
  it("reads prices, sizes and dates from table cells", () => {
    expect(cellValue("€12,000")).toBe(12000);
    expect(cellValue("12.000 €")).toBe(12000);
    expect(cellValue("€1,250,000")).toBe(1250000);
    expect(cellValue("48 m²")).toBe(48);
    expect(cellValue("€520/m²")).toBe(520);
    expect(cellValue("89")).toBe(89);
    expect(cellValue("2,5")).toBe(2.5);
    expect(cellValue("·")).toBeNull();
    expect(cellValue("23 Sep 2026", "2026-09-23")).toBe(Date.parse("2026-09-23"));
    expect(cellValue("Lazio")).toBe("lazio");
  });
  it("sorts both ways and leaves empty cells last", () => {
    expect(sortOrder([30, null, 10, 20], 1)).toEqual([2, 3, 0, 1]);
    expect(sortOrder([30, null, 10, 20], -1)).toEqual([0, 3, 2, 1]);
    expect(sortOrder(["b", "a", null], 1)).toEqual([1, 0, 2]);
  });
  it("builds share links", () => {
    const s = shareLinks("Cheap homes in Italy", "https://realhunt.co/homes/italy");
    expect(s.whatsapp).toBe("https://wa.me/?text=Cheap%20homes%20in%20Italy%20https%3A%2F%2Frealhunt.co%2Fhomes%2Fitaly");
    expect(s.email.startsWith("mailto:?subject=Cheap%20homes%20in%20Italy&body=")).toBe(true);
  });
});

describe("save nudge", () => {
  it("asks only guests, at three saves, once", () => {
    expect(shouldNudge({ user: false, saves: 2, answered: false })).toBe(false);
    expect(shouldNudge({ user: false, saves: 3, answered: false })).toBe(true);
    expect(shouldNudge({ user: true, saves: 5, answered: false })).toBe(false);
    expect(shouldNudge({ user: false, saves: 5, answered: true })).toBe(false);
  });
});

describe("isUnconfirmed (20-nov-2026)", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  const old = "2026-10-01T00:00:00Z";
  it("marks homes the check could not read for 30 days", () => {
    expect(isUnconfirmed({ src_last: "blocked", src_ok_at: null, approved_at: old }, now)).toBe(true);
    expect(isUnconfirmed({ src_last: "error", src_ok_at: "2026-10-10T00:00:00Z", approved_at: old }, now)).toBe(true);
    expect(isUnconfirmed({ src_last: null, src_ok_at: null, approved_at: old }, now)).toBe(true);
  });
  it("leaves confirmed, gone, new and old-snapshot homes alone", () => {
    expect(isUnconfirmed({ src_last: "blocked", src_ok_at: "2026-11-10T00:00:00Z", approved_at: old }, now)).toBe(false);
    expect(isUnconfirmed({ src_last: "ok", src_ok_at: "2026-11-19T00:00:00Z", approved_at: old }, now)).toBe(false);
    expect(isUnconfirmed({ src_last: "gone", sold_reports: 2, available_reports: 0, approved_at: old }, now)).toBe(false);
    expect(isUnconfirmed({ src_last: null, src_ok_at: null, approved_at: "2026-11-18T00:00:00Z" }, now)).toBe(false);
    expect(isUnconfirmed({ approved_at: old }, now)).toBe(false);
  });
});
