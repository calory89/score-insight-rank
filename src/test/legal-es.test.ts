// Spanish buying rules and legal texts (8-nov-2026): every English text has a Spanish one, with the same numbers
// and no em dash, and the sentences built in code come out in Spanish.
import { describe, expect, it } from "vitest";
import RULES from "@/data/buyrules.json";
import RULES_ES from "@/data/buyrules-es.json";
import CB_JSON from "@/data/canbuy.json";
import CB_ES from "@/data/canbuy-es.json";
import DEST from "@/data/destinations.json";
import DEST_ES from "@/data/destinations-es.json";
import GUIDES from "@/data/guides.json";
import GUIDES_ES from "@/data/guides-es.json";
import { agentEmail, buyRule, monthEs, questionUi, questions, type RulesEs } from "@/community/checkLogic";
import {
  type CanBuyData, canBuyFaq, canBuyMeta, costCountries, costLines, fill, fmtMoney, localizeCanBuy, localizeRows, residencyFor, ruleFor, theEs,
} from "@/community/seo2data";

const R = RULES as Record<string, any>;
const RE = RULES_ES as Record<string, any>;
const CB = CB_JSON as unknown as CanBuyData;
const CBE = CB_ES as any;
const D = DEST as Record<string, any>;
const DE = DEST_ES as Record<string, any>;
const G = GUIDES as Record<string, any>;
const GE = GUIDES_ES as Record<string, any>;
const LEGAL_FIELDS = ["purchase_costs_breakdown", "annual_property_tax", "rental_income_tax"] as const;

/** Every [key, English, Spanish] text pair across the four data files. */
function pairs(): [string, string, string][] {
  const out: [string, string, string][] = [];
  for (const [k, c] of Object.entries(R)) {
    if (k === "_meta") continue;
    out.push([`buyrules.${k}.name`, c.name, RE[k]?.name]);
    for (const g of ["eu", "uk", "na", "other"]) {
      out.push([`buyrules.${k}.${g}.note`, c[g].note, RE[k]?.[g]?.note]);
      if (c[g].badge) out.push([`buyrules.${k}.${g}.badge`, c[g].badge, RE[k]?.[g]?.badge]);
    }
  }
  for (const [k, n] of Object.entries(CB.nationalities)) {
    for (const f of ["label", "noun", "plural"] as const) out.push([`canbuy.nat.${k}.${f}`, n[f], CBE.nationalities[k]?.[f]]);
    n.notes.forEach((x, i) => out.push([`canbuy.nat.${k}.notes.${i}`, x, CBE.nationalities[k]?.notes?.[i]]));
  }
  for (const [k, c] of Object.entries(CB.countries)) for (const [g, r] of Object.entries(c)) {
    const e = CBE.countries[k]?.[g];
    out.push([`canbuy.${k}.${g}`, typeof r === "string" ? r : r!.a, typeof e === "string" ? e : e?.a]);
  }
  for (const [k, v] of Object.entries(D)) {
    if (k === "_meta") continue;
    for (const f of LEGAL_FIELDS) if (v[f]) out.push([`destinations.${k}.${f}`, v[f], DE[k]?.[f]]);
  }
  for (const [k, v] of Object.entries(G)) {
    out.push([`guides.${k}.name`, v.name, GE[k]?.name]);
    if (v.yearly) out.push([`guides.${k}.yearly`, v.yearly, GE[k]?.yearly]);
    (v.steps as [string, string][]).forEach(([h], i) => out.push([`guides.${k}.steps.${i}`, h, GE[k]?.steps?.[i]]));
  }
  return out;
}

// Numbers as values: English "€1,850" / "0.6%" / "€300k" and Spanish "1.850 €" / "0,6%" / "300.000 €" give the same set.
const numsEn = (s: string) => new Set((s.replace(/(\d+)k\b/g, "$1000").replace(/\bm2\b/g, "m²").replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+(?:\.\d+)?/g) || []).map(Number));
const numsEs = (s: string) => new Set((s.replace(/(\d)\.(?=\d{3}\b)/g, "$1").replace(/(\d),(\d)/g, "$1.$2").match(/\d+(?:\.\d+)?/g) || []).map(Number));
// Written differently on purpose: "1 billion VND" is "1.000 millones de VND"; "per m2" is "por m²".
const NUM_EXCEPTIONS = new Set(["destinations.vietnam.rental_income_tax", "destinations.northern-cyprus.annual_property_tax"]);

describe("Spanish buying rules and legal texts", () => {
  const all = pairs();
  it("has a Spanish text for every English one", () => {
    const missing = all.filter(([, en, es]) => en && !(typeof es === "string" && es.trim().length > 0)).map(([k]) => k);
    expect(missing).toEqual([]);
    expect(all.length).toBeGreaterThan(400);
  });
  it("has no em dash in any Spanish text", () => {
    for (const f of [RULES_ES, CB_ES, DEST_ES, GUIDES_ES]) expect(JSON.stringify(f)).not.toContain("—");
  });
  it("keeps the same amounts and percentages", () => {
    const off = all.filter(([k, en, es]) => !NUM_EXCEPTIONS.has(k) && !k.endsWith(".name") && [...numsEn(en)].sort().join() !== [...numsEs(es)].sort().join()).map(([k, en, es]) => `${k}: ${en} | ${es}`);
    expect(off).toEqual([]);
  });
  it("keeps the {plural} placeholder where the English has it", () => {
    for (const [k, en, es] of all) if (k.startsWith("canbuy.")) expect(`${k}:${es.includes("{plural}")}`).toBe(`${k}:${en.includes("{plural}")}`);
  });
  it("gives every nationality a Spanish adjective", () => {
    for (const k of Object.keys(CB.nationalities)) {
      expect(CBE.nationalities[k].adj).toMatch(/^[a-záéíóúñ]+$/);
      expect(CBE.nationalities[k].adj_pl).toMatch(/^[a-záéíóúñ]+$/);
      expect(CBE.nationalities[k].plural).toMatch(/^los /);
    }
  });
  it("uses the Spanish legal terms", () => {
    const es = JSON.stringify([CB_ES, DEST_ES, GUIDES_ES]);
    for (const w of ["NIE", "notario", "escritura", "Impuesto sobre Transmisiones Patrimoniales", "fideicomiso", "permiso"]) expect(es).toContain(w);
  });
});

describe("Spanish pages built in code", () => {
  const cbEs = localizeCanBuy(CB, CB_ES as any);
  const destEs = localizeRows(D, DE);
  const guidesEs = localizeRows(G, GE);
  it("fills {plural} with a capital at the start of a sentence only", () => {
    const n = cbEs.nationalities.american;
    expect(fill("Sí. {plural} compran.", n)).toBe("Sí. Los estadounidenses compran.");
    expect(fill("No afecta a {plural}.", n)).toBe("No afecta a los estadounidenses.");
    expect(fill("{plural} compran.", n)).toBe("Los estadounidenses compran.");
    expect(fill("Yes. {plural} buy.", CB.nationalities.american)).toBe("Yes. Americans buy.");
  });
  it("answers British in Spain in Spanish", () => {
    const m = canBuyMeta(cbEs, "british", "spain", guidesEs.spain.name, "es");
    expect(m.h1).toBe("¿Puede un británico comprar una vivienda en España?");
    expect(m.title).toContain("Normas para compradores británicos (noviembre de 2026)");
    expect(m.desc).toMatch(/^Sí, de momento\. Los británicos compran en España/);
    const faq = canBuyFaq(cbEs, "british", "spain", { dest: destEs.spain, guide: guidesEs.spain, name: guidesEs.spain.name, homes: [{ price_eur: 52000 }, { price_eur: 80000 }] }, "es");
    expect(faq[1][0]).toBe("¿Cuánto cuestan los gastos de compra en España?");
    expect(faq[1][1]).toContain("Alrededor de un 7,5-14% además del precio, es decir, 11.250 € a 21.000 € en una vivienda de 150.000 €");
    expect(faq[1][1]).toContain("Impuesto sobre Transmisiones Patrimoniales");
    expect(faq.at(-1)![1]).toContain("Las 2 viviendas en España en RealHunt empiezan en 52.000 €");
    const res = residencyFor(cbEs, "british", "spain", "España", "es");
    expect(res[1]).toBe("España está en el espacio Schengen: con pasaporte británico normalmente puedes estar hasta 90 días de cada 180 en toda la zona sin visado.");
    for (const [q, a] of faq) { expect(q + a).not.toMatch(/—|\bthe\b|\bYes\b/); }
  });
  it("answers Americans in Mexico and the Netherlands with the right article", () => {
    expect(ruleFor(cbEs, "american", "mexico")!.a).toContain("fideicomiso bancario");
    expect(theEs("Países Bajos")).toBe("los Países Bajos");
    expect(residencyFor(cbEs, "american", "netherlands", "Países Bajos", "es")[1]).toMatch(/^Los Países Bajos están en el espacio Schengen/);
    expect(residencyFor(cbEs, "german", "spain", "España", "es")[0]).toMatch(/^Como ciudadano de la UE tienes derecho a vivir en España/);
  });
  it("writes costs the Spanish way and keeps English as it was", () => {
    expect(costLines(150000, destEs.portugal, "EUR", "es")!.pct).toBe("3% a 12%");
    expect(costLines(150000, destEs.portugal, "EUR", "es")!.fees).toBe("4.500 € a 18.000 €");
    expect(costLines(150000, D.portugal)!.fees).toBe("€4,500 to €18,000");
    expect(fmtMoney(1500, "USD", "es")).toBe("1.500 US$");
    expect(destEs.portugal.purchase_costs_breakdown).toMatch(/^Impuesto de transmisión IMT/);
    expect(costCountries(destEs, guidesEs, "es")).toContain("northern-cyprus");
  });
});

describe("Spanish CHECK layer", () => {
  const boca = { title: "2-bed condo in Boca Raton", location_name: "Boca Raton, Florida", country: "United States", price_eur: 450000, hoa_monthly: 124, hoa_currency: "USD", tax_annual: 9000, category: "city", why_great: "55+ community." };
  it("uses the Spanish rule texts when given", () => {
    const r = buyRule("Denmark", "uk", RULES_ES as unknown as RulesEs)!;
    expect(r.s).toBe("red");
    expect(r.note).toMatch(/^Los no residentes necesitan autorización del Ministerio de Justicia/);
    expect(r.badge).toBe("Solo residentes");
    expect(buyRule("United States", "eu", RULES_ES as unknown as RulesEs)!.name).toBe("Estados Unidos");
    expect(buyRule("Denmark", "uk")!.note).toMatch(/^Non-residents/);
    expect(monthEs("2026-11")).toBe("noviembre de 2026");
  });
  it("writes the questions with amounts per language", () => {
    const ids = questions(boca);
    expect(questionUi("hoa_known", boca, "en")).toBe("What does the $124 monthly community fee include, and has it risen in recent years?");
    expect(questionUi("hoa_known", boca, "es")).toBe("¿Qué incluye la cuota de comunidad de 124 US$ al mes y ha subido en los últimos años?");
    for (const id of ids) expect(questionUi(id, boca, "es")).toMatch(/^¿.+\?$/);
    expect(questionUi("tax", { country: "Denmark" }, "es")).not.toMatch(/IBI|predial/);
    expect(questionUi("tax", { country: "Spain" }, "es")).toContain("IBI");
  });
  it("keeps the agent email in the listing's language, with local number formats", () => {
    expect(agentEmail(boca).body).toContain("$124");
    const es = agentEmail({ title: "Piso con terraza", country: "Spain", price_eur: 90000, hoa_monthly: 80 });
    expect(es.body).toContain("90.000 €");
    expect(es.body).toContain("80 € al mes");
  });
});
