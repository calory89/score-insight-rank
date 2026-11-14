// Pages that exist only as prerendered HTML written by seo/assets.ts and seo/assetsTrust.ts: the data hub, the
// method document, the press page, the editorial policy, the embeds page and the page for AI assistants.
// Community.tsx shows them with StaticPage. /research/new-builds is a page of the app and is matched before this.
export const isAssetPath = (path: string) =>
  path === "/method" || path === "/press" || path === "/embed" || path === "/for-ai" || path === "/editorial-policy" || path === "/research" || (path.startsWith("/research/") && path !== "/research/new-builds");
