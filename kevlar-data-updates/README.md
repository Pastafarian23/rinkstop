# Kevlar Data - Property Data Update

## Files to Update in Replit

### 1. API Spec (OpenAPI)
**File:** `lib/api-spec/openapi.yaml`
**Replace with:** `/kevlar-data-updates/openapi.yaml`

Changes:
- Added `/data/properties` endpoint (query property records)
- Added `/data/properties/scrape` endpoint (trigger scrape - admin)
- Added `PropertyRecord` schema
- Kept existing `/data/zipcodes` for backwards compatibility

---

### 2. New Scraper Module
**Create:** `lib/scrapers/dupage-county.ts`
**From:** `/kevlar-data-updates/scrapers/dupage-county.ts`

This handles scraping DuPage County property data.

**⚠️ NOTE:** The DuPage County website recently migrated. The scraper currently uses mock data. Once you find the new property lookup URL, update the scraper with the real data source.

---

### 3. Database Schema
**File:** `lib/db/src/schema.sql` (or create new migration)
**Add:** `/kevlar-data-updates/schema.sql`

Creates:
- `properties` table
- `property_api_usage` table
- Indexes for performance

---

## Next Steps

1. Copy the files above to your Replit
2. Run the database migration/schema
3. Find the new DuPage County property data URL and update `dupage-county.ts`
4. Deploy and test!

---

## Questions?

Ask me for help troubleshooting the scraper or adapting for other counties.