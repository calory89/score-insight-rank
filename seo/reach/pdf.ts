// A very small PDF writer (15-nov-2026) for the one-page country fact sheets (/data/countries/<country>.pdf).
// No dependency: the two standard fonts every PDF reader has (Helvetica, Helvetica-Bold), text only, A4.
// Text is encoded as WinAnsi (Latin-1 plus the euro sign and typographic quotes), which covers English and Spanish;
// letters outside it are written without their accent, never dropped.

/** `label` makes a two-column row: the label in bold on the left, the text wrapped in the column to its right. */
export type Line = { text: string; size?: number; bold?: boolean; gap?: number; color?: number; indent?: number; label?: string };
const LABEL_COL = 178;

// Advance widths of Helvetica for the characters 32..126, in thousandths of the font size (Adobe font metrics).
const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
// WinAnsi codes of the few characters above Latin-1 that the sheets use.
const EXTRA: Record<string, number> = { "€": 0x80, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "–": 0x96, "\u2014": 0x97, "…": 0x85, "•": 0x95 };

/** The WinAnsi byte of each character; what the encoding lacks loses its accent ("ł" -> "l") or becomes "?". */
export function winAnsi(s: string): number[] {
  const out: number[] = [];
  for (const ch of String(s).replace(/m²/g, "m2")) { // not every reader has the superscript in its Helvetica
    const c = ch.codePointAt(0)!;
    if (EXTRA[ch]) out.push(EXTRA[ch]);
    else if (c < 0x100 && (c >= 0x20 || c === 9) && !(c >= 0x7f && c < 0xa0)) out.push(c === 9 ? 0x20 : c);
    else {
      const plain = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      const special: Record<string, string> = { "ł": "l", "Ł": "L", "ø": "o", "đ": "d", "ı": "i", "ß": "ss", "²": "2" };
      const p = special[ch] ?? plain;
      for (const x of p) { const k = x.codePointAt(0)!; out.push(k >= 0x20 && k < 0x7f ? k : 0x3f); }
    }
  }
  return out;
}

const widthOf = (bytes: number[], size: number, bold: boolean) => bytes.reduce((n, b) => n + (b >= 32 && b <= 126 ? W[b - 32] : 556), 0) * size / 1000 * (bold ? 1.06 : 1);

/** Breaks a text into lines no wider than `max` points. A word longer than the line (a web address) is cut. */
export function wrap(text: string, size: number, max: number, bold = false): string[] {
  const out: string[] = [];
  let cur = "";
  const fits = (s: string) => widthOf(winAnsi(s), size, bold) <= max;
  for (let word of String(text).split(/\s+/).filter(Boolean)) {
    while (!fits(word)) { // cut a very long word
      let n = word.length - 1;
      while (n > 1 && !fits((cur ? cur + " " : "") + word.slice(0, n))) n--;
      if (cur && n <= 1) { out.push(cur); cur = ""; continue; }
      out.push((cur ? cur + " " : "") + word.slice(0, n)); cur = ""; word = word.slice(n);
    }
    if (!cur) cur = word;
    else if (fits(cur + " " + word)) cur += " " + word;
    else { out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  return out;
}

const pdfStr = (bytes: number[]) => "(" + bytes.map((b) => (b === 0x28 || b === 0x29 || b === 0x5c ? "\\" + String.fromCharCode(b) : b < 0x20 || b > 0x7e ? "\\" + b.toString(8).padStart(3, "0") : String.fromCharCode(b))).join("") + ")";

/** A PDF (A4, 48 pt margins) with the lines one under another; a new page starts when the current one is full. */
export function makePdf(lines: Line[], meta: { title: string; author?: string; subject?: string; lang?: string }): Buffer {
  const PW = 595, PH = 842, M = 48, maxW = PW - 2 * M;
  const pages: string[] = [];
  let ops: string[] = [];
  let y = PH - M;
  const flush = () => { pages.push(ops.join("\n")); ops = []; y = PH - M; };
  for (const l of lines) {
    const size = l.size ?? 10, lead = Math.round(size * 1.38 * 10) / 10, indent = l.label ? LABEL_COL : l.indent ?? 0;
    const parts = wrap(l.text, size, maxW - indent, !!l.bold);
    const labels = l.label ? wrap(l.label, size, LABEL_COL - 8, true) : [];
    y -= l.gap ?? 0;
    const n = Math.max(parts.length, labels.length, 1);
    if (l.label && y - lead * n < M) flush(); // a row is never split between two pages
    for (let i = 0; i < n; i++) {
      if (y - lead < M) flush();
      y -= lead;
      const g = l.color ?? 0, yy = Math.round(y * 10) / 10;
      if (labels[i]) ops.push(`BT /F2 ${size} Tf ${g} g ${M} ${yy} Td ${pdfStr(winAnsi(labels[i]))} Tj ET`);
      if (parts[i] != null) ops.push(`BT /${l.bold ? "F2" : "F1"} ${size} Tf ${g} g ${M + indent} ${yy} Td ${pdfStr(winAnsi(parts[i]))} Tj ET`);
    }
  }
  if (ops.length || !pages.length) flush();

  // objects: 1 catalog, 2 pages, 3 and 4 fonts, 5 info, then a page and its content stream for each page
  const objs: string[] = [];
  const kids = pages.map((_p, i) => `${6 + i * 2} 0 R`).join(" ");
  objs[1] = `<< /Type /Catalog /Pages 2 0 R${meta.lang ? ` /Lang (${meta.lang})` : ""} >>`;
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  objs[5] = `<< /Title ${pdfStr(winAnsi(meta.title))} /Author ${pdfStr(winAnsi(meta.author || "RealHunt"))}${meta.subject ? ` /Subject ${pdfStr(winAnsi(meta.subject))}` : ""} /Producer (RealHunt) >>`;
  pages.forEach((content, i) => {
    objs[6 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + i * 2} 0 R >>`;
    objs[7 + i * 2] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) { offsets[i] = Buffer.byteLength(out, "latin1"); out += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + offsets.slice(1).map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** How many pages a PDF made here has (for tests and the build log). */
export const pdfPages = (buf: Buffer) => (buf.toString("latin1").match(/\/Type \/Page\b(?!s)/g) || []).length;
