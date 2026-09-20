export type ImportIssue = { row: number; message: string };
// RFC 4180 quoted cells, doubled quotes and multiline fields; also TSV / semicolon exports.
export function parseDelimited(text: string): { rows: string[][]; issues: ImportIssue[] } {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0] || "";
  let quoted = false;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (let i = 0; i < first.length; i++) {
    if (first[i] === '"') { if (quoted && first[i + 1] === '"') i++; else quoted = !quoted; }
    else if (!quoted && first[i] in counts) counts[first[i]]++;
  }
  const separator = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const rows: string[][] = [], issues: ImportIssue[] = [];
  let row: string[] = [], cell = ""; quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell.trim()) quoted = !quoted;
      else cell += c;
    } else if (!quoted && c === separator) { row.push(cell.trim()); cell = ""; }
    else if (!quoted && (c === "\n" || c === "\r")) {
      row.push(cell.trim()); rows.push(row); row = []; cell = "";
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else cell += c;
  }
  if (quoted) issues.push({ row: rows.length + 1, message: "Unclosed quoted field. Correct this row before importing." });
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return { rows, issues };
}
export function contactCandidates(text: string) {
  const { rows, issues } = parseDelimited(text);
  const contacts = new Map<string, string>();
  let duplicates = 0;
  rows.forEach((cells, index) => {
    let found = 0;
    cells.forEach(cell => {
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell);
      const digits = cell.replace(/\D/g, "").replace(/^00/, "");
      const phone = /^[+\d\s().-]+$/.test(cell) && digits.length >= 7 && digits.length <= 15;
      if (!email && !phone) return;
      found++;
      const key = email ? cell.toLowerCase() : "p:" + digits;
      if (contacts.has(key)) duplicates++; else contacts.set(key, cell);
    });
    const header = index === 0 && cells.some(c => /^(email|e-mail|phone|telephone|mobile|name|nombre|tel[eé]fono)$/i.test(c));
    if (!found && cells.some(Boolean) && !header) issues.push({ row: index + 1, message: "No valid email or phone found; row skipped." });
  });
  return { contacts: [...contacts.values()], duplicates, issues, invalid: issues.some(i => i.message.startsWith("Unclosed")) };
}
