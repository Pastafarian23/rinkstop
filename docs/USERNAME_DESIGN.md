# Username System Design — RinkStop

**Status:** Approved 2026-06-14
**Owner:** KiloClaw
**Reference:** Instagram username rules, adapted for `rinkstop.com/profile/[slug]`

---

## 1. Public Profile URL

**Pattern:** `https://rinkstop.com/profile/{username}`

- Username is a per-user public alias for the internal Clerk user ID
- Old route `/u/{clerkId}` is **removed entirely** (404, no redirect)
- Lookup is by `LOWER(username) = LOWER(slug)` for case-insensitive matching

---

## 2. Username Rules (Instagram-compatible)

### Allowed characters
- Lowercase letters: `a-z`
- Digits: `0-9`
- Period: `.`
- Underscore: `_`

### Length
- Minimum: **1 character**
- Maximum: **30 characters**

### Forbidden patterns
- ❌ Uppercase letters (normalized to lowercase on input)
- ❌ All-numeric usernames (e.g. `12345` is not allowed — must contain at least one letter)
- ❌ Leading or trailing period (`.john`, `john.`)
- ❌ Consecutive periods (`john..smith`)
- ❌ Period adjacent to underscore (`john._smith`, `john_.smith`)
- ❌ Spaces, dashes, or any other special characters
- ❌ Empty string
- ❌ Reserved slugs (see Section 4)

### Case handling
- All input is normalized to lowercase before storage and lookup
- `John.Smith`, `john.smith`, and `JOHN.SMITH` all resolve to the same profile
- Display: show the original-case version the user typed (lowercased) — no fancy title-case restoration

---

## 3. Change Cooldown

**Cooldown:** 14 days between any username changes (Instagram rule).

- A user can change their username at most once per 14 days
- The 14-day clock starts at the moment of the last change
- Tracked in `username_changes` table (most recent row per user)
- Old username is held for 14 days, then becomes available for re-registration

**Rationale:** Prevents username squatting, abuse, and "username jacking" where someone grabs a popular username, holds it, and tries to sell it back.

---

## 4. Reserved Slugs

The following are reserved and **cannot** be used as usernames:

### System routes
- `admin`, `api`, `login`, `signup`, `logout`, `register`
- `dashboard`, `profile`, `profiles`, `settings`, `account`
- `support`, `help`, `about`, `terms`, `privacy`, `legal`
- `directory`, `search`, `explore`, `discover`

### Brand
- `rinkstop`, `hockey`, `ice`, `rink`, `puck`

### Account types
- `team`, `league`, `player`, `coach`, `scout`, `referee`
- `rink_operator`, `league_admin`, `team_admin`
- `business`, `fan`, `parent`

### Reserved by intent (first-claim for potential future use)
- `stats`, `scores`, `news`, `games`, `schedule`
- `standings`, `leaderboard`, `rankings`

**Stored in:** `reserved_slugs` table (text, primary key)
**Managed by:** Manual `INSERT` / `DELETE` only — no app-side mutation
**Check at:** Username validation time (live, in API + UI)

---

## 5. User Experience

### First-time setup prompt
- Shown on **first dashboard visit** (when `profiles.username IS NULL`)
- Pre-populated with auto-suggestion from `display_name`:
  - `John Smith` → `john.smith`
  - `Mary O'Brien` → `mary.obrien` (apostrophe stripped)
  - `Coach 123` → `coach.123`
- Skip-able ("I'll do this later") — user lands on dashboard with a banner reminder
- Banner persists until username is set
- Can be dismissed for the session, but reappears on next login

### Editing in profile settings
- Field available at `/dashboard/profile`
- Live availability check (debounced, 300ms)
- On conflict, show 3-5 suggested alternatives:
  - `{slug}_`
  - `{slug}{n}` (n=1, 2, 3...)
  - `the.{slug}`
  - `{slug}.hockey`
- If user is **within the 14-day cooldown**, show:
  > "You can change your username again in {N} days"
  - Field is disabled, with a "Why?" tooltip explaining the cooldown

### Conflict messaging
- ❌ "This username is already taken" (boring but clear)
- ✅ "Already taken. Try one of these: john.smith_, john.smith2, the.john.smith"
- ✅ Inline suggestions clickable → auto-fills the input

### Reserved slug messaging
- ❌ "This username is reserved. Please choose another."
- No suggestions for reserved slugs (they're permanently off-limits)

### Forbidden character messaging
- "Usernames can only contain lowercase letters, numbers, periods, and underscores"
- "Usernames can't start or end with a period"
- "Usernames can't have consecutive periods"
- Each rule is a specific message, not a generic "invalid"

---

## 6. Database Schema

### Add to `profiles`
```sql
ALTER TABLE profiles ADD COLUMN username TEXT;

-- Case-insensitive unique index
CREATE UNIQUE INDEX profiles_username_unique 
  ON profiles (LOWER(username)) 
  WHERE username IS NOT NULL;

-- Lookup index (lowercased)
CREATE INDEX profiles_username_lower_idx 
  ON profiles (LOWER(username)) 
  WHERE username IS NOT NULL;
```

### New `reserved_slugs` table
```sql
CREATE TABLE reserved_slugs (
  slug TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data (see Section 4)
INSERT INTO reserved_slugs (slug, reason) VALUES
  ('admin', 'system'),
  ('api', 'system'),
  ('login', 'system'),
  ('signup', 'system'),
  ('logout', 'system'),
  ('register', 'system'),
  ('dashboard', 'system'),
  ('profile', 'system'),
  ('profiles', 'system'),
  ('settings', 'system'),
  ('account', 'system'),
  ('support', 'system'),
  ('help', 'system'),
  ('about', 'system'),
  ('terms', 'system'),
  ('privacy', 'system'),
  ('legal', 'system'),
  ('directory', 'system'),
  ('search', 'system'),
  ('explore', 'system'),
  ('discover', 'system'),
  ('rinkstop', 'brand'),
  ('hockey', 'brand'),
  ('ice', 'brand'),
  ('rink', 'brand'),
  ('puck', 'brand'),
  ('team', 'account_type'),
  ('league', 'account_type'),
  ('player', 'account_type'),
  ('coach', 'account_type'),
  ('scout', 'account_type'),
  ('referee', 'account_type'),
  ('rink_operator', 'account_type'),
  ('league_admin', 'account_type'),
  ('team_admin', 'account_type'),
  ('business', 'account_type'),
  ('fan', 'account_type'),
  ('parent', 'account_type'),
  ('stats', 'future_use'),
  ('scores', 'future_use'),
  ('news', 'future_use'),
  ('games', 'future_use'),
  ('schedule', 'future_use'),
  ('standings', 'future_use'),
  ('leaderboard', 'future_use'),
  ('rankings', 'future_use');
```

### New `username_changes` table
```sql
CREATE TABLE username_changes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  old_username TEXT,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup index for cooldown check
CREATE INDEX username_changes_user_recent 
  ON username_changes (user_id, changed_at DESC);
```

### New `username_holds` table (tracks recently-released slugs)
```sql
CREATE TABLE username_holds (
  slug TEXT PRIMARY KEY,
  previous_user_id TEXT NOT NULL,
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_at TIMESTAMPTZ NOT NULL
);

-- Cleanup index (for jobs that remove expired holds)
CREATE INDEX username_holds_available_at 
  ON username_holds (available_at);
```

---

## 7. API Routes

### `GET /api/usernames/check?slug=foo`
- Live availability check for the UI
- Response: `{ available: boolean, reason?: 'taken'|'reserved'|'invalid', suggestions?: string[] }`
- Debounced on the client (300ms)
- No auth required (publicly checkable for usability)

### `POST /api/usernames`
- Set or change the current user's username
- Auth required (Clerk session)
- Request: `{ username: string }`
- Response: `{ ok: true, username: string } | { ok: false, error: string, field?: string, suggestions?: string[] }`
- Errors:
  - `400` — invalid format
  - `409` — taken or reserved
  - `429` — within 14-day cooldown (response includes `next_change_at`)

### `GET /api/usernames/can-change`
- Auth required
- Response: `{ can_change: boolean, next_change_at?: string }`
- Used by the UI to disable the field

---

## 8. Library Code

### `src/lib/username.ts`
Pure functions, fully unit-testable:

```typescript
export const USERNAME_MIN_LENGTH = 1;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9._]+$/;
export const COOLDOWN_DAYS = 14;

export type UsernameValidation = 
  | { valid: true; normalized: string }
  | { valid: false; error: UsernameError; suggestions?: string[] };

export type UsernameError = 
  | 'too_short' 
  | 'too_long' 
  | 'invalid_chars'
  | 'all_numeric'
  | 'leading_period'
  | 'trailing_period'
  | 'consecutive_periods'
  | 'period_underscore_adjacent'
  | 'reserved'
  | 'taken';

export function validateUsername(input: string): UsernameValidation;
export function generateSlugFromName(name: string): string;
export function generateSuggestions(takenSlug: string, count?: number): string[];
export function normalizeUsername(input: string): string; // lowercase, trim
```

### `src/lib/username-server.ts`
Server-only helpers (talk to Supabase):

```typescript
export async function isUsernameAvailable(slug: string): Promise<boolean>;
export async function isReservedSlug(slug: string): Promise<boolean>;
export async function setUsername(userId: string, slug: string): Promise<Result>;
export async function canChangeUsername(userId: string): Promise<{ canChange: boolean; nextChangeAt?: Date }>;
export async function getUsernameChangeHistory(userId: string, limit?: number): Promise<UsernameChange[]>;
```

---

## 9. UI Components

### `<UsernameField />`
Reusable input component with:
- Live availability check (debounced)
- Inline error/success states
- Auto-suggestion on conflict
- "Available!" / "Taken" / "Reserved" status indicator
- Live preview: "Your profile will be at: **rinkstop.com/profile/john.smith**"
- Disabled state with tooltip when in cooldown

### `<UsernamePromptModal />`
First-dashboard-visit prompt:
- Shown via `<DashboardShell />` wrapper when `username IS NULL`
- Auto-suggestion from `display_name` pre-filled
- "Set username" / "I'll do this later" buttons
- If "later" → dismissable for the session, banner shows on dashboard

### `<ChangeUsernameDialog />`
Profile settings:
- Triggered by "Change username" button on `/dashboard/profile`
- Shows current username + last change date
- If in cooldown: shows "You can change again in N days", field disabled
- If outside cooldown: field enabled, full validation flow

### `<UsernameBanner />`
Persistent reminder:
- Yellow banner at top of dashboard when `username IS NULL`
- "Set your username to get a public profile URL" with CTA

---

## 10. Public Profile Page

### `src/app/profile/[slug]/page.tsx`
- Server component
- Lookup: `SELECT * FROM profiles WHERE LOWER(username) = LOWER($slug)`
- 404 if not found
- Renders the same UI as the old `/u/[userId]` page
- OG tags use the new URL pattern
- `buildUserShare()` updated to use `rinkstop.com/profile/[slug]`

### SEO
- `<title>`: `{displayName} (@{username}) · RinkStop`
- `<meta name="description">`: From profile bio, fallback to "{displayName}'s hockey profile on RinkStop"
- OG title: `{displayName} (@{username})`
- OG image: Profile avatar (or RinkStop default if none)
- Canonical URL: `https://rinkstop.com/profile/{username}`
- `rel="alternate"` and `rel="canonical"` properly set

### Social sharing
- Share button copies `https://rinkstop.com/profile/{username}` to clipboard
- Twitter, Facebook, LinkedIn all use this URL
- The existing `buildUserShare()` is updated; no per-platform pre-fill needed since each platform fetches the OG tags

---

## 11. Old Route Removal

### `src/app/u/[userId]/` — DELETED
- Delete the entire directory: `src/app/u/`
- Any existing link to `/u/{clerkId}` will **404**
- This is a **breaking change** documented in commit message and MEMORY.md
- Rationale: clean break, no legacy redirects polluting the codebase; users with no username set will be funneled back to the dashboard via the prompt

### Migration for existing data
- All 10 Phase 4 test accounts and any other existing users will have `username = NULL` after migration
- They'll see the username prompt on next dashboard visit
- For bulk seeding: optional `data/seed-usernames.mjs` script can auto-generate slugs for existing users (uses `display_name`, falls back to `user-{shortClerkId}`)

---

## 12. Build Order

1. ✅ Design doc (this file) — `docs/USERNAME_DESIGN.md`
2. Database migration — `supabase/migrations/2026-06-14-username-system.sql`
3. Library — `src/lib/username.ts` + `src/lib/username-server.ts` (with unit tests)
4. API routes — `/api/usernames/check`, `/api/usernames`, `/api/usernames/can-change`
5. Components — `<UsernameField />`, `<UsernamePromptModal />`, `<ChangeUsernameDialog />`, `<UsernameBanner />`
6. Wire into dashboard shell + profile page
7. Public profile page — `src/app/profile/[slug]/page.tsx`
8. Update `buildUserShare()` in `lib/share.ts`
9. Delete `src/app/u/` directory
10. Update MEMORY.md with the new URL pattern and the breaking change
11. Optional: seed existing test accounts

---

## 13. Out of Scope (Future)

- Username mentions (`@username`) in posts/comments
- Username search/autocomplete
- Username-based login (sign in with username instead of email)
- Vanity URL for businesses (separate system)
- Custom profile themes per tier

---

## 14. Open Questions for Later

- Should reserved slugs be case-sensitive in storage? (Currently: lowercase only)
- Should we add a "username history" view in profile settings? (Helpful for transparency, low priority)
- Should reserved slugs be 100% hidden, or shown as "unavailable" with a note? (Currently: hidden from suggestions)

---

**End of design doc. Ready for implementation.**
