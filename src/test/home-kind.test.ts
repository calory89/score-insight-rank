// Idea 4 of the second list (21 Nov 2026): the short title of a home page never says something different from the
// advert. Checked on every home of the snapshot: the kind of home in the short title is a word the advert title uses
// (or the plain "home" when the title names none), and the bedrooms are the ones in the data.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { homeKind, homeTitle, homeWhat } from "@/community/homeLead";

const rows: any[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/data/rh-static.json"), "utf8")).rows || [];
// the words of an advert title that name each kind
const SAYS: Record<string, RegExp> = {
  studio: /\bstudio\b/i, penthouse: /\bpenthouse\b/i, duplex: /\bduplex\b/i, flat: /\b(flat|apartment|condo)\b/i, loft: /\bloft\b/i,
  townhouse: /\b(town ?house|row ?house|end[ -]terrace)\b/i, villa: /\bvilla\b/i, bungalow: /\bbungalow\b/i, farmhouse: /\b(farm ?house|farm|cortijo|stazzo|homestead)\b/i,
  cottage: /\b(cottage|stuga)\b/i, chalet: /\bchalet\b/i, cabin: /\b(cabin|a-frame)\b/i, house: /\b(house|home|ranch|colonial|victorian|mansion|longère|kominka)\b/i, // ronda 19: house types the advert names
};

describe("short titles say what the advert says (idea 4)", () => {
  it("has homes to check", () => expect(rows.length).toBeGreaterThan(500));
  it("names a kind of home the advert title uses, never one it does not", () => {
    const plain = (t: string) => t.replace(/\b[\w-]+-(style|like|sized)\b/gi, "");
    const wrong = rows.filter((r) => r.title).map((r) => ({ t: String(r.title), k: homeKind(r).en })).filter(({ t, k }) =>
      k === "home" ? Object.values(SAYS).some((re) => re.test(plain(t))) : !SAYS[k] || !SAYS[k].test(plain(t)));
    expect(wrong).toEqual([]);
  });
  it("gives the bedrooms of the data, and none for a studio", () => {
    for (const r of rows) {
      const w = homeWhat(r, "en"), b = Number(r.bedrooms) || 0, k = homeKind(r);
      if (k.noBeds || !b) expect(w).not.toMatch(/bedroom/);
      else expect(w.startsWith(`${b}-bedroom `)).toBe(true);
      expect(homeTitle(r, "en").length).toBeGreaterThan(10);
    }
  });
  it("reads the hard cases right", () => {
    expect(homeKind({ title: "Cottage-style house with a new kitchen near the waterfront" }).en).toBe("house");
    expect(homeKind({ title: "Furnished loft-style studio with a new bathroom" }).en).toBe("studio");
    expect(homeKind({ title: "Top-floor loft with an 82 m² cathedral living room in Lodève" }).en).toBe("loft");
    expect(homeKind({ title: "Fully renovated brick rowhouse with a fenced yard" }).en).toBe("townhouse");
    expect(homeKind({ title: "Renovated two-bedroom end terrace with garage" }).en).toBe("townhouse");
    expect(homeKind({ title: "Bright as-new tiny house with sleeping loft and heat pump" }).en).toBe("house");
    expect(homeKind({ title: "Japanese-style home with an engawa" }).en).toBe("house");
  });
});
