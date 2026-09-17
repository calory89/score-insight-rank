// A/B/n experiments. Assignment is deterministic per visitor (sid + key), so the same person always sees
// the same variant. Exposures and conversions go to rh_events; the admin reads them with admin_experiments().
import { useEffect, useMemo, useState } from "react";
import { db, track, sid } from "@/lib/rh";

export type Variant = { id: string; label?: string; text?: string; weight?: number };
export type Experiment = { key: string; name: string; page: string; kind: string; variants: Variant[]; goals: string[]; active: boolean };

const CACHE_KEY = "rh_exp_cfg_v1";
const ASSIGN_KEY = "rh_exp_assign";
const FORCE_KEY = "rh_exp_force";
let cfg: Experiment[] | null = null;
let inflight: Promise<Experiment[]> | null = null;

// fnv-1a 32 bit, good enough to spread visitors evenly
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const readJson = (store: Storage, k: string) => { try { return JSON.parse(store.getItem(k) || "null"); } catch { return null; } };
const writeJson = (store: Storage, k: string, v: any) => { try { store.setItem(k, JSON.stringify(v)); } catch {} };

/** ?exp=key:B,key2:C forces variants for this browser (for previews). ?exp=off clears. */
const forced = (): Record<string, string> => {
  try {
    const q = new URLSearchParams(location.search).get("exp");
    if (q === "off") { localStorage.removeItem(FORCE_KEY); return {}; }
    if (q) { const m: Record<string, string> = readJson(localStorage, FORCE_KEY) || {}; q.split(",").forEach((p) => { const [k, v] = p.split(":"); if (k && v) m[k.trim()] = v.trim(); }); writeJson(localStorage, FORCE_KEY, m); return m; }
    return readJson(localStorage, FORCE_KEY) || {};
  } catch { return {}; }
};

export const currentAssignments = (): Record<string, string> => readJson(sessionStorage, ASSIGN_KEY) || {};

export const loadExperiments = (): Promise<Experiment[]> => {
  if (cfg) return Promise.resolve(cfg);
  const cached = readJson(sessionStorage, CACHE_KEY);
  if (cached && Date.now() - cached.t < 5 * 60 * 1000) { cfg = cached.list; return Promise.resolve(cfg!); }
  if (!inflight) inflight = db.from("experiments").select("key,name,page,kind,variants,goals,active").eq("active", true).then(({ data }: any) => { cfg = data || []; writeJson(sessionStorage, CACHE_KEY, { t: Date.now(), list: cfg }); return cfg!; }).catch(() => (cfg = []));
  return inflight;
};

export const pickVariant = (exp: Experiment): Variant => {
  const f = forced()[exp.key]; if (f) { const v = exp.variants.find((x) => x.id === f); if (v) return v; }
  const total = exp.variants.reduce((a, v) => a + (v.weight ?? 1), 0) || 1;
  let r = (hash(`${sid()}|${exp.key}`) % 10000) / 10000 * total;
  for (const v of exp.variants) { r -= v.weight ?? 1; if (r < 0) return v; }
  return exp.variants[0];
};

/** Returns the variant for an experiment. `fallback` is used before the config loads or when the experiment is off. */
export const useExperiment = (key: string, fallback: Variant[]): Variant => {
  const [exp, setExp] = useState<Experiment | null>(cfg ? cfg.find((e) => e.key === key) || null : null);
  const [ready, setReady] = useState(!!cfg);
  useEffect(() => { let on = true; loadExperiments().then((list) => { if (!on) return; setExp(list.find((e) => e.key === key) || null); setReady(true); }); return () => { on = false; }; }, [key]);
  const variant = useMemo(() => {
    const e = exp && exp.variants.length ? exp : { key, name: key, page: "", kind: "text", variants: fallback, goals: [], active: true };
    return pickVariant(e as Experiment);
  }, [exp, key, ready]);
  useEffect(() => {
    if (!ready) return;
    const a = currentAssignments(); if (a[key] !== variant.id) { a[key] = variant.id; writeJson(sessionStorage, ASSIGN_KEY, a); }
    const seen: Record<string, string> = readJson(sessionStorage, "rh_exp_seen") || {};
    if (seen[key] !== variant.id) { seen[key] = variant.id; writeJson(sessionStorage, "rh_exp_seen", seen); track("exp_expose", { meta: { exp_key: key, exp_v: variant.id } }); }
  }, [ready, key, variant.id]);
  return variant;
};
