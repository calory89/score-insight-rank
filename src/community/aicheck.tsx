// 8-nov-2026 (live search v2): on a home's page, what the AI check said. Homes the live search published carry
// ai_checked = true until a person approves them in /hunt/admin; why_cheap and ai_flags stay after that.
import { Sparkles } from "lucide-react";
import { t, getLang } from "./i18n";
import { FLAG_LABEL } from "../../supabase/functions/realhunt-live-search/flags";
import "./aicheck.css";

type AiRow = { ai_checked?: boolean | null; ai_checked_at?: string | null; why_cheap?: string | null; ai_flags?: string[] | null };

export const aiDate = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  try { return d.toLocaleDateString(getLang() === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return d.toISOString().slice(0, 10); }
};

export function AiCheckNote({ d }: { d: AiRow }) {
  const flags = (d.ai_flags || []).filter((f) => FLAG_LABEL[f]);
  const cheap = String(d.why_cheap || "").trim();
  if (!d.ai_checked && !cheap && !flags.length) return null;
  return (
    <>
      {d.ai_checked && (
        <div className="rh-ai-note" role="note">
          <p className="rh-ai-head"><Sparkles size={16} aria-hidden="true" /><span>{aiDate(d.ai_checked_at) ? <>{t("Checked by AI on")} {aiDate(d.ai_checked_at)}{", "}{t("not yet by a person")}{"."}</> : t("Checked by AI, not yet by a person.")}</span></p>
          <p className="rh-ai-sub">{t("Our AI read the listing and looked at its photos. A person will check it too. Always confirm the details with the seller.")}</p>
          {flags.length > 0 && <span className="hx-ai">{flags.map((f) => <span key={f} className="hx-ai-flag">{t(FLAG_LABEL[f])}</span>)}</span>}
        </div>
      )}
      {!d.ai_checked && flags.length > 0 && <span className="hx-ai">{flags.map((f) => <span key={f} className="hx-ai-flag">{t(FLAG_LABEL[f])}</span>)}</span>}
      {cheap && (
        <div className="rh-ai-cheap">
          <strong>{t("Why is it so cheap?")}</strong>
          <p>{cheap}</p>
        </div>
      )}
    </>
  );
}

/** /hunt/admin: homes the AI check published, for a person to confirm (clears the label) or reject. Admin only, English. */
export function AiQueue({ approved, busy, act }: { approved: any[]; busy: boolean; act: (action: string, payload: any) => void }) {
  const list = (approved || []).filter((d) => d.ai_checked);
  return (
    <>
      <h2>Checked by AI, waiting for a person ({list.length})</h2>
      <p>Published by the live search after its AI check. Confirm removes the "not yet by a person" label; reject hides the home.</p>
      {list.map((d) => (
        <article key={d.id} className="hunt-submission hunt-crm-card">
          {d.image_urls?.[0] && <img src={d.image_urls[0]} alt="" width={120} height={90} loading="lazy" style={{ borderRadius: 12, objectFit: "cover" }} />}
          <div className="hunt-crm-info">
            <span className="hunt-status approved">AI-checked {aiDate(d.ai_checked_at)}</span>
            <h3><a href={`/deal/${d.slug}`}>{d.title}</a></h3>
            {d.why_cheap && <p>Why cheap: {d.why_cheap}</p>}
            {d.source_url && <p><a href={d.source_url} target="_blank" rel="noopener noreferrer">Original listing ↗</a></p>}
          </div>
          <button disabled={busy} onClick={() => act("moderate", { id: d.id, decision: "approve" })}>Confirm (checked by a person)</button>
          <button disabled={busy} onClick={() => { const reason = window.prompt("Why reject it?", "Not good enough for RealHunt"); if (reason) act("moderate", { id: d.id, decision: "reject", reason }); }}>Reject</button>
        </article>
      ))}
    </>
  );
}
