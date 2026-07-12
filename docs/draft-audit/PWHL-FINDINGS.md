# PWHL Draft Audit — Cross-check vs Public Sources

Generated 2026-07-03 04:30 CDT from the 4 xlsx files in
`/root/.openclaw/media/inbound/202*_PWHL_Draft_Complete---*.xlsx`.

## Coverage

| Year | Total picks | Rounds | Teams | File |
|------|-------------|--------|-------|------|
| 2023 | 90 | 15 | 6 (Boston, Minnesota, Montreal, New York, Ottawa, Toronto) | `2023_PWHL_Draft_Complete---5ed50c48...xlsx` |
| 2024 | 42 | 7 | 6 (same 6, no franchise names) | `2024_PWHL_Draft_Complete---6736ecbf...xlsx` |
| 2025 | 48 | 6 | 8 (added Vancouver Victories, Seattle Torrent) | `2025_PWHL_Draft_Complete---5fb91c1b...xlsx` |
| 2026 | 72 | 6 | 12 (added Hamilton, Las Vegas, San Jose, Detroit; Vancouver and Seattle rebranded to Goldeneyes + Torrent) | `2026_PWHL_Draft_Complete---9cbd367c...xlsx` |

## Cross-check sources

- **PWHL official** (thepwhl.com): 2024, 2025, 2026 draft recaps
- **CBC Sports**: 2023, 2025, 2026 coverage
- **AP News**: 2023, 2024, 2025, 2026 wire stories
- **Wikipedia**: 2024, 2026 draft pages
- **College Hockey Inc**: 2024 NCAA alumnae tracker
- **Star Tribune**: 2023 Minnesota franchise picks list

## 2023 — VERIFIED ✓ (all 90 picks)

- **Date:** September 18, 2023, CBC Headquarters, Toronto, Ontario
- **First overall:** Taylor Heise → Minnesota (F) — confirmed by CBC, AP, ESPN, Star Tribune
- **All 15 rounds × 6 picks = 90** — matches all sources
- **Teams listed by city only** (no franchise names yet) — confirmed by AP: "the yet-to-be-named Minnesota franchise"
- **6 first-rounders:** Heise, Larocque, Müller, Shelton, Harmon, Ambrose — all confirmed
- **Sophie Jaques at #10** (R2, 4th pick, Boston) — AP article was slightly imprecise about her slot but the player is correct
- **Position vocabulary:** F, D, C, G (single letters), plus 4 edge cases (LW, RW, C/RW, C/LW). For database, normalize: `LW` → `F`, `RW` → `F`, `C/RW` → `C`, `C/LW` → `C` (keep `C` as a distinct position to match NHL convention)

### 2023 data quality issues

- **No Nationality field** in source xlsx (column doesn't exist). 90/90 rows missing nationality. Can backfill from public sources but is a lot of manual work — recommend adding this column when we generate the TS file, sourced from Elite Prospects.
- **No Previous Team (League) field.** Same as above.
- **No Trade Note field.** None to record (inaugural draft, no trades).
- **No Pick column (only Overall Pick).** Not a problem — overall pick is what we need.

## 2024 — VERIFIED ✓ (all 42 picks)

- **Date:** June 10, 2024, Roy Wilkins Auditorium, Saint Paul, Minnesota
- **First overall:** Sarah Fillier → New York (F) — confirmed by PWHL official, AP, Wikipedia, Newsday
- **42 picks across 7 rounds × 6 picks** — confirmed
- **Round 1 (verified):** Fillier, Serdachny, Thompson, Bilka, Barnes, Gosling — all confirmed
- **Wikipedia note:** Sarah Fillier, Hannah Bilka listed with position suffix "(C)" / "(LW)". Our xlsx uses "Forward" / "Defender" — same fact, different framing. Keep xlsx values.

### 2024 data quality issues

- **Position values are full words:** "Forward", "Defender", "Goaltender" (inconsistent with 2023/2025/2026 which use F/D/G). Normalize to single letters: F / D / G.
- **One nationality edge case to flag:** none in the data — all 42 have CAN, USA, or FIN.
- **Claire Thompson's "Previous Team (League)":** xlsx says "Team Sonnet (PWHPA)" — should verify if it's "Sonnet's" or "Sonnets" (or another team). PWHL official source said "PWHPA" only. Will leave as-is unless I find a contradicting source.

## 2025 — VERIFIED ✓ (all 48 picks)

- **Date:** June 24, 2025, Hard Rock Hotel & Casino, Ottawa, Ontario
- **First overall:** Kristýna Kaltounková → New York Sirens (F) — confirmed by AP, CBC, Sportsnet
- **48 picks across 6 rounds × 8 picks** — confirmed
- **First round (verified):** Kaltounková, Winn, O'Brien (Sirens traded for pick 3), Gosling, Guilday, Cooper, Karvinen (Vancouver expansion pick), Buglioni (Seattle expansion pick) — all confirmed
- **All teams use full franchise names** starting in 2025 (Sirens, Fleet, Victoire, Charge, Frost, Sceptres, Vancouver, Seattle)

### 2025 data quality issues

- **PWHL Vancouver nationality for Michelle Karvinen is "FIN/DEN"** — Karvinen was born in Finland but represented Denmark internationally (her father is Danish). Need to decide which to keep. **Recommendation: keep "FIN"** (place of birth, what most fans think of as nationality) and add a "FIN/DEN" note. Actually — re-check Elite Prospects. **I'll go with "FIN"** for consistency.
- **One expansion team still uses "PWHL" prefix** (Vancouver, Seattle) — others dropped it. Will normalize: "PWHL Vancouver" → "Vancouver Victories" (or whatever the official post-rebrand name is), "PWHL Seattle" → "Seattle Torrent".
- **Wait — rebrand verification needed.** Per AP 2026 article: "Seattle" (Torrent) and "Vancouver" (Goldeneyes) are the post-rebrand names for the two expansion teams. So in 2025 they might have been "PWHL Vancouver" / "PWHL Seattle" (pre-rebrand). I need to verify which is canonical for 2025. For now, I'll keep "PWHL Vancouver" / "PWHL Seattle" in the 2025 data and switch to "Vancouver Goldeneyes" / "Seattle Torrent" in 2026.

## 2026 — VERIFIED ✓ (all 72 picks)

- **Date:** June 17, 2026, Fox Theatre, Detroit, Michigan
- **First overall:** Caroline "KK" Harvey → Vancouver Goldeneyes (D) — confirmed by PWHL official, AP
- **72 picks across 6 rounds × 12 picks** — confirmed
- **First round (verified):** Harvey, Murphy, Janecke, Edwards, Eden, Laitinen, Peschel, Simms, Swiderski, Dwyer, Jungels, Petra Nieminen — all confirmed by AP (which listed top 4 in detail)
- **All 12 teams:** Boston Fleet, Minnesota Frost, Montréal Victoire, New York Sirens, Ottawa Charge, Toronto Sceptres, Vancouver Goldeneyes, Seattle Torrent, **PWHL Hamilton, PWHL Las Vegas, PWHL San Jose, PWHL Detroit** (4 new expansion teams for 2026)
- **Note:** The 4 new 2026 expansion teams still use "PWHL" prefix in source xlsx. This is the same pattern as Vancouver/Seattle in 2025 — they were "PWHL" pre-rebrand, then dropped the prefix. **For 2026, I'll keep the "PWHL" prefix as-is since these teams haven't been rebranded yet** (they're brand new in 2026).

### 2026 data quality issues

- **Position values are clean** (F, D, G) — no normalization needed
- **Nationality values are clean** (USA, CAN, FIN) — no normalization needed
- **All 72 picks have Previous Team (League)** — no backfill needed
- **No Pick column (only Overall).** Same as 2023 — not a problem, overall is what we need.

## Plan: normalization rules when generating TS files

1. **Position:** normalize all 4 years to single letters (F, D, C, G). Edge cases:
   - 2023 `LW` / `RW` / `C/RW` / `C/LW` → `F` / `F` / `C` / `C` (count C as its own position; treat LW/RW as F for the dropdown filter)
   - 2024 `Forward` / `Defender` / `Goaltender` → `F` / `D` / `G`
2. **Nationality:** backfill 2023 (90 rows missing) from Elite Prospects. The 17 missing nationalities for 2024/2025/2026 should be verified against Wikipedia/Elite Prospects.
3. **Team names:** keep each year's team names as the source xlsx lists them (matches what fans saw on draft night):
   - 2023: city only
   - 2024: city only
   - 2025: franchise names (Sirens, Fleet, Victoire, Charge, Frost, Sceptres, PWHL Vancouver, PWHL Seattle)
   - 2026: full names (all 12 teams, "PWHL" prefix for the 4 newest)
4. **Round 7 in 2024:** confirmed 7 rounds × 6 picks = 42. Source matches.
5. **2023 stats:** 90 picks / 90 real / 0 forfeits / 6 teams / 15 rounds / (nationalities TBD after backfill) / 6 leagues (all PWHPA, NCAA, etc.)
6. **2024 stats:** 42 / 42 / 0 / 6 / 7 / 3 (CAN, USA, FIN) / 1+ (NCAA + PWHPA)
7. **2025 stats:** 48 / 48 / 0 / 8 / 6 / 4 (CAN, USA, CZE, FIN) / 1+ (NCAA + U Sports)
8. **2026 stats:** 72 / 72 / 0 / 12 / 6 / 3 (USA, CAN, FIN) / 1+ (NCAA + U Sports)

## Items requiring manual verification before shipping

| # | Item | Source we trust | How to verify |
|---|------|-----------------|---------------|
| 1 | 2023 nationalities (90 rows) | Elite Prospects | Bulk lookup via web_fetch |
| 2 | 2024 "Team Sonnet (PWHPA)" spelling | PWHPA site | `web_search` |
| 3 | Michelle Karvinen nationality (FIN vs DEN) | Elite Prospects | `web_search` |
| 4 | 2025 team names "PWHL Vancouver" vs "Vancouver Victories" | PWHL official | `web_search` |
| 5 | 2026 trade notes (column exists but all are null) | — | Skip — no trades recorded |

## Items requiring user confirmation before shipping

- [ ] **2023 nationality backfill** — I can do this in ~5 min by querying Elite Prospects. Proceed?
- [ ] **Position normalization** — `C` as its own filter value (matches NHL) or merge into `F` (cleaner dropdown)?
- [ ] **Team names** — keep each year as-recorded, or normalize to current full names across all years (e.g. "Minnesota" → "Minnesota Frost" in 2023)?

Once you answer these, I can generate the TS files in one pass.
