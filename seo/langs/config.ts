// Which languages have listing pages, which families each one covers and how many pages it may publish
// (15-nov-2026). The owner's limit for this round is MAX_TOTAL new HTML files across all of them: Cloudflare Pages
// caps the files of a deployment (seo/budget.ts), and a language starts with the pages that have most homes.
import type { Pack } from "../listings/pack";
import type { Kind } from "../listings/facets";
import type { NewLang } from "../listings/packkit";
import { de } from "../listings/pack.de";
import { ru } from "../listings/pack.ru";
import { nl } from "../listings/pack.nl";
import { pl } from "../listings/pack.pl";

export const MAX_TOTAL = 2500;
const CORE: Kind[] = ["country", "band", "region", "setting", "ptype", "beds", "area", "regionBand", "town", "gband"];
const ALL: Kind[] = [...CORE, "feature", "gfeature", "combo", "near", "ccyBand"];

export const PACKS: Partial<Record<NewLang, Pack>> = { de, ru, nl, pl };
/** `kinds`: the families the language's pack words well; `max`: its share of MAX_TOTAL (the page of all searches not counted). */
export const CONFIG: Partial<Record<NewLang, { kinds: Kind[]; max: number }>> = {
  de: { kinds: ALL, max: 560 },
  // Russian: the families its pack words without case endings on place names; Bulgaria first, then Greece and Cyprus
  ru: { kinds: CORE, max: 300 },
  // Dutch and Polish (15-nov-2026): every family, like German; together at most 1,050 files of the deployment
  nl: { kinds: ALL, max: 520 },
  pl: { kinds: ALL, max: 520 },
};
export { CORE, ALL };
