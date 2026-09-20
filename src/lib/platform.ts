import { toast } from "sonner";

export type DbResult<T> = { data: T; error?: { message?: string; code?: string } | null; count?: number | null };
export function requireResult<T>(result: DbResult<T>): T {
  if (result.error) throw new Error(result.error.message || "The change could not be saved.");
  return result.data;
}
export async function saveChange<T>(operation: () => PromiseLike<DbResult<T>>, success?: string): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const data = requireResult(await operation());
    if (success) toast.success(success);
    return { ok: true, data };
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Connection interrupted. Please try again.", { duration: 7000 });
    return { ok: false };
  }
}
// Export uses a stable ordered query and visits every page; never silently exports a truncated list.
export async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<DbResult<T[]>>, size = 500): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const result = await query(from, from + size - 1);
    const batch = requireResult(result) || [];
    rows.push(...batch);
    if (batch.length < size || (result.count != null && rows.length >= result.count)) return rows;
  }
}
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  // Spreadsheet formula injection, including whitespace-prefixed formulas.
  if (/^\s*[=+@-]/.test(s) && typeof value !== "number") s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export const csvText = (rows: unknown[][]) => rows.map(row => row.map(csvCell).join(",")).join("\r\n");
export function downloadCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csvText(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeProjectUrl(raw: string): string {
  const value = raw.trim();
  const url = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value);
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".") || url.username || url.password) throw new Error("Enter a valid public project URL.");
  return url.href;
}
