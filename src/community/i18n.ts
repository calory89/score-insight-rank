// RealHunt UI language. Components write English; src/lib/lang.ts swaps the rendered text to Spanish
// for visitors from Spain or Spanish-speaking countries (1-oct-2026). t() stays as a no-op wrapper so
// older call sites keep working.
import { getLang as gl, setLang as sl, type Lang as L } from "@/lib/lang";
export type Lang = L;
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];
export const getLang = gl;
export const setLang = sl;
export function t(en: string): string { return en; }
