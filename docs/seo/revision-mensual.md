# Revisión mensual de una hora

Con el dueño, el primer lunes de cada mes. Tres cosas que funcionaron, tres que no y qué sigue.
Antes de la reunión: exportación de Search Console e informe (docs/seo/owner-steps.md, paso 3) y, si se puede,
registros de Cloudflare (paso 5).

## Comprobaciones a mano (no hay API): apunta el resultado en la tabla

| Qué | Dónde | Resultado de este mes |
| --- | --- | --- |
| Páginas indexadas y motivos de no indexación | Search Console, Indexación > Páginas | |
| Discover: clics e impresiones (la pestaña solo aparece si hay datos) | Search Console, Rendimiento > Discover | |
| Informe de rastreo y recomendaciones de Bing | Bing Webmaster, Rastreo y Recomendaciones | |
| Las diez páginas clave en la inspección de Bing | Bing Webmaster, Inspección de URL | |
| `site:realhunt.co` en Bing, DuckDuckGo, Ecosia, Brave, Qwant, Startpage, Mojeek | cada buscador | |
| Resultado de marca "realhunt" (título, icono, enlaces) en Google, Bing y Yandex | cada buscador | |
| Fotos y gráficos en la búsqueda de imágenes de Bing y Yandex (`site:realhunt.co`) | cada buscador | |
| Copilot y ChatGPT: preguntar "casas baratas en Bulgaria por menos de 80.000 euros" y "portales inmobiliarios de Italia"; ¿nos citan? | cada asistente | |
| Resumen de IA de Google en cinco búsquedas objetivo: ¿sale? ¿nos cita? | Google | |
| Resultados especiales en esas búsquedas (preguntas, imágenes, mapa) | Google | |
| Qué posicionan Kyero, Green-Acres, Properstar e Idealista en "cheap houses in <país>" (tres países) | Google | |
| Actualizaciones de Google del mes y si coinciden con un cambio nuestro | https://status.search.google.com | |
| Google Trends: "buy house in Italy", "akiya", "cheap houses Spain" (12 meses) | https://trends.google.com | |
| Enlaces nuevos y de qué acción vinieron | Search Console, Enlaces | |
| Cambios de ley del mes (visados, impuestos a extranjeros): ¿hay que publicar una entrada con fecha? | fuentes de cada guía | |

## Del informe (scripts/seo_report.py)

- Familias con más clics por página: repetir.
- Familias con muchas páginas y cero impresiones: mejorar, fusionar o dejar sin indexar (regla de poda, seis meses).
- Títulos flojos (sección 7): reescribir los cinco primeros.
- Búsquedas de oro (sección 5): comprobar que su página sigue respondiendo bien.
- Caídas (sección 10): si hay aviso, análisis escrito en docs/seo/experimentos.md.

## Acta

| Fecha | Funcionó | No funcionó | Qué sigue |
| --- | --- | --- | --- |
| | | | |
