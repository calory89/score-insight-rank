// Quote a value for CSV and neutralize spreadsheet formulas (=, +, -, @, tab, CR).
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
export const csvRow = (values: unknown[]) => values.map(csvCell).join(",");
