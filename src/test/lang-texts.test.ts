import { describe, it, expect, beforeAll } from "vitest";

// lang.ts reads the page language once, when it loads: load it as a Spanish page.
let L: typeof import("@/lib/lang");
beforeAll(async () => {
  document.documentElement.setAttribute("data-lang", "es");
  L = await import("@/lib/lang");
});

describe("Spanish texts of homes (no English card on the Spanish site)", () => {
  it("learns each home's own Spanish title, description and why-cheap line", () => {
    expect(L.isEs()).toBe(true);
    L.learnTexts([{ title: "Spacious two-story house in Buffalo Estates, Tampa", title_es: "Amplia casa de dos plantas en Buffalo Estates, Tampa", why_great: "New roof.", why_great_es: "Tejado nuevo.", why_cheap: "1964 home.", why_cheap_es: "Casa de 1964." }]);
    expect(L.tr("Spacious two-story house in Buffalo Estates, Tampa")).toBe("Amplia casa de dos plantas en Buffalo Estates, Tampa");
    expect(L.tr("New roof.")).toBe("Tejado nuevo.");
    expect(L.tr("1964 home.")).toBe("Casa de 1964.");
  });
  it("translates labels built around a title (photo alt, numbered list, title + place)", () => {
    L.learnTexts([{ title: "Fjord-view villa with a big garden", title_es: "Villa con vistas al fiordo y gran jardín" }]);
    expect(L.tr("Fjord-view villa with a big garden, 4")).toBe("Villa con vistas al fiordo y gran jardín, 4");
    expect(L.tr("Fjord-view villa with a big garden, Hurup, Denmark")).toBe("Villa con vistas al fiordo y gran jardín, Hurup, Dinamarca");
    expect(L.tr("3. Fjord-view villa with a big garden")).toBe("3. Villa con vistas al fiordo y gran jardín");
  });
  it("ignores rows without Spanish and leaves unknown text as it is", () => {
    L.learnTexts([{ title: "Only English" }, null, "x"]);
    expect(L.tr("Only English")).toBe("Only English");
  });
});
