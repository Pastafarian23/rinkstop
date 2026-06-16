# Phase 4 Test Plan — Account Type Login + User Flow

## Test Accounts (ready, Clerk + Supabase verified)

All accounts use the same password: `RinkStopPhase4!2026`

| Type | Email | Tier | Tier-Driven Features |
|---|---|---|---|
| player | kiloclaw+phase4-player@rinkstop.com | free | View own profile, claim records |
| parent | kiloclaw+phase4-parent@rinkstop.com | supporter | Linked players, claim kid's records |
| coach | kiloclaw+phase4-coach@rinkstop.com | verified | Manage teams (claimed), analytics |
| scout | kiloclaw+phase4-scout@rinkstop.com | free | Watchlist, followed players |
| referee | kiloclaw+phase4-referee@rinkstop.com | supporter | Officiated games log |
| rink_operator | kiloclaw+phase4-rink_operator@rinkstop.com | verified | Rinks owned, leads received |
| league_admin | kiloclaw+phase4-league_admin@rinkstop.com | free | Leagues managed, member tools |
| team_admin | kiloclaw+phase4-team_admin@rinkstop.com | verified | Teams managed, roster edits |
| business | kiloclaw+phase4-business@rinkstop.com | pro | Listings, leads dashboard |
| fan | kiloclaw+phase4-fan@rinkstop.com | free | Followed teams/players |

## Test Sequence (per account type)

For each of the 10 accounts above:

1. **Sign-in flow**
   - Open https://rinkstop.com/login
   - Enter the email
   - Enter the password
   - **Expected:** Redirects to https://rinkstop.com/dashboard

2. **Dashboard landing**
   - **Expected:** Nav bar shows the relevant links for this account type
     - Always: Profile, Favorites, Connections, Messages, Reviews, Support, Listings (if business)
     - Plus: Manage (if team/league/rink claimed), Admin (if super_admin)
   - **Expected:** A type-specific card (TypeSectionCard) appears with the right
     headline (e.g. "Your player profile is live" for player type)

3. **Tier badge**
   - **Expected:** Tier badge in the header shows the correct tier (Free / Supporter / Verified / Pro)

4. **Type-specific pages**
   - **player:** /dashboard/claims, /profile/{username}
   - **parent:** /dashboard/claims, /directory/players (browse)
   - **coach:** /dashboard/claims, /dashboard/manage/team/[id] (if claimed)
   - **scout:** /directory/players (browse + follow)
   - **referee:** /directory/games (browse officiated)
   - **rink_operator:** /dashboard/leads, /dashboard/manage/rink/[id]
   - **league_admin:** /dashboard/manage/league/[id]
   - **team_admin:** /dashboard/manage/team/[id]
   - **business:** /dashboard/listings, /dashboard/leads
   - **fan:** /dashboard/connections, /dashboard/favorites

5. **Sign-out**
   - Click user button → sign out
   - **Expected:** Redirected back to /

6. **Edge cases (in priority order)**
   - Try a deep link while signed out: /dashboard/manage/team/abc123
     - **Expected:** 307 to /login?redirect_url=/dashboard/manage/team/abc123
     - After login: should land on the deep link, not just /dashboard
   - Try /admin while signed in as a non-admin (e.g. player)
     - **Expected:** 403 or redirect, NOT the admin panel
   - Try /admin while signed in as a super_admin (the 2 existing super_admins)
     - **Expected:** Admin panel loads

## Known Gaps (per the existing code)

1. **No username** — all 10 test accounts have username=NULL. UsernameBanner should
   show, prompting to set one. Test this.
2. **No profile_views tracking** — the player section hardcodes "Your player profile is live"
   rather than showing a count. Verify it renders gracefully.
3. **No scout_watchlist / referee_games tables** — `loadDashboardTypeData` catches
   missing tables and renders "loaded: false" with a generic CTA. Verify the CTA shows.
4. **No team_owners / rink_owners for the test accounts** — coach/rink_operator/etc.
   will see "0 teams managed" / "0 rinks owned" in their TypeSectionCard. Verify
   the empty state renders cleanly.

## How to Run This Test Plan

1. Use the login cheat sheet below
2. Go through steps 1-5 for EACH of the 10 accounts
3. Make notes on what works, what's broken, what's confusing
4. Reply to me with findings — I'll fix any gaps

## Login Cheat Sheet (bookmark this)

```
Email template: kiloclaw+phase4-{type}@rinkstop.com
Password:       RinkStopPhase4!2026

player          → kiloclaw+phase4-player@rinkstop.com
parent          → kiloclaw+phase4-parent@rinkstop.com
coach           → kiloclaw+phase4-coach@rinkstop.com
scout           → kiloclaw+phase4-scout@rinkstop.com
referee         → kiloclaw+phase4-referee@rinkstop.com
rink_operator   → kiloclaw+phase4-rink_operator@rinkstop.com
league_admin    → kiloclaw+phase4-league_admin@rinkstop.com
team_admin      → kiloclaw+phase4-team_admin@rinkstop.com
business        → kiloclaw+phase4-business@rinkstop.com
fan             → kiloclaw+phase4-fan@rinkstop.com
```

The `+phase4-{type}` is a Gmail-style subaddress — Clerk treats it as a unique
email, but it's easy to remember. All emails go to the same Gmail inbox.
