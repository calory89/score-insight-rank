// The clean-text version of a home page (20-nov-2026, ideas 3 and 4 of the list of 100). Made from the finished HTML
// of the page (the same words, figures and links), so it can never say something the page does not. seo/pack.ts writes
// it into the same bundle files as the HTML under "/deal/<slug>.md" (and "/es/deal/<slug>.md"); the worker serves those
// keys as text/markdown, and each page points at it with <link rel="alternate" type="text/markdown">.
const SITE = "https://realhunt.co";

const unesc = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const abs = (u: string) => (/^https?:\/\//.test(u) ? u : u.startsWith("/") ? SITE + u : u);
const yaml = (s: string) => JSON.stringify(s);

/** Inline HTML to Markdown: links, bold, everything else as plain text. */
function inline(h: string): string {
  return unesc(h
    .replace(/<a\b[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_m, u: string, t: string) => { const x = t.replace(/<[^>]+>/g, "").trim(); return x ? `[${x}](${abs(unesc(u))})` : ""; })
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/g, (_m, _t, x: string) => `**${x.replace(/<[^>]+>/g, "").trim()}**`)
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ").trim();
}

/** Block HTML (headings, paragraphs, lists) to Markdown. */
function blocks(h: string): string {
  const out: string[] = [];
  const re = /<(h[1-4]|p|li|nav)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(h))) {
    const t = inline(m[2]); if (!t) continue;
    const tag = m[1];
    if (tag === "nav") out.push(t.replace(/\s*›\s*/g, " › "));
    else if (tag[0] === "h") out.push(`${"#".repeat(Math.max(2, Number(tag[1])))} ${t}`);
    else if (tag === "li") out.push(`- ${t}`);
    else out.push(t);
  }
  // list items stay together, everything else gets a blank line around it
  return out.reduce((acc, line, i) => acc + (i === 0 ? "" : line.startsWith("- ") && out[i - 1].startsWith("- ") ? "\n" : "\n\n") + line, "");
}

/** The Markdown of a finished home page. `key` is its public path ("/deal/x" or "/es/deal/x"). */
export function dealMarkdown(html: string, key: string): string {
  const es = key.startsWith("/es/");
  const meta = (re: RegExp) => unesc(re.exec(html)?.[1] || "");
  const title = meta(/<title>([^<]*)<\/title>/);
  const desc = meta(/<meta name="description" content="([^"]*)"/);
  const canon = meta(/<link rel="canonical" href="([^"]*)"/) || SITE + key;
  // the first h1 is the shell's (seo/dealShell.ts): the title of the home in the language of the page
  const h1 = inline(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] || "") || title;
  const price = inline(/<div class="rh-sh-price">([\s\S]*?)<\/div>/.exec(html)?.[1] || "");
  const photo = /<img src="([^"]+)" alt="[^"]*" fetchpriority="high"/.exec(html)?.[1] || "";
  const alt = unesc(/<img src="[^"]+" alt="([^"]*)" fetchpriority="high"/.exec(html)?.[1] || "");
  const main = /<main class="rh-static"[^>]*>([\s\S]*?)<\/main>/.exec(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ""))?.[1] || "";
  const other = /<link rel="alternate" hreflang="(en|es)" href="([^"]+)"/g;
  const alts = [...html.matchAll(other)].filter((x) => x[2] !== canon).map((x) => [x[1], x[2]]);
  const head = ["---", `title: ${yaml(title)}`, `url: ${yaml(canon)}`, `language: ${es ? "es" : "en"}`, ...(desc ? [`description: ${yaml(desc)}`] : []), ...alts.map(([l, u]) => `${l === "es" ? "spanish" : "english"}: ${yaml(u)}`), `license: ${yaml(es ? "Textos y cifras: CC BY 4.0, con un enlace a la página. Las fotos son de los anuncios originales." : "Text and figures: CC BY 4.0, with a link to the page. Photos belong to the original listings.")}`, "---", ""].join("\n");
  const body = [`# ${h1}`, price ? `**${price}**` : "", photo ? `![${alt.replace(/[[\]]/g, "")}](${photo})` : "", blocks(main)].filter(Boolean).join("\n\n");
  const foot = es
    ? `---\n\nFuente: RealHunt, ${canon}. RealHunt no es una inmobiliaria: revisa y puntúa casas y enlaza al anuncio original.`
    : `---\n\nSource: RealHunt, ${canon}. RealHunt is not an estate agent: it checks and scores homes and links to the original listing.`;
  return head + body + "\n\n" + foot + "\n";
}
