# Pre-deploy gate

Single entry point for "is this PR safe to ship?". Replaces the older
`scripts/pre-push-guard.sh` (which is the git pre-push hook — still
wired up automatically). The pre-deploy gate is meant for **manual runs
during PR review** or before merging to main.

## Why this exists

Three bug classes slipped through the existing pre-push guard
(tsc + pnpm build + route collisions) in September 2026:

1. **2026-09-11 — invisible text.** 24 /learn subpages shipped with
   light-mode color values (`#041E42`, `#1a1a1a`, `#888`) on a dark-theme
   site (`#0D1117` page bg). HTTP 200, tsc clean, JSON-LD present — all
   green. The text was just invisible to users.

2. **2026-09-11 — uuid FK with Clerk.** The `learn_progress` migration
   declared `user_id uuid REFERENCES auth.users(id)`. Clerk user IDs are
   strings, not UUIDs. Every real user insert would have failed with
   `ERROR 22P02 invalid input syntax for type uuid`.

3. **2026-09-04 — 308 redirect loop investigation.** Earlier in the
   project's history, an alleged 308 redirect bug was chased across
   session boundaries when the actual fix was "the previous session
   ended in a renderer wedge and the message wasn't verified".

The pre-deploy gate catches classes 1 and 2 by adding **runtime** checks
on top of the existing **compile-time** checks:

| Gate | Type | Catches |
|---|---|---|
| 1. Working tree clean | trivial | uncommitted in-flight work |
| 2. `tsc --noEmit` | compile | TypeScript errors |
| 3. `pnpm build` + route collision | compile | Next.js route conflicts (the 2026-08-11 prod 500 class) |
| 4. **HTML color audit** (NEW) | runtime | light-mode hex on dark bg |
| 5. **Migration sanity** (NEW) | static | uuid FK to auth.users, missing RLS |
| 6. **Live RLS sanity** (NEW, optional) | runtime | real-DB RLS behavior |

The class 3 bugs are still on the team to spot (memory + lessons are the
only mechanism). Gates 1-6 reduce the surface.

## Usage

```bash
# Full gate (default — runs all 6 gates; gate 3 takes 60-120s)
./scripts/pre-deploy-gate.sh

# Fast feedback during development
./scripts/pre-deploy-gate.sh --skip-build

# Just the new gates (4, 5, 6) without the slow compile steps
./scripts/pre-deploy-gate.sh --only=4,5,6

# Enable the live RLS check (gate 6) — needs network access to dev DB
SUPABASE_LIVE_CHECK=1 RLS_PROBE_TABLE=learn_progress ./scripts/pre-deploy-gate.sh

# Or via npm
pnpm run check
```

## What gate 4 looks for

For each `src/app/**/page.tsx` modified in the last commit, the script:

1. Fetches the live production URL (`https://rinkstop.com/...`)
2. Strips `<script>` blocks (those contain JSON-LD and chunk hashes that
   aren't visual styling)
3. Greps for any of these hex values as `color:` values:
   - `#041E42` — RinkStop navy (invisible on `#0D1117` dark bg)
   - `#1a1a1a` — near-black text
   - `#444`, `#555`, `#666`, `#777`, `#888`, `#999` — light-mode grays
   - `#A0A0A0` — breadcrumb "current"
   - `#38BDF8` — ice-blue accent (off-brand + low contrast)
4. If any are present, the gate fails with the URL + the offending
   colors listed

The reference template for "what correct looks like" is
`src/app/guides/hockey-rules/page.tsx`:
- H1/H2: `color: '#fff'`
- Body: `color: 'rgba(255,255,255,0.55)'`
- Small print: `color: 'rgba(255,255,255,0.4)'`
- Accent: `color: '#C8102E'` (RinkStop red)

## What gate 5 looks for

For each new `.sql` file in `supabase/migrations/` modified in the last
commit, the script:

1. Greps for `user_id ... uuid ... REFERENCES auth.users(id)` — the
   2026-09-11 bug class. **Fails the gate.**
2. Notes (doesn't fail) when a `CREATE TABLE IF NOT EXISTS` doesn't
   have a corresponding `ENABLE ROW LEVEL SECURITY` line. May be
   intentional (anon-readable tables); verify by hand.

## What gate 6 looks for

If `SUPABASE_LIVE_CHECK=1`:

1. Reads `learn_progress` with the **anon key** from `.env.local`. RLS
   should hide user rows.
2. Reads the same with the **service role key** from
   `/root/.openclaw/credentials/supabase.json`. Should see all rows.
3. Logs both to stdout. Informational — you verify what you see
   matches the RLS design intent.

## Why is this not the git pre-push hook?

The pre-push hook (`scripts/pre-push-guard.sh`) is wired up via
`.git/hooks/pre-push` and runs automatically on `git push`. The
pre-deploy gate is meant for **PR review** and **manual pre-merge
checks** — the slow gates (3 = 60-120s, plus optional 6 with network)
would make every push feel slow. Use this one:

- Before merging a PR to `main`
- After running the migration apply script
- When you specifically suspect a visual or schema regression

For routine pushes, the pre-push hook (compile-time only) is fast
enough.

## Adding a new gate

Edit `scripts/pre-deploy-gate.sh`. Each gate is an `if should_run N`
block. Keep the pattern: `echo "[N/6] name..."`, then run checks,
increment `PASSED` / `FAILED` accordingly.

## See also

- `memory/fabrication-incidents.md` — entries for 2026-09-11 visual + uuid
- `memory/lessons.md` — "uuid-vs-text user_id pattern" lesson
- `MEMORY.md` § "Visual QC on new pages" — the color audit rule
- `TOOLS.md` rule 6 (Ship Gate) — original compile-time gate
- `TOOLS.md` rule 6a (Post-Merge Promote Verification) — Vercel alias check