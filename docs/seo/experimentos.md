# Cuaderno de experimentos y de cambios

Una sola página. Cada línea: fecha, cambio, hipótesis, cómo se mide y resultado. Lo que no se apunta aquí no se puede
relacionar después con una subida o una bajada. Las publicaciones quedan además en https://realhunt.co/releases.json
(una línea por versión publicada: fecha, versión, casas y páginas indexables), para marcarlas en cualquier gráfica.

## Cómo se hace un experimento

1. Una sola cosa cambia. Se elige una familia de páginas y se parte en dos mitades por una regla fija
   (por ejemplo: la suma de los códigos de las letras de la dirección es par o impar), nunca a mano.
2. Dura cuatro semanas como mínimo. No se toca nada más en esa familia.
3. Se mide con Search Console (clics e impresiones de cada mitad) usando scripts/seo_report.py con la exportación
   de páginas. Con menos de 200 impresiones por mitad no hay conclusión: se apunta "sin datos suficientes".
4. Se escribe el resultado aunque sea nulo.

## Registro

| Fecha | Cambio | Hipótesis | Cómo se mide | Resultado |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Pase de calidad de rastreo: noindex en páginas flojas, títulos, migas, 23 sitemaps | Google rastrea más páginas útiles | Indexadas en Search Console a 4 semanas | pendiente |
| 2026-11-14 | Familias de listados nuevas (/homes por precio, tipo, rasgo, región) | Más búsquedas de cola larga | Impresiones de la familia "listing" | pendiente |
| 2026-11-15 | Archivos para asistentes (JSON por país, OpenAPI, /es/llms.txt), directorio de portales, datos clave por país | Citas en asistentes de IA y enlaces | GA4 rh_ai_referral; robots de IA en registros; enlaces nuevos | pendiente |
| 2026-11-15 | Vista previa grande de imagen permitida (googlebot max-image-preview:large) | Entrar en Discover con las entradas semanales | Search Console, Discover | pendiente |
| 2026-11-15 | Fecha legible por máquina en las páginas con fecha real de cambio | Mejor frescura en resultados | Sin medida directa | pendiente |

## Experimento preparado, sin empezar: descripciones de los listados por precio

- Familia: /homes/<país>/under-<precio> en inglés.
- Mitad A: la descripción empieza por el precio mínimo.
- Mitad B: la descripción empieza por el número de casas.
- Regla de reparto: suma de los códigos de los caracteres de la dirección, par a A e impar a B.
- Duración: cuatro semanas desde el día en que se publique.
- Medida: clics entre impresiones de cada mitad, con la exportación de páginas.
- Estado: no aplicado. Las descripciones de esa familia las escribe seo/listings y las ajusta seo/polishMeta.ts;
  el cambio debe hacerlo quien lleva esos archivos para no romper la comprobación de descripciones duplicadas.

## Plantilla de análisis de una caída de más del 20 %

- Semana afectada y cifras (del informe, sección 10):
- Familias y países donde cae (secciones 2 y 4):
- Qué se publicó en los 14 días anteriores (releases.json y este cuaderno):
- Actualización de Google en esas fechas (https://status.search.google.com):
- Errores del sitio en esas fechas (avisos del flujo "Uptime check" en GitHub, registros de Cloudflare):
- Qué pasó, en dos frases:
- Qué se cambia y cuándo se vuelve a mirar:
