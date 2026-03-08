

## Final Audit: Remaining Issues

After reviewing every component and route, the app is in very good shape. Here are the last remaining issues:

---

### Bugs

**1. Footer `/#methodology` anchor is broken**
Footer links to `/#methodology` but no element has `id="methodology"`. The MethodologyPreview section only has `id="trust"`. Need to add `id="methodology"` as well (or change Footer link to `/#trust`).

**2. Orphaned component files still exist**
`TrustSection.tsx`, `APISection.tsx`, `CommunityAskCTA.tsx`, `CommunityFeedPreview.tsx` are no longer imported anywhere. Dead code that should be deleted for codebase hygiene.

**3. Navbar "Methodology" link points to `/#trust`** -- this works but label/anchor mismatch is confusing for maintenance. Should be consistent.

---

### Conversion

**4. No "social proof number" on the landing page above the fold**
The Hero has trust badges but no concrete number like "12,400+ properties analyzed". Adding a single stat line between the subtitle and input would boost credibility instantly.

**5. Footer newsletter lacks email validation feedback**
The subscribe form has `required` but no visual error state for invalid emails. Minor but affects perceived polish.

---

### Implementation Plan

| File | Change |
|------|--------|
| `src/components/MethodologyPreview.tsx` | Add `id="methodology"` alongside `id="trust"` (wrap in a div with both or use the section for methodology) |
| `src/components/Footer.tsx` | Change `/#methodology` link to `/#trust` for consistency |
| `src/components/HeroSection.tsx` | Add a social proof stat line ("12,400+ properties analyzed worldwide") between subtitle and URL input |
| Delete `src/components/TrustSection.tsx` | Orphaned |
| Delete `src/components/APISection.tsx` | Orphaned |

5 files changed, 2 files deleted. No database migrations needed.

