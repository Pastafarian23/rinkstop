# TopShelfToker — Shopify Browserless Workflow

## Overview

This toolkit automates Shopify product management through **browserless automation** (Playwright → Heyron.ai gateway) instead of the Shopify Admin API. No OAuth tokens, no app registrations, no callback URLs — just browser control.

## Why Browserless Over Shopify API

| Shopify Admin API | Browserless |
|---|---|
| Requires OAuth flow | Just login like a human |
| Token management, rate limits | No tokens to manage |
| App registration needed | Zero setup |
| Theme customization is limited | Full UI control |
| Complex pagination/sync | Click and drag like normal |
| Need separate app for each store | Works with any store |

## Prerequisites

1. **Heyron.ai browserless gateway** — already working on this server (profile: `browserless`)
2. **Node.js v24+** — installed
3. **Playwright-core** — installed (`npm install playwright-core`)
4. **Shopify credentials** — stored in TOOLS.md

## File Structure

```
workspace-top-shelf-toker/shopify-browserless/
├── README.md              ← you are here
├── product-catalog.json   ← master product catalog (source of truth)
├── shopify-ctl.js         ← automation CLI (login, list, sync, add, inventory)
├── batch-import.js        ← batch import with dry-run mode
├── images/                ← product images go here
├── screenshots/           ← auto-saved for debugging
└── state/                 ← sync state tracking
```

## Step-by-Step: First Product Sync

### Step 1: Add product images
```bash
# Place images in the images/ folder with handle references
# e.g., tst-og-cannabis-lifestyle-tee-front.jpg
#        tst-og-cannabis-lifestyle-tee-back.jpg
mkdir -p images
# Upload your product photos there
```

### Step 2: Dry-run the batch import
```bash
node batch-import.js --dry-run --images ./images
```

### Step 3: Review the catalog
```bash
# Verify product details are correct
node -e "const c = require('./product-catalog.json'); console.log(JSON.stringify(c.products, null, 2))"
```

### Step 4: Login to Shopify (test connection)
```bash
node shopify-ctl.js login
```

### Step 5: List existing products (verify login)
```bash
node shopify-ctl.js list
```

### Step 6: Full catalog sync
```bash
node shopify-ctl.js sync
```

### Step 7: Take screenshot (verify results)
```bash
node shopify-ctl.js screenshot
```

## Day-to-Day Operations

### Update inventory
```bash
node shopify-ctl.js inventory TST-TEE-BLK-S 100
node shopify-ctl.js inventory TST-HD-BLK-M 25
```

### Add a single new product
```bash
# 1. Add to product-catalog.json
# 2. Run:
node shopify-ctl.js add tst-my-new-product
```

### List current products
```bash
node shopify-ctl.js list
```

## Current Catalog Status

| # | Product | Price | Type | Variants |
|---|---------|-------|------|----------|
| 1 | OG Cannabis Lifestyle Tee | $29.99 | Apparel | 18 (3 colors × 6 sizes) |
| 2 | Premium Hemp Hoodie | $54.99 | Apparel | 12 (2 colors × 6 sizes) |
| 3 | Limited Edition Snapback | $24.99 | Accessories | 2 (colors) |
| 4 | Rolling Tray (Artist Collab) | $34.99 | Accessories | 1 |
| 5 | The Stash Sling Bag | $39.99 | Accessories | 3 (colors) |
| 6 | OG Label Beanie | $22.99 | Apparel | 2 (colors) |
| 7 | Cannabis Culture Sticker Pack | $7.99 | Accessories | 1 |

**Total: 7 products, 39 variants**

## Pricing Strategy

| Product | COGS Est. | Retail | Margin | Notes |
|---------|-----------|--------|--------|-------|
| Tee | ~$8-10 | $29.99 | ~66-73% | Entry-level product |
| Hoodie | ~$15-20 | $54.99 | ~64-73% | Premium positioning |
| Snapback | ~$5-7 | $24.99 | ~72-80% | High margin accessory |
| Rolling Tray | ~$8-12 | $34.99 | ~66-77% | Artist collab = perceived value |
| Sling Bag | ~$10-14 | $39.99 | ~65-75% | Functional + branded |
| Beanie | ~$4-6 | $22.99 | ~74-83% | Winter seasonal |
| Sticker Pack | ~$1-2 | $7.99 | ~75-87% | Gateway product / impulse buy |

## Revenue Projections (Conservative)

If we sell even 10 units of each variant per month:
- **Monthly revenue potential:** ~$8,200
- **Monthly COGS (est.):** ~$2,800
- **Gross monthly profit:** ~$5,400
- **After Shopify fees (~2.9% + $0.30/txn):** ~$5,150

## Integration with Content Pipeline

1. **Blog posts** (already created) → drive organic traffic to products
2. **Social media posts** (already created) → tag products in Instagram Shopping
3. **Email list** ("Opening Soon" signups) → launch announcement with product links

## Next Steps

- [ ] Upload product images
- [ ] Run dry-run import
- [ ] Sync to Shopify live store
- [ ] Set up Instagram Shopping integration
- [ ] Create "Opening Soon" landing page with product previews
- [ ] Launch email campaign to existing subscriber list