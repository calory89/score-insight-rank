// seo/tech/browserCheck.mjs (21 Nov 2026, ideas 5, 65, 81 and 87 of the second list): the pure parts.
import { describe, expect, it } from "vitest";
import { isOwn, ownConsoleError, choosePages, packProblems, weightProblems } from "../../seo/tech/browserCheck.mjs";

describe("browser check after publishing", () => {
  it("counts only our own hosts", () => {
    expect(isOwn("https://realhunt-media.pages.dev/t/finds/a.webp")).toBe(true);
    expect(isOwn("https://realhunt.co/x")).toBe(true);
    expect(isOwn("https://www.googletagmanager.com/gtag/js")).toBe(false);
    expect(isOwn("not a url")).toBe(false);
  });
  it("keeps console errors that are ours and leaves out other sites' errors", () => {
    expect(ownConsoleError("Failed to load resource: the server responded with a status of 404 (Not Found)", "https://realhunt-media.pages.dev/t/finds/a.webp")).toBe(true);
    expect(ownConsoleError("Failed to load resource", "https://www.clarity.ms/tag/x")).toBe(false);
    expect(ownConsoleError("Refused to connect to https://region1.google-analytics.com/g/collect", "https://realhunt.co/")).toBe(false);
    expect(ownConsoleError("TypeError: x is undefined", "")).toBe(true);
  });
  it("opens the main page types first, then others at random, never twice", () => {
    const urls = ["/", "/deal/a", "/es/deal/a", "/homes/spain", "/homes/spain/under-80000", "/guide/spain", "/es/homes/spain", "/de/homes/spain", "/x", "/y", "/z"];
    const p = choosePages(urls, 12, () => 0.5);
    expect(p.slice(0, 3)).toEqual(["/", "/es", "/map"]);
    expect(p).toContain("/deal/a");
    expect(p).toContain("/homes/spain/under-80000");
    expect(new Set(p).size).toBe(p.length);
    expect(p.length).toBe(12);
    expect(choosePages(urls, 4).length).toBe(4);
  });
  it("checks a home page against its copy in the bundles", () => {
    const page = (t: string, c = "https://realhunt.co/deal/a") => `<title>${t}</title><link rel="canonical" href="${c}" />`;
    expect(packProblems("/deal/a", { status: 200, text: page("House in A for €1") }, { status: 200, text: page("House in A for €1") })).toEqual([]);
    expect(packProblems("/deal/a", { status: 200, text: page("House in A for €1") }, { status: 404, text: "" })[0]).toMatch(/not in the bundles/);
    expect(packProblems("/deal/a", { status: 200, text: page("House in A for €1", "https://realhunt.co/") }, { status: 200, text: page("House in A for €1") })[0]).toMatch(/canonical/);
    expect(packProblems("/deal/a", { status: 200, text: page("House in A for €1") }, { status: 200, text: page("Old title") })[0]).toMatch(/bundle says/);
    expect(packProblems("/deal/a", { status: 500, text: "" }, { status: 200, text: "" })).toEqual(["/deal/a: status 500"]);
  });
  it("reports pages heavier than their limit", () => {
    expect(weightProblems("home", "/", { kb: 900, requests: 40 }, { kb: 2000, requests: 75 })).toEqual([]);
    expect(weightProblems("home", "/", { kb: 2100, requests: 80 }, { kb: 2000, requests: 75 }).length).toBe(2);
    expect(weightProblems("home", "/", { kb: 2100, requests: 80 }, undefined)).toEqual([]);
  });
});
