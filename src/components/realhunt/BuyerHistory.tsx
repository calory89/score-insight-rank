import { useEffect, useState } from "react";
import { db } from "@/lib/rh";
export default function BuyerHistory({ id, revision }: { id: string; revision?: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setFailed(false); setRows(null);
    Promise.resolve(db.rpc("dev_buyer_history", { p_id: id })).then(({ data, error }: any) => {
      if (!active) return; if (error) setFailed(true); else setRows(data || []);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [id, revision, retry]);
  return <section className="border border-hairline rounded-2xl bg-white p-4"><h3 className="text-sm font-medium">Activity history</h3>
    {failed ? <button onClick={() => setRetry(x => x + 1)} className="underline text-sm min-h-11">Could not load history. Retry</button> : rows === null ? <p role="status" className="text-sm text-ink-muted mt-2">Loading history…</p> : rows.length === 0 ? <p className="text-sm text-ink-muted mt-2">New changes will appear here.</p> : <ol className="mt-3 space-y-3">{rows.map((r, n) => <li key={n} className="text-sm border-l-2 border-hairline pl-3"><p>{r.previous_status !== r.next_status ? `${r.previous_status || "New"} → ${r.next_status || "Removed"}` : `Updated ${(r.fields || []).filter((f: string) => f !== "updated_at").join(", ").replaceAll("_", " ")}`}</p><time className="text-xs text-ink-muted" dateTime={r.created_at}>{new Date(r.created_at).toLocaleString()}</time></li>)}</ol>}
  </section>;
}
