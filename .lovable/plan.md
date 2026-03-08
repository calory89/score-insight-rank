

## Safe Upgrade Pass 5: Light Mode Default + Polish

### 1. Switch default theme to light mode

Currently `App.tsx` line 84 sets `defaultTheme="dark"`. The user explicitly wants white/light background as the default appearance.

**Fix:** Change `defaultTheme="dark"` to `defaultTheme="light"` in the `ThemeProvider`. Users who previously selected dark mode will keep their preference (stored in `localStorage` under `realhunt-theme`).

| File | Change |
|------|--------|
| `src/App.tsx` | `defaultTheme="dark"` → `defaultTheme="light"` |

**1 file modified. No breaking changes. Dark mode still fully available via toggle.**

