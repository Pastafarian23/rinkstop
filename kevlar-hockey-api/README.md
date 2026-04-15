# NHL Hockey API - Kevlar Data

## Quick Start (Local)

```bash
npm install
node server.js
```

API runs at `http://localhost:3000`

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/nhl/teams` | All 32 NHL teams |
| `GET /api/nhl/teams/:id` | Single team |
| `GET /api/nhl/schedule` | Upcoming games |
| `GET /api/nhl/scores` | Recent results |
| `GET /api/nhl/standings` | Current standings |

## Deploy to Replit

1. Create new Replit (Node.js)
2. Upload files
3. `npm install`
4. Run server

## Data Sources

- Teams: TheSportsDB API
- Schedule/Scores: NHL.com (live)
- Standings: hockey-reference.com

## Current Status

- ✅ Teams: 32 NHL teams loaded
- ⚠️ Schedule/Scores: Needs Replit deployment for live scraping
- ⚠️ Standings: Needs Replit deployment for live scraping