// Pages that exist only as prerendered HTML written by seo/assets.ts and seo/assetsTrust.ts: the data hub, the
// method document, the press page, the editorial policy, the embeds page and the page for AI assistants.
// Community.tsx shows them with StaticPage. /research/new-builds is a page of the app and is matched before this.
/** The trust pages of seo/trustMore.ts (20-nov-2026); the same list as seo/trustPages.ts, checked by a test. */
export const TRUST_PATHS = ["/how-we-check-homes", "/what-we-reject", "/what-we-never-do", "/how-we-make-money", "/corrections"];
export const isAssetPath = (path: string) =>
  TRUST_PATHS.includes(path) || path === "/method" || path === "/press" || path === "/embed" || path === "/for-ai" || path === "/editorial-policy" || path === "/research" || (path.startsWith("/research/") && path !== "/research/new-builds");
