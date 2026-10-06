// Puente RealHunt → Jobersity (6-oct-2026).
// Mucha gente no compra fuera porque teme no tener trabajo allí. Esta tarjeta le ofrece la otra mitad:
// un agente que le busca trabajo en remoto. Jobersity es un proyecto hermano (misma LLC) y se dice.
import { useEffect, useState } from "react";
import { isEs, tr } from "@/lib/lang";
import { track } from "@/lib/rh";
import "./remote-bridge.css";

const JB_URL = "https://nhukaoufssgeyqtwfclt.supabase.co/rest/v1/rpc/jb_public_stats";
const JB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWthb3Vmc3NnZXlxdHdmY2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjQ3MDgsImV4cCI6MjEwNjQ0MDcwOH0.hlMhvpXwRPU-Yaou9GfvQ661Bs-FnnWFrv_1S76kBUM";

let cached: number | null | undefined;
function useRemoteJobs(): number | null {
  const [n, setN] = useState<number | null>(cached ?? null);
  useEffect(() => {
    if (cached !== undefined) return;
    cached = null;
    fetch(JB_URL, { method: "POST", headers: { apikey: JB_ANON, Authorization: `Bearer ${JB_ANON}`, "Content-Type": "application/json" }, body: "{}" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = typeof d?.remote === "number" ? d.remote : null;
        cached = v;
        setN(v);
      })
      .catch(() => null);
  }, []);
  return n;
}

export function jobersityUrl(medium: string, content = ""): string {
  const q = new URLSearchParams({ mode: "remote", utm_source: "realhunt", utm_medium: medium, utm_campaign: "remote_bridge" });
  if (content) q.set("utm_content", content.slice(0, 60));
  return `https://jobersity.com/${isEs() ? "es" : "en"}?${q.toString()}#empezar`;
}

const fmt = (n: number) => n.toLocaleString(isEs() ? "es-ES" : "en-GB");

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true" style={{ flex: "none" }}>
      <rect width="32" height="32" rx="9" fill="#E8192C" />
      <path d="M21.5 9.5a8 8 0 1 0 1.6 11.3A6.4 6.4 0 0 1 21.5 9.5z" fill="#fff" />
    </svg>
  );
}

/** Tarjeta grande dentro del feed de casas (ocupa toda la fila en móvil). */
export function RemoteWorkCard() {
  const es = isEs();
  const n = useRemoteJobs();
  useEffect(() => { track("jb_bridge_view", { meta: { source: "feed" } }).catch(() => null); }, []);
  return (
    <article className="rh-jb-card" aria-label={es ? "Trabajo en remoto con Jobersity" : "Remote work with Jobersity"}>
      <div className="rh-jb-top">
        <span className="rh-jb-brand"><Mark /> Jobersity</span>
        {n !== null && n > 0 && (
          <span className="rh-jb-live"><i aria-hidden="true" />{es ? `${fmt(n)} empleos remotos abiertos` : `${fmt(n)} remote jobs open`}</span>
        )}
      </div>
      <p className="rh-jb-kicker">{es ? "¿Te da miedo no tener trabajo allí?" : "Worried there's no work there?"}</p>
      <h2 className="rh-jb-title">{es ? "Llévate el trabajo contigo." : "Bring your job with you."}</h2>
      <p className="rh-jb-sub">
        {es
          ? "Sube tu CV y un agente con IA te busca empleos en remoto que encajan contigo, te prepara cada candidatura y te avisa cuando quieren entrevistarte. Así la casa barata deja de ser un sueño."
          : "Upload your CV and an AI agent finds remote jobs that fit you, prepares every application and tells you when a company wants to interview you. That's how the cheap home stops being a daydream."}
      </p>
      <ul className="rh-jb-list">
        <li>{es ? "Solo ofertas en remoto, si lo eliges" : "Remote-only jobs, if you choose"}</li>
        <li>{es ? "Prepara la entrevista con IA" : "Prep the interview with AI"}</li>
        <li>{es ? "Gratis para empezar" : "Free to start"}</li>
      </ul>
      <a
        className="rh-jb-cta"
        href={jobersityUrl("feed_card")}
        target="_blank"
        rel="noopener"
        onClick={() => { track("jb_bridge_click", { meta: { source: "feed" } }).catch(() => null); }}
      >
        {es ? "Buscar trabajo en remoto gratis" : "Find a remote job, free"} <span aria-hidden="true">→</span>
      </a>
      <p className="rh-jb-note">{es ? "Jobersity es un proyecto hermano de RealHunt." : "Jobersity is RealHunt's sister project."}</p>
    </article>
  );
}

/** Franja compacta en la ficha de una casa. */
export function RemoteWorkStrip({ place, slug }: { place?: string; slug?: string }) {
  const es = isEs();
  const n = useRemoteJobs();
  const raw = (place || "").split(",").slice(-2).join(",").trim();
  const where = es ? tr(raw) : raw;
  return (
    <aside className="rh-jb-strip" aria-label={es ? "Trabajo en remoto con Jobersity" : "Remote work with Jobersity"}>
      <Mark />
      <div className="rh-jb-strip-text">
        <b>{es ? (where ? `¿Vivirías en ${where} con un trabajo en remoto?` : "¿Vivirías aquí con un trabajo en remoto?") : where ? `Could you live in ${where} with a remote job?` : "Could you live here with a remote job?"}</b>
        <span>
          {es
            ? `Jobersity te busca empleo remoto y aplica por ti${n ? ` · ${fmt(n)} ofertas abiertas` : ""}.`
            : `Jobersity finds remote jobs and applies for you${n ? ` · ${fmt(n)} open now` : ""}.`}
        </span>
      </div>
      <a
        className="rh-jb-strip-cta"
        href={jobersityUrl("detail_strip", slug)}
        target="_blank"
        rel="noopener"
        onClick={() => { track("jb_bridge_click", { meta: { source: "detail" } }).catch(() => null); }}
      >
        {es ? "Ver empleos" : "See jobs"} →
      </a>
    </aside>
  );
}
