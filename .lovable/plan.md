

# Fix: "Analysis Failed" cuando el reporte ya existe en la base de datos

## Problema

Cuando la busqueda tarda mas de 180 segundos, el "safety timeout" se activa y muestra "Analysis Failed", incluso si el analisis ya se completo en el servidor y los datos estan en la base de datos. Esto pasa porque:

1. El timeout de seguridad (linea 639-642) fuerza `setAnalyzing(false)` y `setAnalyzeError(...)` sin comprobar si el reporte ya esta listo
2. La pantalla de error se muestra antes de verificar si hay datos disponibles
3. El polling cada 15s puede haber encontrado el resultado (`readyReportId`), pero el error screen tiene prioridad en el render

## Solucion

### Cambio 1: Safety timeout inteligente (linea 639-642)

Antes de mostrar el error, el timeout hara una consulta final a la base de datos. Si el analisis ya existe, redirige al usuario en lugar de mostrar el error.

```typescript
// Safety timeout: prevent infinite loading
const safetyTimeout = setTimeout(async () => {
  // Final DB check before showing error
  const pollUrl = analyzingUrlRef.current;
  if (pollUrl && pollUrl !== "manual-entry") {
    const normalizedUrl = pollUrl.split("#")[0].replace(/\/$/, "");
    const { data: saved } = await supabase
      .from("analyses")
      .select("id")
      .ilike("url", `${normalizedUrl}%`)
      .not("global_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (saved && saved.length > 0) {
      setAnalyzing(false);
      navigate(`/analysis/${saved[0].id}`, { replace: true });
      return;
    }
  }
  // Only show error if nothing found
  setAnalyzeError("Analysis is taking longer than expected...");
  setAnalyzing(false);
}, 180000);
```

### Cambio 2: Error screen verifica readyReportId

Si `readyReportId` ya existe cuando se muestra la pantalla de error, redirigir automaticamente en lugar de mostrar el error.

```typescript
// Before showing error screen, check if report is actually ready
if (analyzeError && !analyzing && readyReportId) {
  navigate(`/analysis/${readyReportId}`, { replace: true });
  return null;
}
```

### Cambio 3: Polling detecta resultado y limpia el error

Cuando el polling encuentra el resultado, si ya hay un error mostrandose, limpiarlo y navegar al reporte.

## Archivos a modificar

- `src/pages/Analysis.tsx` -- 3 cambios puntuales en la logica de timeout, error screen y polling

