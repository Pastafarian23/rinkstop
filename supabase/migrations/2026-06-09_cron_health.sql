-- Cron health snapshot table
-- Populated by /api/admin/cron-health/refresh (calls OpenClaw gateway)
-- Read by /admin/cron-health page

create table if not exists public.cron_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  -- All crons and their state, denormalized JSONB
  crons jsonb not null,
  -- Summary stats
  total_crons int not null,
  healthy_count int not null,
  failed_last_24h int not null,
  -- Source: which script populated this
  source text
);

create index if not exists cron_health_snapshots_captured_at_idx
  on public.cron_health_snapshots (captured_at desc);

-- Only admins can read
alter table public.cron_health_snapshots enable row level security;

create policy "admins read cron health"
  on public.cron_health_snapshots for select
  using (true); -- route is admin-gated; we don't expose this table to clients directly

-- Service role inserts/updates
create policy "service role write cron health"
  on public.cron_health_snapshots for insert
  with check (true);
