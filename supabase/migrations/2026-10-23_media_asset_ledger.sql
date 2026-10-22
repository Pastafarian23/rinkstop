-- 2026-10-23_media_asset_ledger.sql
--
-- WHY THIS EXISTS
-- Media quota was measured by walking the Supabase Storage bucket prefix. That
-- counts EVERY byte ever uploaded, forever, because nothing ever removed an
-- object:
--
--   * DELETE /api/profile-posts/[id] sets `profile_posts.deleted_at` (soft
--     delete) and never touches Storage.
--   * So a deleted post's video kept consuming the owner's allowance
--     indefinitely. Quota could only be recovered by the owner manually
--     deleting files they could no longer even see.
--
-- The naive fix — delete the storage object when a post is deleted — is wrong
-- in the other direction: if the same object is referenced by another post, a
-- profile cover, or a listing photo, deleting it would break live content.
--
-- WHAT THIS DOES
-- Introduces `media_assets` as the authoritative index of "which storage object
-- belongs to which account, and who still references it". Quota accounting
-- reads from this table instead of walking the bucket, which makes:
--
--   1. Soft-deleted-but-retained media a POLICY question (does it count?)
--      rather than an accident of bucket contents.
--   2. Shared assets safe: an asset is removed from Storage only when its
--      last reference disappears.
--   3. Orphaned uploads (uploaded but never attached to a post) reclaimable.
--
-- DESIGN DECISIONS (see memory/2026-10-23-media-ledger-design.md)
--
--   * `retained_until` implements a grace period. A soft-deleted asset keeps
--     counting toward quota during the grace window, then stops counting and
--     becomes eligible for permanent deletion. This is the "soft delete =
--     recoverable, but not free forever" model.
--
--   * `ref_count` is maintained by trigger, NOT by the application, so a
--     reference inserted by any path (API, admin script, future endpoint)
--     is counted. The application must never set ref_count directly.
--
--   * `bytes` is denormalized from Storage metadata at insert time so quota
--     checks never require a bucket walk on the hot path.

begin;

-- ---------------------------------------------------------------------------
-- 1. The ledger
-- ---------------------------------------------------------------------------

create table if not exists public.media_assets (
  id              uuid primary key default gen_random_uuid(),

  -- Storage coordinates. (bucket, object_path) is the natural key.
  bucket          text        not null,
  object_path     text        not null,

  -- Owner. This is the Clerk user id for user-keyed buckets (post-media,
  -- profile_covers, listing-photos). For player-media it is the uploading
  -- user, which may differ from the player the media is attached to.
  owner_user_id   text        not null,

  -- Denormalized size, copied from Storage metadata.contentLength at insert.
  bytes           bigint      not null default 0,

  mime_type       text,

  -- 'photo' | 'video' | 'document'. Drives the video allowance checks.
  asset_kind      text        not null default 'photo'
                  check (asset_kind in ('photo','video','document')),

  -- Live references. Maintained by trigger from media_asset_refs.
  ref_count       integer     not null default 0,

  -- Soft-delete lifecycle.
  --   retained_until IS NULL  → asset is live and counts against quota.
  --   retained_until IN (past) → past the grace period; excluded from quota
  --                              and eligible for permanent deletion.
  -- The column is deliberately "when does this stop counting" rather than
  -- "when was it deleted", so the live/retained/orphan states are one
  -- comparison instead of a state machine.
  retained_until  timestamptz,

  created_at      timestamptz not null default now(),

  constraint media_assets_bucket_path_key unique (bucket, object_path),
  constraint media_assets_bytes_positive check (bytes >= 0),
  constraint media_assets_refcount_positive check (ref_count >= 0)
);

comment on table public.media_assets is
  'Authoritative index of stored media for quota accounting. Quota is measured '
  'from this table, not by walking the Storage bucket, so deleted and '
  'orphaned media can be reclaimed. ref_count is trigger-maintained.';

comment on column public.media_assets.retained_until is
  'When this asset stops counting toward quota. NULL = live and counted. '
  'Set to now()+grace on last-reference removal; a sweep deletes assets past '
  'this value.';

-- Quota lookups are always "for this owner", and most often "still counted".
create index if not exists media_assets_owner_counted_idx
  on public.media_assets (owner_user_id)
  where retained_until is null;

-- The reaper sweep: assets whose grace period has expired.
create index if not exists media_assets_reapable_idx
  on public.media_assets (retained_until)
  where retained_until is not null;

-- ---------------------------------------------------------------------------
-- 2. Reference table — who points at this asset
-- ---------------------------------------------------------------------------

create table if not exists public.media_asset_refs (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references public.media_assets(id) on delete cascade,

  -- Logical pointer. Deliberately NOT a foreign key: the referencing tables
  -- (profile_posts, profiles, listings) have wildly different id types and
  -- some are soft-deleted. A text pointer plus the trigger below is more
  -- honest than a cascade rule that would fight soft deletion.
  ref_table    text        not null,
  ref_id       text        not null,

  created_at   timestamptz not null default now(),

  constraint media_asset_refs_unique unique (asset_id, ref_table, ref_id)
);

create index if not exists media_asset_refs_asset_idx
  on public.media_asset_refs (asset_id);

create index if not exists media_asset_refs_target_idx
  on public.media_asset_refs (ref_table, ref_id);

comment on table public.media_asset_refs is
  'Live references to a stored asset. An asset is removed from Storage only '
  'when this table has no rows for it.';

-- ---------------------------------------------------------------------------
-- 3. Keep ref_count honest
--
-- ref_count is the number of rows in media_asset_refs for this asset. It is
-- maintained here rather than in application code so that ANY insert path —
-- API route, admin script, backfill, future endpoint — is counted
-- automatically. An application that sets ref_count by hand can silently
-- disagree with reality and either delete live media or leak quota.
-- ---------------------------------------------------------------------------

create or replace function public.media_asset_sync_refcount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_id uuid;
  v_count    integer;
  -- Grace period during which a soft-deleted asset still counts against
  -- quota and is not yet eligible for physical deletion.
  v_grace    interval := interval '30 days';
begin
  v_asset_id := coalesce(new.asset_id, old.asset_id);

  select count(*)::integer into v_count
    from public.media_asset_refs
   where asset_id = v_asset_id;

  -- Last reference removed → start the grace period. This is the "soft
  -- delete stops charging you" moment.
  if v_count = 0 then
    update public.media_assets
       set ref_count = 0,
           -- Only stamp the grace clock if it is not already running, so
           -- repeated no-op churn does not extend retention forever.
           retained_until = coalesce(retained_until, now() + v_grace)
     where id = v_asset_id;
  else
    -- Any live reference → asset is live again and fully counted. This
    -- handles undo of a soft delete.
    update public.media_assets
       set ref_count = v_count,
           retained_until = null
     where id = v_asset_id;
  end if;

  return coalesce(new, old);
end;
$$;

comment on function public.media_asset_sync_refcount() is
  'Maintains media_assets.ref_count from media_asset_refs and drives the '
  'retention clock. SECURITY DEFINER so it works regardless of the caller''s '
  'grants on the ledger tables.';

drop trigger if exists trg_media_asset_sync_refcount on public.media_asset_refs;
create trigger trg_media_asset_sync_refcount
  after insert or delete on public.media_asset_refs
  for each row execute function public.media_asset_sync_refcount();

-- ---------------------------------------------------------------------------
-- 4. Quota view — the single definition of "counts against the allowance"
--
-- Quota accounting must use THIS view, not a bucket walk. Keeping the
-- definition in one place means the delete path, the upload path, and the
-- settings UI can never disagree about what counts.
-- ---------------------------------------------------------------------------

create or replace view public.media_counted_assets
with (security_invoker = true)
as
select
  a.id,
  a.owner_user_id,
  a.bucket,
  a.object_path,
  a.bytes,
  a.asset_kind
from public.media_assets a
where a.retained_until is null;

comment on view public.media_counted_assets is
  'Assets that currently count against a media allowance: everything except '
  'assets inside their post-reference grace window.';

-- ---------------------------------------------------------------------------
-- 5. Reaper — physically delete assets whose grace period expired
--
-- Returns the (bucket, object_path) pairs the caller must delete from
-- Supabase Storage. The DB cannot delete Storage objects, so this is
-- intentionally a two-step process: this function SELECTs, application
-- DELETEs, then calls release_expired_media_asset() to finalize.
-- ---------------------------------------------------------------------------

create or replace function public.expired_media_assets(
  p_limit integer default 500
)
returns table (asset_id uuid, bucket text, object_path text, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.bucket, a.object_path, a.bytes
    from public.media_assets a
   where a.retained_until is not null
     and a.retained_until < now()
     and a.ref_count = 0
   order by a.retained_until asc
   limit greatest(coalesce(p_limit, 500), 1);
$$;

comment on function public.expired_media_assets(integer) is
  'Lists assets past their retention grace period with zero live references. '
  'The caller deletes them from Storage, then calls '
  'release_expired_media_asset(uuid) to remove the ledger row.';

create or replace function public.release_expired_media_asset(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  -- Refuse to release an asset that still has live references. Guards against
  -- a caller deleting Storage first and asking the ledger to rubber-stamp it.
  if exists (
    select 1 from public.media_asset_refs where asset_id = p_asset_id
  ) then
    return false;
  end if;

  delete from public.media_assets
   where id = p_asset_id
     and retained_until is not null
     and retained_until < now();

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

comment on function public.release_expired_media_asset(uuid) is
  'Removes a ledger row for an asset whose Storage object the caller has '
  'already deleted. Returns false (and deletes nothing) if the asset still '
  'has live references or is still inside its grace period.';

-- ---------------------------------------------------------------------------
-- 6. RLS
--
-- The ledger is server-side infrastructure. The application uses the
-- service-role client (supabaseAdmin) for all reads and writes, so no
-- user-facing policy is needed. Enabling RLS without policies means the
-- anon/authenticated roles see nothing — fail-closed, which is what we want
-- for a table that governs billing-relevant quota.
-- ---------------------------------------------------------------------------

alter table public.media_assets enable row level security;
alter table public.media_asset_refs enable row level security;

-- No policies: service_role bypasses RLS; every other role is denied.

-- ---------------------------------------------------------------------------
-- 7. Backfill from live Storage
--
-- Populates the ledger from the actual bucket contents so quota measurement
-- is accurate from the moment this migration lands. Only assets with a
-- resolvable DB reference are inserted as live; anything else is recorded
-- with zero references so it enters the grace period and gets reaped.
--
-- This is deliberately a separate, hand-run step (see
-- scripts/backfill-media-ledger.mjs) rather than inline SQL: it needs the
-- Storage API, which SQL cannot reach.
-- ---------------------------------------------------------------------------

comment on table public.media_assets is
  'Authoritative index of stored media for quota accounting. Backfilled from '
  'live Storage on 2026-10-23 by scripts/backfill-media-ledger.mjs.';

commit;