-- 2026-10-23: abuse forensics storage
--
-- WHY THIS TABLE EXISTS
--
-- The 2026-10-23 Singapore traffic incident (74,971 bot requests to
-- /directory/nhl/schedule in one day) could not be attributed after the fact.
-- Two independent reasons, both structural:
--
--   1. Vercel's runtime logs contain NO ip and NO userAgent. Their record fields
--      are: id, timestamp, deploymentId, projectId, level, message, source,
--      domain, requestMethod, requestPath, responseStatusCode, environment,
--      branch, cache, cacheReason, pprState, traceId, logs[].
--   2. Vercel's runtime log retention is effectively MINUTES, not days.
--      `vercel logs --since 1h|6h|24h|48d` all return the same newest-first
--      rows whose oldest timestamp is ~4 minutes back.
--
-- So identity (IP + UA) was never durably retained anywhere. The middleware now
-- emits structured JSON lines to stdout for tracked paths (see
-- src/lib/request-logger.ts), and this table is the durable sink.
--
-- PRIVACY CONTRACT
-- This table stores IP + User-Agent. That is deliberate and bounded:
--   - Only paths on the tracked list are logged (src/lib/request-logger.ts).
--   - Sampling: every new IP, every blocked request, plus a 2% sample of the rest.
--   - NEVER stored: cookies, authorization headers, session tokens, request
--     bodies, or query strings.
--   - Retention: rows older than 30 days are deleted by the collector cron.
--
-- ACCESS CONTROL — READ THE 2026-09-23 LESSON
--
-- Enabling RLS is NOT sufficient on its own. RLS filters rows, but the table-level
-- GRANT still lets anon/authenticated reach the table. This repo hit exactly that
-- in 2026-09-23 (see 2026-09-23_enable_rls_5_op_tables.sql): an RLS-enabled table
-- with no policies was still DELETE-able by anon. The fix is the same pattern used
-- there: REVOKE ALL from anon + authenticated, then GRANT to service_role only.
--
-- Verified after applying: anon SELECT on this table returns 0 rows AND the
-- service role (the collector cron) can write.

create table if not exists public.request_logs (
  id            bigserial primary key,
  occurred_at   timestamptz not null default now(),
  path          text        not null,
  method        text        not null default 'GET',
  status        integer     not null,
  ip            text        not null,
  user_agent    text,
  duration_ms   integer,
  claimed_bot   boolean     not null default false,
  limited       boolean     not null default false,
  tier          text
);

create index if not exists request_logs_occurred_at_idx on public.request_logs (occurred_at desc);
create index if not exists request_logs_path_idx on public.request_logs (path);
create index if not exists request_logs_ip_idx on public.request_logs (ip);

-- Retention helper. Called by the collector cron so old rows do not accumulate
-- forever. Retention window: 30 days.
create or replace function public.prune_request_logs(retain_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.request_logs
   where occurred_at < now() - make_interval(days => retain_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- RLS on (no policies = no row access even if a GRANT existed).
alter table public.request_logs enable row level security;

-- Deny at the privilege level too. Without this, anon/authenticated keep their
-- table-level GRANT and can still reach the table (the 2026-09-23 lesson).
revoke all on public.request_logs from anon, authenticated;
revoke all on public.request_logs from public;
grant all on public.request_logs to service_role;

-- The retention function is SECURITY DEFINER (it must delete despite RLS).
-- Revoke execute from anon/authenticated so only service_role can call it.
revoke all on function public.prune_request_logs(integer) from public, anon, authenticated;
grant execute on function public.prune_request_logs(integer) to service_role;

comment on table public.request_logs is
  'Abuse forensics: sampled IP + UA + path + status for tracked paths. '
  'Sourced from Vercel runtime logs via the collector cron. No cookies, '
  'no auth headers, no query strings. Retained 30 days.';
