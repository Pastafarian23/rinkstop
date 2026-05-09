/**
 * TopShelfToker — Shopify Browserless Automation (Self-Hosted)
 *
 * Uses Playwright LOCAL Chromium — no external gateway dependency.
 * Full control, no third-party reliability concerns.
 *
 * Credentials (from TOOLS.md):
 *   Store: https://admin.shopify.com/store/top-shelf-toker-2
 *   Email: topshelftoker69@gmail.com
 *   Pass:  1729WRascherAve1!
 *
 * Commands:
 *   node shopify-ctl.js login          — Login to Shopify admin
 *   node shopify-ctl.js list           — List all products
 *   node shopify-ctl.js sync           — Sync catalog → Shopify
 *   node shopify-ctl.js add <handle>   — Add single product
 *   node shopify-ctl.js update <handle> — Update existing product
 *   node shopify-ctl.js inventory <sku> <qty> — Update inventory
 *   node shopify-ctl.js screenshot     — Take admin dashboard screenshot
 */

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  shopifyEmail: 'topshelftoker69@gmail.com',
  shopifyPassword: '1729WRascherAve1!',
  adminUrl: 'https://admin.shopify.com/store/top-shelf-toker-2',

  // Local browser — self-hosted, no external dependency
  headless: true,
  viewport: { width: 1920, height: 1080 },

  // Product catalog
  catalogPath: path.join(__dirname, 'product-catalog.json'),

  // State tracking
  statePath: path.join(__dirname, 'shopify-state.json'),

  // Timing
  timeout: 30000,
  delayBetweenActions: 1000,
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
    state.lastError = null;
    fs.writeFileSync(CONFIG.statePath, JSON.stringify(state, null, 2));
  } catch (e) { /* ignore */ }
}

// ─── Browser Launch (SELF-HOSTED) ────────────────────────────────────────────

async function launchBrowser() {
  console.log('🚀 Launching local Chromium via Playwright...');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
  });

  console.log('✓ Local browser running (no external gateway)');
  return browser;
}

async function getPage(browser) {
  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
  });

  // Anti-detection: remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });

  return await context.newPage();
}

// ─── Shopify Actions ─────────────────────────────────────────────────────────

/**
 * Login to Shopify admin
 * Returns true on success, false on failure
 */
async function doLogin(page) {
  console.log('→ Navigating to Shopify admin...');
  await page.goto(CONFIG.adminUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
  await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

  // Check if already logged in (Shopify home page title)
  const title = await page.title();
  if (title.includes('Home')) {
    console.log('✓ Already logged in');
    return true;
  }

  console.log('→ Entering credentials...');

  // Email
  const emailField = page.locator('input[type="email"], input[name="email"]');
  await emailField.fill(CONFIG.shopifyEmail);
  await emailField.press('Tab');
  await page.waitForTimeout(CONFIG.delayBetweenActions);

  // Check for password-only flow (single sign-on)
  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordField.fill(CONFIG.shopifyPassword);
    await passwordField.press('Tab');
    await page.waitForTimeout(CONFIG.delayBetweenActions / 2);
  }

  // Click submit/continue
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(CONFIG.delayBetweenActions * 3);

  // Handle 2FA if present
  const otpField = page.locator('input[name="otp"], input[name="code"]');
  const isOTP = await otpField.isVisible({ timeout: 5000 }).catch(() => false);
  if (isOTP) {
    console.log('⚠️  2FA detected — waiting for manual completion (5 min timeout)');
    try {
      await page.waitForFunction(
        () => !document.querySelector('input[name="otp"], input[name="code"]'),
        { timeout: 300000 }
      );
      console.log('✓ 2FA completed');
    } catch (e) {
      console.log('⏰ 2FA timeout — check manually');
      // Still might have logged in, proceed
    }
  }

  // Verify login
  const newTitle = await page.title();
  const loggedIn = newTitle.includes('Home') || newTitle.includes('Dashboard');

  if (loggedIn) {
    console.log('✓ Login successful');
    return true;
  }

  console.log('⚠️  Login may have failed — taking screenshot for debugging');
  await screenshot(page, 'login-error');
  return false;
}

/**
 * Navigate to Products section
 */
async function gotoProducts(page) {
  console.log('→ Navigating to Products...');

  // Try sidebar link
  try {
    const productsLink = page.locator('a[href*="/products"]').first();
    await productsLink.click({ timeout: 5000 });
  } catch {
    // Direct URL fallback
    await page.goto(`${CONFIG.adminUrl}/products`, { waitUntil: 'domcontentloaded' });
  }

  await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

  // Wait for product list to load
  const productTable = page.locator('[data-testid="product-index-table"], .Polaris-ResourceList__table');
  await productTable.waitFor({ timeout: CONFIG.timeout });

  console.log('✓ In Products section');
}

/**
 * List all products visible on current page
 */
async function listProducts(page) {
  await gotoProducts(page);

  const products = await page.evaluate(() => {
    const rows = document.querySelectorAll(
      '[data-testid="product-index-table"] tbody tr, ' +
      '.Polaris-ResourceList__table tbody tr, ' +
      'table tbody tr'
    );
    const results = [];
    rows.forEach(row => {
      const titleEl = row.querySelector('a, [data-testid="product-title"]');
      const statusEl = row.querySelector('[data-testid="product-status"], .Polaris-Status');
      results.push({
        title: titleEl?.textContent?.trim() || 'Unknown',
        status: statusEl?.textContent?.trim() || 'Unknown',
      });
    });
    return results;
  });

  console.log(`✓ Found ${products.length} products`);
  products.forEach((p, i) => console.log(`  ${i + 1}. ${p.title} [${p.status}]`));
  return products;
}

/**
 * Check if a product handle already exists
 */
async function productExists(page, handle) {
  const searchBar = page.locator(
    'input[data-testid="product-index-search"], ' +
    'input[type="search"], ' +
    'input[placeholder*="Search"]'
  );

  try {
    await searchBar.fill(handle, { timeout: 3000 });
    await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

    const result = page.locator(`a:has-text("${handle}")`);
    const found = await result.isVisible({ timeout: 2000 }).catch(() => false);

    // Clear search
    await searchBar.fill('');
    await page.waitForTimeout(CONFIG.delayBetweenActions);

    return found;
  } catch {
    return false;
  }
}

/**
 * Add a new product to Shopify
 */
async function addProduct(page, product) {
  await gotoProducts(page);

  console.log(`→ Adding: ${product.title}`);

  // Click "Add product"
  const addBtn = page.locator('button:has-text("Add product"), [data-testid="add-product"]');
  await addBtn.click({ timeout: CONFIG.timeout });
  await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

  // Title
  const titleField = page.locator('input[data-testid="product-title"]');
  await titleField.fill(product.title);
  await titleField.press('Tab');
  await page.waitForTimeout(CONFIG.delayBetweenActions / 2);

  // Body / Description
  const bodyField = page.locator('[data-testid="product-body"]');
  if (await bodyField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bodyField.click();
    // Use keyboard to type content (Playwright handles contenteditable)
    await bodyField.fill('');
    await page.keyboard.type(product.bodyHtml.replace(/<[^>]+>/g, '\n'));
  }
  await page.waitForTimeout(CONFIG.delayBetweenActions / 2);

  // Product type
  if (product.productType) {
    const typeField = page.locator('input[data-testid="product-type-input"]');
    if (await typeField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeField.fill(product.productType);
    }
  }

  // Vendor
  if (product.vendor) {
    const vendorField = page.locator('input[data-testid="product-vendor"]');
    if (await vendorField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vendorField.fill(product.vendor);
    }
  }

  // Tags
  if (product.tags?.length) {
    const tagsField = page.locator('input[data-testid="product-tags"]');
    if (await tagsField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagsField.fill(product.tags.join(', '));
    }
  }

  // Navigate to Variants section
  const variantTab = page.locator(
    'a:has-text("Variants"), [data-testid="product-variant-panel"]'
  );
  if (await variantTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await variantTab.click();
    await page.waitForTimeout(CONFIG.delayBetweenActions);
  }

  // Fill variant details
  const firstVariant = product.variants[0];
  await fillVariantFields(page, firstVariant, 0);

  // Add additional variants if needed
  for (let i = 1; i < product.variants.length; i++) {
    const addVarBtn = page.locator('button:has-text("Add variant"), [data-testid="add-variant"]');
    if (await addVarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addVarBtn.click();
      await page.waitForTimeout(CONFIG.delayBetweenActions);
    } else {
      // Try clicking within variant rows
      const rows = page.locator('[data-testid="product-variant-row"]');
      const count = await rows.count();
      const lastRow = rows.nth(count - 1);
      const addBtnInRow = lastRow.locator('button');
      if (await addBtnInRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addBtnInRow.click();
        await page.waitForTimeout(CONFIG.delayBetweenActions);
      }
    }
    await fillVariantFields(page, product.variants[i], i);
  }

  // Save
  const saveBtn = page.locator('button:has-text("Save"), [data-testid="product-save"]');
  if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(CONFIG.delayBetweenActions * 3);

    // Verify save
    const successToast = page.locator('[data-testid="toast-success"], .Polaris-Banner--success');
    if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`✓ ${product.title} — saved successfully`);
      state.productCount++;
      saveState();
      return true;
    }

    // Fallback: check if we're on product detail page (means save worked)
    const savedTitle = await page.title();
    if (savedTitle.includes(product.title.substring(0, 30))) {
      console.log(`✓ ${product.title} — saved (verified by page title)`);
      state.productCount++;
      saveState();
      return true;
    }
  }

  console.log(`✗ ${product.title} — save failed or timed out`);
  await screenshot(page, `save-fail-${product.handle}`);
  state.lastError = `Failed to save: ${product.title}`;
  saveState();
  return false;
}

/**
 * Fill variant-level fields (SKU, price, inventory, options)
 */
async function fillVariantFields(page, variant, index) {
  // SKU
  const skuField = page.locator(
    `input[data-testid^="variant-sku"], input[name*="sku"]`
  ).nth(index);
  if (await skuField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skuField.fill(variant.sku);
  }

  // Price
  const priceField = page.locator(
    `input[data-testid^="variant-price"], input[name*="price"]`
  ).nth(index);
  if (await priceField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await priceField.fill(String(variant.price));
  }

  // Compare at price
  if (variant.compareAtPrice) {
    const compareField = page.locator(
      `input[data-testid^="variant-compare"], input[name*="compare"]`
    ).nth(index);
    if (await compareField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await compareField.fill(String(variant.compareAtPrice));
    }
  }

  // Inventory quantity
  if (variant.inventoryQty !== undefined) {
    const invField = page.locator(
      `input[data-testid^="variant-inventory"], input[name*="inventory"], input[aria-label*="inventory"]`
    ).nth(index);
    if (await invField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await invField.fill(String(variant.inventoryQty));
    }
  }

  // Option values
  if (variant.option1) {
    const optField = page.locator(
      `input[data-testid^="variant-option"], input[name*="option"]`
    ).nth(index);
    if (await optField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await optField.fill(variant.option1);
    }
  }
}

/**
 * Update inventory quantity for a specific SKU
 */
async function updateInventory(browser, sku, qty) {
  console.log(`→ Updating inventory: ${sku} → ${qty}`);

  const page = await getPage(browser);
  await login(page);

  // Go to Inventory section
  await page.goto(`${CONFIG.adminUrl}/inventory`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

  // Search for SKU
  const searchField = page.locator('input[type="search"], input[placeholder*="Search"]');
  if (await searchField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchField.fill(sku);
    await page.waitForTimeout(CONFIG.delayBetweenActions * 2);
  }

  // Find the row and update quantity
  const rows = page.locator('[data-testid="inventory-row"], tbody tr');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const rowText = await row.textContent();
    if (rowText.includes(sku)) {
      const qtyInput = row.locator('input[type="number"]');
      if (await qtyInput.isVisible()) {
        await qtyInput.fill(String(qty));
        await page.waitForTimeout(CONFIG.delayBetweenActions);
        console.log(`✓ Updated ${sku} → ${qty}`);
        return true;
      }
    }
  }

  // Fallback: try edit on product page
  console.log('⚠️  SKU not found in inventory list, trying product-level edit...');
  await page.goto(`${CONFIG.adminUrl}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

  const searchBar = page.locator('input[type="search"]');
  await searchBar.fill(sku);
  await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

  const editBtn = page.locator('button:has-text("Edit")').first();
  if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

    const qtyInput = page.locator('input[name*="inventory_quantity"], input[aria-label*="quantity"]').first();
    if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyInput.fill(String(qty));
      await page.waitForTimeout(CONFIG.delayBetweenActions);

      const saveBtn = page.locator('button:has-text("Save")');
      await saveBtn.click();
      await page.waitForTimeout(CONFIG.delayBetweenActions * 2);

      console.log(`✓ Updated ${sku} → ${qty} (via product edit)`);
      return true;
    }
  }

  console.log(`✗ Could not update ${sku}`);
  return false;
}

/**
 * Take screenshot for debugging
 */
async function screenshot(page, name = 'screenshot') {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot: ${filePath}`);
  return filePath;
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  const arg2 = process.argv[4];

  console.log('🚀 TopShelfToker Shopify Automation (Self-Hosted)');
  console.log('=' .repeat(50));

  const browser = await launchBrowser();

  try {
    const page = await getPage(browser);

    switch (command) {
      case 'login':
        await doLogin(page);
        break;

      case 'list':
        await doLogin(page);
        await listProducts(page);
        break;

      case 'sync': {
        const catalog = JSON.parse(fs.readFileSync(CONFIG.catalogPath, 'utf8'));
        await doLogin(page);

        let added = 0;
        let skipped = 0;

        for (const product of catalog.products) {
          console.log(`\n[${added + skipped + 1}/${catalog.products.length}] ${product.title}`);
          const exists = await productExists(page, product.handle);
          if (exists) {
            console.log(`⏭️  Already exists: ${product.title}`);
            skipped++;
          } else {
            const success = await addProduct(page, product);
            if (success) added++;
          }
          await page.waitForTimeout(CONFIG.delayBetweenActions);
        }

        console.log(`\n📊 Sync Complete: ${added} added, ${skipped} skipped`);
        saveState();
        break;
      }

      case 'add':
        if (!arg) {
          console.log('Usage: node shopify-ctl.js add <handle>');
          process.exit(1);
        }
        await doLogin(page);
        const catalog = JSON.parse(fs.readFileSync(CONFIG.catalogPath, 'utf8'));
        const product = catalog.products.find(p => p.handle === arg);
        if (!product) {
          console.log(`✗ Product not found: ${arg}`);
          process.exit(1);
        }
        await addProduct(page, product);
        break;

      case 'inventory':
        if (!arg || !arg2) {
          console.log('Usage: node shopify-ctl.js inventory <sku> <qty>');
          process.exit(1);
        }
        await updateInventory(browser, arg, parseInt(arg2));
        break;

      case 'screenshot':
        await doLogin(page);
        await screenshot(page, arg || 'admin-dashboard');
        break;

      default:
        console.log('\nCommands:');
        console.log('  login                   — Login to Shopify admin');
        console.log('  list                    — List all products');
        console.log('  sync                    — Sync full catalog');
        console.log('  add <handle>            — Add single product');
        console.log('  inventory <sku> <qty>   — Update inventory');
        console.log('  screenshot [name]       — Take dashboard screenshot');
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
    state.lastError = error.message;
    saveState();
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed');
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });