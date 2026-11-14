// Knowledge pages (seo/knowledge): every statement has a source, both languages are complete, the Spanish pages have
// no English left, no two pages are near copies, internal links point at pages that exist and a page nobody has
// reviewed for six months says so.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { GLOSSARIES, TOPICS, QUIZ_OF, writeKnowledge, glossaryPath, topicPath, glossaryOf, linkTerms, type KnowCtx } from "../../seo/knowledge/build";
import { SOURCES } from "../../seo/knowledge/sources";
import { STALE_DAYS, fitDesc, md, plain } from "../../seo/knowledge/render";
import { englishLeft, passes } from "../../seo/es";
import { isKnowledgePath, GLOSSARY_OF } from "../community/knowledgeRoutes";

const read = (f: string) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), f), "utf8"));
const guides = read("src/data/guides.json"), dest = read("src/data/destinations.json"), cb = read("src/data/canbuy.json"), blog: { slug: string }[] = read("src/data/blog.json");
const rows = read("public/data/rh-static.json").rows;

type Rec = { url: string; title: string; desc: string; body: string; ld: object[]; o: Record<string, any> };
function build(today = "2026-11-15"): Rec[] {
  const out: Rec[] = [];
  const ctx: KnowCtx = { root: "/nonexistent", rows, dest, guides, cb, today, image: "https://realhunt.co/og-home.jpg", page: (url, title, desc, _image, body, ld, o) => { out.push({ url, title, desc, body: body || "", ld: ld || [], o: o || {} }); } };
  writeKnowledge(ctx);
  return out;
}
const pages = build();
const en = pages.filter((p) => p.o.lang !== "es"), es = pages.filter((p) => p.o.lang === "es");
const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const allL = () => [
  ...GLOSSARIES.flatMap((g) => [g.name, g.tongue, g.lede, ...g.terms.flatMap((t) => [t.plain, t.def, t.more])]),
  ...TOPICS.flatMap((t) => [t.title, t.h1, t.desc, t.answer, ...t.secs.flatMap((s) => [s.h, ...s.p])]),
];

describe("sources", () => {
  it("every source is an https page with a publisher, a title in both languages and the day it was read", () => {
    for (const [id, s] of Object.entries(SOURCES)) {
      expect(s.url, id).toMatch(/^https:\/\//);
      expect(s.org.length, id).toBeGreaterThan(2);
      expect(s.title.en && s.title.es, id).toBeTruthy();
      expect(s.read, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("every term and every section that states a rule names its sources, and they exist", () => {
    const known = (id: string) => (id.startsWith("data:") ? id === "data:canbuy" || !!dest[id.slice(5)] : !!SOURCES[id]);
    for (const g of GLOSSARIES) for (const t of g.terms) { expect(t.src.length, `${g.slug}#${t.id}`).toBeGreaterThan(0); for (const id of t.src) expect(known(id), `${g.slug}#${t.id}: ${id}`).toBe(true); }
    for (const t of TOPICS) for (const s of t.secs) for (const id of s.src || []) expect(known(id), `${t.slug}: ${id}`).toBe(true);
    // a section with a percentage, an amount or a number of days must carry a source or a block computed from our data
    for (const t of TOPICS) for (const s of t.secs) if (/\d\s?%|[€£$¥]\s?\d|\d+ (calendar )?days|SEK|DKK/.test(s.p.map((x) => x.en).join(" "))) expect(!!s.src?.length || !!s.block, `${t.slug} / ${s.h.en}`).toBe(true);
  });
  it("no source is left unused", () => {
    const used = new Set([...GLOSSARIES.flatMap((g) => g.terms.flatMap((t) => t.src)), ...TOPICS.flatMap((t) => t.secs.flatMap((s) => s.src || []))]);
    for (const id of Object.keys(SOURCES)) expect(used.has(id), id).toBe(true);
  });
  it("every page shows the date, the 'as of' month and that it is not advice", () => {
    for (const p of en.filter((x) => /\/guide\/(glossary|buying|questions)\/[^/]+$/.test(x.url))) {
      expect(p.body, p.url).toContain("General information, not legal or tax advice");
      expect(p.body, p.url).toContain("as of November 2026");
      expect(p.body, p.url).toMatch(/<h2 id="sources">Sources<\/h2>|kn-cite/);
    }
    for (const p of es.filter((x) => /\/guide\/(glossary|buying|questions)\/[^/]+$/.test(x.url))) {
      expect(p.body, p.url).toContain("Información general, no asesoramiento jurídico ni fiscal");
      expect(p.body, p.url).toContain("a noviembre de 2026");
    }
  });
  it("the official pages are cited with their address and the day they were read", () => {
    const p = en.find((x) => x.url.endsWith("/guide/glossary/spain"))!;
    expect(p.body).toContain('href="https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763"');
    expect(p.body).toContain("read on 14 November 2026");
  });
});

describe("texts", () => {
  it("both languages are written, with no em dash", () => {
    for (const l of allL()) { expect(l.en.trim().length).toBeGreaterThan(0); expect(l.es.trim().length, l.en).toBeGreaterThan(0); expect(l.en + l.es).not.toMatch(/—/); }
  });
  it("a definition is one sentence", () => {
    for (const g of GLOSSARIES) for (const t of g.terms) for (const s of [t.def.en, t.def.es]) { expect(s, `${g.slug}#${t.id}`).toMatch(/\.$/); expect(plain(s).replace(/\b(k\.k|U\.S)\./g, "").split(/[.!?]\s+\p{Lu}/u).length, `${g.slug}#${t.id}: ${s}`).toBe(1); }
  });
  it("ids are unique and usable as anchors and paths", () => {
    for (const g of GLOSSARIES) { expect(g.slug).toMatch(/^[a-z-]+$/); const ids = g.terms.map((t) => t.id); expect(new Set(ids).size, g.slug).toBe(ids.length); for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/); }
    const slugs = TOPICS.map(topicPath); expect(new Set(slugs).size).toBe(slugs.length);
    for (const t of TOPICS) expect(t.slug).toMatch(/^[a-z0-9-]+$/);
  });
  it("titles and descriptions fit the limits of the crawl pass", () => {
    for (const p of pages) { expect(p.title.length, p.title).toBeLessThanOrEqual(70); expect(p.desc.length, `${p.url}: ${p.desc}`).toBeLessThanOrEqual(155); expect(p.desc.length, `${p.url}: ${p.desc}`).toBeGreaterThanOrEqual(110); }
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.desc)).size).toBe(pages.length);
  });
  it("the glossary of a country belongs to countries we have a guide for", () => {
    for (const g of GLOSSARIES) for (const cc of g.cc) { expect(guides[cc], `${g.slug}: ${cc}`).toBeTruthy(); expect(glossaryOf(cc)).toBe(g); }
    for (const t of TOPICS) for (const cc of t.cc || []) expect(guides[cc], `${t.slug}: ${cc}`).toBeTruthy();
  });
});

describe("pages", () => {
  it("stays inside the page budget and writes every page in both languages", () => {
    expect(pages.length).toBeLessThanOrEqual(500);
    expect(en.length).toBe(es.length);
    expect(en.length).toBe(GLOSSARIES.length + TOPICS.length + 4); // + the three hubs and the quiz
    for (const p of en) { const twin = es.find((x) => x.url === p.url.replace("https://realhunt.co/", "https://realhunt.co/es/")); expect(twin, p.url).toBeTruthy(); if (!p.o.noindex) { expect(p.o.alt).toEqual(twin!.o.alt); expect(twin!.o.group).toBe("es"); } }
  });
  it("every page has one h1 and enough words of its own", () => {
    for (const p of pages) {
      expect((p.body.match(/<h1[\s>]/g) || []).length, p.url).toBe(1);
      if (!p.o.noindex) expect(words(text(p.body)), p.url).toBeGreaterThanOrEqual(250);
    }
  });
  it("only the quiz is noindex", () => {
    expect(pages.filter((p) => p.o.noindex).map((p) => p.url).sort()).toEqual([`https://realhunt.co/es${glossaryPath(QUIZ_OF)}/quiz`, `https://realhunt.co${glossaryPath(QUIZ_OF)}/quiz`]);
  });
  it("the Spanish pages have no English left", () => {
    for (const p of es) {
      const ldText: string[] = [];
      const walk = (x: any, key = "") => { if (typeof x === "string") { if (["name", "headline", "description", "text", "alternateName"].includes(key)) ldText.push(x); } else if (Array.isArray(x)) x.forEach((v) => walk(v, key)); else if (x && typeof x === "object") { if (x["@type"] === "Organization") return; for (const [k2, v] of Object.entries(x)) walk(v, k2); } };
      p.ld.forEach((x) => walk(x));
      const parts = p.body.replace(/<style[\s\S]*?<\/style>/g, "").split(/<[^>]+>/).map((s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"')).filter((s) => /[A-Za-z]/.test(s));
      const cover = englishLeft([p.title, p.desc, ...parts, ...ldText].join("\n"));
      expect(passes(cover), `${p.url}: ${cover.hits.join(", ")}`).toBe(true);
    }
  });
  it("no two pages are near copies of each other", () => {
    const sentences = (p: Rec) => new Set(text(p.body.replace(/<h2 id="sources">[\s\S]*$/, "")).split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length > 40));
    const sets = en.filter((p) => !p.o.noindex && /\/guide\/(glossary|buying|questions)\/[^/]+$/.test(p.url)).map((p) => ({ url: p.url, s: sentences(p) }));
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i].s, b = sets[j].s; let both = 0; for (const x of a) if (b.has(x)) both++;
      expect(both / Math.min(a.size, b.size), `${sets[i].url} vs ${sets[j].url}`).toBeLessThan(0.3);
    }
  });
  it("each 'why is it cheap' page carries its own official figure and our own homes", () => {
    const fig: Record<string, string> = { japan: "9,002 thousand", italy: "9,581,772", france: "2.9 million", bulgaria: "6,519,789", sweden: "1.5%" };
    for (const [cc, f] of Object.entries(fig)) { const p = en.find((x) => x.url.endsWith(`/guide/questions/why-are-houses-so-cheap-in-${cc}`))!; expect(p.body, cc).toContain(f); expect(p.body, cc).toMatch(/Homes checked and listed today: \d+|fewer than three homes/); }
  });
  it("internal links point at pages that exist", () => {
    const mine = new Set(pages.map((p) => p.url.replace("https://realhunt.co/es", "").replace("https://realhunt.co", "")));
    const ok = (href: string) => { const p = href.replace(/[#?].*$/, "");
      if (mine.has(p)) return true;
      let m;
      if ((m = /^\/(guide|costs)\/([a-z-]+)$/.exec(p))) return m[1] === "guide" ? !!guides[m[2]] : !!dest[m[2]];
      if ((m = /^\/buying-costs\/([a-z-]+)$/.exec(p))) return !!dest[m[1]]?.purchase_costs_pct;
      if ((m = /^\/blog\/([a-z0-9-]+)$/.exec(p))) return blog.some((b) => b.slug === m![1]);
      if ((m = /^\/deal\/(.+)$/.exec(p))) return rows.some((r: any) => r.slug === m![1]);
      if ((m = /^\/homes\/([a-z-]+)$/.exec(p))) return rows.filter((r: any) => String(r.country).toLowerCase().replace(/\s+/g, "-") === m![1]).length >= 3;
      if ((m = /^\/can-i-buy\/([a-z]+)-in-([a-z-]+)$/.exec(p))) return !!cb.nationalities[m[1]] && !!cb.countries[m[2]] && !!guides[m[2]];
      return ["/", "/guide", "/costs", "/buying-costs", "/can-i-buy", "/countries", "/method", "/editorial-policy", "/help-buying"].includes(p); };
    for (const p of pages) for (const m of p.body.matchAll(/<a\b[^>]*?\shref="(\/[^"]*)"/g)) expect(ok(m[1]), `${p.url} -> ${m[1]}`).toBe(true);
  });
  it("structured data: a glossary is a set of defined terms, a question page answers its question", () => {
    const g = en.find((x) => x.url.endsWith("/guide/glossary/france"))!;
    const set: any = g.ld.find((x: any) => x["@type"] === "DefinedTermSet");
    expect(set.hasDefinedTerm.length).toBe(GLOSSARIES.find((x) => x.slug === "france")!.terms.length);
    expect(set.hasDefinedTerm[0].url).toContain("/guide/glossary/france#");
    const q = en.find((x) => x.url.endsWith("/guide/questions/what-if-i-change-my-mind"))!;
    const faq: any = q.ld.find((x: any) => x["@type"] === "FAQPage");
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain("10 calendar days");
    expect(JSON.stringify(q.ld)).not.toContain("](/");
  });
  it("an English word on a Spanish page comes after its Spanish name, in brackets", () => {
    const p = es.find((x) => x.url.endsWith("/guide/glossary/mexico-united-states"))!;
    expect(p.body).toContain("Seguro de título (title insurance)");
    expect(p.body).toContain('<i lang="es-MX">fideicomiso</i>');
  });
});

describe("review dates (ideas 320 and 410)", () => {
  it("a page reviewed less than six months ago carries no warning; an older one does, in both languages", () => {
    expect(pages.some((p) => p.body.includes("data-kn-stale"))).toBe(false);
    const d = new Date(Date.parse("2026-11-14") + (STALE_DAYS + 1) * 864e5).toISOString().slice(0, 10);
    const later = build(d);
    const p = later.find((x) => x.url === "https://realhunt.co/guide/glossary/spain")!;
    expect(p.body).toContain("data-kn-stale");
    expect(p.body).toContain("This page was last reviewed on 14 November 2026");
    expect(later.find((x) => x.url === "https://realhunt.co/es/guide/glossary/spain")!.body).toContain("Esta página se revisó por última vez el 14 de noviembre de 2026");
  });
});

describe("helpers", () => {
  it("md turns the two marks into HTML and escapes the rest", () => {
    expect(md("See the [Spain glossary](/guide/glossary/spain) and the *nota simple* <b>")).toBe('See the <a href="/guide/glossary/spain">Spain glossary</a> and the <i>nota simple</i> &lt;b&gt;');
    expect(plain("See the [Spain glossary](/guide/glossary/spain) and the *nota simple*")).toBe("See the Spain glossary and the nota simple");
  });
  it("fitDesc never cuts a word and never passes the limit", () => {
    const s = "One sentence that is fairly long and says something useful about the page. A second sentence that makes the whole thing far too long for a description, so it has to go away entirely.";
    expect(fitDesc(s).length).toBeLessThanOrEqual(155);
    expect(fitDesc(s)).toMatch(/\.$/);
    expect(fitDesc("Short.")).toBe("Short.");
  });
  it("linkTerms links the first mention of each word, outside links and headings", () => {
    const html = '<h2>The arras</h2><p>Sign the arras contract, then the escritura. The arras is 10%.</p><p><a href="/x">nota simple</a> and a nota simple.</p>';
    const r = linkTerms(html, [{ word: "arras", href: "/g#arras" }, { word: "escritura", href: "/g#escritura" }, { word: "nota simple", href: "/g#nota-simple" }]);
    expect(r.linked).toBe(3);
    expect(r.html).toBe('<h2>The arras</h2><p>Sign the <a href="/g#arras">arras</a> contract, then the <a href="/g#escritura">escritura</a>. The arras is 10%.</p><p><a href="/x">nota simple</a> and a <a href="/g#nota-simple">nota simple</a>.</p>');
    expect(linkTerms("<p>Parras and IBIS are not words of the glossary.</p>", [{ word: "arras", href: "/a" }, { word: "IBI", href: "/b" }]).linked).toBe(0);
  });
  it("the app shows these pages as static pages, and leaves the country guides to the app", () => {
    for (const p of ["/guide/glossary", "/guide/glossary/spain", "/guide/glossary/italy/quiz", "/guide/buying", "/guide/buying/first-year-costs", "/guide/questions/do-i-need-a-lawyer"]) expect(isKnowledgePath(p), p).toBe(true);
    for (const p of ["/guide", "/guide/spain", "/guide/glossary-of-spain", "/costs/spain"]) expect(isKnowledgePath(p), p).toBe(false);
    const want: Record<string, string> = {}; for (const g of GLOSSARIES) for (const cc of g.cc) want[cc] = g.slug;
    expect(GLOSSARY_OF).toEqual(want);
    for (const p of en) expect(isKnowledgePath(p.url.replace("https://realhunt.co", "")), p.url).toBe(true);
  });
});
