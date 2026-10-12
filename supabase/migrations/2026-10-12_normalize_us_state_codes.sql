-- 2026-10-12: Normalize 18 US rinks using full state names to 2-letter codes.
--
-- Background: 724 of 742 active US rinks use 2-letter codes (e.g. 'MI'),
-- 18 use full names (e.g. 'Michigan'). Coverage reports split these rows
-- incorrectly because 'Michigan' != 'MI' in GROUP BY. Normalizing fixes the
-- reports and makes the data consistent.
--
-- Per Arnel 2026-10-12 directive, this migration is LIMITED to:
--   - 18 explicit UPDATEs (one per row, by primary key id)
--   - No other tables touched
--   - No schema changes
--   - Idempotent (re-running produces no changes; the AND province_state =
--     'X' guard ensures we only touch rows still in the old state)
--
-- Verified against production on 2026-10-12 before writing:
--   18 rows returned for country='United States' with province_state length > 2
--   724 rows already use 2-letter codes (untouched)

BEGIN;

UPDATE rinks SET province_state = 'ND' WHERE id = '204f2baf-7e7e-4d68-86ad-f19e05c7b3dc'::uuid AND province_state = 'North Dakota';
UPDATE rinks SET province_state = 'SD' WHERE id = '7aabfd06-1a4f-4c13-ac8f-e6418de7703b'::uuid AND province_state = 'South Dakota';
UPDATE rinks SET province_state = 'AL' WHERE id = '45bf5d5c-692e-41b5-bbb5-43ccb192fe94'::uuid AND province_state = 'Alabama';
UPDATE rinks SET province_state = 'OH' WHERE id = '2270a7dd-125b-41fe-a2ff-17d73ee72982'::uuid AND province_state = 'Ohio';
UPDATE rinks SET province_state = 'IA' WHERE id = 'ddfeda37-fd57-4ce7-b577-f68f3daadf14'::uuid AND province_state = 'Iowa';
UPDATE rinks SET province_state = 'NE' WHERE id = 'f3993dfa-273b-411a-8583-998fd3b3779a'::uuid AND province_state = 'Nebraska';
UPDATE rinks SET province_state = 'IL' WHERE id = 'ee88c99a-0eb2-40be-bd60-0e05d1d4fcec'::uuid AND province_state = 'Illinois';
UPDATE rinks SET province_state = 'AL' WHERE id = '5c40e36c-6865-4e40-b090-53452d1fec79'::uuid AND province_state = 'Alabama';
UPDATE rinks SET province_state = 'AL' WHERE id = '62f56f1f-bc4e-4b47-83f5-5617bf670a77'::uuid AND province_state = 'Alabama';
UPDATE rinks SET province_state = 'NE' WHERE id = 'ad3dc348-8ee7-4274-ac90-9a0e14bfcae1'::uuid AND province_state = 'Nebraska';
UPDATE rinks SET province_state = 'MI' WHERE id = '75b6fdda-efb3-4559-a917-b5ad0ab44e86'::uuid AND province_state = 'Michigan';
UPDATE rinks SET province_state = 'WI' WHERE id = 'cb66457b-3816-40e1-b395-ed8a70b009fa'::uuid AND province_state = 'Wisconsin';
UPDATE rinks SET province_state = 'NE' WHERE id = '3a8eaf4b-592b-4ad3-816c-b9501b17e085'::uuid AND province_state = 'Nebraska';
UPDATE rinks SET province_state = 'MI' WHERE id = '99f13951-a229-4aba-bbcf-0b326c9a0909'::uuid AND province_state = 'Michigan';
UPDATE rinks SET province_state = 'IA' WHERE id = '6a6e4414-e65b-4bca-a6e8-b39b59695677'::uuid AND province_state = 'Iowa';
UPDATE rinks SET province_state = 'IA' WHERE id = '5d733165-bbcc-459a-a123-47876c4b05cf'::uuid AND province_state = 'Iowa';
UPDATE rinks SET province_state = 'IA' WHERE id = '9dad603e-ba0e-499e-9fc5-36dcf2347399'::uuid AND province_state = 'Iowa';
UPDATE rinks SET province_state = 'IA' WHERE id = 'c76eb7fd-973c-4661-8d79-2213d66a3741'::uuid AND province_state = 'Iowa';

COMMIT;
