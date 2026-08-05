# Audit Batch D — Founded + N/A links

**Branch:** `audit-fixes-batch-d`
**Status:** Not started

## #3 Founded — template hardening

**Problem:** `PublicTeamProfile.tsx:655` and `TeamDetailClient.tsx:209` render `team.created_at` as "Founded". No real `founded_year` column exists on `team_workspaces`. This is a template-only fix for v1.

**Fix:**
- `src/app/directory/teams/[slug]/PublicTeamProfile.tsx` — suppress the Founded row when `team.founded_year` is null/undefined
- `src/app/directory/teams/[slug]/TeamDetailClient.tsx` — same conditional render

**Skip:** Data backfill (separate PR, needs external source data).

## #4 N/A links — investigate + guard

**Problem:** Some rink links render as `https://N/A`. The template at `CountryPageContent.tsx:121` uses `r.website_url || \`https://rinkstop.com/directory/rinks/${r.slug}\``, so either:
- `website_url` in DB literally contains "N/A" (data bug from bad import), or
- A different template path emits the literal string

**Fix:**
1. Run a Supabase query to count rinks where `website_url = 'N/A'` or `website_url ILIKE '%N/A%'`
2. If found, update those rows to NULL
3. Add a template guard: if `r.website_url` is null/empty/"N/A", skip the link entirely or use the fallback

**Skip:** Bulk cleanup of all empty website_urls — punt to Batch E.
