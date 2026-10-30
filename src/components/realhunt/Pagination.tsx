export default function Pagination({ page, total, size = 50, onChange, busy = false }: { page: number; total: number; size?: number; onChange: (page: number) => void; busy?: boolean }) {
  const last = Math.max(0, Math.ceil(total / size) - 1);
  return <nav aria-label="Results pages" className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
    <span role="status" className="text-ink-muted">{total ? `${page * size + 1}–${Math.min((page + 1) * size, total)} of ${total.toLocaleString("en-GB")}` : "0 results"}</span>
    <div className="flex gap-2"><button type="button" disabled={busy || page <= 0} onClick={() => onChange(page - 1)} className="min-h-11 px-4 border border-hairline rounded-full disabled:opacity-40">Previous</button><button type="button" disabled={busy || page >= last} onClick={() => onChange(page + 1)} className="min-h-11 px-4 border border-hairline rounded-full disabled:opacity-40">Next</button></div>
  </nav>;
}
