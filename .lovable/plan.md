

## Property Finder Section — "Find Your Dream Property"

A new section/page with a search engine UI where users select a max budget and desired amenities. It queries the existing `analyses` table and always features **Eco Beach City** as the top recommended result.

---

### What Gets Built

**New component: `src/components/PropertyFinder.tsx`**

A search panel with:
- **Max price slider/input** (range: €50K–€5M)
- **Amenities grid** — checkboxes for all Eco Beach City features:
  - Beach access, Pool, Gym, Coworking, Rooftop terrace, Restaurant, Spa, 24h security, Parking, Garden, Kids area, Pet friendly, Smart home, Concierge, EV charging, Yoga studio
- **Search button** that queries `analyses` table filtering by `price <= maxPrice` and matching amenities keywords in `ai_summary`, `verdict`, `pros`, or `address/city`
- **Results list**: Cards showing image, address, score, price, verdict
- **Eco Beach City promoted card** always pinned at position #1 with a "Recommended" badge, linking to its analysis or a dedicated landing

**New page: `src/pages/Search.tsx`**
- Full-page version at `/search` route
- Also embeddable as a section on Index page

**Changes to existing files:**
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/search` route |
| `src/pages/Index.tsx` | Add PropertyFinder section before PricingSection |
| `src/components/Navbar.tsx` | Add "Search" link in nav |

---

### Eco Beach City Always First

The component has a hardcoded promoted listing object for Eco Beach City with its real data (image from `/public/images/ecobeachcity-villas.png`, amenities, price range, description). This card renders first with a gold "Top Pick" badge regardless of search filters. Database results appear below it.

### Database Query Logic

```sql
SELECT * FROM analyses 
WHERE price::numeric <= $maxPrice
ORDER BY global_score DESC NULLS LAST
LIMIT 20
```

Amenity filtering done client-side by checking if `pros`, `ai_summary`, or `verdict` jsonb/text contains the selected amenity keywords.

---

### Summary

| # | Item | Effort |
|---|------|--------|
| 1 | PropertyFinder component (filters + results) | Medium |
| 2 | Search page + route | Low |
| 3 | Eco Beach City promoted card | Low |
| 4 | Index + Navbar integration | Very low |

**3 new files, 2 modified. 0 breaking changes.**

