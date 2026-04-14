# Kevlar Data - Easy Setup Guide

## 🎯 The Simple Path: CSV Import

No scraping required!

---

## Step 1: Copy These Files to Replit

| File | Where to Put It |
|------|-----------------|
| `openapi.yaml` | `lib/api-spec/openapi.yaml` (replace) |
| `lib/csv-importer.ts` | Create folder `lib/` and add file |
| `schema.sql` | Run in your database |

---

## Step 2: Database Setup

Run this SQL in your Replit database (Neon/PostgreSQL):

```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    zip VARCHAR(10) NOT NULL,
    county VARCHAR(50) NOT NULL DEFAULT 'cook',
    owner VARCHAR(255),
    mailing_address VARCHAR(500),
    assessed_value INTEGER,
    market_value INTEGER,
    tax_amount INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_properties_county_zip ON properties(county, zip);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_status ON properties(status);
```

---

## Step 3: Import Sample Data

The `csv-importer.ts` has **20 sample Cook County properties** built in!

Add an API endpoint to import them:

```typescript
// In your API routes
import { SAMPLE_CSV, importPropertiesFromCSV } from '../lib/csv-importer';

app.post('/api/data/import-sample', async (req, res) => {
  const count = await importPropertiesFromCSV(SAMPLE_CSV);
  res.json({ imported: count });
});
```

**That's it!** Call that endpoint once and you have 20 properties live.

---

## Step 4: Add Custom Data Later

When you want to add more properties:

1. Create a CSV with this header:
   ```
   pin,address,city,zip,owner,mailing_address,assessed_value,market_value,tax_amount,status
   ```

2. Call `POST /api/data/properties/import` with the CSV body

---

## 📊 Sample Data Included

The `SAMPLE_CSV` in `csv-importer.ts` includes 20 properties from:
- Chicago, Evanston, Skokie, Oak Park, Naperville, etc.
- Mix of statuses: mostly active, ready to add foreclosure/tax-lien examples

---

## ⚡ Quick Test

After setup, call:
```
GET /api/data/properties?city=naperville&limit=5
```

Should return Naperville properties!

---

## Questions?

Ask me to simplify further or help debug any step.