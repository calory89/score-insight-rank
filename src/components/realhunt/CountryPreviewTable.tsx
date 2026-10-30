import { Link } from "react-router-dom";
import ScoreBadge from "./ScoreBadge";

export interface PreviewRow {
  rank: number;
  name: string;
  slug: string;
  developer: string;
  city: string;
  score: number;
  is_owned_by_realhunt?: boolean;
}

interface Props {
  countryName: string;
  countrySlug: string;
  flag: string;
  rows: PreviewRow[];
}

const CountryPreviewTable = ({ countryName, countrySlug, flag, rows }: Props) => (
  <div className="rounded-xl border border-rh-line bg-rh-navy-2/60 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-rh-line">
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none">{flag}</span>
        <div>
          <h3 className="font-serif text-xl text-white leading-tight">{countryName}</h3>
          <p className="text-xs text-white/40 mt-0.5">Top off-plan projects · live ranking</p>
        </div>
      </div>
      <Link to={`/countries/${countrySlug}`} className="text-xs text-rh-gold hover:text-rh-gold-soft tracking-wide">
        View all →
      </Link>
    </div>
    <table className="w-full text-sm">
      <thead className="text-[10px] tracking-widest uppercase text-white/40">
        <tr>
          <th className="text-left font-medium px-5 py-2 w-10">#</th>
          <th className="text-left font-medium px-2 py-2">Project</th>
          <th className="text-left font-medium px-2 py-2 hidden sm:table-cell">Developer</th>
          <th className="text-right font-medium px-5 py-2">Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.slug} className="border-t border-rh-line/60 hover:bg-white/[0.02]">
            <td className="px-5 py-3 font-mono text-white/40 text-xs tabular-nums">{String(r.rank).padStart(2, "0")}</td>
            <td className="px-2 py-3">
              <Link to={`/projects/${r.slug}`} className="text-white hover:text-rh-gold font-medium">
                {r.name}
              </Link>
              <div className="text-xs text-white/40 mt-0.5 flex items-center gap-2">
                {r.city}
                {r.is_owned_by_realhunt && (
                  <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-rh-gold/15 text-rh-gold ring-1 ring-rh-gold/30">
                    Owned by RealHunt
                  </span>
                )}
              </div>
            </td>
            <td className="px-2 py-3 text-white/60 hidden sm:table-cell">{r.developer}</td>
            <td className="px-5 py-3 text-right"><ScoreBadge score={r.score} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default CountryPreviewTable;
