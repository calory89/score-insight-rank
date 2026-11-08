// Typo-tolerant search words (8-nov-2026, v3). Pure and tiny: the live search parser (core.ts, Deno + vitest) and the
// site's own search box parser (src/community/smartsearch.ts) both use it.
//   osa          edit distance with swapped neighbours counted as one edit ("habtiacioens" -> "habitaciones" = 2)
//   fixBedWords  "3 habtiacioens" -> "3 habitaciones", "2 bedromms" -> "2 bedrooms": only a word right after a number
//   CENTRAL_RE   "en el centro", "city centre", "downtown", "casco antiguo", "old town": a preference, never a place

/** Optimal string alignment distance (Damerau-Levenshtein without repeated edits of the same letters). */
export function osa(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** The bedroom words people type, in their correct spelling (accents removed). */
export const BED_WORDS = [
  "habitaciones", "habitacion", "dormitorios", "dormitorio", "recamaras", "recamara", "cuartos", "cuarto",
  "bedrooms", "bedroom", "quartos", "chambres", "camere", "camera", "zimmer", "slaapkamers",
];
const NUMBER_WORD = /^(\d{1,2}|one|two|three|four|five|six|un|uno|una|dos|tres|cuatro|cinco|seis)$/;

/** The correct bedroom word for a misspelt one, or null. Short words need to be closer (1 edit up to 6 letters, else 2). */
export function bedWord(w: string): string | null {
  if (w.length < 5 || BED_WORDS.includes(w)) return null;
  let best: string | null = null; let bd = 9;
  for (const k of BED_WORDS) {
    const lim = Math.min(w.length, k.length) <= 6 ? 1 : 2;
    const dist = osa(w, k, lim);
    if (dist <= lim && dist < bd) { bd = dist; best = k; }
  }
  return best;
}

/**
 * Fixes a misspelt bedroom word that follows a number ("3 habtiacioens", "tres dormitoros", "2 bedromms"). Expects
 * lower case text without accents; other words are left exactly as they are, so a place name is never "corrected".
 */
export function fixBedWords(s: string): string {
  const parts = s.split(/(\s+)/);
  for (let i = 2; i < parts.length; i += 2) {
    const prev = parts[i - 2].replace(/[+-]$/, "");
    if (!NUMBER_WORD.test(prev)) continue;
    const m = parts[i].match(/^([a-z]+)([.,;:]*)$/);
    if (!m) continue;
    const fixed = bedWord(m[1]);
    if (fixed) parts[i] = fixed + m[2];
  }
  return parts.join("");
}

/** "In the centre" in English and Spanish (accents removed). Matched and taken out before the place is read. */
export const CENTRAL_RE = /\s(?:(?:en|in|near|cerca del?|junto al?)\s+)?(?:el |la |the )?(?:centro(?: historico| de la ciudad| ciudad)?|casco (?:antiguo|historico|viejo)|city cent(?:re|er)|town cent(?:re|er)|cent(?:re|er) of (?:the )?(?:city|town)|downtown|old town|old city|historic cent(?:re|er)|centric[ao]s?|centrally located|central)(?=\s|,|$)/g;
