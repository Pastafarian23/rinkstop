# Supabase Support Ticket — Region Move Request

Copy/paste the text below into the Supabase support form at
https://supabase.com/dashboard/support/new. Replace anything in
[brackets] with your actual values.

---

**Subject:** Region move: ap-northeast-1 → us-east-1 (Pro plan, project ref `yszheonqyyskkjoxoexk`)

**Project ref:** `yszheonqyyskkjoxoexk`
**Current region:** ap-northeast-1 (Tokyo)
**Target region:** us-east-1 (Virginia)
**Plan:** Pro (confirmed on dashboard 2026-10-12)
**Requester:** [your name], [your email]

---

**Request:** Please migrate this project from ap-northeast-1 to us-east-1. We're on the Vercel Pro plan with the function deployed in `iad1` (US East). Every Supabase query currently round-trips from Virginia to Tokyo (~180ms RTT). Moving to us-east-1 will colocate with Vercel and save ~100-150ms per round-trip on our public pages.

**Why now:** Our 28-day GSC traffic data (1,174 total clicks across 79 countries) shows 57.6% of clicks come from USA+Canada+UK. The current Tokyo region adds 180ms of pure network latency for 100% of users in exchange for ~30ms saved for the 0.6% who come from the Philippines. The user base is US/CA/EU-dominated and growing; latency is now a real cost.

**Acceptable downtime window:** 15 minutes is fine, ideally during a US/CA low-traffic period. We have automated daily backups verified against Supabase's own physical backups (WAL-G, 8+ days of COMPLETED backups) so we can roll back to a snapshot if the migration corrupts anything.

**Pre-migration work we've done on our end:**
- Backup cron (5:00 UTC) now verifies Supabase physical backups via the Management API; if the migration breaks our connection, we'll know within hours
- 10 critical indexes added for country/city/active queries (2026-10-12) so the move won't land on a slow DB
- 6 routes converted to ISR (2026-10-12) so cache hits will continue serving during the move
- Smoke test ready: `bash scripts/vercel-post-deploy-smoke.sh` validates 10 critical URLs

**Post-migration steps we'll take on our end:**
1. Update `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` in Vercel (project + production env) to the new us-east-1 URL
2. Redeploy
3. Run the post-deploy smoke test
4. Re-run `recover-postgrest.mjs --check` to confirm the schema cache + RPC health
5. Re-enable the backup cron

**Verification query we ran already:** the project's current status is `ACTIVE_HEALTHY` and 8+ days of daily physical backups are `COMPLETED`. We're not asking for an emergency move — this is a planned optimization.

**Estimated request:** can you confirm:
1. The migration is supported on Pro without extra cost
2. Your recommended maintenance window
3. Whether the move is zero-downtime or requires us to take the app offline for X minutes
4. What `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` change (same hostname suffix, different region prefix, or full swap)

Thanks,
[your name]
