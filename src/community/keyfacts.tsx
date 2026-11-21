// Key facts under the price on a home page: size, price per m², bedrooms and the RealHunt score as big tiles in one
// row (21-nov-2026). The score tile jumps to the score block, where each part explains what it measures.
import { keyFacts } from "./keyfactsLogic";
import { useScore } from "./scores";
import { t } from "./i18n";
import { isEs } from "@/lib/lang";

export function KeyFacts({ deal }: { deal: any }) {
  const s = useScore(deal);
  const list = keyFacts(deal, s?.n);
  if (!list.length) return null;
  const toScore = () => { const el = document.getElementById("rh-score"); if (!el) return; el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); el.focus({ preventScroll: true }); };
  return (
    <ul className={"rh-kf n" + list.length} aria-label={isEs() ? "Datos clave" : "Key facts"}>
      {list.map((f) => f.k === "score" ? (
        <li key={f.k} className="is-score">
          <button type="button" onClick={toScore} aria-label={isEs() ? `Puntuación RealHunt ${f.value}. Mira qué mide cada parte` : `RealHunt score ${f.value}. See what each part measures`}>
            <strong className={(s && s.n >= 90 ? "is-top" : s && s.n >= 80 ? "is-great" : "is-good")}>{f.value}</strong><span>{t(f.label)}</span>
          </button>
        </li>
      ) : (
        <li key={f.k}><strong>{f.value}</strong><span>{t(f.label)}</span></li>
      ))}
    </ul>
  );
}
