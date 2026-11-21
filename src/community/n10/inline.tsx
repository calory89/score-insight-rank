// Small always-loaded pieces of round n10 (21-nov-2026) for the home page: where the advert is and when it was last
// confirmed (list2 46, 47) and the badge on homes of RealHunt's own group (53). Texts are written in both languages
// here, so a Spanish page never shows an English sentence while the dictionary loads.
import { Link } from "react-router-dom";
import { Building2, KeyRound } from "lucide-react";
import { isEs } from "@/lib/lang";
import { isGone, dayLabel, type StatusRow } from "../n9/status";
import { isGroupHome } from "./logic";
import "./n10.css";

const L = (en: string, es: string) => (isEs() ? es : en);

/** One line under the "View listing" button: the portal, and the last day our nightly check found the advert. */
export function SourceLine({ d, open }: { d: StatusRow & { source_url?: string | null }; open: boolean }) {
  const es = isEs();
  const dom = d.source_domain && d.source_domain !== "instagram.com" ? d.source_domain.replace(/^www\./, "") : "";
  const ok = d.src_ok_at ? dayLabel(d.src_ok_at, es ? "es" : "en") : "";
  const gone = isGone(d);
  const parts: string[] = [];
  if (dom) parts.push(L(`Advert on ${dom}`, `Anuncio en ${dom}`));
  if (gone) parts.push(L("our nightly check no longer finds it online", "nuestra revisión nocturna ya no lo encuentra en línea"));
  else if (ok) parts.push(L(`last found online by our nightly check on ${ok}`, `encontrado en línea por última vez en nuestra revisión nocturna el ${ok}`));
  else if (dom) parts.push(L("not yet confirmed by our nightly check", "aún sin confirmar en nuestra revisión nocturna"));
  return (
    <div className="n10-src">
      {parts.length > 0 && <p>{parts.join(" · ")}. <Link className="hunt-link" to={es ? "/es/how-we-check-homes" : "/how-we-check-homes"}>{L("How we check", "Cómo lo comprobamos")}</Link></p>}
      {!open && <p className="n10-src-acct"><KeyRound size={14} aria-hidden="true" /> <span>{L(
        "The link to the original advert opens with a free RealHunt account: an email and a password, no payment and no card. After you sign in, you come straight back to this home.",
        "El enlace al anuncio original se abre con una cuenta gratuita de RealHunt: un correo y una contraseña, sin pagos ni tarjeta. Al entrar, vuelves directamente a esta casa.")}</span></p>}
    </div>
  );
}

/** "Our group's project": shown on any home or project of Equinox Investment Group (Eco Beach City), never hidden. */
export function GroupBadge({ d, compact = false }: { d: Parameters<typeof isGroupHome>[0]; compact?: boolean }) {
  if (!isGroupHome(d)) return null;
  return (
    <span className={"n10-group" + (compact ? " is-compact" : "")} title={L("Developed by the group that runs RealHunt (Equinox Investment Group). It never takes part in the rankings.", "La desarrolla el grupo que gestiona RealHunt (Equinox Investment Group). Nunca entra en las clasificaciones.")}>
      <Building2 size={13} aria-hidden="true" /> {L("Our group's project", "Proyecto de nuestro grupo")}
    </span>
  );
}
