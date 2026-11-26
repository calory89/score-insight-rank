// Results pages (admin lists). 815: the current page is named and announced, the buttons sit inside the "Results pages" navigation.
export default function Pagination({ page, total, size = 50, onChange, busy = false }: { page: number; total: number; size?: number; onChange: (page: number) => void; busy?: boolean }) {
  const last = Math.max(0, Math.ceil(total / size) - 1);
  return <nav aria-label="Results pages" aria-busy={busy || undefined} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
    <span role="status" className="text-ink-muted">{total ? `${page * size + 1}–${Math.min((page + 1) * size, total)} of ${total.toLocaleString("en-GB")}` : "0 results"}</span>
    <div className="flex items-center gap-2">
      {last > 0 && <span aria-current="page" className="text-ink-muted tabular-nums">Page {page + 1} of {last + 1}</span>}
      <button type="button" disabled={busy || page <= 0} onClick={() => onChange(page - 1)} className="min-h-11 px-4 border border-hairline rounded-full disabled:opacity-40">Previous</button>
      <button type="button" disabled={busy || page >= last} onClick={() => onChange(page + 1)} className="min-h-11 px-4 border border-hairline rounded-full disabled:opacity-40">Next</button>
    </div>
  </nav>;
}
