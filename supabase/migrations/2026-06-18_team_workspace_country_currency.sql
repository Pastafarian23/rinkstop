-- 2026-06-18_team_workspace_country_currency.sql
-- Day 1 follow-up: country → currency mapping for team events.
-- Owner: KiloClaw
-- Triggered by: Arnel's request that Cebu Ice Datus events are PHP,
-- but US teams get USD, Canadian teams get CAD, etc.
--
-- Design:
--   * team_workspaces gets country_code (ISO 3166-1 alpha-2) — nullable,
--     set on creation or by the user later.
--   * New country_currency table: 50 rows covering countries with hockey rinks.
--     Maps country_code → currency code (ISO 4217), symbol, and locale hint.
--   * team_events.currency gets a generated column that defaults from the team's
--     country_code via the lookup. If team has no country_code, falls back to 'USD'.
--   * This means existing event-creation code (or new code) can omit currency
--     and it just works. Manager can override per-event if needed (rare).
--
-- Reuses rinks.country → ISO mapping handled in app code on rink claim flow.
-- That code path is Day 2/3 work; this migration only adds the team-side pieces.

BEGIN;

-- ============================================================
-- A. team_workspaces.country_code column
-- ============================================================

ALTER TABLE team_workspaces
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS currency     CHAR(3);

COMMENT ON COLUMN team_workspaces.country_code IS
  'ISO 3166-1 alpha-2 country code. Set on team creation. Drives default currency '
  'for team_events. Use ISO codes, not full names (rinks.country uses full names, '
  'this uses codes — different schemas).';
COMMENT ON COLUMN team_workspaces.currency IS
  'ISO 4217 currency code for this team. Set from country_code at creation time. '
  'Used as the default for team_events.currency.';

CREATE INDEX IF NOT EXISTS team_workspaces_country_code_idx
  ON team_workspaces (country_code);

-- ============================================================
-- B. country_currency lookup table
-- ============================================================
-- Covers countries with at least one RinkStop rink or hockey program.
-- Listed in alphabetical order for diff-friendliness.

CREATE TABLE IF NOT EXISTS country_currency (
  country_code CHAR(2) PRIMARY KEY,
  country_name TEXT NOT NULL,
  currency     CHAR(3) NOT NULL,
  currency_name TEXT NOT NULL,
  symbol       TEXT,
  locale       TEXT                                -- BCP-47 for Intl.NumberFormat, e.g. 'en-PH'
);

INSERT INTO country_currency (country_code, country_name, currency, currency_name, symbol, locale) VALUES
  ('AR', 'Argentina',         'ARS', 'Argentine Peso',       '$',   'es-AR'),
  ('AT', 'Austria',           'EUR', 'Euro',                 '€',   'de-AT'),
  ('AU', 'Australia',         'AUD', 'Australian Dollar',    'A$',  'en-AU'),
  ('BE', 'Belgium',           'EUR', 'Euro',                 '€',   'nl-BE'),
  ('BG', 'Bulgaria',          'BGN', 'Bulgarian Lev',        'лв',  'bg-BG'),
  ('BR', 'Brazil',            'BRL', 'Brazilian Real',       'R$',  'pt-BR'),
  ('BY', 'Belarus',           'BYN', 'Belarusian Ruble',     'Br',  'be-BY'),
  ('CA', 'Canada',            'CAD', 'Canadian Dollar',      'C$',  'en-CA'),
  ('CH', 'Switzerland',       'CHF', 'Swiss Franc',          'Fr',  'de-CH'),
  ('CL', 'Chile',             'CLP', 'Chilean Peso',         '$',   'es-CL'),
  ('CN', 'China',             'CNY', 'Chinese Yuan',         '¥',   'zh-CN'),
  ('CO', 'Colombia',          'COP', 'Colombian Peso',       '$',   'es-CO'),
  ('CZ', 'Czech Republic',    'CZK', 'Czech Koruna',         'Kč',  'cs-CZ'),
  ('DE', 'Germany',           'EUR', 'Euro',                 '€',   'de-DE'),
  ('DK', 'Denmark',           'DKK', 'Danish Krone',         'kr',  'da-DK'),
  ('EE', 'Estonia',           'EUR', 'Euro',                 '€',   'et-EE'),
  ('ES', 'Spain',             'EUR', 'Euro',                 '€',   'es-ES'),
  ('FI', 'Finland',           'EUR', 'Euro',                 '€',   'fi-FI'),
  ('FR', 'France',            'EUR', 'Euro',                 '€',   'fr-FR'),
  ('GB', 'United Kingdom',    'GBP', 'Pound Sterling',       '£',   'en-GB'),
  ('GR', 'Greece',            'EUR', 'Euro',                 '€',   'el-GR'),
  ('HK', 'Hong Kong',         'HKD', 'Hong Kong Dollar',     'HK$', 'en-HK'),
  ('HR', 'Croatia',           'EUR', 'Euro',                 '€',   'hr-HR'),
  ('HU', 'Hungary',           'HUF', 'Hungarian Forint',     'Ft',  'hu-HU'),
  ('ID', 'Indonesia',         'IDR', 'Indonesian Rupiah',    'Rp',  'id-ID'),
  ('IE', 'Ireland',           'EUR', 'Euro',                 '€',   'en-IE'),
  ('IL', 'Israel',            'ILS', 'Israeli Shekel',       '₪',   'he-IL'),
  ('IN', 'India',             'INR', 'Indian Rupee',         '₹',   'en-IN'),
  ('IS', 'Iceland',           'ISK', 'Icelandic Króna',      'kr',  'is-IS'),
  ('IT', 'Italy',             'EUR', 'Euro',                 '€',   'it-IT'),
  ('JP', 'Japan',             'JPY', 'Japanese Yen',         '¥',   'ja-JP'),
  ('KR', 'South Korea',       'KRW', 'South Korean Won',     '₩',   'ko-KR'),
  ('LT', 'Lithuania',         'EUR', 'Euro',                 '€',   'lt-LT'),
  ('LU', 'Luxembourg',        'EUR', 'Euro',                 '€',   'fr-LU'),
  ('LV', 'Latvia',            'EUR', 'Euro',                 '€',   'lv-LV'),
  ('MX', 'Mexico',            'MXN', 'Mexican Peso',         '$',   'es-MX'),
  ('MY', 'Malaysia',          'MYR', 'Malaysian Ringgit',    'RM',  'ms-MY'),
  ('NL', 'Netherlands',       'EUR', 'Euro',                 '€',   'nl-NL'),
  ('NO', 'Norway',            'NOK', 'Norwegian Krone',      'kr',  'nb-NO'),
  ('NZ', 'New Zealand',       'NZD', 'New Zealand Dollar',   'NZ$', 'en-NZ'),
  ('PH', 'Philippines',       'PHP', 'Philippine Peso',      '₱',   'en-PH'),
  ('PL', 'Poland',            'PLN', 'Polish Złoty',         'zł',  'pl-PL'),
  ('PT', 'Portugal',          'EUR', 'Euro',                 '€',   'pt-PT'),
  ('RO', 'Romania',           'RON', 'Romanian Leu',         'lei', 'ro-RO'),
  ('RS', 'Serbia',            'RSD', 'Serbian Dinar',        'дин', 'sr-RS'),
  ('RU', 'Russia',            'RUB', 'Russian Ruble',        '₽',   'ru-RU'),
  ('SE', 'Sweden',            'SEK', 'Swedish Krona',        'kr',  'sv-SE'),
  ('SG', 'Singapore',         'SGD', 'Singapore Dollar',     'S$',  'en-SG'),
  ('SI', 'Slovenia',          'EUR', 'Euro',                 '€',   'sl-SI'),
  ('SK', 'Slovakia',          'EUR', 'Euro',                 '€',   'sk-SK'),
  ('TH', 'Thailand',          'THB', 'Thai Baht',            '฿',   'th-TH'),
  ('TR', 'Turkey',            'TRY', 'Turkish Lira',         '₺',   'tr-TR'),
  ('TW', 'Taiwan',            'TWD', 'Taiwan Dollar',        'NT$', 'zh-TW'),
  ('UA', 'Ukraine',           'UAH', 'Ukrainian Hryvnia',    '₴',   'uk-UA'),
  ('US', 'United States',     'USD', 'United States Dollar', '$',   'en-US'),
  ('VN', 'Vietnam',           'VND', 'Vietnamese Đồng',      '₫',   'vi-VN'),
  ('ZA', 'South Africa',      'ZAR', 'South African Rand',   'R',   'en-ZA')
ON CONFLICT (country_code) DO UPDATE SET
  country_name  = EXCLUDED.country_name,
  currency      = EXCLUDED.currency,
  currency_name = EXCLUDED.currency_name,
  symbol        = EXCLUDED.symbol,
  locale        = EXCLUDED.locale;

ALTER TABLE country_currency ENABLE ROW LEVEL SECURITY;

-- Public read — used by client UI for symbol/locale hints.
DROP POLICY IF EXISTS "country_currency_public_read" ON country_currency;
CREATE POLICY "country_currency_public_read" ON country_currency
  FOR SELECT USING (true);

-- Writes only via service_role (no client-side updates to currency data).
COMMENT ON TABLE country_currency IS
  'ISO 3166-1 alpha-2 → ISO 4217 currency mapping for ~60 countries with active hockey '
  'programs or rinks. Public read. Service-role-only writes. Locale column is BCP-47 '
  'for Intl.NumberFormat. Single source of truth for team_events.currency defaults.';

-- ============================================================
-- C. team_workspaces: trigger to auto-fill currency from country_code
-- ============================================================

CREATE OR REPLACE FUNCTION set_team_workspace_currency()
RETURNS TRIGGER AS $$
DECLARE
  resolved_currency CHAR(3);
BEGIN
  -- Only fill if currency is NULL and country_code is provided.
  IF NEW.currency IS NULL AND NEW.country_code IS NOT NULL THEN
    SELECT currency INTO resolved_currency
    FROM country_currency
    WHERE country_code = NEW.country_code;
    NEW.currency := COALESCE(resolved_currency, 'USD');
  ELSIF NEW.currency IS NULL THEN
    NEW.currency := 'USD';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_workspaces_currency ON team_workspaces;
CREATE TRIGGER trg_team_workspaces_currency
  BEFORE INSERT OR UPDATE OF country_code, currency ON team_workspaces
  FOR EACH ROW EXECUTE FUNCTION set_team_workspace_currency();

COMMENT ON FUNCTION set_team_workspace_currency() IS
  'Auto-resolves team_workspaces.currency from country_code via country_currency lookup. '
  'Defaults to USD when country is unknown. Trigger fires on INSERT or when country_code/currency change.';

-- ============================================================
-- D. team_events: default currency from team's currency
-- ============================================================

CREATE OR REPLACE FUNCTION set_team_event_currency()
RETURNS TRIGGER AS $$
DECLARE
  team_currency CHAR(3);
BEGIN
  -- Only fill if currency is explicitly the PHP placeholder default AND team has one.
  -- Otherwise respect what the caller set.
  IF NEW.currency IS NULL OR NEW.currency = 'PHP' THEN
    SELECT currency INTO team_currency
    FROM team_workspaces
    WHERE id = NEW.team_id;
    IF team_currency IS NOT NULL THEN
      NEW.currency := team_currency;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_events_currency ON team_events;
CREATE TRIGGER trg_team_events_currency
  BEFORE INSERT ON team_events
  FOR EACH ROW EXECUTE FUNCTION set_team_event_currency();

COMMENT ON FUNCTION set_team_event_currency() IS
  'Auto-resolves team_events.currency from the parent team_workspace.currency. '
  'If the caller explicitly set a non-PHP currency, that value is preserved. '
  'If team has no currency, falls back to USD via team_workspaces default.';

-- ============================================================
-- E. Backfill currency for Cebu Ice Datus (when Arnel creates the team)
-- ============================================================
-- We don't have the team row yet — it will be created in Day 2. The trigger will
-- auto-fill when 'PH' is provided as country_code. No backfill needed now.

COMMIT;