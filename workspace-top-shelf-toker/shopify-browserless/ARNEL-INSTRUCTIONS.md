# TopShelfToker — Automation Instructions for Arnel

## What You Need To Do (2 minutes total)

### 1. Printful API Keys (30 seconds)
1. Go to [printful.com](https://www.printful.com) and log in
2. Click your **profile icon** (top right)
3. Click **"API"**
4. Click **"Generate API key"**
5. Name it **"TopShelfToker"**
6. Copy the **key** and **secret** — send them to me

### 2. Shopify Login (60 seconds — one time only)
1. Open your Shopify admin: `https://xsisex-d6.myshopify.com/admin`
2. Log in normally (with 2FA if enabled)
3. Tell me when you're logged in — I save the session so you never do this again

---

## What Happens After That

You never do any of the above again. From then on:

```
# Upload designs to Printful + push products to Shopify — one command
node topshelf-automate.js --full-run
```

That's it. One command does everything.

---

## What The Automation Does

| Command | What it does |
|---------|-------------|
| `--shopify-login` | Opens browser, saves your login session |
| `--status` | Shows store products, Printful connection, catalog status |
| `--sync-products` | Creates all catalog products in Shopify |
| `--sync-printful` | Creates products on Printful for design upload |
| `--inventory SKU QTY` | Updates stock for a specific product |
| `--full-run` | Everything — Printful + Shopify sync |

---

## Design Upload Process

Designs go to Printful first, then Printful pushes products to Shopify:

```
Your Designs (zip)
    → Printful API (upload & mockups)
    → Printful ↔ Shopify App (auto-product-sync)
    → Shopify Store (live products)
```

### Once Printful API keys are set:

```bash
# Set your keys
export PRINTFUL_API_KEY="your_key"
export PRINTFUL_API_SECRET="your_secret"

# Run full automation
node topshelf-automate.js --full-run
```

---

## Current Catalog

| Product | Price | Variants |
|---------|-------|----------|
| OG Cannabis Tee | $29.99 | 18 (3 colors × 6 sizes) |
| Hemp Hoodie | $54.99 | 12 (2 colors × 6 sizes) |
| Snapback Cap | $24.99 | 2 colors |
| Rolling Tray | $34.99 | 1 |
| Stash Sling Bag | $39.99 | 3 colors |
| OG Beanie | $22.99 | 2 colors |
| Sticker Pack | $7.99 | 1 |

**Total: 7 products, 39 SKUs**