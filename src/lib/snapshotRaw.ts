// One download of the public snapshot per page (9-nov-2026). Six modules each fetched /data/rh-static.json on
// their own (about 270 KB compressed), so a home page pulled it three times. They now share this promise.
// The object is shared: treat it as read-only (mediaDeep() returns a copy, so callers that use it are safe).
// Keep this file free of imports: importing @/lib/static-db from some callers would patch supabase.rpc twice.
let rawP: Promise<any> | null = null;
const download = (): Promise<any> => fetch("/data/rh-static.json", { cache: "no-cache" }).then((r) => {
  if (!r.ok) throw new Error("static data " + r.status);
  return r.json();
});
export function snapshotRaw(): Promise<any> {
  if (rawP) return rawP;
  // index.html starts this download before the app is parsed on the pages that need it (see vite.config.ts)
  const early: Promise<any> | undefined = typeof window !== "undefined" ? (window as any).__rhSnap : undefined;
  if (early) (window as any).__rhSnap = undefined;
  return (rawP = (early ? early.catch(download) : download()).catch((e) => { rawP = null; throw e; }));
}
