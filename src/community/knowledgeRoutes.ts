// Pages that exist only as prerendered HTML written by seo/knowledge/build.ts: the glossaries, the guides by subject
// and the question pages. Community.tsx shows them with StaticPage; it is matched before the country guides
// (/guide/<country>), which are a page of the app.
export const isKnowledgePath = (path: string) => /^\/guide\/(glossary|buying|questions)(\/|$)/.test(path);
/** Country of a buying guide -> its glossary page (kept in step with seo/knowledge/data by src/test/knowledge.test.ts). */
export const GLOSSARY_OF: Record<string, string> = {
  spain: "spain", italy: "italy", france: "france", germany: "germany", portugal: "portugal", netherlands: "netherlands", japan: "japan",
  sweden: "sweden-denmark", denmark: "sweden-denmark", greece: "greece", bulgaria: "bulgaria", mexico: "mexico-united-states", "united-states": "mexico-united-states",
};
