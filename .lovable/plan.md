

# Fix: Navegacion rota en la pagina de analisis

## Problemas identificados

### 1. Boton "Back" no funciona desde la pagina del reporte
El boton usa `window.history.back()` que puede llevar al usuario de vuelta a `/analysis/loading`, re-activando el loader en un bucle. Necesita detectar si la pagina anterior es una ruta de carga y saltar al dashboard en su lugar.

### 2. Click en reportes del feed no muestra nada visible
Al clickar un reporte en "Top rated properties", se ejecuta `setPreviewId(report.id)` que renderiza un preview inline al final de la pagina, fuera de la vista del usuario. El usuario no ve nada porque no se hace scroll automatico hacia el preview.

**Solucion**: Hacer scroll automatico hacia el preview cuando se selecciona un reporte y tambien ofrecer un boton para abrir el reporte completo.

### 3. "See above" / "Click to view" lleva a pagina en blanco
Cuando el usuario clicka el banner "Your report is ready! Click to view", el codigo hace:
- `setAnalyzing(false)` y `setReadyReportId(null)` -- limpia el estado del FomoLoader
- `navigate(/analysis/ID, { replace: true })` -- cambia la URL

Pero el componente se re-renderiza y como `data` es null (no se ha cargado aun), cae en `if (!data) return null` (linea 824) y muestra una pagina en blanco hasta que el `useEffect` de fetch se ejecuta. El problema es una condicion de carrera entre la navegacion y la carga de datos.

**Solucion**: Usar `window.location.href` para forzar un reload completo de la pagina, o mejor, no limpiar el estado hasta que los datos esten cargados.

## Cambios tecnicos

### Archivo: `src/pages/Analysis.tsx`

**Cambio 1 - Back button inteligente (linea 849-857)**

Reemplazar la logica de `window.history.back()` para detectar si la pagina anterior es una ruta de carga:

```typescript
onClick={() => {
  if (fromBulk) {
    navigate("/dashboard?bulk=true&restore=true");
  } else {
    // Always go to dashboard — history.back() often goes to the loading page
    navigate("/dashboard");
  }
}}
```

**Cambio 2 - Scroll automatico al preview (linea 416-434)**

Agregar un `ref` al contenedor del preview y hacer `scrollIntoView` cuando se selecciona un reporte:

```typescript
const previewRef = useRef<HTMLDivElement>(null);

// On setPreviewId, scroll to preview
useEffect(() => {
  if (previewId && previewRef.current) {
    previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, [previewId]);
```

Ademas, agregar un boton "View full report" dentro del InlineReportPreview que navega al reporte completo con `window.location.href`.

**Cambio 3 - Fix pagina en blanco en "Click to view" (linea 777-782)**

Cambiar `navigate()` por `window.location.href` para forzar una carga completa de la pagina, evitando la condicion de carrera:

```typescript
onViewReady={() => {
  if (readyReportId) {
    window.location.href = `/analysis/${readyReportId}`;
  }
}}
```

Esto garantiza que la pagina se recarga completamente con el ID correcto en la URL, activando el fetch de datos desde cero.
