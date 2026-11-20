// The trust pages written by seo/trustMore.ts, in a file of their own so any page can link to them without importing
// the writer (seo/assetsTrust.ts, seo/reach, the footer of the app).
/** The pages of seo/trustMore.ts, for links from other pages and for llms.txt: [path, English name, Spanish name]. */
export const TRUST_PAGES: [string, string, string][] = [
  ["/how-we-check-homes", "How we know a home is still for sale", "Cómo sabemos que una casa sigue a la venta"],
  ["/what-we-reject", "Which homes we reject and why", "Qué casas rechazamos y por qué"],
  ["/what-we-never-do", "What we never do", "Lo que nunca hacemos"],
  ["/how-we-make-money", "How RealHunt makes money", "Cómo gana dinero RealHunt"],
  ["/corrections", "Corrections and changes, with their dates", "Correcciones y cambios, con su fecha"],
  ["/research/removed-homes", "Homes taken off the site, month by month", "Casas retiradas de la web, mes a mes"],
];
