-- 2026-06-19_stripe_webhook_events.sql
-- Persist every Stripe webhook event so we can debug production issues
-- without grepping Vercel logs. Idempotent on event.id (Stripe retries
-- duplicate deliveries, we should never store the same event twice).

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,             -- Stripe event.id (evt_...)
  event_type text not null,                  -- e.g. checkout.session.completed
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed')),
  payload jsonb not null,                    -- full event.data.object for debugging
  processed_at timestamptz,
  error text,                                -- error message if status='failed'
  created_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_created_at_idx
  on public.stripe_webhook_events (created_at desc);

create index if not exists stripe_webhook_events_status_idx
  on public.stripe_webhook_events (status, created_at desc)
  where status in ('failed', 'received');

-- Only service role reads/writes this table.
-- RLS: deny all to anon + authenticated. Service role bypasses RLS.
alter table public.stripe_webhook_events enable row level security;

create policy "stripe_webhook_events_admin_select"
  on public.stripe_webhook_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = (auth.uid()::text)
        and role = 'admin'
    )
  );

-- No insert/update/delete policy for authenticated — service role only.
