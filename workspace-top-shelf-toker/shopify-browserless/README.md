# TopShelfToker — Shopify Browserless Automation Toolkit

> Uses Playwright through the browserless gateway (already working on Heyron.ai).
> No Shopify Admin API OAuth needed — controls the browser UI directly.

## Credentials (from TOOLS.md)

- **Store URL:** https://admin.shopify.com/store/top-shelf-toker-2
- **Email:** topshelftoker69@gmail.com
- **Password:** 1729WRascherAve1!

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  product-catalog.js  │────▶│  shopify-ctl.js   │────▶│  Shopify Admin  │
│  (CRUD definitions)  │     │  (browserless)    │     │  (UI automation) │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
                                    │
                           ┌────────┴────────┐
                           │  Heyron.ai      │
                           │  browserless    │
                           │  gateway        │
                           └─────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `product-catalog.json` | Master product definitions (source of truth) |
| `shopify-ctl.js` | Core automation: login, add/update/remove products |
| `batch-import.js` | Import all catalog products in sequence |
| `workflow.md` | Step-by-step usage guide |