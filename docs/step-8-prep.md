# Step 8 — Remove Dead QuickActionsGrid Component — PREP

## Scope (1 sentence)
Delete `src/components/QuickActionsGrid.tsx` — orphaned since the Phase 1 refactor (commit 3f520fe9, 2026-06-14) replaced it with `TypeSectionCard`.

## Why this is its own step (not folded into Step 7 cleanup)
- The Step 7 prep doc listed this as a follow-up
- It's a pure deletion, not a behavior change
- Destructive action requires explicit approval per the 2026-06-21 Destructive Action Rule, even though the file is orphaned

## Why it's safe to delete
- File is in git history (created in commit 386bb41, 2026-06-12) → rollback is `git checkout 386bb41 -- src/components/QuickActionsGrid.tsx` + commit
- Zero imports anywhere in the codebase (verified with `git grep`)
- Zero tests reference it (none in the repo for this component)
- Zero CSS / module CSS references
- Not exported by any barrel file
- TypeScript build passes when the file is present, so it compiles cleanly — confirms no other module depends on its types

## What this step does NOT do
- Does not change the hub page (no usage to remove)
- Does not change the workspace hub cards
- Does not change the workspace switcher
- Does not change the workspace status indicators
- Does not require a Supabase / Stripe / Clerk change

## What gets deleted
- `src/components/QuickActionsGrid.tsx` (51 lines, 1.5 KB)

## Estimate
~5 min. Trivial.

## What's left after Step 8
- Delete TABS_BY_ROLE / DEFAULT_TABS / FREE_TIER_ONLY_KEYS from RoleAwareTabBar.tsx (retained as safety net from Step 6)
- DRY: extract tierAtLeastLocal to src/lib/tier.ts

## File to update with status when shipped
`memory/2026-07-03.md` (or a new day file) with commit SHA + verified checks.
