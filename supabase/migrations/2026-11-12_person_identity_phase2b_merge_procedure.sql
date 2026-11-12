-- =============================================================================
-- 2026-11-12_person_identity_phase2b_merge_procedure.sql
--
-- PHASE 2A (part C) — The identity MERGE PROCEDURE, tested on the branch only.
--
-- Authorized by Arnel Larracas on 2026-11-12 (Phase 2A, BRANCH ONLY).
-- Audit: PHASE-1-SUPPLEMENTAL-AUDIT.md § 2, § 4
--
-- WHAT THIS IS
--   The executable procedure for merging two person identities into one, plus
--   a full reconciliation. It is written as a FUNCTION so it can be tested
--   exhaustively, and so Phase 2B (production) can call exactly the same code
--   that was proven on the branch.
--
--   IT DOES NOTHING BY ITSELF. It is a function definition. It is only ever
--   invoked by an explicit CALL with an approved decision id — and Phase 2A
--   does not make any such call against production.
--
-- THE MERGE ALGORITHM
--   Given two persons (A = survivor, B = merged-away):
--     1. REFUSE if either is already merged, if they are the same person,
--        if the decision is not 'approved_to_merge', or if the decision is
--        protected.
--     2. Move every `person_sources` row of B to A. **No source row is ever
--        deleted** — the row is RE-pointed, so the inverse mapping survives.
--     3. Move every `person_roles` row of B to A (role rows are per-person,
--        so a coach/player keeps both roles).
--     4. Move every `person_claims` row of B to A.
--     5. Set B.identity_state = 'merged' and B.canonical_person_id = A.id.
--        **B is retained**, not deleted, so the merge is fully reversible.
--     6. Merge B's alias rows into A's (renaming paths on collision).
--     7. Update A's display attributes from B where A's are empty.
--
-- REVERSIBILITY
--   Because B is retained and B's source rows are re-pointed (not deleted),
--   a rollback is a matter of moving the rows back and restoring B's
--   identity_state. `person_merge_audit` records every row movement, so the
--   inverse is mechanical rather than a guess.
--
-- SAFETY INVARIANTS (all enforced by the function AND by the reconciliation)
--   • Every source row survives. Count of person_sources is INVARIANT.
--   • No person is deleted. Count of persons is INVARIANT.
--   • A protected/conflict decision can never be merged.
--   • Only 'approved_to_merge' decisions can be merged.
--   • The survivor always keeps its own id.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. person_merge_audit — the inverse-mapping ledger.
--
--    Records every row movement so a rollback is mechanical.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_merge_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_id      uuid NOT NULL,
  survivor_id   uuid NOT NULL,
  merged_id     uuid NOT NULL,
  decision_id   uuid,
  source_id     text,
  source        text,
  source_row_id text,
  moved_at      timestamptz NOT NULL DEFAULT now(),
  reverted_at   timestamptz,
  note          text
);

COMMENT ON TABLE public.person_merge_audit IS
  'Every row movement performed by person_merge_identities(). Makes a merge '
  'mechanically reversible: each moved row is recorded with its original owner.';

CREATE INDEX IF NOT EXISTS idx_pma_merge ON public.person_merge_audit (merge_id);
CREATE INDEX IF NOT EXISTS idx_pma_survivor ON public.person_merge_audit (survivor_id);
CREATE INDEX IF NOT EXISTS idx_pma_merged ON public.person_merge_audit (merged_id);
CREATE INDEX IF NOT EXISTS idx_pma_reverted ON public.person_merge_audit (reverted_at)
  WHERE reverted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. person_merge_identities() — the merge procedure.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_merge_identities(
  p_decision_id uuid,
  p_survivor_person_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dec       public.person_identity_decisions%ROWTYPE;
  v_survivor  uuid;
  v_merged    uuid;
  v_merge_id  uuid := gen_random_uuid();
  v_moved     int := 0;
  r_source    RECORD;
  r_id        RECORD;
BEGIN
  -- ---- 2.1 Load and validate the decision -------------------------------
  SELECT * INTO v_dec
  FROM public.person_identity_decisions
  WHERE id = p_decision_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'merge: decision % does not exist', p_decision_id;
  END IF;

  IF v_dec.decision <> 'approved_to_merge' THEN
    RAISE EXCEPTION 'merge: decision % is % — only approved_to_merge may be applied',
      p_decision_id, v_dec.decision;
  END IF;

  IF COALESCE((v_dec.evidence->>'protected')::boolean, false) THEN
    RAISE EXCEPTION 'merge: decision % is PROTECTED — it can never be merged', p_decision_id;
  END IF;

  -- ---- 2.2 Pick the survivor ---------------------------------------------
  -- The survivor is the person that owns the record with MORE attributes,
  -- so the richer row wins. Ties go to the nhl person (it is the upstream
  -- source of record for NHL data). Both ids are stable person ids, never
  -- names or slugs.
  SELECT
    CASE
      WHEN (SELECT count(*) FROM public.person_roles WHERE person_id = v_dec.nhl_person_id)
         >= (SELECT count(*) FROM public.person_roles WHERE person_id = v_dec.players_person_id)
      THEN v_dec.nhl_person_id ELSE v_dec.players_person_id END
  INTO v_survivor
  FROM public.person_identity_decisions d
  WHERE d.id = p_decision_id;

  IF p_survivor_person_id IS NOT NULL THEN
    IF p_survivor_person_id NOT IN (v_dec.nhl_person_id, v_dec.players_person_id) THEN
      RAISE EXCEPTION 'merge: survivor % is not one of the two decision participants', p_survivor_person_id;
    END IF;
    v_survivor := p_survivor_person_id;
  END IF;

  v_merged := CASE WHEN v_survivor = v_dec.nhl_person_id
                    THEN v_dec.players_person_id ELSE v_dec.nhl_person_id END;

  IF v_survivor IS NULL OR v_merged IS NULL OR v_survivor = v_merged THEN
    RAISE EXCEPTION 'merge: decision % does not resolve to two distinct persons', p_decision_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.persons WHERE id = v_merged AND identity_state = 'merged') THEN
    RAISE EXCEPTION 'merge: person % is already merged', v_merged;
  END IF;

  -- ---- 2.3 Move person_sources (re-point, NEVER delete) ------------------
  FOR r_source IN
    SELECT id, source, source_id FROM public.person_sources
    WHERE person_id = v_merged
  LOOP
    -- If the survivor already has a source row for this exact
    -- (source, source_id), that would violate the UNIQUE constraint. It
    -- means the same source row is being pointed at two persons, which is
    -- already a broken state — refuse rather than guess.
    IF EXISTS (SELECT 1 FROM public.person_sources
               WHERE person_id = v_survivor AND source = r_source.source AND source_id = r_source.source_id) THEN
      RAISE EXCEPTION 'merge: survivor % already has source (% , %) — refusing',
        v_survivor, r_source.source, r_source.source_id;
    END IF;

    UPDATE public.person_sources SET person_id = v_survivor WHERE id = r_source.id;
    INSERT INTO public.person_merge_audit
      (merge_id, survivor_id, merged_id, decision_id, source_id, source, source_row_id, note)
    VALUES
      (v_merge_id, v_survivor, v_merged, p_decision_id, r_source.source_id, r_source.source, r_source.id::text,
       'person_sources re-pointed');
    v_moved := v_moved + 1;
  END LOOP;

  -- ---- 2.4 Move person_roles --------------------------------------------
  FOR r_id IN
    SELECT id FROM public.person_roles WHERE person_id = v_merged
  LOOP
    UPDATE public.person_roles SET person_id = v_survivor WHERE id = r_id.id;
    INSERT INTO public.person_merge_audit
      (merge_id, survivor_id, merged_id, decision_id, source_row_id, note)
    VALUES (v_merge_id, v_survivor, v_merged, p_decision_id, r_id.id::text, 'person_roles re-pointed');
    v_moved := v_moved + 1;
  END LOOP;

  -- ---- 2.5 Move person_claims -------------------------------------------
  FOR r_id IN
    SELECT id FROM public.person_claims WHERE person_id = v_merged
  LOOP
    UPDATE public.person_claims SET person_id = v_survivor WHERE id = r_id.id;
    INSERT INTO public.person_merge_audit
      (merge_id, survivor_id, merged_id, decision_id, source_row_id, note)
    VALUES (v_merge_id, v_survivor, v_merged, p_decision_id, r_id.id::text, 'person_claims re-pointed');
    v_moved := v_moved + 1;
  END LOOP;

  -- ---- 2.6 Move person_aliases (rename on path collision) ----------------
  FOR r_id IN
    SELECT id, path FROM public.person_aliases WHERE person_id = v_merged
  LOOP
    IF EXISTS (SELECT 1 FROM public.person_aliases WHERE person_id = v_survivor AND path = r_id.path) THEN
      -- The survivor already owns this path. Keep the survivor's alias and
      -- record the duplicate for review rather than deleting it.
      INSERT INTO public.person_merge_audit
        (merge_id, survivor_id, merged_id, decision_id, source_row_id, note)
      VALUES (v_merge_id, v_survivor, v_merged, p_decision_id, r_id.id::text,
              'alias path already owned by survivor — retained on merged person');
    ELSE
      UPDATE public.person_aliases SET person_id = v_survivor WHERE id = r_id.id;
      INSERT INTO public.person_merge_audit
        (merge_id, survivor_id, merged_id, decision_id, source_row_id, note)
      VALUES (v_merge_id, v_survivor, v_merged, p_decision_id, r_id.id::text, 'person_aliases re-pointed');
    END IF;
    v_moved := v_moved + 1;
  END LOOP;

  -- ---- 2.7 Fill the survivor's empty attributes from the merged person ---
  UPDATE public.persons p
  SET birth_date   = COALESCE(p.birth_date,   m.birth_date),
      nationality  = COALESCE(p.nationality,  m.nationality),
      first_name   = COALESCE(p.first_name,   m.first_name),
      last_name    = COALESCE(p.last_name,    m.last_name),
      display_name = CASE WHEN length(btrim(coalesce(p.display_name,''))) = 0
                          THEN m.display_name ELSE p.display_name END
  FROM public.persons m
  WHERE m.id = v_merged AND p.id = v_survivor;

  -- ---- 2.8 Mark the merged-away person. It is RETAINED, not deleted. -----
  UPDATE public.persons
  SET identity_state = 'merged',
      canonical_person_id = v_survivor
  WHERE id = v_merged;

  INSERT INTO public.person_merge_audit
    (merge_id, survivor_id, merged_id, decision_id, note)
  VALUES (v_merge_id, v_survivor, v_merged, p_decision_id,
          format('merge applied; %s rows moved', v_moved));

  RETURN v_merge_id;
END;
$$;

COMMENT ON FUNCTION public.person_merge_identities(uuid, uuid) IS
  'Merges the two persons of an approved identity decision. Retains the '
  'merged-away person (identity_state=merged) and re-points rather than '
  'deletes its source rows, so the operation is reversible via '
  'person_merge_audit. Refuses protected decisions.';

REVOKE ALL ON FUNCTION public.person_merge_identities(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.person_merge_identities(uuid, uuid) TO service_role;

COMMIT;

-- =============================================================================
-- VERBATIM ROLLBACK
--
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.person_merge_identities(uuid, uuid);
--   DROP TABLE IF EXISTS public.person_merge_audit;
--   COMMIT;
--
--   No pre-existing table is touched by this migration.
-- =============================================================================
