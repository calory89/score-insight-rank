# RealHunt v2 — Plan de Migración + Nueva Plataforma

Esto es un proyecto enorme (15+ rutas nuevas, 12 tablas nuevas, panel admin, dashboard, auth, seed data). Lo voy a ejecutar en **olas incrementales** para que puedas validar progreso real al final de cada una, en vez de un único entregable gigante de varias horas que probablemente rompa cosas.

---

## FASE 0 — Migración crítica (PRIMERO, separado)

**Objetivo**: Mover el landing actual a `/homescoring` sin tocar nada de su contenido, y dejar `/` libre.

1. En `src/App.tsx`: añadir ruta `/homescoring` que renderiza el `Index` actual.
2. Crear nuevo `src/pages/IndexNew.tsx` (placeholder temporal "Coming soon — RealHunt v2") y montarlo en `/`.
3. Crear `src/components/LegacyBanner.tsx` con el aviso y montarlo encima del Index legacy solo cuando esté en `/homescoring`.
4. Buscar enlaces internos a `/` que sean del producto legacy (CTAs del scoring, "volver al inicio", etc.) y redirigirlos a `/homescoring` cuando aplique. **No** tocar enlaces neutros de marca.
5. Verificar: `/homescoring` funciona, `/` muestra placeholder.

**Entregable de Fase 0**: legacy preservado + ruta nueva libre. Te aviso para que valides antes de seguir.

---

## FASE 1 — Esquema de base de datos + seed

1. Migración Supabase con las 12 tablas (`countries`, `developers`, `projects`, `project_scores`, `commission_terms`, `agents`, `agent_applications`, `dossier_downloads`, `slot_reservations`, `pipeline_entries`, `saved_searches`).
2. RLS según especificación (público lee catálogo; agentes solo sus propios datos; admin escribe).
3. Función `is_realhunt_admin()` reutilizando el patrón existente `is_admin()` (admin sigue siendo `rrppspain@gmail.com`).
4. Seed de los 20 proyectos + sus developers + countries + scores + commission_terms vía `supabase--insert`.
5. EcoBeachCity con `is_owned_by_realhunt = true` y disclosure completo.

---

## FASE 2 — Homepage nueva (`/`)

Reemplazar el placeholder por el homepage completo de la Parte 2.A:
- Navbar nuevo (sticky)
- Hero + mock visual de tabla de ranking (Bloomberg-style)
- Sección de dolor
- 4 pilares
- Preview de metodología (5 dimensiones)
- Disclosure EcoBeachCity
- 4 country preview tables (UAE, España, Indonesia, México) con datos reales del seed
- Sección "Free for agents"
- FAQ (10 preguntas del apéndice)
- CTA final
- Footer nuevo

Componentes reutilizables: `<ScoreBadge>`, `<ProjectCard>`, `<CountryPreviewTable>`.

Diseño: deep navy `#0B1426`, gold `#C9A961`, score green/amber/red, fuentes Fraunces + Inter + JetBrains Mono. Todo en `index.css` + `tailwind.config.ts` con tokens HSL.

---

## FASE 3 — Browse + Countries + Country detail

- `/browse` — grid maestro filtrable de todos los proyectos
- `/countries` — grid de tarjetas país (con stats agregados)
- `/countries/:slug` — ranking filtrable por país, sidebar de filtros, SEO meta + JSON-LD ItemList

---

## FASE 4 — Project detail + Methodology + For Developers

- `/projects/:slug` — página pública con dossier y reserva bloqueados detrás de auth
- `/methodology` — long-form con 14 secciones
- `/for-developers` — landing B2B con 3 tiers + form de aplicación

---

## FASE 5 — Agent apply + Auth + Dashboard

- `/apply` — formulario que inserta en `agent_applications`
- `/login` — magic link (Supabase auth ya existe, adaptar)
- `/dashboard` + sub-rutas (`/dashboard/pipeline`, `/dashboard/saved`, `/dashboard/projects/:slug` con dossier desbloqueado)
- Botones de "Reserve slot" y "Download dossier" funcionales para agentes verificados

---

## FASE 6 — Admin panel

- `/admin/projects`, `/admin/agents`, `/admin/countries`, `/admin/developers`, `/admin/analytics`
- Reutiliza el `Admin.tsx` existente o crea uno paralelo. CRUD funcional con shadcn Table + Dialog + Form.
- Cola de aprobación de agentes con asignación de `agent_number` secuencial.

---

## Decisiones clave que tomo por defecto (avísame si no)

1. **PostHog y Resend NO se instalan ahora** — no hay secrets configurados y añaden fricción. Uso eventos vacíos (stub) y emails vía edge function existente. Cuando estés listo me das las API keys.
2. **Magic-link auth**: uso el `AuthContext` existente. Añado opción magic-link a la pantalla de login actual sin romper email/password ni Google.
3. **Admin = mismo usuario actual** (`rrppspain@gmail.com`) vía `is_admin()` existente. No creo sistema de roles nuevo todavía.
4. **El landing legacy en `/homescoring` queda intocable** — ni un pixel cambia salvo el banner superior.
5. **No borro nada del producto antiguo** (Dashboard, Analysis, Portfolio, etc.) — siguen accesibles. El nuevo producto vive en paralelo. Más adelante decides si los retiras.
6. **Imágenes de proyectos**: como no tengo fotos reales de Solaya/Armani/etc., uso placeholders con gradiente + nombre del proyecto sobre el navy corporativo. Marco en admin que faltan fotos reales. Si prefieres que genere imágenes con AI dímelo (cuesta créditos).

---

## Tiempo estimado de ejecución

- Fase 0: rápida (~5 min de tool calls)
- Fase 1: media (migración + 20 inserts)
- Fases 2-6: cada una es sustancial. **Voy a parar al final de cada fase** y resumirte qué quedó hecho para que puedas revisar el preview antes de seguir.

---

## Pregunta antes de empezar

¿Procedo así, fase por fase, **empezando por Fase 0 + Fase 1 ahora mismo en este turno**? ¿O prefieres que ejecute las 7 fases seguidas sin pausa (más rápido pero más riesgo de errores acumulados sin que puedas validar)?

Por defecto, si apruebas tal cual, hago **Fase 0 + Fase 1** en este turno y te paso el preview.
