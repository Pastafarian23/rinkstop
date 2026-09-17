-- 2026-09-17: prevent duplicate leagues going forward.
--
-- The slug UNIQUE constraint alone catches exact slug duplicates, but
-- not cases like "KHL" vs "Kontinental Hockey League" (different slugs,
-- same league in practice). This trigger normalizes the name (lowercase,
-- alphanumeric only) and rejects INSERT / UPDATE that flips is_active
-- from false to true when an active league with the same normalized
-- name already exists.
--
-- Soft-deprecation (is_active=false) is unaffected — toggle freely.

CREATE OR REPLACE FUNCTION prevent_duplicate_active_league()
RETURNS TRIGGER AS $$
DECLARE
  norm_new TEXT;
  existing_id UUID;
  existing_name TEXT;
BEGIN
  -- Only enforce on insert or when is_active flips false → true
  IF (TG_OP = 'UPDATE' AND OLD.is_active = NEW.is_active) THEN
    RETURN NEW;
  END IF;

  -- Normalize: lowercase, strip everything except a-z and digits
  norm_new := regexp_replace(lower(coalesce(NEW.name, '')), '[^a-z0-9]', '', 'g');

  -- Find any active league with the same normalized name (excluding self)
  SELECT id, name INTO existing_id, existing_name
  FROM leagues
  WHERE is_active = true
    AND id != NEW.id
    AND regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]', '', 'g') = norm_new
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate active league: "%" matches existing league "%" (id=%) after normalization. Soft-deprecate the existing row or use a more specific name.',
      NEW.name, existing_name, existing_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_active_league ON leagues;
CREATE TRIGGER trg_prevent_duplicate_active_league
  BEFORE INSERT OR UPDATE OF is_active ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_active_league();

COMMENT ON TRIGGER trg_prevent_duplicate_active_league ON leagues IS
  'Prevents inserting or re-activating a league whose normalized name matches an existing active league. Catches cases like "KHL" vs "Kontinental Hockey League" that the slug UNIQUE alone would not catch.';
