

## Problemas identificados y soluciones

### Problema 1: El AI inventa datos que no existen en el listing
El listing dice "Size: Ask agent" pero el sistema muestra 72 m². No menciona ano de construccion pero muestra "Built 1985". Esto es porque el modelo AI rellena campos aunque no esten en el contenido scrapeado.

**Solucion:**
- Actualizar el prompt del sistema en la edge function con reglas explicitas:
  - Si el listing dice "Ask agent", "Contact agent", "Not specified" o similar para cualquier campo, devolver `null`
  - Si el tamano no aparece LITERALMENTE como numero en el contenido, devolver `size_sqm: null`
  - Si el ano de construccion no aparece explicitamente, devolver `year_built: null`
- Anadir validacion post-AI: comparar los valores devueltos contra el contenido scrapeado. Si `size_sqm` o `year_built` no aparecen como texto en el contenido, forzar a `null`
- En la UI (Analysis.tsx), mostrar "Not specified" en vez del valor cuando sea null, y ocultar metricas derivadas (precio/m2) si no hay tamano

### Problema 2: Precio incorrecto - dos precios en el listing
El listing tiene dos precios: Guide Price de 320,500 (para el plan Homewise over-60s) y precio de mercado completo de 485,000. El AI eligio 485,000 pero el usuario ve 320,500 como precio principal en Rightmove.

**Solucion:**
- Actualizar el prompt para que cuando existan multiples precios en un listing, el AI use el precio de mercado completo (full market value) pero lo indique claramente en el `ai_summary` y `primary_insight`, mencionando ambos precios
- Anadir una nota visible en la UI cuando el precio tiene condiciones especiales (como esquemas Lifetime Lease, shared ownership, etc.)

### Problema 3: Foto de propiedad no disponible
Cuando no se puede extraer una foto real del listing, no mostrar ningun placeholder ni imagen rota.

**Solucion:**
- En Analysis.tsx, solo renderizar el bloque de imagen si `image_url` o `listing_image_url` contiene una URL valida (empieza con http)
- No mostrar nada si no hay imagen real

---

### Detalles tecnicos

**Archivo: `supabase/functions/analyze-property/index.ts`**

1. Ampliar las instrucciones del sistema prompt (lineas ~250-262):
```
- If listing says "Ask agent", "Contact agent", "POA", "Not specified" for size: set size_sqm to null
- If year_built is NOT explicitly stated as a number in the content: set year_built to null  
- NEVER estimate or guess size_sqm or year_built - only use values EXPLICITLY written in the listing
- When multiple prices exist (e.g. Lifetime Lease vs market value), use the FULL MARKET VALUE as the price, but explain both in ai_summary
```

2. Anadir validacion post-AI (despues de linea ~671, tras los clamp checks):
```typescript
// Validate size_sqm against scraped content - null out if not found in text
if (scrapedContent && analysis.size_sqm != null) {
  const sizeStr = String(Math.round(analysis.size_sqm));
  const sqftEquiv = String(Math.round(analysis.size_sqm * 10.7639));
  const contentLower = scrapedContent.toLowerCase();
  const hasSizeInContent = contentLower.includes(sizeStr + " m") || 
    contentLower.includes(sizeStr + "m") ||
    contentLower.includes(sqftEquiv + " sq") ||
    contentLower.includes(sqftEquiv + "sq") ||
    /\d+['′]\d+/.test(scrapedContent); // room dimensions like 14'5
  const hasAskAgent = contentLower.includes("ask agent") || contentLower.includes("not specified");
  if (hasAskAgent || !hasSizeInContent) {
    analysis.size_sqm = null;
  }
}

// Validate year_built
if (scrapedContent && analysis.year_built != null) {
  const yearStr = String(analysis.year_built);
  if (!scrapedContent.includes(yearStr)) {
    analysis.year_built = null;
  }
}
```

**Archivo: `src/pages/Analysis.tsx`**

3. En la seccion de property header (~linea 390+), condicionar la muestra de size y year_built:
- Solo mostrar "X m2 / Y ft2" si `d.size_sqm` no es null
- Solo mostrar "Built XXXX" si `d.year_built` no es null
- Solo mostrar precio/m2 si `d.size_sqm` no es null
- Solo renderizar imagen si la URL es valida (empieza con "http")

4. Redesplegar la edge function `analyze-property`

