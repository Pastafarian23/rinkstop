-- Tier rename 2026-06-17: refresh the comment on profiles.is_founding_member so
-- anyone reading \d+ profiles sees the current tier names (Starter+, not
-- Supporter+). The original 2026-06-08 migration is left untouched as a
-- historical artifact; this keeps the live comment in sync without rewriting
-- history. The webhooks/stripe handler that actually awards the flag is in
-- code and was updated as part of commit 7d8e9f1.

COMMENT ON COLUMN profiles.is_founding_member IS 'True for the first 500 paying members (Starter+). One-time scarcity lever — never awarded again once the cap is hit.';