// The browser side of the calculators: reads the form, redraws the result with the same function that printed it in
// the prerendered page (src/tools/defs.ts), keeps the state in the address so a result can be sent as a link, and
// makes the share image. No framework: it enhances HTML that is already on the page, inside the app
// (src/tools/ToolsPage.tsx) and inside an iframe on another site (src/tools/embedEntry.ts).
import { TOOLS, fmt, readState, writeQuery, type Card, type State, type ToolData } from "./defs";

const SITE = "https://realhunt.co";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function mount(sec: HTMLElement, o: { embed?: boolean } = {}) {
  if (sec.dataset.mounted) return;
  const tool = TOOLS[sec.dataset.tool || ""];
  const form = sec.querySelector<HTMLFormElement>("form[data-tool-form]"), out = sec.querySelector<HTMLElement>("[data-tool-out]");
  if (!tool || !form || !out) return;
  sec.dataset.mounted = "1";
  const k = fmt(sec.dataset.lang === "es" ? "es" : "en");
  let data: ToolData = {};
  try { data = JSON.parse(sec.querySelector("script[data-tool-data]")?.textContent || "{}"); } catch { /* the form still works with what it has */ }
  if (sec.dataset.now) data = { ...data, today: today() };
  let page: State = {};
  try { page = JSON.parse(sec.dataset.base || "{}"); } catch { /* no page defaults */ }
  const base: State = { ...tool.defaults(data), ...page };
  const navBase = o.embed ? "" : sec.dataset.navBase || "";
  const names = tool.fields(k, data).map((f) => f.n);
  let state = readState(tool, data, k, location.search, page);
  let card: Card | null = null;

  const ctl = (n: string) => form.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement | null;
  const fill = () => { for (const n of names) { const c = ctl(n); if (!c) continue; if (c instanceof HTMLInputElement && c.type === "checkbox") c.checked = state[n] === "1"; else if (c.value !== (state[n] ?? "")) c.value = state[n] ?? ""; } };
  const read = () => { for (const n of names) { const c = ctl(n); if (!c) continue; state[n] = c instanceof HTMLInputElement && c.type === "checkbox" ? (c.checked ? "1" : "0") : c.value; } };
  const pathC = (sec.dataset.url || "").includes("{c}"); // the country is part of the page's address, not of the query
  const query = () => writeQuery(state, base, pathC ? ["c"] : []);
  /** The address of this result on realhunt.co (the canonical page plus the state). */
  const shareUrl = () => (o.embed || !/^https?:/.test(location.origin) ? (sec.dataset.url || SITE).replace(/\{c\}/g, state.c || "") : location.origin + location.pathname) + query();
  const draw = () => {
    const r = tool.render(state, data, k);
    out.innerHTML = r.html; card = r.card;
    if (o.embed) out.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((a) => { a.href = SITE + (k.es ? "/es" : "") + a.getAttribute("href"); a.target = "_blank"; a.rel = "noopener"; });
    const emb = sec.querySelector<HTMLTextAreaElement>("[data-tool-embed]");
    if (emb?.dataset.tpl) emb.value = emb.dataset.tpl.replace(/\{q\}/g, writeQuery(state, tool.defaults(data)).replace(/&/g, "&amp;"));
    const full = (o.embed ? document : sec).querySelector<HTMLAnchorElement>("[data-tool-full]");
    if (full) full.href = shareUrl();
  };
  const sync = () => { if (!o.embed) try { history.replaceState(history.state, "", location.pathname + query() + location.hash); } catch { /* a sandboxed frame: the link button still carries the state */ } };

  fill(); draw();
  form.addEventListener("submit", (e) => e.preventDefault());
  const onChange = (e: Event) => {
    const el = e.target as HTMLElement;
    read();
    // the country is part of the address of the page (/buying-costs/italy): go there, carrying the rest of the state
    if (navBase && e.type === "change" && el instanceof HTMLSelectElement && el.hasAttribute("data-nav") && state.c) {
      const pre = /^\/es(\/|$)/.test(location.pathname) ? "/es" : "";
      history.pushState(null, "", pre + navBase + state.c + query());
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    draw(); sync();
  };
  form.addEventListener("input", onChange);
  form.addEventListener("change", onChange);

  const flash = (b: HTMLElement, text: string) => { const old = b.dataset.label || b.textContent || ""; b.dataset.label = old; b.textContent = text; b.classList.add("is-done"); setTimeout(() => { b.textContent = old; b.classList.remove("is-done"); }, 1800); };
  sec.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-tool-copy],[data-tool-img],[data-tool-share]");
    if (!b || !sec.contains(b)) return;
    e.preventDefault();
    const done = b.dataset.done || "OK";
    if (b.hasAttribute("data-tool-copy")) { copyText(shareUrl()).then(() => flash(b, done)); return; }
    if (!card) return;
    const meta = { url: shareUrl(), note: sec.dataset.note || "", date: k.date(today()), file: `realhunt-${tool.id}.png` };
    if (b.hasAttribute("data-tool-img")) { cardBlob(card, meta).then((blob) => { if (blob) { download(blob, meta.file); flash(b, done); } }); return; }
    cardBlob(card, meta).then((blob) => {
      const file = blob ? new File([blob], meta.file, { type: "image/png" }) : null;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      const payload: ShareData = { title: card!.title, text: `${card!.title}: ${card!.big[1]}`, url: meta.url };
      if (file && nav.canShare?.({ files: [file] })) payload.files = [file];
      if (nav.share) nav.share(payload).catch(() => { /* closed by the person */ });
      else copyText(meta.url).then(() => flash(b, done));
    });
  });
  const sh = sec.querySelector<HTMLElement>("[data-tool-share]");
  if (sh && !(navigator as Navigator).share) sh.hidden = true;
}

function copyText(text: string): Promise<void> {
  const legacy = () => { const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch { /* nothing else to try */ } document.body.removeChild(ta); };
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(legacy);
  legacy(); return Promise.resolve();
}
function download(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** The result as a 1200 x 630 image (the size link previews and WhatsApp use), drawn in the browser: nothing is
 * sent to a server. White card, the figures, the brand and the address of the result. */
export function drawCard(card: Card, meta: { url: string; note: string; date: string }): HTMLCanvasElement {
  const W = 1200, H = 630, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const font = (w: number, px: number) => `${w} ${px}px Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  const wrap = (text: string, max: number, lines: number): string[] => {
    const out: string[] = []; let cur = "";
    for (const w of text.split(/\s+/)) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width <= max || !cur) cur = t; else { out.push(cur); cur = w; } }
    if (cur) out.push(cur);
    if (out.length > lines) { out.length = lines; let last = out[lines - 1]; while (last && g.measureText(last + "…").width > max) last = last.slice(0, -1); out[lines - 1] = last.trimEnd() + "…"; }
    return out;
  };
  const fit = (text: string, w: number, px: number, max: number) => { let s = px; g.font = font(w, s); while (s > 22 && g.measureText(text).width > max) { s -= 2; g.font = font(w, s); } return s; };
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#D4420C"; g.fillRect(0, 0, W, 14);
  g.textBaseline = "alphabetic";
  g.fillStyle = "#111214"; g.font = font(800, 34); g.fillText("RealHunt", 64, 86);
  g.fillStyle = "#62666E"; g.font = font(500, 24); g.textAlign = "right"; g.fillText(meta.date, W - 64, 86); g.textAlign = "left";
  g.fillStyle = "#111214"; g.font = font(700, 44);
  let y = 160;
  for (const l of wrap(card.title, W - 128, 2)) { g.fillText(l, 64, y); y += 54; }
  y += 18;
  g.fillStyle = "#62666E"; g.font = font(500, 28); g.fillText(wrap(card.big[0], W - 128, 1)[0] || "", 64, y); y += 74;
  g.fillStyle = "#D4420C"; const s = fit(card.big[1], 800, 72, W - 128); g.fillText(card.big[1], 64, y); y += Math.max(40, s * 0.55);
  g.strokeStyle = "#E4E5E8"; g.lineWidth = 2;
  for (const [label, value] of card.lines.slice(0, 4)) {
    if (y > H - 130) break;
    g.beginPath(); g.moveTo(64, y); g.lineTo(W - 64, y); g.stroke(); y += 44;
    g.font = font(700, 28); const vw = Math.min(g.measureText(value).width, 560);
    g.fillStyle = "#111214"; g.textAlign = "right"; g.fillText(wrap(value, 560, 1)[0] || "", W - 64, y); g.textAlign = "left";
    g.fillStyle = "#3D4047"; g.font = font(500, 28); g.fillText(wrap(label, W - 128 - vw - 32, 1)[0] || "", 64, y); y += 16;
  }
  g.fillStyle = "#F4F5F6"; g.fillRect(0, H - 86, W, 86);
  g.fillStyle = "#3D4047"; g.font = font(500, 22);
  g.fillText(wrap(meta.note, W - 128, 1)[0] || "", 64, H - 50);
  g.fillStyle = "#111214"; g.font = font(600, 22);
  g.fillText(wrap(meta.url.replace(/^https?:\/\//, ""), W - 128, 1)[0] || "", 64, H - 20);
  return c;
}
export function cardBlob(card: Card, meta: { url: string; note: string; date: string }): Promise<Blob | null> {
  try { const c = drawCard(card, meta); return new Promise((res) => c.toBlob((b) => res(b), "image/png")); } catch { return Promise.resolve(null); }
}
