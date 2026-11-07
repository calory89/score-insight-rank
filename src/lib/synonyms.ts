// Search synonyms shared by the static feed filter (entry bundle) and the FIND layer. Kept tiny on purpose.
/** Each canonical search word also matches these words in a listing (used by the static feed filter). */
export const SYNONYMS: Record<string, string[]> = {
  apartment: ["apartment", "flat", "condo", "penthouse", "studio", "floor"],
  farm: ["farm", "finca", "cortijo", "masseria", "country house", "rustic"],
  cabin: ["cabin", "cottage", "chalet", "log house", "hut"],
  mountain: ["mountain", "alps", "alpine", "sierra", " ski ", "ski resort", "hills"],
};
export function wordMatches(text: string, word: string): boolean {
  const t = text.toLowerCase();
  const w = word.toLowerCase();
  return (SYNONYMS[w] || [w]).some((x) => t.includes(x));
}
