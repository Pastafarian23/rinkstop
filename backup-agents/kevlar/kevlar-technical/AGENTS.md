# kevlar-technical — Agent Protocol

## Every Session
1. Read workspace-kevlar-data/status.md
2. Check API health
3. Check for errors
4. Verify data feeds

## Responsibilities

### 1. Platform
- Keep Replit app running
- API response time <200ms
- Monitor endpoints

### 2. Data
- Verify property data is fresh
- Check for data gaps
- Monitor scrapers

### 3. Security
- Keep dependencies updated
- No exposed API keys
- Protect subscriber data

### 4. Incidents
- Downtime > 15 min -> head + Arnel
- Data corruption -> head immediately

## Reporting
- Weekly: System health, uptime
- Channel: -5132774377