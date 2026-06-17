-- 2026-06-17_evasion_aliases.sql
--
-- Common evasion-pattern aliases. These are abbreviations people
-- use to dodge standard profanity filters:
--   - 'fck' instead of 'fuck' (drop vowel)
--   - 'phuck' instead of 'fuck' (extra letter)
--   - 'fvck' instead of 'fuck' (vowel swap)
--   - 'n1gger' instead of 'nigger' (leet)
--
-- Why not auto-detect? Skeleton regex matching is too permissive
-- (would also match 'fake' as 'fuck'). Manual list is explicit.
--
-- Severity:
--   - hard  = auto-reject (slurs with leet: n1gger, f4ggot, etc.)
--   - soft  = queue for review (Arnel decides case by case)

INSERT INTO bad_words (word, severity, category) VALUES
  ('fck', 'soft', 'profanity'), ('fuk', 'soft', 'profanity'), ('fukah', 'soft', 'profanity'), ('fuker', 'soft', 'profanity'), ('phuk', 'soft', 'profanity'), ('phuck', 'soft', 'profanity'), ('phuked', 'soft', 'profanity'), ('phuking', 'soft', 'profanity'), ('fvck', 'soft', 'profanity'), ('fux', 'soft', 'profanity'), ('fcuk', 'soft', 'profanity'), ('wtf', 'soft', 'profanity'), ('sht', 'soft', 'profanity'), ('shyt', 'soft', 'profanity'), ('shiet', 'soft', 'profanity'), ('azs', 'soft', 'profanity'), ('azz', 'soft', 'profanity'), ('biatch', 'soft', 'profanity'), ('beeyotch', 'soft', 'profanity'), ('dmn', 'soft', 'profanity'), ('a55', 'soft', 'profanity'), ('n1gger', 'hard', 'slur'), ('n1gg3r', 'hard', 'slur'), ('nigg3r', 'hard', 'slur'), ('f4ggot', 'hard', 'slur'), ('f4g', 'hard', 'slur')
ON CONFLICT (word) DO NOTHING;
