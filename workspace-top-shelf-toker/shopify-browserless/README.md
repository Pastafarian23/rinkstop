# TopShelfToker — Shopify Browserless Automation (Self-Hosted)

> **No external gateway dependency.** Uses local Playwright-controlled Chromium on this machine.
> Printful handles fulfillment. Browserless handles store customization.

## Architecture

```
   Arnel's Design ZIP
          │
          ▼
   Printful Store        (upload designs → auto-generate mockups)
          │
          ▼ (Printful Shopify App — auto-sync)
   Shopify Store         (products, variants, fulfillment, orders)
          │
          ▼ (local Playwright automation)
   Store Customization   (theme, navigation, checkout, policies)
          │
          ▼ (content pipeline)
   Blog Posts → Social Posts → Email → Traffic → Sales
```

## What This Toolkit Does

| Layer | Handled By | Our Scripts |
|-------|-----------|-------------|
| Fulfillment & printing | Printful | ✅ App handles it |
| Product variants/sync | Printful ↔ Shopify | ✅ App handles it |
| Theme & branding | Shopify admin UI | ✅ Via browser |
| Navigation & menus | Shopify admin UI | ✅ Via browser |
| Policy pages | Shopify admin UI | ✅ Via browser |
| SEO & meta tags | Shopify admin UI | ✅ Via browser |
| Product images & copy | Printful mockups | ✅ Via browser |
| Content & social | Content pipeline | ✅ Separate agents |

## Requirements

- Node.js v24+ ✅ (installed)
- Playwright-core ✅ (installed)
- Local Chromium ✅ (installed via `npx playwright install chromium`)
- Shopify credentials ✅ (in TOOLS.md)
- Printful app ✅ (connected to Shopify)

## File Structure

```
workspace-top-shelf-toker/shopify-browserless/
├── README.md               ← you are here
├── product-catalog.json    ← product definitions (design specs)
├── shopify-ctl.js          ← product management CLI
├── store-setup.js          ← store configuration CLI
├── batch-import.js         ← batch catalog sync
├── PRINTFUL-WORKFLOW.md    ← Printful integration workflow
├── screenshots/            ← auto-saved debugging screenshots
└── state/                  ← tracked sync state
```

## Quick Start

### 1. Upload designs to Printful
- Log into Printful → Upload your zip designs
- Assign them to product types (tees, hoodies, etc.)
- Printful generates mockups automatically

### 2. Connect Printful to Shopify
- Install the Printful app from Shopify App Store (already done ✅)
- Products sync automatically from Printful → Shopify

### 3. Customize your store (browserless)
```bash
# View store setup options
node store-setup.js

# Run full setup
node store-setup.js setup all

# Or step by step
node store-setup.js setup theme
node store-setup.js setup navigation
node store-setup.js setup policies
node store-store.js setup seo
```

### 4. Sync catalog via browserless
```bash
# Dry run first (no changes)
node batch-import.js --dry-run

# Sync products to Shopify
node shopify-ctl.js sync

# Verify
node shopify-ctl.js list
node shopify-ctl.js screenshot
```

### 5. Update inventory
```bash
node shopify-ctl.js inventory TST-TEE-BLK-S 100
```

## Current Catalog (7 products, 39 variants)

| Product | Price | Type | Variants |
|---------|-------|------|----------|
| OG Cannabis Tee | $29.99 | Apparel | 18 (3 colors × 6 sizes) |
| Premium Hemp Hoodie | $54.99 | Apparel | 12 (2 colors × 6 sizes) |
| Limited Edition Snapback | $24.99 | Accessories | 2 colors |
| Rolling Tray (Artist Collab) | $34.99 | Accessories | 1 |
| Stash Sling Bag | $39.99 | Accessories | 3 colors |
| OG Label Beanie | $22.99 | Apparel | 2 colors |
| Sticker Pack | $7.99 | Accessories | 1 |

## Self-Hosted vs Heyron.ai Gateway

| | Heyron.ai Gateway | Self-Hosted |
|---|---|---|
| External dependency | ✅ Yes | ❌ No |
| Browser location | Remote (cloud) | Local machine |
| Reliability | Depends on third party | Full control |
| Speed | Network latency | Direct execution |
| Cost | Potentially billed | Free (on your hardware) |
| Maintenance | Managed | Your responsibility |

**Decision:** Self-hosted wins for a store that's core to your business. No external point of failure.

## Revenue Projections

Conservative estimate (10 units/variant/month):
- **Monthly revenue:** ~$8,200
- **Gross margin:** ~65-75% (Printful handles COGS)
- **After Shopify fees:** ~$5,150/month
- **Growth lever:** Content pipeline drives organic traffic → compounds over time

## Integration Points

- **Content pipeline** → Blog posts drive SEO traffic to store
- **Social media** → Instagram Shopping tags link to products
- **Email list** → Launch announcement to "Opening Soon" subscribers
- **Stepdad funnel** → Risk management offers in post-purchase flow (future)