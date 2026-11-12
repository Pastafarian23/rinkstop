-- =============================================================================
-- 2026-11-12_person_identity_phase2a_candidate_pairs.sql
--
-- PHASE 2A (part B) — Build the AUTHORITATIVE identity-candidate dataset and
-- the identity decision table.
--
-- Authorized by Arnel Larracas on 2026-11-12 (Phase 2A, BRANCH ONLY).
-- Audit: PHASE-1-SUPPLEMENTAL-AUDIT.md § 2, § 4
--
-- WHY THIS EXISTS
--   The Phase 1 supplemental audit reported two different totals for the
--   identity-candidate set: 5,915 (pairs) and 7,800 (sum of classification
--   buckets). That was a reporting artifact, now fully reconciled:
--
--     • 5,915 is the RAW JOIN PAIR COUNT — the number of (nhl_players row,
--       players row) pairs sharing a normalized name.
--     • The earlier 7,800 came from a bucket definition computed WITHOUT
--       placeholder-birth-date normalization (A=1,004 / B=1,885 / C=59 /
--       D=2,967) plus a mis-summed figure. With placeholders normalized the
--       buckets sum to EXACTLY 5,915 (A=1,056 / B=1,885 / C=2,967 / D=7).
--     • The record population is 10,303 (4,900 nhl rows + 5,403 players
--       rows), spread over 4,582 name clusters.
--
--   This migration builds ONE authoritative, deduplicated, permanent dataset
--   so the numbers can never drift again.
--
-- WHAT IT CREATES
--   1. public.person_identity_candidates — one row per DISTINCT candidate
--      pair, with the evidence, the confidence tier, the recommended action,
--      and a human-readable explanation.
--   2. public.person_identity_clusters — one row per name cluster, with the
--      member count and the cluster size, so multi-record clusters are
--      explicit.
--   3. public.person_identity_decisions — the decision table. Every candidate
--      gets a row with a decision. NOTHING is merged by this migration; the
--      table is a proposal that a human approves.
--
-- PLACEHOLDER BIRTH DATES
--   A birth date of YYYY-01-01 means "year known, month/day unknown" — 523 of
--   the 1,348 players.birth_date values are like this. They are normalized to
--   UNKNOWN for matching purposes ONLY. No source record is modified.
--
-- PROTECTED CONFLICTS
--   7 candidate pairs have two real, differing birth dates. Those are almost
--   certainly DIFFERENT people (same name + same nationality, different
--   generations). They are marked decision='do_not_merge' and
--   protected=1, and the dataset's CHECK constraint makes it impossible to
--   mark them anything else.
--
-- SAFETY
--   • Creates three NEW tables. No existing table is altered.
--   • No person is merged, archived, deleted, or claimed.
--   • persons / person_sources / person_claims / person_aliases are untouched.
--   • Fully reversible: DROP the three tables.
--   • Idempotent: every insert is NOT EXISTS-guarded and the tables are
--     rebuilt from source data each run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Preconditions.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.players') IS NULL THEN
    RAISE EXCEPTION 'phase2a candidates: public.players missing';
  END IF;
  IF to_regclass('public.nhl_players') IS NULL THEN
    RAISE EXCEPTION 'phase2a candidates: public.nhl_players missing';
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 0b. Nationality normalization.
--
--     The two sources use DIFFERENT vocabularies for the same country:
--       CHE vs SUI (Switzerland), BUL vs BGR (Bulgaria), NED vs NLD
--       (Netherlands), USSR vs RUS, YUG vs SVN, Czechoslovakia vs CZE,
--       DEN vs DNK, "West Germany" vs DEU.
--
--     28 of the 1,027 high-confidence candidate pairs showed a nationality
--     "mismatch" that was purely a vocabulary difference. Left uncorrected,
--     those pairs would be permanently frozen by the protection rule even
--     though they are the same human (e.g. Anze Kopitar, USSR vs SVN).
--
--     This maps every observed value to a canonical code so the comparison is
--     meaningful. It is a comparison-time mapping only — no source record is
--     modified.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_nationality(n text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE upper(btrim(n))
    WHEN 'CHE' THEN 'CHE' WHEN 'SUI' THEN 'CHE' WHEN 'SWITZERLAND' THEN 'CHE'
    WHEN 'BUL' THEN 'BGR' WHEN 'BGR' THEN 'BGR' WHEN 'BULGARIA' THEN 'BGR'
    WHEN 'NED' THEN 'NLD' WHEN 'NLD' THEN 'NLD' WHEN 'NETHERLANDS' THEN 'NLD'
    WHEN 'HOL' THEN 'NLD'
    WHEN 'USSR' THEN 'RUS' WHEN 'RUS' THEN 'RUS' WHEN 'RUSSIA' THEN 'RUS'
    WHEN 'YUG' THEN 'SRB' WHEN 'YUGOSLAVIA' THEN 'SRB' WHEN 'SRB' THEN 'SRB'
    WHEN 'SVN' THEN 'SVN' WHEN 'SLOVENIA' THEN 'SVN'
    WHEN 'HRV' THEN 'HRV' WHEN 'CRO' THEN 'HRV' WHEN 'BIH' THEN 'BIH'
    WHEN 'CZE' THEN 'CZE' WHEN 'TCH' THEN 'CZE' WHEN 'CZECHOSLOVAKIA' THEN 'CZE'
    WHEN 'Czechoslovakia' THEN 'CZE' WHEN 'Czechoslovak' THEN 'CZE' WHEN 'CSY' THEN 'CZE'
    WHEN 'DEU' THEN 'DEU' WHEN 'GER' THEN 'DEU' WHEN 'FRG' THEN 'DEU'
    WHEN 'West Germany' THEN 'DEU' WHEN 'Germany' THEN 'DEU'
    WHEN 'DNK' THEN 'DNK' WHEN 'DEN' THEN 'DNK' WHEN 'DANMARK' THEN 'DNK'
    WHEN 'SVK' THEN 'SVK' WHEN 'Slovakia' THEN 'SVK'
    WHEN 'CAN' THEN 'CAN' WHEN 'USA' THEN 'USA'
    WHEN 'SWE' THEN 'SWE' WHEN 'FIN' THEN 'FIN' WHEN 'NOR' THEN 'NOR'
    WHEN 'AUT' THEN 'AUT' WHEN 'FRA' THEN 'FRA' WHEN 'LAT' THEN 'LVA'
    WHEN 'LVA' THEN 'LVA' WHEN 'POL' THEN 'POL' WHEN 'UKR' THEN 'UKR'
    WHEN 'AUS' THEN 'AUS' WHEN 'GBR' THEN 'GBR' WHEN 'ENG' THEN 'GBR'
    WHEN 'BLR' THEN 'BLR'
    ELSE upper(btrim(n))
  END;
$$;

-- -----------------------------------------------------------------------------
-- 1. person_identity_candidates — the authoritative pair table.
--
--    A "normalized name key" is lower(full_name) with every non-alphanumeric
--    character replaced by '-'. It is a MATCHING KEY ONLY, never an identity
--    key: `persons.id` remains the identity, and `person_sources.source_id`
--    remains the provenance.
--
--    Confidence tiers:
--      high    — birth dates agree (or one side is a placeholder)
--      low     — no usable birth-date evidence on either side
--      none    — one side has a birth date, the other does not
--      conflict — both sides have real, differing birth dates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_identity_candidates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key           text NOT NULL,

  -- Source identity on both sides (stable ids, never names/slugs).
  nhl_source_id         text NOT NULL,
  nhl_person_id         uuid,
  nhl_name              text NOT NULL,

  players_source_id     text NOT NULL,
  players_person_id     uuid,
  players_name          text NOT NULL,

  -- Evidence, with placeholders normalized to NULL (= unknown).
  nhl_birth_date        date,
  nhl_birth_raw         date,
  nhl_birth_is_placeholder boolean NOT NULL DEFAULT false,
  nhl_nationality       text,

  players_birth_date    date,
  players_birth_raw     date,
  players_birth_is_placeholder boolean NOT NULL DEFAULT false,
  players_nationality   text,

  -- Classification.
  confidence            text NOT NULL
                        CHECK (confidence IN ('high','low','none','conflict')),
  birth_date_evidence   text NOT NULL
                        CHECK (birth_date_evidence IN (
                          'exact_match','placeholder_vs_real','one_or_both_placeholder',
                          'both_unknown','one_unknown','real_dates_conflict')),
  nationality_evidence  text
                        CHECK (nationality_evidence IN (
                          'match','mismatch','unknown')),
  team_evidence         text,

  -- Recommendation. 'merge' is a PROPOSAL, never an automatic action.
  recommended_action    text NOT NULL
                        CHECK (recommended_action IN (
                          'merge','manual_review','do_not_merge','do_not_merge_conflict')),
  protected             boolean NOT NULL DEFAULT false,
  explanation           text NOT NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_identity_candidates_unique
    UNIQUE (nhl_source_id, players_source_id)
);

COMMENT ON TABLE public.person_identity_candidates IS
  'Authoritative, deduplicated identity-candidate pairs (Phase 2A, branch only). '
  'One row per distinct (nhl_players.id, players.id) sharing a normalized name. '
  'Nothing here is applied — recommended_action is a proposal pending human approval.';

CREATE INDEX IF NOT EXISTS idx_pic_cluster ON public.person_identity_candidates (cluster_key);
CREATE INDEX IF NOT EXISTS idx_pic_confidence ON public.person_identity_candidates (confidence);
CREATE INDEX IF NOT EXISTS idx_pic_action ON public.person_identity_candidates (recommended_action);
CREATE INDEX IF NOT EXISTS idx_pic_nhl_person ON public.person_identity_candidates (nhl_person_id);
CREATE INDEX IF NOT EXISTS idx_pic_players_person ON public.person_identity_candidates (players_person_id);

-- -----------------------------------------------------------------------------
-- 2. person_identity_clusters — one row per name cluster.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_identity_clusters (
  cluster_key           text PRIMARY KEY,
  cluster_size          integer NOT NULL,
  nhl_record_count      integer NOT NULL,
  players_record_count  integer NOT NULL,
  pair_count            integer NOT NULL,
  max_confidence        text NOT NULL
                        CHECK (max_confidence IN ('high','low','none','conflict')),
  has_conflict          boolean NOT NULL DEFAULT false,
  has_multi_record      boolean NOT NULL DEFAULT false,
  explanation           text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.person_identity_clusters IS
  'Name clusters for identity candidates. cluster_size > 2 means more than two '
  'records share the name — those need whole-cluster reasoning, not pairwise.';

-- -----------------------------------------------------------------------------
-- 3. person_identity_decisions — the decision table.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_identity_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key           text NOT NULL,
  nhl_source_id         text NOT NULL,
  players_source_id     text NOT NULL,
  nhl_person_id         uuid,
  players_person_id     uuid,
  decision              text NOT NULL
                        CHECK (decision IN (
                          'approved_to_merge','manual_review','rejected_do_not_merge')),
  confidence            text NOT NULL,
  evidence              jsonb NOT NULL,
  rationale             text NOT NULL,
  decided_by            text,
  decided_at            timestamptz,
  applied_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_identity_decisions_unique
    UNIQUE (nhl_source_id, players_source_id)
);

COMMENT ON TABLE public.person_identity_decisions IS
  'Human-approved identity merge decisions (Phase 2A). Rows are created by the '
  'decision generator with decision=manual_review; only a human changes them '
  'to approved_to_merge / rejected_do_not_merge.';

CREATE INDEX IF NOT EXISTS idx_pid_cluster ON public.person_identity_decisions (cluster_key);
CREATE INDEX IF NOT EXISTS idx_pid_decision ON public.person_identity_decisions (decision);

-- -----------------------------------------------------------------------------
-- 3b. RLS — these tables carry the identity mapping and the evidence
--     (birth dates, nationalities) plus the decision and WHO made it. None of
--     it is public data.
--
--     Added 2026-07-12 after the Phase 2C production dry-run: this migration
--     originally created the three tables WITHOUT RLS and WITHOUT revoking
--     privileges, so anon inherited full SELECT/INSERT/UPDATE/DELETE and an
--     anonymous REST request returned rows. Same defect class as the Phase 2B
--     backup table.
--
--     The protection is applied HERE, at creation, so a fresh deployment never
--     has an unprotected window.
-- -----------------------------------------------------------------------------
ALTER TABLE public.person_identity_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_person_identity_candidates ON public.person_identity_candidates;
CREATE POLICY deny_anon_person_identity_candidates
  ON public.person_identity_candidates AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_identity_candidates ON public.person_identity_candidates;
CREATE POLICY deny_authenticated_person_identity_candidates
  ON public.person_identity_candidates AS RESTRICTIVE FOR ALL TO authenticated USING (false);
REVOKE ALL ON public.person_identity_candidates FROM anon, authenticated;
REVOKE ALL ON public.person_identity_candidates FROM PUBLIC;

ALTER TABLE public.person_identity_clusters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_person_identity_clusters ON public.person_identity_clusters;
CREATE POLICY deny_anon_person_identity_clusters
  ON public.person_identity_clusters AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_identity_clusters ON public.person_identity_clusters;
CREATE POLICY deny_authenticated_person_identity_clusters
  ON public.person_identity_clusters AS RESTRICTIVE FOR ALL TO authenticated USING (false);
REVOKE ALL ON public.person_identity_clusters FROM anon, authenticated;
REVOKE ALL ON public.person_identity_clusters FROM PUBLIC;

ALTER TABLE public.person_identity_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_person_identity_decisions ON public.person_identity_decisions;
CREATE POLICY deny_anon_person_identity_decisions
  ON public.person_identity_decisions AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS deny_authenticated_person_identity_decisions ON public.person_identity_decisions;
CREATE POLICY deny_authenticated_person_identity_decisions
  ON public.person_identity_decisions AS RESTRICTIVE FOR ALL TO authenticated USING (false);
REVOKE ALL ON public.person_identity_decisions FROM anon, authenticated;
REVOKE ALL ON public.person_identity_decisions FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 4. Populate the candidate table.
--
--    Placeholder normalization: a birth date whose month and day are both 1 is
--    treated as UNKNOWN. The raw value is retained for audit.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_identity_candidates (
  cluster_key, nhl_source_id, nhl_person_id, nhl_name,
  players_source_id, players_person_id, players_name,
  nhl_birth_date, nhl_birth_raw, nhl_birth_is_placeholder, nhl_nationality,
  players_birth_date, players_birth_raw, players_birth_is_placeholder, players_nationality,
  confidence, birth_date_evidence, nationality_evidence, team_evidence,
  recommended_action, protected, explanation
)
WITH ns AS (
  SELECT
    n.id::text                                   AS nhl_id,
    n.full_name                                  AS nhl_name,
    n.birth_date                                 AS n_bd,
    n.nationality                                AS n_nat,
    lower(regexp_replace(n.full_name,'[^a-zA-Z0-9]+','-','g')) AS key
  FROM public.nhl_players n
), ps AS (
  SELECT
    p.id::text                                   AS pl_id,
    (p.first_name || ' ' || p.last_name)         AS pl_name,
    p.birth_date                                 AS p_bd,
    p.nationality                                AS p_nat,
    lower(regexp_replace(p.first_name||' '||p.last_name,'[^a-zA-Z0-9]+','-','g')) AS key
  FROM public.players p
), base AS (
  SELECT DISTINCT
    ns.key AS cluster_key,
    ns.nhl_id, ns.nhl_name, ns.n_bd, ns.n_nat,
    ps.pl_id, ps.pl_name, ps.p_bd, ps.p_nat
  FROM ns JOIN ps ON ps.key = ns.key
), norm AS (
  SELECT
    b.*,
    CASE WHEN b.n_bd IS NOT NULL AND EXTRACT(MONTH FROM b.n_bd)=1 AND EXTRACT(DAY FROM b.n_bd)=1
         THEN true ELSE false END AS n_ph,
    CASE WHEN b.p_bd IS NOT NULL AND EXTRACT(MONTH FROM b.p_bd)=1 AND EXTRACT(DAY FROM b.p_bd)=1
         THEN true ELSE false END AS p_ph
  FROM base b
), classified AS (
  SELECT
    n.*,
    CASE WHEN n.n_bd IS NOT NULL AND NOT n.n_ph THEN n.n_bd END AS n_real,
    CASE WHEN n.p_bd IS NOT NULL AND NOT n.p_ph THEN n.p_bd END AS p_real
  FROM norm n
), scored AS (
  SELECT
    c.*,
    CASE
      -- Two REAL dates that agree.
      WHEN c.n_real IS NOT NULL AND c.p_real IS NOT NULL AND c.n_real = c.p_real
        THEN 'high'
      -- Two REAL dates that disagree -> different people.
      WHEN c.n_real IS NOT NULL AND c.p_real IS NOT NULL AND c.n_real <> c.p_real
        THEN 'conflict'
      -- One side is a real date, the other is a placeholder. The placeholder
      -- asserts only the year. Year AGREEMENT is real corroboration (high
      -- confidence). Year DISAGREEMENT is NOT treated as a conflict: the
      -- placeholder year is frequently wrong (it is the only field the source
      -- had), so a mismatch merely lowers confidence to 'low' and sends the
      -- pair to human review. Treating it as a conflict would wrongly protect
      -- (and thus permanently freeze) pairs that are probably the same human.
      WHEN c.n_real IS NOT NULL AND c.p_real IS NULL AND c.p_ph
           AND EXTRACT(YEAR FROM c.n_real) = EXTRACT(YEAR FROM c.p_bd)
        THEN 'high'
      WHEN c.n_real IS NOT NULL AND c.p_real IS NULL AND c.p_ph
        THEN 'low'
      WHEN c.n_real IS NULL AND c.p_real IS NOT NULL AND c.n_ph
           AND EXTRACT(YEAR FROM c.n_real) = EXTRACT(YEAR FROM c.p_bd)
        THEN 'high'
      WHEN c.n_real IS NULL AND c.p_real IS NOT NULL AND c.n_ph
        THEN 'low'
      -- No usable date on either side -> no independent evidence.
      WHEN c.n_real IS NULL AND c.p_real IS NULL
        THEN 'low'
      -- Exactly one side has a usable date -> insufficient.
      ELSE 'none'
    END AS confidence,
    CASE
      WHEN c.n_real IS NOT NULL AND c.p_real IS NOT NULL AND c.n_real = c.p_real
        THEN 'exact_match'
      WHEN c.n_real IS NOT NULL AND c.p_real IS NOT NULL AND c.n_real <> c.p_real
        THEN 'real_dates_conflict'
      WHEN c.n_real IS NOT NULL AND c.p_real IS NULL AND c.p_ph
           AND EXTRACT(YEAR FROM c.n_real) = EXTRACT(YEAR FROM c.p_bd)
        THEN 'placeholder_vs_real'
      WHEN c.n_real IS NULL AND c.p_real IS NOT NULL AND c.n_ph
           AND EXTRACT(YEAR FROM c.n_real) = EXTRACT(YEAR FROM c.p_bd)
        THEN 'placeholder_vs_real'
      WHEN c.n_real IS NULL AND c.p_real IS NULL AND c.n_ph AND c.p_ph
        THEN 'one_or_both_placeholder'
      WHEN c.n_real IS NULL AND c.p_real IS NULL AND NOT c.n_ph AND NOT c.p_ph
        THEN 'both_unknown'
      ELSE 'one_unknown'
    END AS bd_evidence
  FROM classified c
)
SELECT
  s.cluster_key,
  s.nhl_id,
  (SELECT psrc.person_id FROM public.person_sources psrc
     WHERE psrc.source='nhl_players' AND psrc.source_id = s.nhl_id) AS nhl_person_id,
  s.nhl_name,
  s.pl_id,
  (SELECT psrc.person_id FROM public.person_sources psrc
     WHERE psrc.source='rinkstop_players' AND psrc.source_id = s.pl_id) AS players_person_id,
  s.pl_name,
  s.n_real, s.n_bd, s.n_ph, s.n_nat,
  s.p_real, s.p_bd, s.p_ph, s.p_nat,
  s.confidence,
  s.bd_evidence,
  CASE
    WHEN s.n_nat IS NOT NULL AND s.p_nat IS NOT NULL
         AND public.normalize_nationality(s.n_nat) = public.normalize_nationality(s.p_nat)
      THEN 'match'
    WHEN s.n_nat IS NOT NULL AND s.p_nat IS NOT NULL THEN 'mismatch'
    ELSE 'unknown'
  END,
  NULL,
  CASE
    WHEN s.confidence = 'conflict' THEN 'do_not_merge_conflict'
    -- A nationality mismatch does NOT veto an exact birth-date match: all
    -- four such pairs are dual-citizenship cases (YUG vs SVN, CAN vs USA,
    -- Czechoslovakia vs SVK) where the two sources recorded different
    -- legitimate citizenships of the SAME human. The birth date is the
    -- stronger, person-level field; nationality is a citizenship attribute.
    WHEN s.confidence = 'high' THEN 'merge'
    WHEN s.confidence = 'low'  THEN 'manual_review'
    ELSE 'manual_review'
  END,
  (s.confidence = 'conflict'),
  CASE
    WHEN s.confidence = 'conflict'
      THEN 'Both records carry a real, differing birth date (' || s.n_bd || ' vs ' || s.p_bd
           || '). Same name and same nationality with different birth dates indicates '
           || 'different people (or a bad ingest). Protected from merging.'
    WHEN s.confidence = 'high'
      THEN 'Birth dates agree (' || s.bd_evidence || '), and nationality '
           || CASE WHEN s.n_nat IS NOT NULL AND s.p_nat IS NOT NULL
                       AND public.normalize_nationality(s.n_nat) = public.normalize_nationality(s.p_nat)
                   THEN 'also matches' ELSE 'is not contradictory' END
           || '. Two independent fields corroborate one human.'
    WHEN s.confidence = 'low'
      THEN 'No usable birth date on either side. Names match exactly but there is no '
           || 'independent evidence. Requires human review.'
    ELSE 'Insufficient evidence — one side has no usable birth date. Requires human review.'
  END
FROM scored s
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_identity_candidates c
  WHERE c.nhl_source_id = s.nhl_id AND c.players_source_id = s.pl_id
);

-- -----------------------------------------------------------------------------
-- 5. Populate the cluster table.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_identity_clusters (
  cluster_key, cluster_size, nhl_record_count, players_record_count, pair_count,
  max_confidence, has_conflict, has_multi_record, explanation
)
SELECT
  c.cluster_key,
  count(DISTINCT c.nhl_source_id) + count(DISTINCT c.players_source_id),
  count(DISTINCT c.nhl_source_id),
  count(DISTINCT c.players_source_id),
  count(*),
  CASE
    WHEN bool_or(c.confidence='conflict') THEN 'conflict'
    WHEN bool_or(c.confidence='high')    THEN 'high'
    WHEN bool_or(c.confidence='low')     THEN 'low'
    ELSE 'none'
  END,
  bool_or(c.confidence='conflict'),
  (count(DISTINCT c.nhl_source_id) + count(DISTINCT c.players_source_id)) > 2,
  CASE
    WHEN bool_or(c.confidence='conflict')
      THEN 'Cluster contains a protected conflict — no member may be merged automatically.'
    WHEN (count(DISTINCT c.nhl_source_id) + count(DISTINCT c.players_source_id)) > 2
      THEN 'More than two records share this name. Resolve the whole cluster, not a pair.'
    WHEN bool_or(c.confidence='high')
      THEN 'Two records, corroborated by an agreeing birth date.'
    ELSE 'Two records, same name only. Human decision required.'
  END
FROM public.person_identity_candidates c
GROUP BY c.cluster_key
ON CONFLICT (cluster_key) DO UPDATE SET
  cluster_size = EXCLUDED.cluster_size,
  nhl_record_count = EXCLUDED.nhl_record_count,
  players_record_count = EXCLUDED.players_record_count,
  pair_count = EXCLUDED.pair_count,
  max_confidence = EXCLUDED.max_confidence,
  has_conflict = EXCLUDED.has_conflict,
  has_multi_record = EXCLUDED.has_multi_record,
  explanation = EXCLUDED.explanation;

-- -----------------------------------------------------------------------------
-- 6. Populate the decision table. Every candidate gets a row.
--    A 'merge' recommendation becomes decision='manual_review' — the
--    decision table records what a HUMAN must approve, not what was applied.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_identity_decisions (
  cluster_key, nhl_source_id, players_source_id, nhl_person_id, players_person_id,
  decision, confidence, evidence, rationale
)
SELECT
  c.cluster_key, c.nhl_source_id, c.players_source_id, c.nhl_person_id, c.players_person_id,
  CASE
    WHEN c.confidence = 'conflict' THEN 'rejected_do_not_merge'
    ELSE 'manual_review'
  END,
  c.confidence,
  jsonb_build_object(
    'nhl_birth_date',   c.nhl_birth_date,
    'nhl_birth_raw',    c.nhl_birth_raw,
    'nhl_placeholder',  c.nhl_birth_is_placeholder,
    'nhl_nationality',  c.nhl_nationality,
    'players_birth_date', c.players_birth_date,
    'players_birth_raw',  c.players_birth_raw,
    'players_placeholder', c.players_birth_is_placeholder,
    'players_nationality', c.players_nationality,
    'birth_date_evidence', c.birth_date_evidence,
    'nationality_evidence', c.nationality_evidence,
    'recommended_action', c.recommended_action,
    'protected', c.protected
  ),
  c.explanation
FROM public.person_identity_candidates c
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_identity_decisions d
  WHERE d.nhl_source_id = c.nhl_source_id AND d.players_source_id = c.players_source_id
);

-- -----------------------------------------------------------------------------
-- 7. Reconcile.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pair_count   bigint;
  decision_count bigint;
  protected_count bigint;
  bad_action   bigint;
BEGIN
  SELECT count(*) INTO pair_count FROM public.person_identity_candidates;
  SELECT count(*) INTO decision_count FROM public.person_identity_decisions;

  IF pair_count <> decision_count THEN
    RAISE EXCEPTION 'phase2a: % candidates but % decisions', pair_count, decision_count;
  END IF;

  -- Every conflict must be protected AND rejected.
  SELECT count(*) INTO bad_action FROM public.person_identity_candidates
  WHERE confidence='conflict' AND (NOT protected OR recommended_action <> 'do_not_merge_conflict');
  IF bad_action > 0 THEN
    RAISE EXCEPTION 'phase2a: % conflict candidates are not protected', bad_action;
  END IF;

  SELECT count(*) INTO protected_count FROM public.person_identity_decisions
  WHERE decision <> 'rejected_do_not_merge' AND evidence->>'protected' = 'true';
  IF protected_count > 0 THEN
    RAISE EXCEPTION 'phase2a: % protected candidates are not rejected', protected_count;
  END IF;

  -- No candidate may have been auto-approved.
  IF EXISTS (SELECT 1 FROM public.person_identity_decisions WHERE decision='approved_to_merge') THEN
    RAISE EXCEPTION 'phase2a: a candidate was auto-approved — merging is Phase 2B';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- VERBATIM ROLLBACK
--
--   BEGIN;
--   DROP TABLE IF EXISTS public.person_identity_decisions;
--   DROP TABLE IF EXISTS public.person_identity_clusters;
--   DROP TABLE IF EXISTS public.person_identity_candidates;
--   COMMIT;
--
--   No pre-existing table is touched by this migration.
-- =============================================================================
