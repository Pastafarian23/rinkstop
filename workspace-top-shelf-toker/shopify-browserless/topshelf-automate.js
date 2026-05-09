/**
 * topshelf-automate.js — TopShelfToker Full Automation
 *
 * Unified script for Printful + Shopify automation.
 * Uses local Playwright Chromium with persistent session.
 *
 * Usage:
 *   node topshelf-automate.js --help
 *
 *   node topshelf-automate.js --shopify-login          # One-time Shopify login (saves session)
 *   node topshelf-automate.js --upload-designs         # Upload designs to Printful
 *   node topshelf-automate.js --sync-products           # Create products on Printful + push to Shopify
 *   node topshelf-automate.js --full-run                # Do everything
 *   node topshelf-automate.js --update-pricing          # Update all product prices
 *   node topshelf-automate.js --inventory <sku> <qty>   # Update inventory
 *   node topshelf-automate.js --status                   # Check store + Printful status
 */

const { chromium } = require('playwright-core');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  // Shopify Store
  shopifyStore: 'xsisex-d6.myshopify.com',
  shopifyAdminUrl: `https://admin.shopify.com/store/xsisex-d6`,
  shopifyApiVersion: '2024-07',

  // Paths
  catalogPath: path.join(__dirname, 'product-catalog.json'),
  sessionPath: path.join(__dirname, 'state', 'shopify-session.json'),
  screenshotsDir: path.join(__dirname, 'screenshots'),
  statePath: path.join(__dirname, 'state', 'automation-state.json'),

  // Printful API (will load from env or config)
  printfulApiBase: 'https://api.printful.com',
  printfulApiKey: process.env.PRINTFUL_API_KEY || '',
  printfulApiSecret: process.env.PRINTFUL_API_SECRET || '',

  // Timing
  timeout: 30000,
  delay: 1000,
};

// Ensure directories exist
['state', 'screenshots'].forEach(dir => {
  const d = path.join(__dirname, dir);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── State Management ────────────────────────────────────────────────────────
let state = {};

function loadState() {
  try {
    if (fs.existsSync(CONFIG.statePath)) {
      state = JSON.parse(fs.readFileSync(CONFIG.statePath, 'utf8'));
    }
  } catch (e) { state = {}; }
  return state;
}

function saveState() {
  try {
    state.updatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG.statePath, JSON.stringify(state, null, 2));
  } catch (e) { /* ignore */ }
}

// ─── Printful API Client ─────────────────────────────────────────────────────

function printfulRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.printfulApiBase}${endpoint}`;
    const parsedUrl = new URL(url);
    const auth = Buffer.from(`${CONFIG.printfulApiKey}:${CONFIG.printfulApiSecret}`).toString('base64');

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Printful API ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function printfulHealthCheck() {
  try {
    const result = await printfulRequest('GET', '/');
    console.log('✓ Printful API connected successfully');
    console.log(`  Server time: ${result.info?.server_time || 'N/A'}`);
    return true;
  } catch (e) {
    console.log('✗ Printful API connection failed:', e.message);
    return false;
  }
}

async function printfulGetProducts() {
  const result = await printfulRequest('GET', '/sync/products?limit=100');
  return result.result || [];
}

async function printfulUploadDesign(filePath, options = {}) {
  // Read file and upload to Printful
  const fileContent = fs.readFileSync(filePath);
  // Printful file upload uses form-data — simplified here
  console.log(`→ Would upload: ${filePath}`);
  console.log('   Note: File upload requires multipart/form-data');
  console.log('   Use Printful dashboard for initial bulk upload, then API for management');
}

async function printfulCreateProductSync(payload) {
  try {
    const result = await printfulRequest('POST', '/sync/products', payload);
    console.log(`✓ Printful product created: ${result.result?.name || 'Unknown'}`);
    console.log(`  Printful ID: ${result.result?.id}`);
    console.log(`  Sync Status: ${result.result?.sync_status || 'pending'}`);
    return result.result;
  } catch (e) {
    console.log(`✗ Printful product creation failed: ${e.message}`);
    return null;
  }
}

// ─── Browser Management (Self-Hosted) ────────────────────────────────────────

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: CONFIG.headless !== false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  return browser;
}

function getSessionContext(browser) {
  // Create context with saved storage state if available
  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
  };

  if (fs.existsSync(CONFIG.sessionPath)) {
    try {
      const sessionData = JSON.parse(fs.readFileSync(CONFIG.sessionPath, 'utf8'));
      contextOptions.storageState = sessionData;
      console.log('🔄 Loaded saved session — skipping login');
    } catch (e) {
      console.log('ℹ️  No saved session found — login required');
    }
  }

  return browser.newContext(contextOptions);
}

async function saveSession(page) {
  const storageState = await page.context().storageState();
  fs.writeFileSync(CONFIG.sessionPath, JSON.stringify(storageState, null, 2));
  console.log('💾 Session saved — future runs skip login');
}

async function runInBrowser(page, fn) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  if (!page.url() || page.url() === 'about:blank') {
    await page.goto(CONFIG.shopifyAdminUrl, { waitUntil: 'domcontentloaded' });
  }

  await fn(page);
}

// ─── Shopify Admin Actions ───────────────────────────────────────────────────

async function shopifyLogin(page) {
  console.log('🔐 Logging into Shopify (manual — handles all security checks)...');
  await page.goto(CONFIG.shopifyAdminUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(CONFIG.delay * 3);

  // Check if login is needed
  const title = await page.title();
  if (title.includes('Home') || title.includes('Dashboard')) {
    console.log('✓ Already logged in');
    await saveSession(page);
    return;
  }

  console.log('📝 When the login form appears, log in manually.');
  console.log('   This is the ONLY time you need to do this.');
  console.log('   After login, the session is saved for future use.');
  console.log('   Waiting 60 seconds for you to complete login...');

  // Wait for user to complete login (including 2FA)
  try {
    await page.waitForFunction(
      () => {
        const title = document.title;
        return title.includes('Home') || title.includes('Dashboard');
      },
      { timeout: 60000 }
    );
    console.log('✓ Login successful!');
    await saveSession(page);
  } catch (e) {
    console.log('⏰ Login timeout. If you completed login, try running --status');
  }
}

async function shopifyProducts(page) {
  const products = await page.evaluate(() => {
    const rows = document.querySelectorAll(
      '[data-testid="product-index-table"] tbody tr, ' +
      '.Polaris-ResourceList__table tbody tr'
    );
    return Array.from(rows).slice(0, 20).map(row => {
      const titleEl = row.querySelector('a, [data-testid="product-title"]');
      return {
        title: titleEl?.textContent?.trim() || 'Unknown',
        url: titleEl?.href || '',
      };
    });
  });

  console.log(`\n📦 Products in Shopify (${products.length}):`);
  products.forEach((p, i) => console.log(`  ${i + 1}. ${p.title}`));
  return products;
}

async function shopifyInventory(page, sku, qty) {
  // Navigate to product, find variant by SKU, update inventory
  console.log(`→ Updating inventory: ${sku} → ${qty} units`);

  // Go to products page
  await page.goto(`${CONFIG.shopifyAdminUrl}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(CONFIG.delay * 2);

  // Search for product containing this SKU
  const searchBar = page.locator('input[type="search"]').first();
  await searchBar.fill(sku);
  await page.waitForTimeout(CONFIG.delay * 2);

  // Click on the product
  const productLink = page.locator('a:has-text("' + sku + '"), [data-testid*="product-title"]').first();
  if (await productLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await productLink.click();
    await page.waitForTimeout(CONFIG.delay * 2);
  } else {
    console.log('⚠️  Product not found by SKU search');
    return false;
  }

  // Find inventory field and update
  const invField = page.locator(
    'input[name*="inventory_quantity"], input[aria-label*="quantity"], input[data-testid*="inventory"]'
  );

  for (let i = 0; i < await invField.count(); i++) {
    const field = invField.nth(i);
    const fieldSku = await field.getAttribute('data-testid') || '';
    if (fieldSku.includes(sku) || (await field.evaluate(el => el.closest('tr')?.textContent?.includes(sku)))) {
      await field.fill(String(qty));
      await page.waitForTimeout(CONFIG.delay);
      console.log(`✓ Updated ${sku} inventory to ${qty}`);

      // Save
      const saveBtn = page.locator('button:has-text("Save")');
      if (await saveBtn.isVisible()) await saveBtn.click();
      return true;
    }
  }

  console.log('⚠️  Could not find inventory field for SKU:', sku);
  return false;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdShopifyLogin() {
  const browser = await launchBrowser();
  try {
    const context = getSessionContext(browser);
    const page = await context.newPage();
    await shopifyLogin(page);
  } finally {
    await browser.close();
  }
}

async function cmdStatus() {
  console.log('\n📊 TopShelfToker Status');
  console.log('=' .repeat(50));

  // Printful status
  loadState();
  console.log('\n🔵 Printful API:');
  if (CONFIG.printfulApiKey && CONFIG.printfulApiSecret) {
    try {
      await printfulHealthCheck();
    } catch (e) {
      console.log('✗ Not connected — set PRINTFUL_API_KEY and PRINTFUL_API_SECRET');
    }
  } else {
    console.log('⚠️  No API keys configured');
    console.log('   Set: PRINTFUL_API_KEY and PRINTFUL_API_SECRET');
  }

  // Shopify status (check session)
  console.log('\n🟣 Shopify Store:');
  const sessionExists = fs.existsSync(CONFIG.sessionPath);
  if (sessionExists) {
    const session = JSON.parse(fs.readFileSync(CONFIG.sessionPath, 'utf8'));
    const hasCookies = session.cookies && session.cookies.length > 0;
    console.log(`   Session: ${hasCookies ? '✅ Active' : '⚠️  Expired'}`);
    console.log(`   Store: ${CONFIG.shopifyStore}`);

    if (hasCookies) {
      const browser = await launchBrowser();
      try {
        const context = await browser.newContext({ storageState: session });
        const page = await context.newPage();
        await page.goto(CONFIG.shopifyAdminUrl, { waitUntil: 'domcontentloaded' });
        const title = await page.title();
        console.log(`   Page: ${title}`);
      } catch (e) {
        console.log(`   Connection: ⚠️  ${e.message}`);
      } finally {
        await browser.close();
      }
    }
  } else {
    console.log('   Session: ❌ Not logged in (run --shopify-login)');
  }

  // Catalog status
  console.log('\n📋 Product Catalog:');
  if (fs.existsSync(CONFIG.catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(CONFIG.catalogPath, 'utf8'));
    const totalVariants = catalog.products.reduce((sum, p) => sum + p.variants.length, 0);
    console.log(`   Products: ${catalog.products.length}`);
    console.log(`   Variants: ${totalVariants}`);
    catalog.products.forEach(p => {
      console.log(`   • ${p.title} — $${p.variants[0].price} (${p.variants.length} variants)`);
    });
  } else {
    console.log('   ⚠️  catalog not found');
  }

  console.log('\n' + '='.repeat(50));
}

async function cmdSyncProducts(options = {}) {
  const browser = await launchBrowser();

  try {
    const context = getSessionContext(browser);
    const page = await context.newPage();

    // Check if logged in
    await page.goto(CONFIG.shopifyAdminUrl, { waitUntil: 'domcontentloaded' });
    const title = await page.title();

    if (!title.includes('Home') && !title.includes('Dashboard')) {
      console.log('⚠️  Not logged in. Run --shopify-login first.');
      return;
    }

    // Load catalog
    const catalog = JSON.parse(fs.readFileSync(CONFIG.catalogPath, 'utf8'));

    console.log(`\n📦 Syncing ${catalog.products.length} products to Shopify...`);

    // Navigate to products
    await page.goto(`${CONFIG.shopifyAdminUrl}/products`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(CONFIG.delay * 2);

    let added = 0;
    let failed = 0;

    for (const product of catalog.products) {
      console.log(`\n[${added + failed + 1}/${catalog.products.length}] ${product.title}`);

      // Click Add product
      const addBtn = page.locator('button:has-text("Add product"), [data-testid="add-product"]');
      await addBtn.click({ timeout: CONFIG.timeout });
      await page.waitForTimeout(CONFIG.delay * 2);

      // Fill title
      const titleField = page.locator('input[data-testid="product-title"]').first();
      await titleField.fill(product.title);
      await titleField.press('Tab');
      await page.waitForTimeout(CONFIG.delay / 2);

      // Fill body (strip HTML, use plain text for contenteditable)
      const plainText = product.bodyHtml.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n');
      const bodyField = page.locator('[data-testid="product-body"]');
      if (await bodyField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bodyField.click();
        // Select all and replace
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(plainText);
      }
      await page.waitForTimeout(CONFIG.delay / 2);

      // Fill vendor
      if (product.vendor) {
        const vendorField = page.locator('input[data-testid="product-vendor"]');
        if (await vendorField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await vendorField.fill(product.vendor);
        }
      }

      // Fill product type
      if (product.productType) {
        const typeField = page.locator('input[data-testid="product-type-input"]');
        if (await typeField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await typeField.fill(product.productType);
        }
      }

      // Fill tags
      if (product.tags?.length) {
        const tagsField = page.locator('input[data-testid="product-tags"]');
        if (await tagsField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await tagsField.fill(product.tags.join(', '));
        }
      }

      // Handle variants
      const variantRows = page.locator('[data-testid="product-variant-row"]');
      const varCount = await variantRows.count();

      if (varCount > 0) {
        // Fill first variant
        await fillVariantFields(page, product.variants[0], 0);

        // Add additional variants
        for (let i = 1; i < product.variants.length; i++) {
          const addVarBtn = page.locator('button:has-text("Add variant"), [data-testid="add-variant"]');
          if (await addVarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await addVarBtn.click();
            await page.waitForTimeout(CONFIG.delay);
          }
          await fillVariantFields(page, product.variants[i], i);
          await page.waitForTimeout(CONFIG.delay);
        }
      }

      // Save
      const saveBtn = page.locator('button:has-text("Save"), [data-testid="product-save"]');
      if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(CONFIG.delay * 3);

        // Check for success
        const newTitle = await page.title();
        if (newTitle.includes(product.title.substring(0, 30)) ||
            page.locator('[data-testid="toast-success"]').isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`  ✅ ${product.title} — saved`);
          added++;
        } else {
          console.log(`  ⚠️  ${product.title} — may have saved, verify manually`);
          failed++;
        }
      } else {
        console.log(`  ❌ ${product.title} — save button missing`);
        failed++;
      }

      await page.waitForTimeout(CONFIG.delay);
    }

    console.log(`\n📊 Sync Complete: ${added} succeeded, ${failed} failed`);

    // Save state
    state.productCount = added;
    state.lastSync = new Date().toISOString();
    saveState();

  } finally {
    await browser.close();
  }
}

async function cmdSyncPrintful(options = {}) {
  if (!CONFIG.printfulApiKey || !CONFIG.printfulApiSecret) {
    console.log('✗ Printful API keys not configured.');
    console.log('  Set environment variables:');
    console.log('    PRINTFUL_API_KEY=your_key_here');
    console.log('    PRINTFUL_API_SECRET=your_secret_here');
    return;
  }

  console.log('\n🔵 Printful Integration:');

  // Step 1: Check existing products on Printful
  console.log('→ Fetching Printful products...');
  try {
    const printfulProducts = await printfulGetProducts();
    console.log(`  Found ${printfulProducts.length} products on Printful`);
  } catch (e) {
    console.log('  ✗ Could not fetch:', e.message);
  }

  // Step 2: Load catalog
  const catalog = JSON.parse(fs.readFileSync(CONFIG.catalogPath, 'utf8'));

  // Step 3: For each catalog product, create/update on Printful
  // Note: Printful product creation requires specific format
  // We'll need to use /sync/products endpoint with external_id mapping

  console.log('\n→ Creating Printful sync products...');

  for (const product of catalog.products) {
    console.log(`\n  Processing: ${product.title}`);

    // Build Printful sync product payload
    const printfulPayload = {
      external_id: product.handle,
      name: product.title,
      description: product.bodyHtml.replace(/<[^>]+>/g, '').substring(0, 500),
      categories: [product.productType === 'Apparel' ? 'apparel' : 'accessories'],
      variants: product.variants.map(v => ({
        external_id: v.sku,
        size: v.option1,
        color: v.option1,
        price: v.price,
      })),
    };

    try {
      const result = await printfulCreateProductSync(printfulPayload);
      if (result) {
        console.log(`  ✅ ${product.title} → Printful (ID: ${result.id})`);
      }
    } catch (e) {
      console.log(`  ❌ ${product.title} → ${e.message}`);
    }
  }

  console.log('\n⚡ Printful sync complete.');
  console.log('   Note: Design files need to be uploaded separately via Printful dashboard');
  console.log('   or via their file upload API endpoint.');
}

async function cmdInventory(sku, qty) {
  if (!sku || !qty) {
    console.log('Usage: --inventory <sku> <quantity>');
    return;
  }

  const browser = await launchBrowser();
  try {
    const context = getSessionContext(browser);
    const page = await context.newPage();

    // Check if logged in
    await page.goto(CONFIG.shopifyAdminUrl, { waitUntil: 'domcontentloaded' });
    const title = await page.title();

    if (!title.includes('Home') && !title.includes('Dashboard')) {
      console.log('⚠️  Not logged in. Run --shopify-login first.');
      return;
    }

    await shopifyInventory(page, sku, parseInt(qty));
  } finally {
    await browser.close();
  }
}

// ─── Helper: Fill variant fields ────────────────────────────────────────────

async function fillVariantFields(page, variant, index) {
  // Try multiple selector strategies for variant fields
  const variantRow = page.locator('[data-testid="product-variant-row"]').nth(index);

  // SKU
  if (variant.sku) {
    const skuField = variantRow.locator('input[data-testid*="sku"], input[name*="sku"]');
    if (await skuField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skuField.fill(variant.sku);
    }
  }

  // Price
  if (variant.price) {
    const priceField = variantRow.locator('input[data-testid*="price"], input[name*="price"]');
    if (await priceField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await priceField.fill(String(variant.price));
    }
  }

  // Inventory
  if (variant.inventoryQty !== undefined) {
    const invField = variantRow.locator('input[data-testid*="inventory"], input[name*="inventory_quantity"]');
    if (await invField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await invField.fill(String(variant.inventoryQty));
    }
  }

  // Option1
  if (variant.option1) {
    const optField = variantRow.locator('input[data-testid*="option"], input[name*="option"]');
    if (await optField.isVisible({ timeout: 1000 }).catch(() => false)) {
      const currentVal = await optField.inputValue();
      if (!currentVal || currentVal !== variant.option1) {
        await optField.fill(variant.option1);
      }
    }
  }
}

// ─── Full automation (design upload placeholder) ─────────────────────────────

async function cmdFullRun() {
  console.log('\n🚀 Starting full automation...');

  // Step 1: Printful sync (if keys available)
  await cmdSyncPrintful();

  // Step 2: Shopify product sync
  await cmdSyncProducts();

  // Step 3: Status check
  await cmdStatus();

  console.log('\n✨ Full automation complete!');
}

// ─── CLI Entry ──────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  console.log('\n🔥 TopShelfToker — Full Automation (Self-Hosted)');
  console.log('=' .repeat(50));

  if (!command || command === '--help') {
    console.log('\nUsage:');
    console.log('  node topshelf-automate.js --shopify-login     One-time Shopify login');
    console.log('  node topshelf-automate.js --status             Check system status');
    console.log('  node topshelf-automate.js --sync-products      Sync catalog to Shopify');
    console.log('  node topshelf-automate.js --sync-printful      Sync products to Printful');
    console.log('  node topshelf-automate.js --inventory <SKU> <qty>  Update inventory');
    console.log('  node topshelf-automate.js --full-run           Everything (Printful + Shopify)');
    console.log('\nEnv vars:');
    console.log('  PRINTFUL_API_KEY=...');
    console.log('  PRINTFUL_API_SECRET=...');
    return;
  }

  switch (command) {
    case '--shopify-login': await cmdShopifyLogin(); break;
    case '--status':         await cmdStatus(); break;
    case '--sync-products':  await cmdSyncProducts(); break;
    case '--sync-printful':  await cmdSyncPrintful(); break;
    case '--inventory':      await cmdInventory(arg1, arg2); break;
    case '--full-run':       await cmdFullRun(); break;
    default:
      console.log('Unknown command:', command);
      console.log('Run with --help for usage.');
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });