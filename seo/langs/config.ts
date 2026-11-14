// Which languages have listing pages, which families each one covers and how many pages it may publish
// (15-nov-2026). The owner's limit for this round is MAX_TOTAL new HTML files across all of them: Cloudflare Pages
// caps the files of a deployment (seo/budget.ts), and a language starts with the pages that have most homes.
import type { Pack } from "../listings/pack";
import type { Kind } from "../listings/facets";
import type { NewLang } from "../listings/packkit";
import { de } from "../listings/pack.de";
import { ru } from "../listings/pack.ru";
import { fr } from "../listings/pack.fr";

export const MAX_TOTAL = 2500;
const CORE: Kind[] = ["country", "band", "region", "setting", "ptype", "beds", "area", "regionBand", "town", "gband"];
const ALL: Kind[] = [...CORE, "feature", "gfeature", "combo", "near", "ccyBand"];

export const PACKS: Partial<Record<NewLang, Pack>> = { de, ru, fr };
/** `kinds`: the families the language's pack words well; `max`: its share of MAX_TOTAL (the page of all searches not counted). */
export const CONFIG: Partial<Record<NewLang, { kinds: Kind[]; max: number }>> = {
  de: { kinds: ALL, max: 560 },
  // Russian: the families its pack words without case endings on place names, in every country whose homes have a Russian title
  ru: { kinds: [...CORE, "ccyBand"], max: 300 },
  fr: { kinds: ALL, max: 560 },
};
export { CORE, ALL };
