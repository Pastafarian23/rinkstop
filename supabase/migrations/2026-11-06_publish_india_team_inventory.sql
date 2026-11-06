-- 2026-11-06: Publish the Ice Hockey Association of India's team and league inventory.
--
-- Source: Harjinder Singh, General Secretary, Ice Hockey Association of India,
-- reply to Arnel's outreach (received 2026-11-06). He supplied the club and
-- league list for India.
--
-- Why this migration exists:
--   The IHA federation page (/federations/india) was live but rendered NO
--   leagues, no clubs and no rinks — the directory's India page said
--   "6 Rinks, 1 Teams" and nothing else. Arnel's Oct 31 email asked Harjinder
--   for "current clubs, teams, player rosters, national team programs, leagues,
--   coaches and ice facilities". He has now sent the teams and leagues.
--
--   Everything published here comes directly from the General Secretary of the
--   national federation. It is authoritative.
--
-- What is published:
--   1. The "first league" (clubs: Skara, Himalaya Underdogs, Showworks
--      Sporting, Himveer, IBEX, Spawn for men; Rosefinch, Himalaya Underdogs,
--      Himveer for women). The league's own name was NOT supplied, so it is
--      published as "India — First League" with the source named in the
--      description and the exact league name left for Harjinder to correct.
--   2. Eleven clubs, linked to the IHA federation and to that league.
--   3. The existing "India National Team Programme" league and the existing
--      "India National Ice Hockey Team" are linked to the IHA federation so
--      the federation page actually shows them.
--   4. The five existing national_teams rows get their federation_url set to
--      the IHA page so they link back to the governing body.
--
-- What is deliberately NOT published:
--   The state / UT team list. Harjinder's list ended in "..." after Andhra
--   Pradesh, so it is visibly incomplete. Publishing a truncated national
--   roster would misrepresent the IHA, and the incompleteness is already
--   recorded in the federation page description. It stays pending until the
--   full list arrives.
--
-- Also NOT published (needs more detail first):
--   - The Pune mall rink and the Shimla natural ice rink. Neither exists in
--     our rinks table, and we have no rink name or contact for them (Harjinder
--     copied Suraj Pawar for Pune and Rajat for Shimla but gave no addresses).
--   - Which of the shared club names are one club with two sides versus two
--     separate clubs. Himalaya Underdogs, Himveer and Rosefinch appear in both
--     the men's and the women's list; the message is recorded on the shared
--     rows rather than guessed at.
--
-- Idempotent: safe to re-run. Every insert is ON CONFLICT (slug) DO UPDATE.
--
-- Verified live before this migration:
--   - IHA federation id: 2928c892-dc08-473c-8013-d04a238f114a
--   - leagues linked to IHA: 0 | team_workspaces linked to IHA: 0
--   - none of the 11 club names existed in the DB

-- ---------------------------------------------------------------------------
-- 1. Link the existing India league and team to the IHA federation
-- ---------------------------------------------------------------------------
UPDATE public.leagues
   SET federation_id = '2928c892-dc08-473c-8013-d04a238f114a'
 WHERE slug = 'india-national-team-programme'
   AND federation_id IS DISTINCT FROM '2928c892-dc08-473c-8013-d04a238f114a';

UPDATE public.team_workspaces
   SET federation_id = '2928c892-dc08-473c-8013-d04a238f114a'
 WHERE slug = 'india-india-national-ice-hockey-team'
   AND federation_id IS DISTINCT FROM '2928c892-dc08-473c-8013-d04a238f114a';

-- ---------------------------------------------------------------------------
-- 2. The "first league"
--    Harjinder wrote "Teams in the first league" without naming it. Publish
--    under a neutral name and record the verbatim source so it can be renamed
--    the moment he confirms the real title.
-- ---------------------------------------------------------------------------
INSERT INTO public.leagues
  (name, slug, description, country, level, website_url, is_active, federation_id, claimable)
VALUES
  ('India — First League',
   'india-first-league',
   'The first league of the Ice Hockey Association of India. Listed from the General Secretary''s team schedule (received 6 November 2026); the league''s official title was not supplied with the list and will be corrected on confirmation. Men''s clubs: Skara, Himalaya Underdogs, Showworks Sporting, Himveer, IBEX, Spawn. Women''s clubs: Rosefinch, Himalaya Underdogs, Himveer.',
   'India',
   'amateur',
   NULL,
   true,
   '2928c892-dc08-473c-8013-d04a238f114a',
   true)
ON CONFLICT (slug) DO UPDATE
   SET description  = EXCLUDED.description,
       federation_id = EXCLUDED.federation_id,
       level        = EXCLUDED.level,
       country      = EXCLUDED.country,
       updated_at   = now();

-- ---------------------------------------------------------------------------
-- 3. The eleven clubs
--    age_category: 'adult' for the senior sides, 'youth' for the U20 boys.
--    division records which side of the first league the club plays in.
--    Himalaya Underdogs and Himveer appear in BOTH the men's and the women's
--    list in the source message; the source note is preserved in the
--    description so the ambiguity is visible until Harjinder confirms whether
--    these are one club fielding two sides or two separate clubs.
-- ---------------------------------------------------------------------------

-- Men's clubs
INSERT INTO public.team_workspaces
  (name, slug, league_id, age_category, division, visibility, is_active, is_published,
   country_code, home_country, description, federation_id, created_at, updated_at)
VALUES
  ('Skara', 'india-first-league-skara',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Men', 'public', true, true,
   'IN', 'India',
   'Men''s club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Himalaya Underdogs', 'india-first-league-himalaya-underdogs',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Men', 'public', true, true,
   'IN', 'India',
   'Men''s club in the first league of the Ice Hockey Association of India. Listed in both the men''s and the women''s schedules in the source message — to be confirmed whether this is one club fielding two sides or two separate clubs.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Showworks Sporting', 'india-first-league-showworks-sporting',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Men', 'public', true, true,
   'IN', 'India',
   'Men''s club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Himveer', 'india-first-league-himveer',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Men', 'public', true, true,
   'IN', 'India',
   'Club in the first league of the Ice Hockey Association of India. Listed in both the men''s and the women''s schedules in the source message — to be confirmed whether this is one club fielding two sides or two separate clubs.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('IBEX', 'india-first-league-ibex',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Men', 'public', true, true,
   'IN', 'India',
   'Men''s club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Spawn', 'india-first-league-spawn',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Men', 'public', true, true,
   'IN', 'India',
   'Men''s club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now())
ON CONFLICT (slug) DO UPDATE
   SET league_id     = EXCLUDED.league_id,
       division      = EXCLUDED.division,
       description   = EXCLUDED.description,
       federation_id = EXCLUDED.federation_id,
       visibility    = EXCLUDED.visibility,
       is_active     = EXCLUDED.is_active,
       updated_at    = now();

-- Women's clubs
INSERT INTO public.team_workspaces
  (name, slug, league_id, age_category, division, visibility, is_active, is_published,
   country_code, home_country, description, federation_id, created_at, updated_at)
VALUES
  ('Rosefinch', 'india-first-league-rosefinch',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Women', 'public', true, true,
   'IN', 'India',
   'Women''s club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Himalaya Underdogs (Women)', 'india-first-league-himalaya-underdogs-women',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Women', 'public', true, true,
   'IN', 'India',
   'Women''s side in the first league of the Ice Hockey Association of India. The source message lists "Himalaya Underdogs" in both the men''s and the women''s schedules; published as a separate entry pending confirmation of whether it is one club with two sides or two clubs.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Himveer (Women)', 'india-first-league-himveer-women',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'adult', 'Women', 'public', true, true,
   'IN', 'India',
   'Women''s side in the first league of the Ice Hockey Association of India. The source message lists "Himveer" in both the men''s and the women''s schedules; published as a separate entry pending confirmation of whether it is one club with two sides or two clubs.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now())
ON CONFLICT (slug) DO UPDATE
   SET league_id     = EXCLUDED.league_id,
       division      = EXCLUDED.division,
       description   = EXCLUDED.description,
       federation_id = EXCLUDED.federation_id,
       visibility    = EXCLUDED.visibility,
       is_active     = EXCLUDED.is_active,
       updated_at    = now();

-- U20 boys' clubs
INSERT INTO public.team_workspaces
  (name, slug, league_id, age_category, division, visibility, is_active, is_published,
   country_code, home_country, description, federation_id, created_at, updated_at)
VALUES
  ('Punjab Goshawks', 'india-u20-punjab-goshawks',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'youth', 'U20 Boys', 'public', true, true,
   'IN', 'India',
   'U20 boys'' club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Hardcore Challengers', 'india-u20-hardcore-challengers',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'youth', 'U20 Boys', 'public', true, true,
   'IN', 'India',
   'U20 boys'' club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('Mavericks', 'india-u20-mavericks',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'youth', 'U20 Boys', 'public', true, true,
   'IN', 'India',
   'U20 boys'' club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now()),
  ('South Stingers', 'india-u20-south-stingers',
   (SELECT id FROM public.leagues WHERE slug='india-first-league'),
   'youth', 'U20 Boys', 'public', true, true,
   'IN', 'India',
   'U20 boys'' club in the first league of the Ice Hockey Association of India.',
   '2928c892-dc08-473c-8013-d04a238f114a', now(), now())
ON CONFLICT (slug) DO UPDATE
   SET league_id     = EXCLUDED.league_id,
       division      = EXCLUDED.division,
       description   = EXCLUDED.description,
       federation_id = EXCLUDED.federation_id,
       visibility    = EXCLUDED.visibility,
       is_active     = EXCLUDED.is_active,
       updated_at    = now();

-- ---------------------------------------------------------------------------
-- 4. Point the national teams at the IHA page
-- ---------------------------------------------------------------------------
UPDATE public.national_teams
   SET federation_url = 'https://rinkstop.com/federations/india',
       updated_at = now()
 WHERE country = 'India'
   AND (federation_url IS NULL OR federation_url <> 'https://rinkstop.com/federations/india');

-- ---------------------------------------------------------------------------
-- 5. Federation description and contact
--    The description states what is confirmed and what is still outstanding,
--    so the page itself tells the truth rather than implying completeness.
-- ---------------------------------------------------------------------------
UPDATE public.federations
   SET description = 'The Ice Hockey Association of India (IHA) is the national governing body for ice hockey in India, led by General Secretary Harjinder Singh. The IHA runs national teams across men''s, women''s, U20 and U18 age categories, and its first league includes men''s clubs (Skara, Himalaya Underdogs, Showworks Sporting, Himveer, IBEX, Spawn), women''s clubs (Rosefinch, Himalaya Underdogs, Himveer) and U20 boys'' clubs (Punjab Goshawks, Hardcore Challengers, Mavericks, South Stingers). A complete list of affiliated state and UT teams is being confirmed with the General Secretary and will be added shortly.',
       contact_email = 'icehockeyindia@gmail.com',
       updated_at = now()
 WHERE id = '2928c892-dc08-473c-8013-d04a238f114a';
