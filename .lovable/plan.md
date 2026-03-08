

## 10 Nuevas Ideas WOW para RealHunt — Batch 3

Basado en auditoría profunda de lo que ya existe (Smart Notes, Saved Filters, Re-Analyze, Negotiation Letter, Investment Quiz, Comparison Matrix, Game, Rankings, Watchlist, Discover, Streaks, Referrals) — estas 10 ideas atacan gaps reales que el producto aún no cubre.

---

### 1. **Portfolio Tracker — Dashboard de Inversiones Reales**
Permite marcar propiedades como "compradas" con precio real de compra. Dashboard dedicado con: valor total del portfolio, ROI acumulado, distribución por país/ciudad (pie chart), timeline de adquisiciones.
- Nueva tabla `portfolio_properties` (user_id, analysis_id, purchase_price, purchase_date, status)
- Nueva página `/portfolio` con gráficos Recharts
- **Valor**: Convierte la app de herramienta puntual a plataforma de gestión patrimonial

### 2. **AI Property Scout — Alertas Inteligentes**
El usuario define criterios (ciudad, presupuesto min/max, score mínimo) y recibe notificaciones in-app cuando otro usuario analiza una propiedad que encaja.
- Nueva tabla `scout_alerts` (user_id, criteria JSON, active boolean)
- Check en `analyze-property` edge function post-análisis
- Notificación en NotificationsBell existente
- **Valor**: Retención pasiva — los usuarios vuelven sin esfuerzo

### 3. **Market Pulse — Páginas SEO por Ciudad**
Páginas públicas auto-generadas en `/market/:country/:city` con stats agregados: avg score, avg price, total analyses, top 5 propiedades, score distribution chart.
- Ruta nueva, query agregada desde `analyses`
- JSON-LD schema para SEO
- **Valor**: Superficie SEO masiva + autoridad por mercado

### 4. **PDF Export — Informe Profesional Descargable**
Botón "Download Report" en cada análisis que genera un PDF limpio con: header branded, scores, radar chart, pros/cons, AI summary, red flags. Feature Pro-only.
- Generación client-side con canvas + blob download
- Template HTML → canvas → PDF
- **Valor**: Entregable tangible para compartir con socios, bancos, agentes

### 5. **Due Diligence Checklist — Guía de Compra Interactiva**
Después de analizar una propiedad, aparece un checklist personalizado por país/tipo: documentos a pedir, inspecciones, preguntas al agente, trámites legales. Progreso guardado.
- Nueva tabla `due_diligence_items` (user_id, analysis_id, items JSON, completed_items JSON)
- Generado por AI basado en país y property_type
- **Valor**: Guía al usuario en el proceso real — stickiness brutal

### 6. **Achievement System — Badges de Logros**
Sistema de logros gamificados: "First Analysis", "10 Analyses", "First Compare", "7-Day Streak", "Portfolio Started", "First Review". Badges visibles en perfil, confetti on unlock.
- Nueva tabla `user_achievements` (user_id, achievement_key, unlocked_at)
- Checks automáticos en acciones clave
- Canvas-confetti ya instalado
- **Valor**: Dopamina + completionism = retención

### 7. **Collaborative Sharing — Compartir Análisis con Co-inversores**
Botón "Share with partner" que genera un link privado. El destinatario puede ver el análisis completo + dejar comentarios. No requiere cuenta (view-only) o con cuenta (comentarios).
- Nueva tabla `analysis_shares` (analysis_id, shared_by, shared_with_email, token, permissions)
- Ruta `/shared/:token` para acceso público read-only
- **Valor**: Viralidad orgánica — cada share trae un nuevo usuario potencial

### 8. **Smart Dashboard Widgets — Layout Personalizable**
El usuario puede elegir qué widgets ver en su dashboard: "Recent Analyses", "Watchlist", "Property of the Day", "Savings Calculator", "Portfolio Summary". Drag-to-reorder o toggle on/off.
- Preferencias guardadas en localStorage (simple) o profiles metadata
- Grid layout con toggles
- **Valor**: Cada usuario tiene SU dashboard — sensación premium de control

### 9. **Price History Timeline**
En cada análisis, mostrar un timeline visual de cambios de precio detectados. Para watchlist items, el sistema guarda snapshots del precio cada vez que se re-analiza.
- Ya existe `price_history` JSON en analyses + `initial_price`/`latest_price` en watchlist
- Visualizar como line chart con date axis
- **Valor**: "Set and forget" — el usuario vigila propiedades pasivamente

### 10. **Onboarding Personalized — Welcome Flow Mejorado**
Mejorar el onboarding existente (OnboardingWizard) con: selección de mercados de interés, presupuesto típico, objetivo (rental yield vs appreciation), idioma preferido. Estos datos alimentan las recomendaciones de Discover y Property Scout.
- Guardar preferencias en `profiles` (investor_type, preferred_markets, budget_range)
- Usar en queries de Discover para personalizar el feed
- **Valor**: Primera impresión premium + datos para personalización

---

### Ranking por Impacto

| # | Idea | Impacto | Esfuerzo |
|---|------|---------|----------|
| 1 | Portfolio Tracker | ★★★★★ | Medio |
| 2 | AI Property Scout | ★★★★★ | Medio |
| 3 | Market Pulse (SEO) | ★★★★★ | Medio |
| 4 | PDF Export | ★★★★☆ | Medio |
| 5 | Due Diligence Checklist | ★★★★☆ | Medio |
| 6 | Achievement System | ★★★☆☆ | Bajo |
| 7 | Collaborative Sharing | ★★★★☆ | Alto |
| 8 | Dashboard Widgets | ★★★☆☆ | Medio |
| 9 | Price History Timeline | ★★★☆☆ | Bajo |
| 10 | Onboarding Personalizado | ★★★★☆ | Bajo |

**Recomendación**: Empezar por **#1 Portfolio Tracker** + **#6 Achievement System** + **#9 Price History Timeline** (alto impacto, esfuerzo bajo-medio). Luego **#3 Market Pulse** para SEO y **#2 AI Property Scout** para retención.

