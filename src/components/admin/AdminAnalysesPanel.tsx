import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Download } from "lucide-react";
import { scoreColor } from "@/lib/score-utils";

interface UserData {
  id: string;
  email: string;
  analyses: any[];
}

const AdminAnalysesPanel = ({ users }: { users: UserData[] }) => {
  const navigate = useNavigate();
  const allAnalyses = useMemo(() => {
    return users.flatMap(u => (u.analyses || []).map((a: any) => ({ ...a, user_email: u.email })));
  }, [users]);

  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const countries = useMemo(() => [...new Set(allAnalyses.map(a => a.country).filter(Boolean))].sort(), [allAnalyses]);
  const cities = useMemo(() => {
    const filtered = countryFilter ? allAnalyses.filter(a => a.country === countryFilter) : allAnalyses;
    return [...new Set(filtered.map(a => a.city).filter(Boolean))].sort();
  }, [allAnalyses, countryFilter]);

  const filtered = useMemo(() => {
    let result = allAnalyses;
    if (countryFilter) result = result.filter(a => a.country === countryFilter);
    if (cityFilter) result = result.filter(a => a.city === cityFilter);
    return result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allAnalyses, countryFilter, cityFilter]);

  const exportCsv = () => {
    const csv = "address,city,country,score,price,user_email,created_at\n" +
      filtered.map((a: any) => `"${a.address || ""}","${a.city || ""}","${a.country || ""}",${a.global_score || ""},"${a.price || ""}","${a.user_email}","${a.created_at}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = `analyses-${new Date().toISOString().slice(0, 10)}.csv`; el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">All Analyses</h2>
          <span className="text-[10px] text-muted-foreground ml-2">{filtered.length} of {allAnalyses.length}</span>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setCityFilter(""); }}
          className="text-xs rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-foreground">
          <option value="">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
          className="text-xs rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-foreground">
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(countryFilter || cityFilter) && (
          <button onClick={() => { setCountryFilter(""); setCityFilter(""); }}
            className="text-[10px] text-primary hover:underline">Clear filters</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No analyses found.</p>
      ) : (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-2">Address</th>
                <th className="text-left py-2 px-2">City</th>
                <th className="text-left py-2 px-2">Country</th>
                <th className="text-center py-2 px-2">Score</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-left py-2 px-2">User</th>
                <th className="text-right py-2 px-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((a: any) => (
                <tr key={a.id} onClick={() => navigate(`/analysis/${a.id}`)}
                  className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors">
                  <td className="py-2 px-2 font-medium text-foreground max-w-[180px] truncate">{a.address || "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{a.city || "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{a.country || "—"}</td>
                  <td className="py-2 px-2 text-center"><span className={`font-mono font-bold ${scoreColor(a.global_score)}`}>{a.global_score || "—"}</span></td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{a.price || "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground max-w-[140px] truncate">{a.user_email}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && <p className="text-[10px] text-muted-foreground text-center py-2">Showing first 200 of {filtered.length}</p>}
        </div>
      )}
    </div>
  );
};

export default AdminAnalysesPanel;
