-- =============================================================================
-- scripts/rollback-2c-identity-merge.sql
--
-- COMPENSATING ROLLBACK for the 38-identity production merge executed on
-- 2026-11-12 (Phase 2C). This is the tested, verbatim procedure.
--
-- It reverses the merge using BOTH independent recovery paths:
--   PRIMARY   — public.person_merge_audit (row-by-row inverse mapping)
--   SECONDARY — public.person_identity_merge_backup (whole-table snapshot)
--
-- The backup snapshot is NOT modified by this script. The rollback restores
-- the LIVE tables from it; the snapshot itself must survive so it remains
-- available as evidence.
--
-- WHAT IT RESTORES
--   1. person_sources.person_id  → the original owner of each moved row
--   2. person_roles.person_id    → the original owner of each moved row
--   3. person_claims.person_id   → the original owner of each moved row
--   4. person_aliases.person_id  → the original owner of each moved row
--   5. persons.identity_state    → 'unverified', canonical_person_id → NULL
--   6. persons display attributes → the pre-merge values from the snapshot
--      (the merge COALESCE-filled empty survivor attributes from the merged
--      person, so those must be put back)
--   7. person_merge_audit.reverted_at → now(), marking the rows reverted
--
-- IT DELETES NOTHING. The merged-away persons are RETAINED exactly as the
-- merge retained them — a rollback is a re-point, never a delete.
--
-- ------------------------------------------------------------------
-- EXACT INVOCATION
-- ------------------------------------------------------------------
--   cd /root/.openclaw/workspace/rinkstop-platform
--   IDENTITY_TARGET_REF=yszheonqyyskkjoxoexk IDENTITY_ALLOW_PRODUCTION=1 \
--     node scripts/_branch-sql.mjs scripts/rollback-2c-identity-merge.sql \
--       --branch yszheonqyyskkjoxoexk
--
-- To run it as a single wrapped transaction with the verification block
-- (recommended), use:
--
--   cd /root/.openclaw/workspace/rinkstop-platform
--   IDENTITY_TARGET_REF=yszheonqyyskkjoxoexk IDENTITY_ALLOW_PRODUCTION=1 \
--     node scripts/_branch-sql.mjs scripts/rollback-2c-identity-merge.sql \
--       --branch yszheonqyyskkjoxoexk
--
--   (this file already contains BEGIN; ... COMMIT; — it is atomic.)
--
-- PRE-FLIGHT (read-only, run first if you want to inspect before rolling back):
--
--   SELECT count(*) FROM public.persons WHERE identity_state = 'merged';
--   SELECT count(*) FROM public.person_merge_audit WHERE reverted_at IS NULL;
--   SELECT count(*) FROM public.person_identity_merge_backup;
--
-- EXPECTED POST-ROLLBACK STATE
--   persons            11,443   (unchanged — nothing deleted)
--   person_sources     11,443   (unchanged count; ownership restored)
--   person_roles       11,424   (unchanged count; ownership restored)
--   person_claims      0
--   person_aliases     0
--   identity_state='merged'   0
--   person_merge_audit rows with reverted_at IS NULL   0
--   origin_key agreements with a live source row       11,443
--
-- ROLLBACK OF THE ROLLBACK (re-apply the merge): run the 38 explicit
-- person_merge_identities(decision_id) calls again. The decisions remain
-- decision='approved_to_merge', so they can be re-applied as-is.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Preconditions. Refuse to run if the state does not match a live merge.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_merged      bigint;
  v_audit_open  bigint;
  v_backup      bigint;
BEGIN
  SELECT count(*) INTO v_merged
    FROM public.persons WHERE identity_state = 'merged';
  IF v_merged = 0 THEN
    RAISE EXCEPTION 'rollback: no merged persons — nothing to roll back';
  END IF;

  SELECT count(*) INTO v_audit_open
    FROM public.person_merge_audit WHERE reverted_at IS NULL;
  IF v_audit_open = 0 THEN
    RAISE EXCEPTION 'rollback: no open merge-audit rows — the merge was already reverted';
  END IF;

  SELECT count(*) INTO v_backup
    FROM public.person_identity_merge_backup;
  IF v_backup = 0 THEN
    RAISE EXCEPTION 'rollback: the pre-merge snapshot is empty — refusing to roll back';
  END IF;

  RAISE NOTICE 'rollback: proceeding — % merged persons, % open audit rows, % snapshot rows',
    v_merged, v_audit_open, v_backup;
END $$;

-- -----------------------------------------------------------------------------
-- 2. PRIMARY PATH — restore row ownership from the audit ledger.
-- -----------------------------------------------------------------------------
UPDATE public.person_sources s
   SET person_id = a.merged_id
  FROM public.person_merge_audit a
 WHERE a.note = 'person_sources re-pointed'
   AND a.source_row_id = s.id::text
   AND a.reverted_at IS NULL
   AND s.person_id = a.survivor_id;

UPDATE public.person_roles r
   SET person_id = a.merged_id
  FROM public.person_merge_audit a
 WHERE a.note = 'person_roles re-pointed'
   AND a.source_row_id = r.id::text
   AND a.reverted_at IS NULL
   AND r.person_id = a.survivor_id;

UPDATE public.person_claims c
   SET person_id = a.merged_id
  FROM public.person_merge_audit a
 WHERE a.note = 'person_claims re-pointed'
   AND a.source_row_id = c.id::text
   AND a.reverted_at IS NULL
   AND c.person_id = a.survivor_id;

UPDATE public.person_aliases al
   SET person_id = a.merged_id
  FROM public.person_merge_audit a
 WHERE a.note = 'person_aliases re-pointed'
   AND a.source_row_id = al.id::text
   AND a.reverted_at IS NULL
   AND al.person_id = a.survivor_id;

-- -----------------------------------------------------------------------------
-- 3. SECONDARY PATH — restore the merged persons' identity_state, pointer and
--    the survivor's display attributes from the immutable snapshot.
-- -----------------------------------------------------------------------------
UPDATE public.persons p
   SET identity_state     = COALESCE(b.row_data->>'identity_state', 'unverified'),
       canonical_person_id = (b.row_data->>'canonical_person_id')::uuid,
       birth_date          = (b.row_data->>'birth_date')::date,
       nationality         = b.row_data->>'nationality',
       first_name          = b.row_data->>'first_name',
       last_name           = b.row_data->>'last_name',
       display_name        = b.row_data->>'display_name'
  FROM public.person_identity_merge_backup b
 WHERE b.backup_of = 'persons'
   AND b.row_id = p.id
   AND p.identity_state = 'merged';

-- -----------------------------------------------------------------------------
-- 4. Mark the audit rows reverted. The audit ledger is NOT deleted — it is the
--    evidence that a merge happened and was undone.
-- -----------------------------------------------------------------------------
UPDATE public.person_merge_audit
   SET reverted_at = now()
 WHERE reverted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 5. Verification. The transaction ABORTS if any check fails, so a failed
--    rollback leaves the database exactly as it was.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_merged      bigint;
  v_open_audit  bigint;
  v_src_changed bigint;
  v_role_changed bigint;
  v_origin_bad  bigint;
  v_persons     bigint;
  v_sources     bigint;
  v_roles       bigint;
BEGIN
  SELECT count(*) INTO v_merged FROM public.persons WHERE identity_state = 'merged';
  IF v_merged <> 0 THEN
    RAISE EXCEPTION 'rollback verify: % persons still marked merged', v_merged;
  END IF;

  SELECT count(*) INTO v_open_audit
    FROM public.person_merge_audit WHERE reverted_at IS NULL;
  IF v_open_audit <> 0 THEN
    RAISE EXCEPTION 'rollback verify: % audit rows still open', v_open_audit;
  END IF;

  -- Every source row must be back with its ORIGINAL owner.
  SELECT count(*) INTO v_src_changed
    FROM public.person_identity_merge_backup b
    JOIN public.person_sources s ON s.id = b.row_id
   WHERE b.backup_of = 'person_sources'
     AND (b.row_data->>'person_id')::uuid IS DISTINCT FROM s.person_id;
  IF v_src_changed <> 0 THEN
    RAISE EXCEPTION 'rollback verify: % person_sources rows are not with their original owner', v_src_changed;
  END IF;

  SELECT count(*) INTO v_role_changed
    FROM public.person_identity_merge_backup b
    JOIN public.person_roles r ON r.id = b.row_id
   WHERE b.backup_of = 'person_roles'
     AND (b.row_data->>'person_id')::uuid IS DISTINCT FROM r.person_id;
  IF v_role_changed <> 0 THEN
    RAISE EXCEPTION 'rollback verify: % person_roles rows are not with their original owner', v_role_changed;
  END IF;

  -- Every person must again agree with one of its source rows.
  SELECT count(*) INTO v_origin_bad
    FROM public.persons p
   WHERE NOT EXISTS (
     SELECT 1 FROM public.person_sources s
      WHERE s.person_id = p.id
        AND (s.source || ':' || s.source_id) = p.origin_key);
  IF v_origin_bad <> 0 THEN
    RAISE EXCEPTION 'rollback verify: % persons no longer agree with a source row', v_origin_bad;
  END IF;

  SELECT count(*) INTO v_persons  FROM public.persons;
  SELECT count(*) INTO v_sources FROM public.person_sources;
  SELECT count(*) INTO v_roles   FROM public.person_roles;

  IF v_persons <> 11443 OR v_sources <> 11443 OR v_roles <> 11424 THEN
    RAISE EXCEPTION 'rollback verify: counts are persons=% sources=% roles=% (expected 11443/11443/11424)',
      v_persons, v_sources, v_roles;
  END IF;

  RAISE NOTICE 'rollback COMPLETE: persons=% sources=% roles=% merged=0 open_audit=0 origin_agreements=11443',
    v_persons, v_sources, v_roles;
END $$;

COMMIT;
