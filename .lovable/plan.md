

## Safe Upgrade Pass 8: Next-Level Features

After auditing the full product, here are the highest-impact improvements to make the product truly mind-blowing -- each one additive, no breaking changes.

---

### 1. Global Leaderboard for the Game (Competitive Viral Loop)

Right now the game is fun but scores vanish. Adding a persistent leaderboard creates FOMO and competition.

- New DB table `game_scores` (user_id, score, total_rounds, played_at)
- Save score after each game for logged-in users
- Show "Top 10 This Week" leaderboard on the Game finished screen
- Show user's rank: "You're #47 out of 312 players this week"
- Leaderboard visible without login (drives signups)

| File | Change |
|------|--------|
| `src/pages/Game.tsx` | Save score to DB, show leaderboard on finish screen |
| DB migration | New `game_scores` table with RLS |

---

### 2. AI Property Roast (Shareable Entertainment Content)

After each analysis, generate a short, witty "AI Roast" of the property (1-2 sentences). Think: "This apartment costs more per m2 than a parking spot in Monaco. Bold."

- Add a "roast" field generated during analysis (via the existing edge function)
- Display as a shareable card on the Analysis page with a "Share Roast" button
- Creates viral Twitter/TikTok-worthy content users share organically
- Fallback: generate client-side from existing data (price/m2 vs city avg, score, verdict)

| File | Change |
|------|--------|
| `src/pages/Analysis.tsx` | Add roast card section with share button |
| Edge function (future) | Generate roast during analysis |

---

### 3. "This or That" Quick Compare Mode

A new lightweight game mode: show 2 properties side by side, user picks which is the better deal, reveal scores.

- Reuses existing `analyses` data
- New route `/compare-game` or section within `/game`
- More engaging than single-card swipe, creates debates users share
- "I picked the $2M villa in Bali over the London flat and I was RIGHT"

| File | Change |
|------|--------|
| New: `src/pages/CompareGame.tsx` | Side-by-side comparison game |
| `src/App.tsx` | Add route |
| `src/components/BottomNav.tsx` | Optional: replace or add tab |

---

### 4. Animated Score Counter (Premium Feel)

When a report loads, the global score should count up from 0 to the actual value with an animated counter (like a speedometer). Right now it just appears statically.

- Use framer-motion `useSpring` or `animate` to count from 0 to score
- Add a circular progress ring around the score number
- Color transitions from red -> yellow -> green as it counts up
- Creates a "wow" moment users screenshot and share

| File | Change |
|------|--------|
| `src/pages/Analysis.tsx` | Animated score counter with circular ring |

---

### 5. Daily Deal Notification + "Property of the Day"

Surface one high-scoring property each day that everyone sees, creating shared conversation.

- Edge function or client-side: pick the highest-scoring new analysis from the last 24h
- Show as a banner on Dashboard: "Today's Top Deal: 92/100 in Lisbon"
- Clickable to view the full report
- Creates daily return habit

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add "Property of the Day" banner at top |

---

### 6. Keyboard Shortcuts in Game (Power User Delight)

- Left/Right arrow keys to swipe in the game
- Makes desktop experience feel native and fast
- Tiny change, big UX impact

| File | Change |
|------|--------|
| `src/pages/Game.tsx` | Add keydown listener for arrow keys |

---

### Implementation Priority

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| **1** | Game Leaderboard | High viral (competition) | Medium (DB + UI) |
| **2** | Animated Score Counter | High premium feel | Low (framer-motion) |
| **3** | Keyboard Shortcuts in Game | UX polish | Very low |
| **4** | Property of the Day | Daily retention | Low |
| **5** | AI Property Roast | Viral sharing | Medium |
| **6** | This or That Compare Game | Engagement | Medium |

**Phase 1 recommended: Features 1-4** (Leaderboard + Animated Score + Keyboard Shortcuts + Daily Deal). 1 new DB table, ~4 files modified, 0 new pages.

