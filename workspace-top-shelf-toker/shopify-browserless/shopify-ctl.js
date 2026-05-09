/**
 * TopShelfToker — Shopify Browserless Automation
 *
 * Uses Playwright via Heyron.ai browserless gateway to automate
 * Shopify admin UI. No OAuth/API keys required — just browser control.
 *
 * Usage:
 *   node shopify-ctl.js login          — Login to Shopify admin
 *   node shopify-ctl.js list           — List all products
 *   node shopify-ctl.js sync           — Sync catalog → Shopify (add/update)
 *   node shopify-ctl.js add <handle>   — Add single product by handle
 *   node shopify-ctl.js update <handle> — Update existing product
 *   node shopify-ctl.js inventory <sku> <qty> — Update inventory
 *   node shopify-ctl.js screenshot     — Take admin dashboard screenshot
 */

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  // Credentials (from TOOLS.md)
  shopifyEmail: 'topshelftoker69@gmail.com',
  shopifyPassword: '1729WRascherAve1!',
  adminUrl: 'https://admin.shopify.com/store/top-shelf-toker-2',

  // Heyron.ai hosted browserless gateway
  browserWsEndpoint: 'ws://localhost:3000/browser/connect', // Adjust to your gateway config

  // Local fallback — run browserless locally if ws endpoint not configured
  headless: true,

  // Product catalog
  catalogPath: path.join(__dirname, 'product-catalog.json'),

  // State tracking
  statePath: path.join(__dirname, 'shopify-state.json'),

  // Timing
  timeout: 30000,
  delayBetweenActions: 800,
};

// ─── State Management ────────────────────────────────────────────────────────
let state = loadState();

function loadState() {
  try {
    if (fs.existsSync(CONFIG.statePath)) {
      return JSON.parse(fs.readFileSync(CONFIG.statePath, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return { lastSync: null, productCount: 0, lastError: null };
}

function saveState() {
  try {
    state.lastSync = new Date().toISOString();
    fs.writeFileSync(CONFIG.statePath, JSON.stringify(state, null, 2));
  } catch (e) { /* ignore */ }
}

// ─── Browser Helper ──────────────────────────────────────────────────────────
async function launchBrowser() {
  // Try browserless websocket first
  try {
    const browser = await chromium.connectOverCDP(CONFIG.browserWsEndpoint);
    console.log('✓ Connected to browserless gateway (CDP)');
    return browser;
  } catch (e) {
    console.log('⚠️  Could not connect to browserless gateway, using local browser...');
    console.log(`   Error: ${e.message}`);
  }

  // Fallback: local browser
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log('✓ Launched local browser (fallback mode)');
  return browser;
}

async function getPage(browser) {
  const contexts = browser.contexts();
  if (contexts.length > 0) {
    const pages = contexts[0].pages();
    if (pages.length > 0) return pages[0];
  }
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  return await context.newPage();
}

// ─── Shopify Actions ─────────────────────────────────────────────────────────

/**
 * Login to Shopify admin
 */
async function doLogin(browser) {
  const page = await getPage(browser);

  console.log('→ Navigating to Shopify admin...');
  await page.goto(CONFIG.adminUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
  await page.wait(CONFIG.delayBetweenActions);

  // Check if already logged in
  const loggedIn = page.locator('[data-testid="homepage-title"]');
  if (await loggedIn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('✓ Already logged in');
    return true;
  }

  console.log('→ Logging in...');

  // Enter email
  await page.fill('input[type="email"], input[name="email"], input[name="account_email"]', CONFIG.shopifyEmail);
  await page.click('button[type="submit"], [data-testid="account-continue"], .Polaris-Button--primary');
  await page.wait(CONFIG.delayBetweenActions * 2);

  // Enter password
  await page.fill('input[type="password"], input[name="password"]', CONFIG.shopifyPassword);
  await page.click('button[type="submit"], [data-testid="login-submit"]');
  await page.wait(CONFIG.delayBetweenActions * 3);

  // Handle 2FA if present
  const otpField = page.locator('input[name="otp"], input[name="code"], [data-testid="2fa-otp"]');
  if (await otpField.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('⚠️  2FA required — check your email/SMS');
    // Wait for manual input
    await page.waitForFunction(() => {
      return !document.querySelector('input[name="otp"]');
    }, { timeout: 300000 });
    console.log('✓ 2FA completed');
  }

  // Check login success
  const title = await page.title();
  if (title.includes('Shopify') || title.includes('Home')) {
    console.log('✓ Login successful');
    return true;
  }

  console.log('✗ Login may have failed');
  await page.screenshot({ path: 'shopify-login-error.png' });
  console.log('   Screenshot saved: shopify-login-error.png');
  return false;
}

/**
 * Navigate to Products section
 */
async function gotoProducts(page) {
  console.log('→ Navigating to Products...');

  // Try sidebar navigation
  const productsLink = page.locator('[data-testid="sidebar-products"], a[href*="/products"], .Polaris-Navigation__item:has-text("Products")');
  if (await productsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await productsLink.click();
  } else {
    // Fallback: direct URL
    await page.goto(`${CONFIG.adminUrl}/products`, { waitUntil: 'domcontentloaded' });
  }

  await page.wait(CONFIG.delayBetweenActions * 2);
  console.log('✓ In Products section');
}

/**
 * List all products on the current page
 */
async function listProducts(page) {
  await gotoProducts(page);

  // Wait for product list to load
  await page.waitForSelector('[data-testid="product-index-table"], .Polaris-ResourceList__table, .product-index-table', { timeout: CONFIG.timeout });
  await page.wait(CONFIG.delayBetweenActions);

  // Extract product info
  const products = await page.evaluate(() => {
    const rows = document.querySelectorAll('[data-testid="product-index-table"] tbody tr, .Polaris-ResourceList__table tbody tr');
    const results = [];
    rows.forEach(row => {
      const titleEl = row.querySelector('a, [data-testid="product-title"], .Polaris-Link');
      const statusEl = row.querySelector('[data-testid="product-status"], .Polaris-Status, .badge');
      results.push({
        title: titleEl?.textContent?.trim() || 'Unknown',
        status: statusEl?.textContent?.trim() || 'Unknown',
        link: titleEl?.href || '',
      });
    });
    return results;
  });

  console.log(`✓ Found ${products.length} products`);
  products.forEach((p, i) => console.log(`  ${i + 1}. ${p.title} [${p.status}]`));
  return products;
}

/**
 * Add a new product
 */
async function addProduct(page, product) {
  await gotoProducts(page);

  console.log(`→ Adding product: ${product.title}`);

  // Click "Add product" button
  const addBtn = page.locator('button:has-text("Add product"), [data-testid="add-product"], a:has-text("Add product")');
  await addBtn.click();
  await page.wait(CONFIG.delayBetweenActions * 2);

  // Fill in title
  const titleField = page.locator('input[data-testid="product-title"], input[name="title"], input[placeholder*="title"]').first();
  await titleField.fill(product.title);
  await titleField.press('Tab');
  await page.wait(CONFIG.delayBetweenActions / 2);

  // Fill body/description
  const bodyField = page.locator('[data-testid="product-body"], textarea[name="body_html"], .ProseMirror');
  if (await bodyField.isVisible({ timeout: 3000 }).catch(() => false)) {
    // For rich text editor, use innerHTML
    await bodyField.evaluate((el, html) => {
      el.innerHTML = html;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, product.bodyHtml);
  }
  await page.wait(CONFIG.delayBetweenActions / 2);

  // Set product type
  if (product.productType) {
    const typeField = page.locator('input[data-testid="product-type-input"], input[name="product_type"]');
    if (await typeField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeField.fill(product.productType);
    }
  }

  // Set vendor
  if (product.vendor) {
    const vendorField = page.locator('input[data-testid="product-vendor"], input[name="vendor"]');
    if (await vendorField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vendorField.fill(product.vendor);
    }
  }

  // Set tags
  if (product.tags && product.tags.length > 0) {
    const tagsField = page.locator('input[data-testid="product-tags"], input[name="tags"]');
    if (await tagsField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagsField.fill(product.tags.join(', '));
    }
  }

  // Handle variants — click to variant section
  const variantSection = page.locator('[data-testid="product-variant-panel"], .product-variants, text="Variants"').first();
  if (await variantSection.isVisible({ timeout: 3000 }).catch(() => false)) {
    await variantSection.click();
    await page.wait(CONFIG.delayBetweenActions);
  }

  // If no variants exist, add from the master variant fields
  const existingVariants = page.locator('[data-testid="product-variant-row"]');
  const count = await existingVariants.count();

  if (count === 0 && product.variants.length > 0) {
    // Fill first variant (master)
    const master = product.variants[0];
    await fillVariantFields(page, master, 0);

    // Add remaining variants
    for (let i = 1; i < product.variants.length; i++) {
      const addVarBtn = page.locator('button:has-text("Add variant"), [data-testid="add-variant"]');
      if (await addVarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addVarBtn.click();
        await page.wait(CONFIG.delayBetweenActions);
      }
      await fillVariantFields(page, product.variants[i], i);
    }
  }

  // Save
  const saveBtn = page.locator('button:has-text("Save"), [data-testid="product-save"]');
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.wait(CONFIG.delayBetweenActions * 3);
    console.log(`✓ Saved: ${product.title}`);
    return true;
  }

  console.log(`✗ Could not save: ${product.title}`);
  return false;
}

/**
 * Fill variant fields
 */
async function fillVariantFields(page, variant, index) {
  // SKU
  const skuField = page.locator(`input[data-testid="variant-sku-${index}"], input[name*="sku"]`).first();
  if (await skuField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skuField.fill(variant.sku);
  }

  // Price
  const priceField = page.locator(`input[data-testid="variant-price-${index}"], input[name*="price[amount]"]`).first();
  if (await priceField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await priceField.fill(String(variant.price));
  }

  // Compare at price (optional)
  if (variant.compareAtPrice) {
    const compareField = page.locator(`input[data-testid="variant-compare-at-price-${index}"], input[name*="compare_at_price"]`).first();
    if (await compareField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await compareField.fill(String(variant.compareAtPrice));
    }
  }

  // Inventory
  if (variant.inventoryQty !== undefined) {
    const invField = page.locator(`input[data-testid="variant-inventory-${index}"], input[name*="inventory_quantity"]`).first();
    if (await invField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await invField.fill(String(variant.inventoryQty));
    }
  }

  // Options
  if (variant.option1) {
    const opt1Field = page.locator(`input[data-testid="variant-option1-${index}"], input[name*="option1"]`).first();
    if (await opt1Field.isVisible({ timeout: 1000 }).catch(() => false)) {
      const currentValue = await opt1Field.inputValue();
      if (!currentValue || currentValue !== variant.option1) {
        await opt1Field.fill(variant.option1);
      }
    }
  }
}

/**
 * Check if a product already exists
 */
async function productExists(page, handle) {
  const searchBox = page.locator('input[data-testid="product-index-search"], input[type="search"], input[placeholder*="Search"]');
  if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchBox.fill(handle);
    await page.wait(CONFIG.delayBetweenActions * 2);

    const results = page.locator(`a:has-text("${handle}"), [data-testid*="${handle}"]`);
    const exists = await results.count();

    // Clear search
    await searchBox.fill('');
    await page.wait(CONFIG.delayBetweenActions);

    return exists > 0;
  }
  return false;
}

/**
 * Update inventory for a SKU
 */
async function updateInventory(browser, sku, qty) {
  const page = await getPage(browser);
  console.log(`→ Updating inventory: ${sku} → ${qty}`);

  // Navigate to inventory
  await page.goto(`${CONFIG.adminUrl}/inventory`, { waitUntil: 'domcontentloaded' });
  await page.wait(CONFIG.delayBetweenActions * 2);

  // Search for SKU
  const searchBox = page.locator('input[data-testid="inventory-search"], input[type="search"]');
  if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchBox.fill(sku);
    await page.wait(CONFIG.delayBetweenActions * 2);
  }

  // Find the row and update quantity
  const qtyField = page.locator(`input[value="${sku}"], input[data-testid*="inventory-qty"]`);
  const parentRow = qtyField.locator('..');
  const qtyInput = parentRow.locator('input[type="number"]');
  if (await qtyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await qtyInput.fill(String(qty));
    await page.wait(CONFIG.delayBetweenActions);
    console.log(`✓ Updated ${sku} inventory to ${qty}`);
    return true;
  }

  console.log(`✗ Could not find SKU ${sku} in inventory`);
  return false;
}

/**
 * Take screenshot of current page (for debugging)
 */
async function takeScreenshot(page, name = 'shopify-screenshot') {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  const filePath = path.join(screenshotsDir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filePath}`);
  return filePath;
}

// ─── CLI Commands ─────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  const arg3 = process.argv[3];
  const arg4 = process.argv[4];

  console.log('🚀 TopShelfToker Shopify Browserless Automation');
  console.log('=' .repeat(50));

  const browser = await launchBrowser();

  try {
    switch (command) {
      case 'login': {
        const page = await getPage(browser);
        await doLogin(browser);
        break;
      }

      case 'list': {
        const page = await getPage(browser);
        await doLogin(browser);
        const products = await listProducts(page);
        console.log('\n📦 Current Products:');
        products.forEach((p, i) => console.log(`  ${i + 1}. ${p.title} — ${p.status}`));
        break;
      }

      case 'sync': {
        const catalog = JSON.parse(fs.readFileSync(CONFIG.catalogPath, 'utf8'));
        const page = await getPage(browser);

        await doLogin(browser);

        let added = 0;
        let skipped = 0;

        for (const product of catalog.products) {
          const exists = await productExists(page, product.handle);
          if (exists) {
            console.log(`⏭️  Skipping (exists): ${product.title}`);
            skipped++;
          } else {
            const success = await addProduct(page, product);
            if (success) added++;
          }
        }

        console.log(`\n📊 Sync Complete: ${added} added, ${skipped} skipped`);
        saveState();
        break;
      }

      case 'add': {
        if (!arg3) {
          console.log('Usage: shopify-ctl.js add <handle>');
          process.exit(1);
        }
        const catalog = JSON.parse(fs.readFileSync(CONFIG.catalogPath, 'utf8'));
        const product = catalog.products.find(p => p.handle === arg3);
        if (!product) {
          console.log(`✗ Product not found: ${arg3}`);
          process.exit(1);
        }
        const page = await getPage(browser);
        await doLogin(browser);
        await addProduct(page, product);
        break;
      }

      case 'inventory': {
        if (!arg3 || !arg4) {
          console.log('Usage: shopify-ctl.js inventory <sku> <qty>');
          process.exit(1);
        }
        await doLogin(browser);
        await updateInventory(browser, arg3, parseInt(arg4));
        break;
      }

      case 'screenshot': {
        const page = await getPage(browser);
        await page.goto(CONFIG.adminUrl, { waitUntil: 'domcontentloaded' });
        await page.wait(CONFIG.delayBetweenActions * 2);
        await takeScreenshot(page, 'admin-dashboard');
        break;
      }

      default: {
        console.log('\nAvailable commands:');
        console.log('  login                    — Login to Shopify admin');
        console.log('  list                     — List all products');
        console.log('  sync                     — Sync full catalog to Shopify');
        console.log('  add <handle>             — Add single product');
        console.log('  inventory <sku> <qty>    — Update inventory');
        console.log('  screenshot               — Take dashboard screenshot');
      }
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    state.lastError = error.message;
    saveState();
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed');
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});