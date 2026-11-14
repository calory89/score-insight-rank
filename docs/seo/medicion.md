# Medición: qué se envía, qué informes hay y cómo se etiquetan los enlaces

## Eventos (src/measure, se carga cuando el navegador está libre)

Solo se envían si el visitante aceptó las cookies de analítica (el mismo ajuste del aviso de cookies, `rh_consent`)
y si la etiqueta de Google Analytics ya está en la página. No se añade ningún proveedor nuevo y no viaja ningún dato
personal: ni direcciones, ni lo que se escribe en el buscador, ni identificadores.

| Evento | Cuándo | Parámetros |
| --- | --- | --- |
| rh_landing | una vez por sesión | landing_family, source_kind (ai, search, social, direct, other), source, page_lang |
| rh_ai_referral | la visita llega desde un asistente de IA | source (chatgpt, perplexity, claude, gemini, copilot...), landing_family |
| rh_family_view | cada página | page_family, page_lang |
| rh_value | alerta creada, clic al anuncio original, casa guardada, alta | action, landing_family, source_kind, source, page_family |
| rh_search_no_results | una búsqueda del sitio sin resultados | term_kind ("country:croatia" u "other"), page_lang |

Las familias de página son las de `seo/reach/families.json`, las mismas en los eventos y en los informes.

## Informes (scripts/)

| Informe | Orden | Necesita |
| --- | --- | --- |
| Posicionamiento por familia | `python3 scripts/seo_report.py [--gsc carpeta] [--archive data/seo-history]` | el build; con Search Console, su exportación |
| Robots de IA, 404 y Googlebot | `python3 scripts/log_report.py registros.ndjson` | exportación de registros de Cloudflare |
| Sitio caído | `python3 scripts/uptime_check.py` (lo ejecuta GitHub cada 30 minutos y avisa por correo si falla) | nada |
| Enlaces sin etiquetas | `python3 scripts/utm_check.py` | nada |
| Aviso a Bing y Yandex | `python3 scripts/indexnow.py [--dry-run]` (se ejecuta en cada publicación) | nada |

Ningún informe inventa una cifra: lo que falta aparece como "sin datos" con el archivo que hace falta.
Pruebas: `python3 -m unittest scripts/test_seo_reports.py`.

## Etiquetas de campaña en los enlaces propios

Todo enlace a realhunt.co que salga de un correo, una red social o una web propia lleva las tres etiquetas, en
minúsculas, sin espacios ni acentos:

| Etiqueta | Valores permitidos | Ejemplo |
| --- | --- | --- |
| utm_source | de dónde sale: newsletter, alerta, x, instagram, linkedin, telegram, whatsapp, o el nombre de la web propia | utm_source=newsletter |
| utm_medium | el tipo de canal: email, social, referral | utm_medium=email |
| utm_campaign | qué envío es, con fecha o nombre fijo: top10-2026-w46, alerta-precio, casas-nuevas | utm_campaign=top10-2026-w46 |

- Nunca se etiquetan los enlaces internos de la web (romperían la atribución de la visita).
- Nunca va un dato personal en una etiqueta (ni correo, ni nombre).
- `python3 scripts/utm_check.py` lista los enlaces (href) de correos y publicaciones que no las llevan. Los enlaces
  que se montan con variables no los ve: revísalos a mano al tocar una plantilla.
