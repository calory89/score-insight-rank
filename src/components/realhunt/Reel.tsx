// 30-second vertical video "this is how your listing looks", made in the browser from the listing photos.
// Photos from other sites go through wsrv.nl (an open image proxy that sends CORS headers), so the canvas can be recorded.
import { useRef, useState } from "react";
import { Film, Download, Loader2 } from "lucide-react";

const W = 720, H = 1280, FPS = 30, SECONDS = 30;
const proxied = (src: string) => (src.startsWith("/") ? src : `https://wsrv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ""))}&w=900&h=1600&fit=cover&output=jpg&q=82`);
const load = (src: string) => new Promise<HTMLImageElement | null>((res) => {
  const im = new Image(); im.crossOrigin = "anonymous"; im.decoding = "async";
  const t = setTimeout(() => res(null), 12000);
  im.onload = () => { clearTimeout(t); res(im); }; im.onerror = () => { clearTimeout(t); res(null); };
  im.src = proxied(src);
});
const eur = (n?: number | null) => (n ? "€" + Math.round(n).toLocaleString("en-GB") : "");
function pickMime() {
  const R = (window as any).MediaRecorder;
  if (!R) return "";
  for (const m of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) if (R.isTypeSupported?.(m)) return m;
  return "";
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export default function Reel({ images, title, price, place, company, cta = "Claim it free on RealHunt" }: { images: string[]; title: string; price?: number | null; place?: string; company?: string; cta?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "rec" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [url, setUrl] = useState("");
  const [ext, setExt] = useState("webm");
  const [err, setErr] = useState("");

  const make = async () => {
    const mime = pickMime();
    if (!mime || !canvas.current || !(canvas.current as any).captureStream) { setErr("Your browser cannot record video. Try Chrome, Edge or Safari on a computer."); setState("error"); return; }
    setState("loading"); setErr(""); setPct(0);
    const imgs = (await Promise.all(images.filter(Boolean).slice(0, 6).map(load))).filter(Boolean) as HTMLImageElement[];
    if (imgs.length === 0) { setErr("We could not load the photos for the video."); setState("error"); return; }
    const c = canvas.current; c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    const stream = (c as any).captureStream(FPS) as MediaStream;
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => { const b = new Blob(chunks, { type: mime.split(";")[0] }); setUrl(URL.createObjectURL(b)); setExt(mime.includes("mp4") ? "mp4" : "webm"); setState("done"); };
    const endCard = 4; const slides = SECONDS - endCard; const count = Math.max(imgs.length, 5); const per = slides / count;
    const order = Array.from({ length: count }, (_, i) => imgs[i % imgs.length]);
    setState("rec"); rec.start(500);
    try { (window as any).clarity?.("event", "reel_make"); } catch { /* ignore */ }
    const t0 = performance.now();
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      setPct(Math.min(100, Math.round((t / SECONDS) * 100)));
      ctx.fillStyle = "#111214"; ctx.fillRect(0, 0, W, H);
      if (t < slides) {
        const i = Math.min(order.length - 1, Math.floor(t / per)); const local = (t - i * per) / per;
        const im = order[i]; const z = 1.04 + 0.12 * local; const dir = i % 2 ? -1 : 1;
        const s = Math.max(W / im.width, H / im.height) * z; const iw = im.width * s, ih = im.height * s;
        const x = (W - iw) / 2 + dir * 30 * (local - 0.5), y = (H - ih) / 2 + 20 * (local - 0.5);
        ctx.globalAlpha = local < 0.08 ? local / 0.08 : 1; ctx.drawImage(im, x, y, iw, ih); ctx.globalAlpha = 1;
        const g = ctx.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.78)"); ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, W, H * 0.45);
        const tg = ctx.createLinearGradient(0, 0, 0, 200); tg.addColorStop(0, "rgba(0,0,0,0.55)"); tg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 200);
        ctx.fillStyle = "#fff"; ctx.font = "600 30px Helvetica, Arial, sans-serif"; ctx.fillText("RealHunt", 44, 76);
        ctx.font = "500 24px Helvetica, Arial, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText(("New build" + (place ? " · " + place : "")).slice(0, 48), 44, 116);
        ctx.fillStyle = "#fff"; ctx.font = "700 50px Helvetica, Arial, sans-serif";
        const lines = wrap(ctx, title, W - 88); lines.forEach((l, k) => ctx.fillText(l, 44, H - 250 + k * 58 - (lines.length - 1) * 58));
        if (price) { ctx.font = "700 64px Helvetica, Arial, sans-serif"; ctx.fillStyle = "#FDE68A"; ctx.fillText("from " + eur(price), 44, H - 140); }
        if (company) { ctx.font = "500 26px Helvetica, Arial, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText(("by " + company).slice(0, 44), 44, H - 84); }
      } else {
        ctx.fillStyle = "#111214"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        ctx.font = "700 58px Helvetica, Arial, sans-serif"; wrap(ctx, title, W - 120).forEach((l, k) => ctx.fillText(l, W / 2, 470 + k * 66));
        if (price) { ctx.font = "700 72px Helvetica, Arial, sans-serif"; ctx.fillStyle = "#FDE68A"; ctx.fillText("from " + eur(price), W / 2, 740); }
        ctx.fillStyle = "#fff"; ctx.font = "500 34px Helvetica, Arial, sans-serif"; ctx.fillText("The best homes, ranked by score", W / 2, 860);
        ctx.font = "700 44px Helvetica, Arial, sans-serif"; ctx.fillText("realhunt.co", W / 2, 960);
        ctx.textAlign = "left";
      }
      if (t < SECONDS) requestAnimationFrame(draw); else rec.stop();
    };
    requestAnimationFrame(draw);
  };

  return (
    <div className="rounded-2xl border border-hairline bg-white p-4">
      <p className="font-semibold inline-flex items-center gap-2"><Film size={17} /> Your 30-second video</p>
      <p className="text-[13px] text-ink-muted mt-1">A vertical video of this listing for Instagram, TikTok or WhatsApp, made from your photos. It takes 30 seconds to record; keep this tab open.</p>
      <canvas ref={canvas} className={state === "rec" ? "mt-3 w-full max-w-[220px] rounded-xl bg-ink" : "hidden"} />
      {state === "done" && url && <video src={url} controls playsInline className="mt-3 w-full max-w-[220px] rounded-xl bg-ink" />}
      {state === "rec" && <div className="mt-2 h-2 rounded-full bg-[#ECEDEF] overflow-hidden max-w-[220px]"><div className="h-full bg-ink" style={{ width: pct + "%" }} /></div>}
      {state === "error" && <p className="text-[13px] text-red-700 mt-2">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {(state === "idle" || state === "error") && <button onClick={make} className="rh-btn-primary !py-2 !px-4 !text-[14px] inline-flex items-center gap-2"><Film size={15} /> Make the video</button>}
        {state === "loading" && <span className="inline-flex items-center gap-2 text-[14px]"><Loader2 size={15} className="animate-spin" /> Loading photos…</span>}
        {state === "rec" && <span className="text-[14px]">Recording… {pct}%</span>}
        {state === "done" && <><a href={url} download={`realhunt-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.${ext}`} className="rh-btn-primary !py-2 !px-4 !text-[14px] inline-flex items-center gap-2"><Download size={15} /> Download ({ext})</a><button onClick={() => { setState("idle"); setUrl(""); }} className="text-[13px] underline">Make again</button></>}
      </div>
      {state === "done" && <p className="text-[12px] text-ink-muted mt-2">{cta}</p>}
    </div>
  );
}
