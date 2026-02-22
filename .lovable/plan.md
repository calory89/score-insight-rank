

## Deteccion Dinamica de Multiples Propiedades en Sitios de Proyectos

### Problema actual
El sistema tiene las 3 propiedades de ecobeachcity.com hardcodeadas en el codigo. Si el sitio cambia precios, agrega propiedades, o si otro sitio de desarrollador tiene multiples propiedades, el sistema no lo detectaria. Ademas, el hardcoding ha causado problemas repetidos de cache y deteccion.

### Solucion
Reemplazar el bloque hardcodeado de ecobeachcity por un sistema dinamico que:
1. Scrape la pagina normalmente
2. Use la IA para detectar si hay multiples propiedades en el contenido
3. Si detecta multiples propiedades, genere un analisis separado para cada una
4. Mantenga la excepcion especial de scores altos (90-94) SOLO para ecobeachcity.com

### Detalles Tecnicos

**Edge Function** (`supabase/functions/analyze-property/index.ts`):

1. **Eliminar el bloque hardcodeado** (lineas 385-469) de ecobeachcity
2. **Nuevo flujo para sitios con multiples propiedades**:
   - Despues de scrapear el contenido, enviar un prompt especial a la IA pidiendo que detecte si hay multiples propiedades listadas
   - Si la IA detecta 2+ propiedades, generar un analisis completo para cada una
   - Para ecobeachcity.com especificamente: aplicar los overrides de scores (90-94, verdict "Exceptional", year_built 2026) despues del analisis de la IA
3. **Prompt de deteccion multi-propiedad**: Un prompt previo al analisis principal que pregunta a la IA: "Does this page contain multiple distinct property listings? If yes, extract each one separately with name, price, size, bedrooms, bathrooms"
4. **Flujo de respuesta**: Si hay multiples propiedades, se insertan todas en la base de datos y se devuelve la principal (la del medio en precio, como ahora)

**Nuevo orden de operacion**:
1. URL parsing y auth
2. Cache global check
3. Scraping del contenido
4. Deteccion multi-propiedad con IA (prompt rapido con gemini-2.5-flash)
5. Si multi-propiedad: analisis individual de cada una con IA
6. Si single-propiedad: analisis normal (flujo actual)
7. Override de scores para ecobeachcity.com (post-analisis)
8. Guardar en base de datos

**Beneficios**:
- Funciona con CUALQUIER sitio de desarrollador que liste multiples propiedades
- Los datos siempre estan actualizados (precios, unidades disponibles)
- El scraper ya funciona correctamente con ecobeachcity.com (confirmado)
- Elimina el codigo fragil hardcodeado que ha causado problemas repetidos

