# Canonical NHL team IDs (proposed, no merge performed)

| Franchise (current) | Canonical team_id | Duplicates to retire |
|---|---|---|
| Montreal Canadiens | (active row, dfa8a4b4) | cff8bd78-5fee-49dc-b0ee-374722efd7b5 (inactive, "duplicate of Montréal Canadiens (dfa8a4b4)") |
| Winnipeg Jets (current) | 88d85b2b-7a91-4679-b1d4-e45d73e3838f (active) | 898e8374-f678-41c3-9876-95f7beaebaf6 (inactive, slug winnipeg-jets-whl) |
| Utah Mammoth | 82a53679-b1e9-4221-b58e-a7b89f45c638 (active) | 3b80d876-f931-4740-a47f-0ed15c0e410f (already merged_into_id = 82a53679) |

Historical (inactive, distinct franchise, leave alone):
- a0000001 Ottawa Senators (original) — 1917-1934, distinct franchise
- a0000002 Montreal Wanderers — 1917-1918, distinct
- a0000003 Quebec Bulldogs — 1919-1920, distinct
- a0000004 Hamilton Tigers — 1920-1925, distinct
- a0000005 Pittsburgh Pirates — 1925-1930, distinct
- a0000006 Philadelphia Quakers — 1930-1931, distinct
- a0000007 New York Americans — 1925-1942, distinct
- a0000008 Brooklyn Americans — 1941-1942, distinct
- a0000009 St. Louis Eagles — 1934-1935, distinct
- a0000010 Montreal Maroons — 1924-1938, distinct
- a0000011 California Golden Seals — 1967-1976, merged_into_id already set
- a0000012 Cleveland Barons — 1976-1978, merged_into_id already set
- a0000014 Kansas City Scouts — 1974-1976, merged_into_id already set
- a0000016 Toronto Arenas — 1917-1919, merged_into_id already set
- a0000017 Toronto St. Patricks — 1919-1927, merged_into_id already set
- a0000018 Detroit Cougars — 1926-1930, merged_into_id already set
- a0000019 Detroit Falcons — 1930-1932, merged_into_id already set
- a0000020 Mighty Ducks of Anaheim — 1993-2006, merged_into_id already set
- a0000021 Winnipeg Jets (original) — 1972-1996, merged_into_id already set (note: target = 82a53679 is wrong; the original Jets moved to Phoenix/Arizona/Utah, but that's how the ingest recorded it)
- a0000023 Arizona Coyotes — 1996-2024, merged_into_id = 82a53679 (same wrong target — see note above)

NOTE: rows a0000021 and a0000023 have merged_into_id pointing to 82a53679 (Utah Mammoth). Per NHL history:
- Original Winnipeg Jets (1972-1996) → moved to Phoenix → became Coyotes (1996-2024) → relocated to Utah (2024) → renamed Utah Hockey Club → Utah Mammoth (2025)
- Arizona Coyotes (1996-2024) → deactivated, franchise continued as Utah
So a0000023 (Arizona) → Utah Mammoth is correct.
But a0000021 (Winnipeg Jets 1972-1996) → 82a53679 is wrong: the historical Jets became the Coyotes, which became Utah, but the new Winnipeg Jets (since 2011) is a separate franchise from Atlanta Thrashers. Arnel should confirm canonical IDs before any merge.
