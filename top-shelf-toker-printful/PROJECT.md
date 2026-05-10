# TopShelfToker — Printful + RinkStop Hockey Merch Project

## Status: ASSETS READY — Awaiting Arnel's product design decisions
## Last updated: 2026-05-10

---

## What We're Building
- **TopShelfToker.com** — Print-on-demand cannabis merch store via Printful + Shopify
- **RinkStop.com** — Print-on-demand hockey merch store (future)
- **Integration:** Printful app installed on Shopify store (`xsisex-d6`), products sync automatically

## Current State (2026-05-10)
### ✅ COMPLETE
- [x] Shopify store live (`xsisex-d6`) at topshelftoker.com
- [x] Printful app installed and syncing to Shopify store
- [x] Printful API tested — token valid, ID 18025506 (Shopify type)
- [x] Printful API limitations identified: file upload endpoint returns 410 Gone; product creation API blocked for Shopify-connected stores
- [x] **Hockey designs — 30 PNGs consolidated, ALL transparent, ALL print-ready**
  - Source: 5 Etsy bundles + 1 heart monitor PNG
  - Resolutions: 2000×3000 to 4946×3156
  - Uploaded to Dropbox: `/RinkStop/Hockey Designs/`
  - Local backup: `rinkstop-designs/all-hockey-pngs.tar.gz`
- [x] **Cannabis designs — top 15 PNGs processed with transparent backgrounds**
  - Source: 200 PNGs analyzed, 15 selected by resolution (10-13 MP each)
  - Output: `top-shelf-toker-printful/designs/processed/`
  - All verified: real alpha transparency, corners transparent
- [x] 185 additional cannabis PNGs available for processing
- [x] Cannabis SVGs inventoried (130 files — likely vinyl-cutting files, not DTG-ready)

### ⏳ PENDING — Needs Arnel's Input
- [ ] **Design selection**: Which designs go on which products?
- [ ] **Product types**: T-shirts (BC 3001 / Gildan 5000), hoodies, stickers (Kiss-Cut), patches (Gunold)?
- [ ] **Pricing strategy**: Recommended 2.5–3.5x Printful base cost
- [ ] **Upload to Printful**: Via Design Maker dashboard (only viable path for Shopify-connected stores)
- [ ] **Process remaining 185 cannabis PNGs**: If scaling up is desired
- [ ] **RinkStop merch**: Confirm whether hockey merch should launch alongside cannabis merch

---

## Upload Path (Blocking Constraint)
Since Printful API file upload (410 Gone) and product creation (Shopify-only block) are unavailable, the **only viable path** is:
1. Printful.com → Design Maker → Upload PNGs manually
2. Create products → Select placements → Push to Shopify

Hockey PNGs and processed cannabis PNGs are ready for immediate upload via this path.

---

## Design Files Location
| Project | Status | Location |
|---------|--------|----------|
| Hockey PNGs (30 files) | ✅ Ready | `/rinkstop-designs/all-hockey-pngs/` + Dropbox `/RinkStop/Hockey Designs/` |
| Cannabis PNGs (15 processed) | ✅ Ready | `top-shelf-toker-printful/designs/processed/` |
| Hockey archive backup | ✅ Done | `rinkstop-designs/all-hockey-pngs.tar.gz` (8.8MB) |
| Cannabis SVGs (130) | ⏸️ Not DTG-ready | `top-shelf-toker-printful/designs/` |

---

## Technical Notes
- Printful API: REST/JSON, full catalog + order management
- Shopify API: **Not needed** — Printful app handles product sync automatically
- Printful handles fulfillment, shipping, inventory (zero inventory model)
- White-label options available (custom labels, stickers, pack-ins)

## Context Recovery Note
Last state: Hockey designs uploaded to Dropbox. Cannabis designs processed. Waiting on Arnel to choose designs + product types before uploading to Printful.