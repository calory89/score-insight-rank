

# Mejoras en la experiencia de carga durante el analisis

## Cambios principales

### 1. Ordenar "Explore other reports" por mejor score (de mayor a menor)
Actualmente los reportes se ordenan por `created_at` descendente. Se cambiara a ordenar por `global_score` descendente para mostrar los mejores primero, como un mini-ranking.

### 2. Al hacer click en un reporte, mostrarlo debajo manteniendo el loader arriba
Cuando el usuario clicka un reporte del feed, en lugar de navegar fuera (perdiendo el estado de carga), se cargara el reporte inline debajo del loader. El loader principal sigue visible arriba, recordando al usuario que su busqueda sigue en proceso.

### 3. Mensaje "Tu reporte esta listo" cuando termine la busqueda principal
Cuando el polling detecta que el analisis principal ha terminado, en lugar de redirigir automaticamente (lo cual interrumpiria si el usuario esta explorando otro reporte), se mostrara un banner fijo tipo "Tu reporte esta listo -- Click para verlo" que el usuario puede pulsar cuando quiera.

## Detalles tecnicos

### Archivo: `src/pages/Analysis.tsx`

**FomoLoader** recibira nuevas props y estado:

- `onReportReady`: callback cuando el polling detecta el resultado listo, en lugar de navegar directamente
- `readyReportId`: el ID del reporte listo, para mostrar el banner
- `previewId` / `setPreviewId`: estado para el reporte que el usuario esta explorando inline

**Cambios especificos:**

1. **Ordenar por score**: cambiar `.order("created_at", { ascending: false })` a `.order("global_score", { ascending: false })` en la query de `recentReports`

2. **Estado de preview inline**: anadir `previewId` state al FomoLoader. Al clickar un reporte, en vez de `window.location.href`, se setea `previewId` y se carga los datos de ese analisis para mostrarlos debajo del loader

3. **Banner de reporte listo**: anadir `readyReportId` state. Cuando el polling encuentra el resultado, en vez de hacer `navigate()`, se guarda el ID y se muestra un banner sticky arriba: "Your report is ready! Click to view". Al clickar, navega al reporte.

4. **Vista previa del reporte explorado**: debajo del feed de reportes, si hay un `previewId`, se renderiza una version compacta del reporte (score, imagen, pros/cons, etc) cargada desde la DB.

### Flujo del usuario:

```text
[Usuario lanza busqueda]
        |
[Aparece FomoLoader con ranking de mejores reportes]
        |
[Usuario clicka un reporte del feed]
        |
[Loader sigue arriba + reporte explorado aparece abajo]
        |
[Polling detecta que la busqueda original termino]
        |
[Banner sticky: "Tu reporte esta listo! Click para verlo"]
        |
[Usuario clicka el banner -> navega a su reporte]
```

### Componente nuevo dentro del archivo:
- `InlineReportPreview`: componente ligero que muestra los datos basicos de un analisis (imagen, score, address, verdict, pros, cons) cargado por ID, renderizado inline debajo del FomoLoader.

