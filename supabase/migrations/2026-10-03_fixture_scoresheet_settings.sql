-- 2026-10-03: Phase B2 — Fixture × Scoresheet settings + backrefs
--
-- Tracks per-fixture opt-in for the Scoresheet QR, plus an index for
-- the live broadcast lookup (B3) so the rinkstop.com /directory/games/[id]
-- page can pull the linked scoresheet game state in O(1).
--
-- This table is owned by rinkstop.com (the directory). The scoresheet
-- app reads it (with service-role) but does not write to it.

CREATE TABLE IF NOT EXISTS public.fixture_scoresheet_settings (
  fixture_id uuid PRIMARY KEY,
  qr_enabled boolean NOT NULL DEFAULT true,
  qr_enabled_by text,
  qr_enabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixture_scoresheet_qr_enabled
  ON public.fixture_scoresheet_settings(qr_enabled)
  WHERE qr_enabled = true;

-- Backref index: when scoresheet writes a game with rinkstop_fixture_id,
-- rinkstop.com can fast-look up "what games are linked to this fixture?"
-- and "does this fixture have a linked in-progress game?"
CREATE INDEX IF NOT EXISTS idx_games_rinkstop_fixture_active
  ON public.games(rinkstop_fixture_id, status, rinkstop_integration)
  WHERE rinkstop_fixture_id IS NOT NULL;

COMMENT ON TABLE public.fixture_scoresheet_settings IS 'Per-fixture RinkStop Scoresheet opt-in (Phase B2). qr_enabled controls the QR on the public game page.';

-- RLS: this is a directory-owned table. Reads are public (so the
-- scoresheet app can check qr_enabled without auth). Writes are
-- restricted to admins (verified by Clerk role in app code; RLS allows
-- service-role bypass).
ALTER TABLE public.fixture_scoresheet_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fss_public_read ON public.fixture_scoresheet_settings;
CREATE POLICY fss_public_read ON public.fixture_scoresheet_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- RLS helper for updated_at (same trigger function as scoresheet tables)
DROP TRIGGER IF EXISTS fss_updated_at ON public.fixture_scoresheet_settings;
CREATE TRIGGER fss_updated_at
  BEFORE UPDATE ON public.fixture_scoresheet_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
