# Pasos que solo puede dar el dueño (alcance y medición)

Esto es lo que no se puede hacer desde el repositorio: hace falta una cuenta, un panel o una decisión tuya.
Está ordenado por lo que más cuenta. Cada paso dice cuánto se tarda y qué se gana.
Fecha: 15 de noviembre de 2026.

## 1. Bing Webmaster Tools (10 minutos). Lo más rentable de la lista

Bing alimenta a ChatGPT, Copilot, DuckDuckGo y Ecosia.

1. Entra en https://www.bing.com/webmasters con una cuenta de Microsoft.
2. Elige "Importar desde Google Search Console" y acepta. Trae la propiedad realhunt.co ya verificada y sus sitemaps.
3. En Sitemaps comprueba que aparece https://realhunt.co/sitemap.xml. Si no, añádelo.
4. En "Inspección de URL" pasa estas diez direcciones y apunta lo que marque en docs/seo/revision-mensual.md:
   /, /homes/spain, /homes/italy, /homes/bulgaria/under-80000, /research/prices, /research/property-portals,
   /research/country-facts, /guide/spain, /costs/spain, /es.
5. No hace falta configurar IndexNow: el sitio ya avisa solo de las páginas nuevas en cada publicación (scripts/indexnow.py).

## 2. Search Console: un envío (2 minutos)

1. Sitemaps > añade `sitemap-news.xml` (entradas del blog de los dos últimos días; estará vacío los días sin entrada, es normal).
2. Si algún día una casa lleva vídeo, aparecerá `sitemap-video.xml` en robots.txt: añádelo entonces.

## 3. Exportación semanal de Search Console (3 minutos, cada lunes)

Sin esto los informes dicen "sin datos". No hay acceso por API desde aquí.

1. Search Console > Rendimiento > Resultados de búsqueda > fecha "Últimos 28 días" > Exportar > Descargar CSV.
2. Descomprime el ZIP en una carpeta, por ejemplo `~/Descargas/gsc-2026-11-16`. No cambies los nombres de los archivos.
3. En el repositorio: `python3 scripts/seo_report.py --gsc ~/Descargas/gsc-2026-11-16 --archive data/seo-history --window-days 28 --out informe.md`
4. El informe da, por familia de página e idioma: impresiones, clics, marca y sin marca, países, títulos flojos,
   búsquedas de oro, las 100 búsquedas objetivo, páginas sin impresiones y caídas de más del 20 %.
   `--archive` guarda una copia propia de los días (Google borra a los 16 meses).
5. Para el informe de canibalización hace falta un CSV con búsqueda y página juntas. Sale de Looker Studio
   (conector de Search Console, tabla con Query y Landing Page) guardado como `consulta-pagina.csv` en la misma carpeta,
   con las columnas query, page, clicks, impressions, position.

## 4. Google Analytics: dimensiones personalizadas (5 minutos, una vez)

El sitio ya envía estos eventos al GA4 que tienes (solo si el visitante aceptó las cookies de analítica):
`rh_landing`, `rh_ai_referral`, `rh_family_view`, `rh_value`, `rh_search_no_results`.

1. GA4 > Administrar > Definiciones personalizadas > Crear dimensión personalizada, ámbito "Evento", una por cada parámetro:
   `page_family`, `landing_family`, `source_kind`, `source`, `action`, `term_kind`, `page_lang`.
2. Informes útiles (Explorar > Formato libre):
   - Visitas desde asistentes de IA: evento `rh_ai_referral`, por `source` (chatgpt, perplexity, claude, gemini, copilot) y `landing_family`.
   - Valor por familia: evento `rh_value`, filas `landing_family`, columnas `action` (alert_created, listing_click, home_saved), con filtro `source_kind` = search.
   - Qué buscan y no encuentran: evento `rh_search_no_results`, por `term_kind` (solo dice el país nombrado, nunca lo que se escribió).
3. Marca `rh_value` como evento clave si quieres verlo en los informes de adquisición.

## 5. Registros del servidor en Cloudflare (10 minutos, una vez al mes)

Para saber qué robots de IA entran y qué direcciones dan error 404.

1. Cloudflare > realhunt.co > Analytics & Logs > Log Search (o Logpush si lo activas), últimos 7 días, campos
   ClientRequestURI, EdgeResponseStatus y ClientRequestUserAgent. Exporta en NDJSON o CSV.
2. `python3 scripts/log_report.py registros.ndjson --out registros.md`
3. El informe da los robots de IA y de buscadores por familia de página y, para cada 404 muy pedido, una decisión
   propuesta. Las redirecciones que aceptes se añaden en `seo/redirects-seed.json`.
4. Si el plan de Cloudflare no deja exportar registros, el worker que sirve la web tendría que contar los 404 y los
   robots (está descrito en el informe de esta ronda).

## 6. Altas en otros buscadores (20 minutos en total)

- Yandex Webmaster (https://webmaster.yandex.com): añade realhunt.co, verifica con el archivo HTML que te da (se sube a `public/`) y envía el sitemap. Imprescindible antes de publicar páginas en ruso.
- Brave Search: no tiene alta. Comprueba `site:realhunt.co` en https://search.brave.com una vez al mes.
- Kagi: sin alta. Comprueba una vez al mes.
- Mojeek: formulario en https://www.mojeek.com/submit (una dirección: https://realhunt.co/).
- Yep, Qwant, Startpage, DuckDuckGo, Ecosia: sin alta propia. Quedan cubiertos con el paso 1 y con el aviso automático de IndexNow.
- Seznam (Chequia) y Naver (Corea): solo cuando haya páginas en checo o visitas desde Corea.
- Google Publisher Center (https://publishercenter.google.com): añade la publicación "RealHunt" con dos secciones, /blog y /research, cuando haya al menos una entrada por semana.

## 7. Perfiles y fichas (decisiones tuyas)

- Usa siempre el mismo texto y los mismos datos de empresa: la descripción de una línea y la larga están en docs/brand/hoja-de-marca.md y la lista de perfiles en docs/brand/perfiles.md. Cópialos tal cual en Crunchbase, LinkedIn, X y Product Hunt. La dirección postal es la de la página /contact.
- LinkedIn de empresa: créala y pasa la dirección; se añade al pie y a los datos de organización (`sameAs` en index.html).
- Ficha de empresa en Google, Apple Business Connect y Bing Places: solo con la dirección real de Equinox y si aceptas que sea pública. Nunca una dirección inventada.
- Trustpilot: reclama el perfil. Solo opiniones de usuarios reales.
- Chrome Web Store (ficha de RealHunt Score): revisa que el título diga qué hace, que haya cinco capturas y que el enlace del sitio sea https://realhunt.co/extension.
- realhunt.ca: aparece en las búsquedas de marca. La web bloquea las lecturas automáticas; ábrela a mano y mira quién la usa. Lo que ya se sabe de otros usos del nombre está en docs/brand/colision-de-nombre.md.
- Cuenta de X: los datos de organización de la web (`sameAs` en index.html) apuntaban a twitter.com/RealHuntApp, que no existe; ahora apuntan a x.com/realhuntco, la cuenta que docs/brand/perfiles.md da como propia. Confirma que es la tuya. El enlace del pie antiguo (src/components/Footer.tsx) sigue pendiente, como explica docs/brand/colision-de-nombre.md.
- Feedly y Flipboard: en Feedly cualquiera puede seguir https://realhunt.co/blog/rss.xml sin alta. Flipboard pide cuenta para crear la revista.
- Mapa público: en https://www.google.com/mymaps crea un mapa, pulsa Importar y sube el archivo https://realhunt.co/data/realhunt-best-homes.kml (las diez casas con mejor nota de cada país, cada punto con su enlace). Hazlo público y pasa la dirección para enlazarlo desde la web.
- GPT de RealHunt y conectores de asistentes: la descripción técnica ya está en https://realhunt.co/openapi.json; el alta en cada tienda pide tu cuenta.
- Looker Studio: es gratis, pero hay que crearlo con tu cuenta de Google (conectores de Search Console y GA4).

## 8. Fotos de los anuncios (decisión tuya)

Las fotos de las casas son de los anuncios originales. Hoy aparecen en el sitemap de imágenes y como imagen al compartir.
Cada página dice en qué portal está el anuncio. Si un portal pide retirarlas, se hace desde /legal/takedown.
Decide si quieres seguir enviando esas fotos a Google Imágenes y Discover o limitarlo a los gráficos propios;
el cambio es de una línea (las imágenes del sitemap se escriben en seo/prerender.ts).

## 9. Revisión mensual de una hora

La lista de comprobaciones está en docs/seo/revision-mensual.md y los objetivos en docs/seo/objetivos.md.
