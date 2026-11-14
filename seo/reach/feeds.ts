// Feeds and special sitemaps (15-nov-2026). The RSS feeds (/feed.xml, /new.xml, /blog/rss.xml) are written by
// seo/prerender.ts and stay as they are for existing subscribers; this adds the other formats readers and
// aggregators ask for, the Spanish feeds, and the sitemaps Google has for news and video:
//   /feed.atom, /feed.json          the newest homes as Atom 1.0 and JSON Feed 1.1
//   /blog/atom.xml, /blog/feed.json the research posts
//   /es/feed.xml, /es/blog/rss.xml  the same in Spanish (homes and posts that have a Spanish page)
//   /sitemap-news.xml               posts of the last two days (Google News format); empty when there are none
//   /sitemap-video.xml              only when a home has a video (none today, so the file is not written)
import fs from "fs";
import path from "path";
import { SITE } from "../assetsKit";
import { added, write, type Row } from "./data";

const x = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (u: string) => (String(u || "").startsWith("http") ? u : SITE + u);
const iso = (s?: string | null) => { const d = new Date(String(s || "")); return isNaN(d.getTime()) ? null : d.toISOString(); };
const eur = (n: number) => "€" + Math.round(n).toLocaleString("en");
const euro = (n: number) => Math.round(n).toLocaleString("es-ES").replace(/^(\d)(\d{3})$/, "$1.$2") + " €";
const imgType = (u: string) => `image/${u.endsWith(".webp") ? "webp" : u.endsWith(".png") ? "png" : "jpeg"}`;

export type Post = { slug: string; title: string; desc: string; date: string; updated?: string; image?: string; tags?: string[]; author?: string };
export type FeedCtx = { root: string; rows: Row[]; posts: Post[]; postsEs: Post[]; today: string; has: (p: string) => boolean };

/** The newest homes, newest first. */
export const newest = (rows: Row[], n = 50) => rows.filter((r) => r.slug && iso(r.publish_at || r.approved_at)).sort((a, b) => String(b.publish_at || b.approved_at).localeCompare(String(a.publish_at || a.approved_at))).slice(0, n);

const homeText = (r: Row) => `${r.location_name || r.country}. ${r.sqm ? r.sqm + " m². " : ""}${r.bedrooms ? r.bedrooms + " bedrooms. " : ""}RealHunt score ${r.nota ?? "n/a"}. ${r.why_great || ""}`.trim();
const homeTextEs = (r: Row) => `${r.location_name || r.country}. ${r.sqm ? r.sqm + " m². " : ""}${r.bedrooms ? r.bedrooms + " dormitorios. " : ""}Nota RealHunt ${r.nota ?? "s. d."}. ${r.why_great_es || ""}`.trim();

export function atomFeed(o: { title: string; sub: string; self: string; page: string; lang: string; items: { url: string; title: string; text: string; date: string; updated?: string; image?: string; tags?: string[] }[] }): string {
  const up = o.items.map((i) => i.updated || i.date).sort().pop() || new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${o.lang}"><title>${x(o.title)}</title><subtitle>${x(o.sub)}</subtitle><id>${x(o.self)}</id><link rel="self" type="application/atom+xml" href="${x(o.self)}"/><link rel="alternate" type="text/html" href="${x(o.page)}"/><updated>${up}</updated><author><name>RealHunt</name><uri>${SITE}/about</uri></author><rights>Text and figures: CC BY 4.0, with a link. Photos belong to the original listings.</rights>`
    + o.items.map((i) => `<entry><title>${x(i.title)}</title><id>${x(i.url)}</id><link rel="alternate" type="text/html" href="${x(i.url)}"/><published>${i.date}</published><updated>${i.updated || i.date}</updated><summary>${x(i.text)}</summary>${(i.tags || []).map((t) => `<category term="${x(t)}"/>`).join("")}${i.image ? `<link rel="enclosure" type="${imgType(i.image)}" href="${x(i.image)}"/>` : ""}</entry>`).join("")
    + `</feed>\n`;
}

export function jsonFeed(o: { title: string; sub: string; self: string; page: string; lang: string; items: { url: string; title: string; text: string; date: string; updated?: string; image?: string; tags?: string[] }[] }): string {
  return JSON.stringify({ version: "https://jsonfeed.org/version/1.1", title: o.title, description: o.sub, home_page_url: o.page, feed_url: o.self, language: o.lang, icon: `${SITE}/apple-touch-icon.png`, favicon: `${SITE}/favicon-32.png`, authors: [{ name: "RealHunt", url: `${SITE}/about` }],
    items: o.items.map((i) => ({ id: i.url, url: i.url, title: i.title, content_text: i.text, date_published: i.date, ...(i.updated && i.updated !== i.date ? { date_modified: i.updated } : {}), ...(i.image ? { image: i.image } : {}), ...(i.tags?.length ? { tags: i.tags } : {}) })) }) + "\n";
}

const rss = (o: { title: string; sub: string; self: string; page: string; lang: string; items: { url: string; title: string; text: string; date: string; image?: string; tags?: string[] }[] }) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${x(o.title)}</title><link>${x(o.page)}</link><atom:link href="${x(o.self)}" rel="self" type="application/rss+xml"/><description>${x(o.sub)}</description><language>${o.lang}</language>`
  + o.items.map((i) => `<item><title>${x(i.title)}</title><link>${x(i.url)}</link><guid isPermaLink="true">${x(i.url)}</guid><pubDate>${new Date(i.date).toUTCString()}</pubDate><description>${x(i.text)}</description>${(i.tags || []).map((t) => `<category>${x(t)}</category>`).join("")}${i.image ? `<enclosure url="${x(i.image)}" type="${imgType(i.image)}" length="0"/>` : ""}</item>`).join("")
  + `</channel></rss>\n`;

/** Posts published or updated in the last `days` days (Google News only reads the last two). */
export const recentPosts = (posts: Post[], today: string, days = 2) => { const from = new Date(new Date(today).getTime() - days * 864e5).toISOString().slice(0, 10); return posts.filter((p) => /^[a-z0-9-]+$/.test(p.slug) && String(p.date).slice(0, 10) >= from && String(p.date).slice(0, 10) <= today); };

export function newsSitemap(items: { url: string; title: string; date: string; lang: string }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`
    + items.map((i) => `  <url><loc>${x(i.url)}</loc><news:news><news:publication><news:name>RealHunt</news:name><news:language>${i.lang}</news:language></news:publication><news:publication_date>${x(i.date)}</news:publication_date><news:title>${x(i.title)}</news:title></news:news></url>\n`).join("")
    + `</urlset>\n`;
}

/** Homes that really have a video. The page must show it; there is no entry without a video address. */
export const withVideo = (rows: Row[]) => rows.filter((r) => r.slug && /^https:\/\//.test(String(r.video_url || "")));
export const videoLd = (r: Row) => ({ "@context": "https://schema.org", "@type": "VideoObject", name: String(r.title || "").trim(), description: String(r.why_great || r.title || "").trim(), contentUrl: String(r.video_url),
  thumbnailUrl: r.image_urls?.[0] ? [abs(String(r.image_urls[0]))] : undefined, uploadDate: iso(r.publish_at || r.approved_at) || undefined });
export function videoSitemap(rows: Row[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`
    + withVideo(rows).filter((r) => r.image_urls?.[0]).map((r) => `  <url><loc>${SITE}/deal/${x(r.slug)}</loc><video:video><video:thumbnail_loc>${x(abs(String(r.image_urls![0])))}</video:thumbnail_loc><video:title>${x(String(r.title || "").trim().slice(0, 100))}</video:title><video:description>${x(String(r.why_great || r.title || "").trim().slice(0, 2000))}</video:description><video:content_loc>${x(r.video_url)}</video:content_loc>${iso(r.publish_at || r.approved_at) ? `<video:publication_date>${iso(r.publish_at || r.approved_at)}</video:publication_date>` : ""}</video:video></url>\n`).join("")
    + `</urlset>\n`;
}

/** Writes the feeds. Returns the list of files written (relative to dist). */
export function writeFeeds(c: FeedCtx): string[] {
  const done: string[] = [];
  const put = (rel: string, text: string) => { write(c.root, rel, text); done.push(rel); };
  const homes = newest(c.rows, 50);
  const img = (r: Row) => (r.image_urls?.[0] ? abs(String(r.image_urls[0])) : undefined);
  const en = { title: "RealHunt: new homes", sub: "The newest homes on RealHunt, each checked by a person and scored from 70 to 98.", page: `${SITE}/new`, lang: "en",
    items: homes.map((r) => ({ url: `${SITE}/deal/${r.slug}`, title: `${eur(r.price_eur)} · ${String(r.title || "").trim()}`, text: homeText(r), date: iso(r.publish_at || r.approved_at)!, image: img(r), tags: r.country ? [r.country] : [] })) };
  put("feed.atom", atomFeed({ ...en, self: `${SITE}/feed.atom` }));
  put("feed.json", jsonFeed({ ...en, self: `${SITE}/feed.json` }));

  const posts = c.posts.filter((p) => /^[a-z0-9-]+$/.test(p.slug) && iso(p.date)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
  const blog = { title: "RealHunt Research", sub: "Data and plain-English guides on cheap homes around the world, from the homes on RealHunt.", page: `${SITE}/blog`, lang: "en",
    items: posts.map((p) => ({ url: `${SITE}/blog/${p.slug}`, title: p.title, text: p.desc, date: iso(p.date)!, updated: iso(p.updated) || undefined, image: p.image ? abs(p.image) : undefined, tags: p.tags })) };
  put("blog/atom.xml", atomFeed({ ...blog, self: `${SITE}/blog/atom.xml` }));
  put("blog/feed.json", jsonFeed({ ...blog, self: `${SITE}/blog/feed.json` }));

  // Spanish: only homes and posts whose Spanish page exists
  const homesEs = homes.filter((r) => r.title_es && c.has(`/es/deal/${r.slug}`));
  if (homesEs.length) put("es/feed.xml", rss({ title: "RealHunt: casas nuevas", sub: "Las casas más nuevas de RealHunt, revisadas una a una por una persona y con nota de 70 a 98.", page: `${SITE}/es/new`, self: `${SITE}/es/feed.xml`, lang: "es",
    items: homesEs.map((r) => ({ url: `${SITE}/es/deal/${r.slug}`, title: `${euro(r.price_eur)} · ${String(r.title_es).trim()}`, text: homeTextEs(r), date: iso(r.publish_at || r.approved_at)!, image: img(r), tags: [] })) }));
  const postsEs = c.postsEs.filter((p) => /^[a-z0-9-]+$/.test(p.slug) && iso(p.date) && c.has(`/es/blog/${p.slug}`)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
  if (postsEs.length) put("es/blog/rss.xml", rss({ title: "RealHunt Research en español", sub: "Datos y guías claras sobre casas baratas en el mundo, a partir de las casas de RealHunt.", page: `${SITE}/es/blog`, self: `${SITE}/es/blog/rss.xml`, lang: "es",
    items: postsEs.map((p) => ({ url: `${SITE}/es/blog/${p.slug}`, title: p.title, text: p.desc, date: iso(p.date)!, image: p.image ? abs(p.image) : undefined, tags: [] })) }));
  return done;
}

/** After the index decisions: the news sitemap (always, even empty) and the video sitemap (only with videos). */
export function writeSpecialSitemaps(root: string, c: { rows: Row[]; posts: Post[]; postsEs: Post[]; today: string; indexable: (url: string) => boolean }): { news: number; video: number } {
  const news = [
    ...recentPosts(c.posts, c.today).map((p) => ({ url: `${SITE}/blog/${p.slug}`, title: p.title, date: String(p.date).slice(0, 10), lang: "en" })),
    ...recentPosts(c.postsEs, c.today).map((p) => ({ url: `${SITE}/es/blog/${p.slug}`, title: p.title, date: String(p.date).slice(0, 10), lang: "es" })),
  ].filter((i) => c.indexable(i.url));
  fs.writeFileSync(path.join(root, "sitemap-news.xml"), newsSitemap(news));
  const vids = withVideo(c.rows).filter((r) => c.indexable(`${SITE}/deal/${r.slug}`));
  if (vids.length) fs.writeFileSync(path.join(root, "sitemap-video.xml"), videoSitemap(vids));
  return { news: news.length, video: vids.length };
}

export { added };
