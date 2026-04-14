# Kevlar Data Replit Pivot Guide
## From Property API → Multi-Vertical API Platform

---

## The Goal

Transform your Replit project from a single Property API to a unified **Multi-Vertical API Platform**:

```
kevlardata.com/api/v1/hockey/...
kevlardata.com/api/v1/property/...
kevlardata.com/api/v1/finance/...
kevlardata.com/api/v1/cannabis/...
```

---

## Phase 1: Restructure the Code (Day 1)

### 1.1 Create Vertical Folders

```
/lib
  /hockey
    facilities.ts      # RinkStop data
    scoresheets.ts    # Game stats
    drills.ts         # CoachBoard drills
  /property
    properties.ts     # Cook County data
    parcels.ts       # Parcel records
  /finance
    markets.ts        # SativaExchange data
    crypto.ts        # Crypto prices
  /cannabis
    strains.ts       # Strain database
    dispensaries.ts  # Dispensary locations
  /common
    auth.ts          # API key auth
    billing.ts       # Usage tracking
    responses.ts     # Standard response format
```

### 1.2 Update API Routes

**OLD (Property only):**
```
GET /api/properties
GET /api/properties/:id
```

**NEW (Multi-vertical):**
```
GET /api/v1/hockey/facilities
GET /api/v1/hockey/scoresheets
GET /api/v1/property/properties
GET /api/v1/finance/markets
GET /api/v1/cannabis/strains
```

---

## Phase 2: Fix API Key UX (Day 2) — CRITICAL

### 2.1 Create Better Key Management

Add these endpoints:

```javascript
// GET /api/keys - List your API keys (masked)
{
  "keys": [
    { "id": "key_123", "name": "Production", "prefix": "kd_live_****", "last_used": "2026-04-14", "calls_used": 5432 }
  ]
}

// POST /api/keys - Create new key
{ "name": "My App" }
// Returns: { "key": "kd_live_xR2s8K...", "show_once": true }

// POST /api/keys/:id/regenerate - Regenerate key
// Returns: { "key": "kd_live_newKey...", "show_once": true }

// GET /api/usage - Usage dashboard
{
  "total_calls": 5432,
  "by_endpoint": { "/hockey/facilities": 3200, "/property/properties": 2232 },
  "remaining": 4568,
  "reset_date": "2026-05-01"
}
```

### 2.2 Frontend Updates (if you have admin UI)

- Add "Copy to Clipboard" button
- Add "Show Key" toggle (masked by default)
- Add "Regenerate" with confirmation modal

---

## Phase 3: Launch Hockey API First (Day 3-5)

### 3.1 Data You Already Have

| Data | Source | How to Import |
|------|--------|---------------|
| RinkStop facilities | Your existing directory | Export to JSON → import to DB |
| CoachBoard drills | CoachBoard.pro | Export diagrams → store in DB |
| Scoresheet games | Scoresheet.pro | Export data → import to DB |

### 3.2 Quick Start: Export/Import

1. **Export from your apps:**
   - Go to RinkStop admin → Export facilities as JSON
   - Go to CoachBoard → Export drills as JSON
   - Go to Scoresheet → Export games as JSON

2. **Create import endpoints:**
```javascript
POST /api/v1/hockey/facilities/import
POST /api/v1/hockey/drills/import
POST /api/v1/hockey/scoresheets/import
```

3. **Test with 100 records first**

---

## Phase 4: Add Property API (Week 2)

### 4.1 Keep Existing Work

Your existing Cook County property data stays! Just move it to `/property/`:

```javascript
// Old
GET /api/properties

// New
GET /api/v1/property/properties
```

### 4.2 Add More Counties

- DuPage County
- Lake County
- Kane County
- Will County

---

## Phase 5: Documentation (Week 3)

### 5.1 Create OpenAPI Spec

```yaml
openapi: 3.0.0
info:
  title: Kevlar Data API
  version: 1.0.0
  description: Multi-vertical data API platform

servers:
  - url: https://kevlardata.com/api/v1
    description: Production

paths:
  /hockey/facilities:
    get:
      summary: List hockey facilities
      parameters:
        - name: city
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List of hockey facilities

  /property/properties:
    get:
      summary: Search properties
      parameters:
        - name: county
          in: query
          schema:
            type: string
        - name: city
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Property search results
```

### 5.2 Create Developer Portal

Use **Swagger UI** (free):
- Auto-generates interactive docs
- "Try it now" button
- Code examples

---

## Phase 6: Launch Checklist

Before going live:

- [ ] All API keys work for ALL verticals
- [ ] Usage tracking per vertical
- [ ] Rate limiting (100 calls/min default)
- [ ] Error messages are helpful
- [ ] Docs are complete for Hockey API
- [ ] Landing page explains all APIs
- [ ] Pricing page is ready
- [ ] Support contact (email/Discord)

---

## Quick Wins to Demonstrate Value

1. **Hockey API: Free Tier** — 100 calls/mo, facility search only
2. **Property API: Free Tier** — 100 calls/mo, basic search
3. **Lead with Hockey** — It's unique and you have the data

---

## Need Help With?

- Exporting data from your apps?
- Setting up the database schema?
- Writing the API routes?
- Creating the developer docs?

Let me know which part to tackle first!