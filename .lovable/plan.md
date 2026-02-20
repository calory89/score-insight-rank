

# Plan: Analisis Real con Extraccion de Datos del Listing

## Problema Actual

La funcion de analisis recibe la URL pero NO entra a la pagina web. Solo envia la URL al modelo de IA que "inventa" datos basandose en lo que puede inferir del texto de la URL. Por eso el precio, tamano y caracteristicas no coinciden con la propiedad real.

## Solucion

Integrar **Firecrawl** para hacer scraping real de la pagina del listing antes de enviar los datos al modelo de IA. Asi el analisis se basa en datos reales extraidos de la pagina.

## Pasos

### 1. Conectar Firecrawl
- Conectar el servicio de Firecrawl al proyecto para tener acceso a la API de scraping
- Esto hara disponible `FIRECRAWL_API_KEY` como variable de entorno en las funciones backend

### 2. Modificar la funcion `analyze-property`

Flujo actual:
```text
URL --> IA adivina datos --> Guarda en BD
```

Nuevo flujo:
```text
URL --> Firecrawl extrae contenido real de la pagina --> IA analiza datos reales --> Guarda en BD
```

Cambios concretos en `supabase/functions/analyze-property/index.ts`:

- Antes de llamar al modelo de IA, hacer una llamada a la API de Firecrawl para extraer el contenido markdown de la pagina del listing
- Incluir el contenido real de la pagina en el prompt del modelo de IA, para que analice datos reales (precio, m2, habitaciones, localizacion, fotos, etc.)
- Actualizar el system prompt para indicar a la IA que debe extraer los datos exactos del contenido proporcionado, no inventarlos

### 3. Actualizar el prompt de la IA

Cambiar de:
> "Generate realistic data based on what you can infer from the URL"

A:
> "Extract the exact property data from the scraped content below. Use the real price, real size, real location. Do NOT invent data -- use only what is in the listing content."

Esto garantiza que el precio, tamano, habitaciones, localizacion y demas datos sean los reales de la propiedad.

### 4. Sin cambios en el frontend

La pagina de analisis (`Analysis.tsx`) y el dashboard ya funcionan correctamente. Solo cambia el origen de los datos -- ahora seran reales en lugar de inventados.

## Seccion Tecnica

### Firecrawl API Call (dentro del edge function)
```text
POST https://api.firecrawl.dev/v1/scrape
Body: { url: listingUrl, formats: ["markdown"], onlyMainContent: true }
```

### Flujo del Edge Function modificado
1. Recibir URL del usuario
2. Validar autenticacion
3. Llamar a Firecrawl para extraer contenido de la pagina (markdown)
4. Si Firecrawl falla, continuar con el flujo actual (solo URL) como fallback
5. Enviar contenido real + URL al modelo de IA para analisis
6. Guardar resultado en base de datos
7. Devolver analisis al usuario

### Manejo de errores
- Si Firecrawl no puede acceder a la pagina (paywall, CAPTCHA, etc.), el sistema hara fallback al analisis basado solo en URL con una nota indicando que los datos son estimados
- Timeout de Firecrawl: 30 segundos maximo

