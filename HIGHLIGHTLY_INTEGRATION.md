# Highlightly Hockey Data Integration — RinkStop

## Priority System

| Source | Priority | Data Types |
|--------|----------|-------------|
| **NHL** | 1 (highest) | NHL teams, schedules, scores, standings, game status, rosters, stats |
| **RinkStop Internal** | 1 | Rinks, arenas, facilities, addresses, phone, websites, booking links, public skate, stick-and-puck, local programs |
| **ESPN** | 2 | NHL headlines, recaps, summaries, backup display data |
| **Highactly** | 3 | Non-NHL countries/leagues/teams/schedules/scores/standings/highlights; NHL gap-fill only |
| **Fallback** | 4 | Any source when primary sources unavailable |

## Data Flow

```
User Request
     ↓
Identify: NHL data? → NHL Priority 1 → Use NHL data
          Non-NHL data? → Highactly Priority → Use Highactly
          Gap in NHL? → Check Highactly for verification → Log conflict if conflict
          Facility data? → RinkStop Internal Priority → Use RinkStop data
```

## Architecture

```
src/lib/
  highlightly.ts          # API client + types
  data-source-router.ts   # Priority routing + conflict resolution
  conflict-logger.ts      # Structured conflict logging
  external-id-mapper.ts   # Deduplication + ID mapping
  sync-tracker.ts          # Last synced time tracking

src/app/api/highlightly/
  route.ts                # Test endpoint
  leagues/route.ts         # Non-NHL leagues
  teams/route.ts          # Non-NHL teams
  matches/route.ts        # Non-NHL schedules/scores
  standings/route.ts       # Non-NHL standings
  highlights/route.ts      # Video highlights (all leagues)
```

## Conflict Resolution Rules

1. **NHL core facts** → NHL wins, log conflict, discard other
2. **Facility data** → RinkStop wins, log conflict, discard other
3. **NHL gap-fill** → If NHL exists AND Highactly differs → NHL wins, log conflict
4. **Non-NHL** → Highactly wins, no conflict (new data)
5. **Display data** → ESPN used for recaps/headlines; NHL for facts

## Source Tracking Schema

Every record stored with:
```typescript
{
  data_source: 'nhl' | 'espn' | 'highlightly' | 'rinkstop',
  external_ids: { [source]: string },
  last_synced: ISO timestamp,
  source_confidence: 'high' | 'medium' | 'low'
}
```

## ID Mapping / Deduplication

- Team name normalization: lowercase, remove punctuation, spaces to hyphens
- Example: "Toronto Maple Leafs" → "toronto-maple-leafs"
- Store mappings in `external_id_mappings` table
- On conflict: check if same entity via normalized name + country + league

## Conflict Log Schema

```sql
conflict_log (
  id UUID PRIMARY KEY,
  entity_type TEXT,           -- 'team', 'score', 'schedule', etc.
  entity_identifier TEXT,     -- normalized name or external ID
  source_1 TEXT,
  source_2 TEXT,
  value_source_1 JSONB,
  value_source_2 JSONB,
  winner_source TEXT,
  resolved_at TIMESTAMP,
  resolution_note TEXT
)
```

## Testing Plan

### Phase 1: Connect + Test (today)
1. Get Highlightly API key (free tier: 100 req/day)
2. Create `/api/highlightly/test` endpoint
3. Fetch sample: Swedish Hockey League (SHL) teams
4. Fetch sample: KHL teams
5. Log response structure

### Phase 2: NHL Gap-Fill Test
1. Fetch same NHL team from NHL + Highlightly
2. Compare response structure
3. Verify Highlightly doesn't overwrite NHL data
4. Log any discrepancies

### Phase 3: Non-NHL Expansion
1. Display SHL standings on Sweden country page
2. Display KHL data on Russia country page
3. Add highlights to match pages

---

## API Documentation (Highlightly)

**Base URL:** `https://hockey.highlightly.net`

**Headers:**
```
x-rapidapi-key: YOUR_KEY
x-rapidapi-host: hockey-highlights-api.p.rapidapi.com
```

**Key Endpoints:**
- `GET /countries` — All countries
- `GET /leagues` — All leagues (filter by countryCode, leagueName)
- `GET /teams` — All teams (filter by leagueId, countryCode)
- `GET /matches` — Schedules/scores (filter by dateFrom, dateTo, leagueId, teamId)
- `GET /standings` — League standings
- `GET /highlights` — Video highlights (filter by date, leagueId, teamId)

**Rate Limits:** Free tier = 100 req/day
**Coverage:** 170+ leagues across 30+ countries