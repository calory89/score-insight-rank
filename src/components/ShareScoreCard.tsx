import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, Download, X, Share as ShareIcon, Check } from "lucide-react";

export type ShareDim = { label: string; value: number; status: "good" | "warn" | "bad" };

export interface ShareScoreCardProps {
  /** Score on a 0–10 scale (we render with one decimal) */
  scoreOutOf10: number;
  /** Letter grade like "A", "B+", or verdict like "Strong" */
  grade?: string;
  title: string;
  location?: string;
  /** Five dimension bars — values on 0–10 */
  dims: ShareDim[];
  /** One-line verdict */
  verdict?: string;
  /** Button visual style */
  variant?: "primary" | "secondary" | "ghost";
  /** Button label override */
  label?: string;
  /** Optional logo image src (otherwise wordmark text) */
  logoSrc?: string;
  /** Brand domain shown bottom-right */
  domain?: string;
}

const STATUS_COLORS: Record<ShareDim["status"], string> = {
  good: "#1E6B4F",
  warn: "#B7791F",
  bad: "#B23A3A",
};

const SIZE = 1080;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function renderCard(props: ShareScoreCardProps): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // Background — warm paper
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle inner card
  const pad = 56;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, pad, pad, SIZE - pad * 2, SIZE - pad * 2, 28);
  ctx.fill();
  ctx.strokeStyle = "#E2E3E6";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top eyebrow
  ctx.fillStyle = "#797E89";
  ctx.font = "600 22px 'Inter', system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("FORENSIC PROPERTY SCORE", pad + 48, pad + 48);
  // gold bar
  ctx.fillStyle = "#D4420C";
  ctx.fillRect(pad + 48, pad + 84, 60, 3);

  // Title (truncate to fit)
  const title = props.title || "Property";
  ctx.fillStyle = "#111214";
  ctx.font = "700 38px 'Georgia', 'Times New Roman', serif";
  const maxTitleW = SIZE - (pad + 48) * 2;
  let displayTitle = title;
  while (ctx.measureText(displayTitle).width > maxTitleW && displayTitle.length > 10) {
    displayTitle = displayTitle.slice(0, -2);
  }
  if (displayTitle !== title) displayTitle = displayTitle.replace(/[\s,.-]*$/, "") + "…";
  ctx.fillText(displayTitle, pad + 48, pad + 110);

  if (props.location) {
    ctx.fillStyle = "#313338";
    ctx.font = "400 22px 'Inter', system-ui, sans-serif";
    ctx.fillText(props.location, pad + 48, pad + 160);
  }

  // Score — huge gold
  const scoreY = 290;
  const scoreStr = props.scoreOutOf10.toFixed(1);
  ctx.fillStyle = "#D4420C";
  ctx.font = "700 280px 'Georgia', 'Times New Roman', serif";
  ctx.textBaseline = "alphabetic";
  const scoreMetrics = ctx.measureText(scoreStr);
  ctx.fillText(scoreStr, pad + 56, scoreY + 240);

  // "/ 10" suffix
  ctx.fillStyle = "#797E89";
  ctx.font = "500 36px 'Inter', system-ui, sans-serif";
  ctx.fillText("/ 10", pad + 56 + scoreMetrics.width + 16, scoreY + 240);

  // Grade chip
  if (props.grade) {
    const gradeText = props.grade.toUpperCase();
    ctx.font = "700 22px 'Inter', system-ui, sans-serif";
    const gw = ctx.measureText(gradeText).width + 32;
    const gx = pad + 56;
    const gy = scoreY + 260;
    ctx.fillStyle = "#111214";
    roundRect(ctx, gx, gy, gw, 42, 999);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(gradeText, gx + 16, gy + 22);
  }

  // Dimension bars
  const barsX = pad + 56;
  const barsW = SIZE - (pad + 56) * 2;
  const barsTopY = 680;
  const rowH = 44;

  ctx.textBaseline = "alphabetic";
  props.dims.slice(0, 5).forEach((d, i) => {
    const y = barsTopY + i * rowH;
    // label
    ctx.fillStyle = "#797E89";
    ctx.font = "600 16px 'Inter', system-ui, sans-serif";
    ctx.fillText(d.label.toUpperCase(), barsX, y);
    // track
    const trackX = barsX + 170;
    const trackY = y - 14;
    const trackW = barsW - 170 - 70;
    ctx.fillStyle = "#E6E7E8";
    roundRect(ctx, trackX, trackY, trackW, 12, 999);
    ctx.fill();
    // fill
    const pct = Math.max(0, Math.min(1, d.value / 10));
    ctx.fillStyle = STATUS_COLORS[d.status];
    roundRect(ctx, trackX, trackY, Math.max(12, trackW * pct), 12, 999);
    ctx.fill();
    // value
    ctx.fillStyle = "#111214";
    ctx.font = "700 20px 'Georgia', serif";
    ctx.textAlign = "right";
    ctx.fillText(d.value.toFixed(1), barsX + barsW, y);
    ctx.textAlign = "left";
  });

  // Verdict
  if (props.verdict) {
    ctx.fillStyle = "#111214";
    ctx.font = "italic 600 26px 'Georgia', serif";
    const maxW = barsW;
    let line = props.verdict;
    while (ctx.measureText(line).width > maxW && line.length > 10) {
      line = line.slice(0, -2);
    }
    if (line !== props.verdict) line = line.replace(/[\s,.-]*$/, "") + "…";
    ctx.fillText(`"${line}"`, barsX, barsTopY + 5 * rowH + 28);
  }

  // Footer — wordmark + domain
  const footY = SIZE - pad - 56;
  ctx.fillStyle = "#111214";
  ctx.font = "700 28px 'Georgia', serif";
  ctx.fillText("RealHunt", pad + 56, footY);
  ctx.fillStyle = "#797E89";
  ctx.font = "500 18px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(props.domain || "realhunt.co", SIZE - pad - 56, footY);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
}

const ShareScoreCard = (props: ShareScoreCardProps) => {
  const { variant = "secondary", label = "Share this score" } = props;
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    renderCard(props)
      .then((url) => setDataUrl(url))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `realhunt-score-${props.scoreOutOf10.toFixed(1)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onNativeShare = async () => {
    if (!dataUrl) return;
    try {
      const file = await dataUrlToFile(dataUrl, "realhunt-score.png");
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "RealHunt score",
          text: `${props.title} — RH Score ${props.scoreOutOf10.toFixed(1)}/10`,
        });
        return;
      }
    } catch {
      // user cancelled or unsupported — fall through
    }
    onDownload();
  };

  const onCopyImage = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      // @ts-ignore
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onDownload();
    }
  };

  const btnClass =
    variant === "primary"
      ? "rh-btn-primary"
      : variant === "ghost"
        ? "inline-flex items-center gap-2 text-[13px] font-medium text-ink hover:opacity-70 transition"
        : "rh-btn-secondary";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        <Share2 size={15} />
        {label}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            <div
              className="bg-paper rounded-2xl shadow-2xl max-w-[560px] w-full p-5 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                    Shareable card
                  </div>
                  <div className="font-display text-[20px] text-ink mt-0.5">Your RH Score</div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full hover:bg-black/5 text-ink"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="aspect-square w-full rounded-xl overflow-hidden border border-hairline bg-white relative">
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center text-ink-soft text-[13px]">
                    Rendering…
                  </div>
                )}
                {dataUrl && (
                  <img
                    ref={imgRef}
                    src={dataUrl}
                    alt="RealHunt shareable score card"
                    className="block w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={onNativeShare}
                  disabled={!dataUrl}
                  className="rh-btn-primary justify-center"
                >
                  <ShareIcon size={15} />
                  Share
                </button>
                <button
                  onClick={onDownload}
                  disabled={!dataUrl}
                  className="rh-btn-secondary justify-center"
                >
                  <Download size={15} />
                  Download
                </button>
                <button
                  onClick={onCopyImage}
                  disabled={!dataUrl}
                  className="rh-btn-secondary justify-center col-span-2 sm:col-span-1"
                >
                  {copied ? <Check size={15} /> : <Share2 size={15} />}
                  {copied ? "Copied" : "Copy image"}
                </button>
              </div>
              <p className="mt-3 text-[12px] text-ink-soft text-center">
                Posts beautifully on WhatsApp, X, LinkedIn and Instagram.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default ShareScoreCard;
