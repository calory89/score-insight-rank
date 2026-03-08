

## Safe Upgrade Pass 6: Viral Growth Features

After auditing the product, here are the highest-impact viral features to add -- each designed to create engagement loops, shareability, and FOMO similar to what makes social platforms addictive.

---

### Feature 1: "Deal or No Deal" Swipe Game (Highest Viral Potential)

A Tinder-style mini-game where users swipe through real properties and guess: **Good Deal or Bad Deal?** After swiping, the AI score is revealed with a satisfying animation. At the end of 10 rounds, users get a shareable scorecard: *"I spotted 8/10 deals correctly on RealHunt!"*

- New page: `/game` accessible from BottomNav and landing page
- Pulls random analyses from the database (public, score > 0)
- Swipe right = "Good Deal" (score > 70), left = "Bad Deal" (score < 50)
- Reveal animation with confetti on correct guesses
- End screen with score + share button (Web Share API)
- Creates a **viral sharing loop** -- friends click the link, play the game, sign up

### Feature 2: Hunt Streaks + Daily Challenge

Daily engagement loop inspired by Duolingo/Snapchat streaks:

- Track consecutive days with at least 1 analysis
- New database table `user_streaks` (user_id, current_streak, longest_streak, last_active_date)
- Streak badge on profile (fire emoji + count)
- "Daily Deal" -- one featured property shown each day that everyone analyzes, creating shared conversation
- Streak milestones unlock badges visible on profile

### Feature 3: Referral System with Bonus Analyses

Organic growth engine:

- New database table `referrals` (referrer_id, referred_id, created_at, bonus_granted)
- Each user gets a unique referral code (displayed on Profile + Settings)
- Referrer gets +3 free analyses per successful signup
- Referred user gets +2 bonus analyses on first login
- Referral leaderboard on Rankings page
- Shareable referral link with OG preview

### Feature 4: "Challenge a Friend" on Reports

After viewing any analysis, users can tap "Challenge: Can you find a better deal?" which:

- Generates a shareable link with the property score as the "score to beat"
- Friend clicks link, signs up, analyzes their property
- If they beat the score, both get a notification
- Creates competitive viral loop

### Feature 5: Interactive Market Heat Map

A visually stunning world map showing real-time market activity:

- New page: `/map` (or section on Discover)
- Aggregates analyses by city/country with average scores
- Color-coded bubbles (green = high score markets, red = risky)
- Clickable cities showing top 3 deals
- Highly shareable -- "Look at the hottest markets right now"

---

### Implementation Priority (Phase 1)

| Priority | Feature | Files | DB Migration |
|----------|---------|-------|-------------|
| **1** | Deal or No Deal Game | New: `src/pages/Game.tsx`, update `App.tsx`, `BottomNav.tsx` | None (reads existing `analyses`) |
| **2** | Referral System | New: `src/components/ReferralCard.tsx`, update `Profile.tsx`, `Settings.tsx` | New table: `referrals` |
| **3** | Hunt Streaks | New: `src/components/StreakBadge.tsx`, update `Profile.tsx`, `Dashboard.tsx` | New table: `user_streaks` |
| **4** | Challenge a Friend | Update `Analysis.tsx` | New table: `challenges` |
| **5** | Market Heat Map | New: `src/pages/Map.tsx` | None (aggregates existing data) |

**Phase 1 scope: Features 1-3** (Game + Referrals + Streaks). These create the core viral loop: Play game -> Share result -> Friend signs up via referral -> Analyzes property -> Maintains streak -> Shares again.

**3 new pages, 3 new components, ~8 files modified, 2 database migrations. All additive -- zero breaking changes.**

