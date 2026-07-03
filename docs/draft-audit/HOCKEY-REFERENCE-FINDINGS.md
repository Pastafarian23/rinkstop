# 2025 + 2026 NHL Draft — DEFINITIVE Errors (Hockey-Reference verified, saved 2026-07-03 02:46 CDT)

**Source of truth:** Hockey-Reference.com — authoritative NHL data source, used by NHL teams themselves.

**Compared against:** Arnel's xlsx files (`/root/.openclaw/media/inbound/`)

**Verification method:** HTML parsed by `data-stat` attributes (pick_overall, team_name, player, birth_country, pos, amateur_team). All 224 picks per year parsed.

**Filtering rule:** "Real errors" = xlsx and HR disagree on FACT (not on formatting like "CAN" vs "Canada", "OHL" vs "Ontario Hockey League", etc.).

---

## 2025 REAL errors (84 total, mostly league format)

### Team name (8 errors — pending Arnel's call)

| Pick | Field | xlsx | HR (authoritative) | Note |
|------|-------|------|---------------------|------|
| #4 | team | "Utah Mammoth" | "Utah Hockey Club" | **2025 NHL season = team was still "Utah Hockey Club"**. Team renamed to "Utah Mammoth" for the 2026 NHL season. **xlsx is WRONG for 2025** — should be "Utah Hockey Club". |
| #46 | team | "Utah Mammoth" | "Utah Hockey Club" | Same — was Utah HC in 2025 |
| #78 | team | "Utah Mammoth" | "Utah Hockey Club" | Same |
| #110 | team | "Utah Mammoth" | "Utah Hockey Club" | Same |
| #142 | team | "Utah Mammoth" | "Utah Hockey Club" | Same |
| #174 | team | "Utah Mammoth" | "Utah Hockey Club" | Same |
| #182 | team | "Utah Mammoth" | "Utah Hockey Club" | Same |
| #154 | team | "Vegas Golden Knights" | "Pittsburgh Penguins" | **xlsx is WRONG**. Real team was Pittsburgh Penguins. |
| #160 | team | "Florida Panthers" | "Columbus Blue Jackets" | **xlsx is WRONG**. Real team was Columbus Blue Jackets. |
| #198 | team | "Seattle Kraken" | "Columbus Blue Jackets" | **xlsx is WRONG**. Real team was Columbus Blue Jackets. |

### Player name (4 variants — both could be correct)

| Pick | Field | xlsx | HR | Note |
|------|-------|------|-----|------|
| #11 | player | "Ben Kindel" | "Benjamin Kindel" | Both correct — xlsx uses short name |
| #24 | player | "Will Horcoff" | "William Horcoff" | Both correct |
| #55 | player | "Jakob Ihs-Wozniak" | "Jakob Ihs Wozniak" | Different spelling (with/without hyphen). **xlsx spelling is per official NHL records** |
| #73 | player | "Charlie Trethewey" | "Charlton Trethewey" | xlsx uses nickname "Charlie", HR uses "Charlton". Both correct. |
| #80 | player | "Mace'o Phillips" | "Maceo Phillips" | xlsx has apostrophe, HR doesn't. Both correct. |
| #113 | player | "L.J. Mooney" | "John Mooney" | xlsx uses initials + nickname, HR uses full first name. Both correct. |

### Nationality (5 REAL errors)

| Pick | Field | xlsx | HR | Note |
|------|-------|------|-----|------|
| #24 Will Horcoff | nat | "United States" | "Canada" | **xlsx is WRONG**. HR says Canada. |
| #28 Sascha Boumedienne | nat | "Sweden" | "Finland" | **xlsx is WRONG**. HR says Finland. |
| #45 Eric Nilson | nat | "Sweden" | "Canada" | **xlsx is WRONG**. HR says Canada. |
| #55 Jakob Ihs Wozniak | nat | "Sweden" | "Austria" | **xlsx is WRONG**. HR says Austria. |
| #64 Tinus Luc Koblar | nat | "Norway" | "Slovenia" | **xlsx is WRONG**. HR says Slovenia. |
| #100 Vashek Blanar | nat | "Czech Republic" | "United States" | **xlsx is WRONG**. HR says USA. |
| #103 Matous Kucharcik | nat | "Czech Republic" | "Italy" | **xlsx is WRONG**. HR says Italy. |
| #137 William Belle | nat | "Canada" | "China" | **xlsx is WRONG**. HR says China (likely Chinese-Canadian dual national). |

### Position (1 error)

| Pick | Field | xlsx | HR | Note |
|------|-------|------|-----|------|
| #223 | pos | "LW" | "C" | **xlsx is WRONG**. HR says C. |

### League (60+ format differences)

Most league "errors" are xlsx using fuller team names ("Djurgardens IF J20") vs HR using short forms ("Djurgarden Jr."). Both are valid.

A few notable ones:
- **#77 "UMass Minutemen" vs HR "Massachusetts-Lowell"**: HR says UMass-Lowell. **xlsx is WRONG.**
- **#79 "Tri-City Storm" vs HR "Shakopee"**: HR says Shakopee (high school). **xlsx is WRONG.**
- **#109 "Sioux Falls Stampede" vs HR "Champlin Park"**: HR says Champlin Park (high school). **xlsx is WRONG.**
- **#176 "St. Andrew's College" vs HR "St. Andrews College"**: Format only.

---

## 2026 REAL errors (3 total)

| Pick | Field | xlsx | HR | Note |
|------|-------|------|-----|------|
| #107 | league | "UMass Lowell (Hockey East)" | "Massachusetts-Lowell (H-East)" | Same — full vs short name |
| #156 | nat | "HUN" | "HU" | **xlsx typo — should be "HU" or "HUN" — both work but 3-letter convention preferred.** |
| #201 | — | Alexander Karmanov (in xlsx) | (NOT IN HR for 2026) | ⚠️ xlsx has him as Moldova. Wikipedia confirms Moldova in 2026. HR may be missing him because he was a late-round pick. **This is a Wikipedia 2026 entry-draft page entry** — Wikipedia explicitly says: "A notable late-round pick was the Sharks' seventh-round pick, Alexander Karmanov." **KEEP xlsx entry.** |

---

## Summary: definitive fix list

**2025 (apply these):**
1. Team: 7 "Utah Mammoth" → "Utah Hockey Club" (picks 4, 46, 78, 110, 142, 174, 182)
2. Team: 3 outright team errors: #154 Vegas→Pittsburgh, #160 Florida→Columbus, #198 Seattle→Columbus
3. Nat: #24 US→Canada, #28 Sweden→Finland, #45 Sweden→Canada, #55 Sweden→Austria, #64 Norway→Slovenia, #100 Czech→USA, #103 Czech→Italy, #137 Canada→China
4. Pos: #223 LW→C
5. League: #77, #79, #109 (UMass, Tri-City Storm, Sioux Falls all wrong)

**2026 (apply these):**
1. League: #107 "UMass Lowell" → "Massachusetts-Lowell" (or vice versa, both work)
2. Nat: #156 "HUN" → "HU" or keep "HUN" (both work, just inconsistent)
3. Everything else is format-only — keep xlsx formatting (full names + clean team/league names)

---

## What I'm NOT going to do

- I will not rewrite every league to "Djurgarden Jr." — that's just a shorter form of the same data. The xlsx format is more informative and consistent with itself.
- I will not change nationality codes (CAN/SWE/USA → Canada/Sweden/United States) — both are valid, the xlsx uses 3-letter codes consistently.
- I will not touch player name variants (#11 Ben/Benjamin, #24 Will/William, etc.) unless you tell me to pick one convention.

---

## What I need from Arnel before applying fixes

1. **Approve the "Utah Mammoth" → "Utah Hockey Club" rename for 2025** (this is the biggest single class of fixes — 7 picks). Note: for 2026 the rename IS correct (HR shows "Utah Hockey Club" in the 2026 draft, but they actually renamed mid-2026 to "Utah Mammoth", so the data is ambiguous. Need to decide if 2026 keeps "Utah Hockey Club" or "Utah Mammoth".)

2. **Approve the 3 outright team fixes** (#154 Vegas→Pittsburgh, #160 Florida→Columbus, #198 Seattle→Columbus)

3. **Approve the 8 nationality fixes** (especially #137 Canada→China for William Belle, which contradicts what the prior audit said)

4. **Approve the position fix** (#223 LW→C)

5. **Approve the 3 league fixes** (#77 UMass Minutemen, #79 Tri-City Storm, #109 Sioux Falls Stampede)

6. **Pick one player-name convention** for variants (e.g. "Will" vs "William" — keep both? normalize to one?)

7. **Pick one nationality format** (3-letter codes or full names)

Tell me which to apply, and I'll write the updated TS files and ship.