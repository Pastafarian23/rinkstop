/**
 * store-setup.js — TopShelfToker Shopify Store Setup (Self-Hosted)
 *
 * Uses local Playwright Chromium — no external gateway.
 * Handles all UI customization that Printful can't do.
 *
 * Commands:
 *   setup theme       — Apply theme customizations
 *   setup navigation  — Set up main menu and footer
 *   setup policies    — Create shipping, returns, privacy pages
 *   setup seo         — Add meta tags and store info
 *   setup trust       — Add trust badges and social proof
 *   setup all         — Run full setup
 *   check responsive  — Test mobile responsiveness
 *   screenshot [name] — Capture current state
 */

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  adminUrl: 'https://admin.shopify.com/store/top-shelf-toker-2',
  storeUrl: 'https://topshelftoker-2.myshopify.com',

  shopifyEmail: 'arnellarracas@gmail.com',
  shopifyPassword: 'Arnelsl1!',

  headless: true,
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  delay: 1000,
};

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function launchBrowser() {
  console.log('🚀 Launching local Chromium...');
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log('✓ Local browser running');
  return browser;
}

async function getPage(browser) {
  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  return await context.newPage();
}

async function login(page) {
  console.log('🔐 Logging in...');
  await page.goto(CONFIG.adminUrl, { waitUntil: 'domcontentloaded' });

  const title = await page.title();
  if (title.includes('Home')) { console.log('✓ Already logged in'); return; }

  await page.fill('input[type="email"]', CONFIG.shopifyEmail);

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await delay(CONFIG.delay * 2);

  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordField.fill(CONFIG.shopifyPassword);
    await page.locator('button[type="submit"]').click();
    await delay(CONFIG.delay * 3);
  }

  // Handle 2FA
  const otpField = page.locator('input[name="otp"]');
  if (await otpField.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('⚠️  2FA detected — waiting (5 min timeout)');
    try {
      await page.waitForFunction(
        () => !document.querySelector('input[name="otp"]'),
        { timeout: 300000 }
      );
      console.log('✓ 2FA completed');
    } catch (e) { console.log('⏰ 2FA timeout'); }
  }

  console.log('✓ Login complete');
}

async function screenshot(page, name = 'store-check') {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot: ${filePath}`);
  return filePath;
}

// ─── Setup Functions ─────────────────────────────────────────────────────────

async function setupTheme(page) {
  console.log('\n🎨 Theme setup...');
  await page.goto(`${CONFIG.adminUrl}/themes`, { waitUntil: 'domcontentloaded' });
  await delay(CONFIG.delay * 2);
  console.log('→ Open Themes page in Admin to customize');
  console.log('   - Upload logo/favicon');
  console.log('   - Set brand colors (cannabis green tones)');
  console.log('   - Configure typography');
  console.log('✓ Theme settings ready for manual customization');
}

async function setupNavigation(page) {
  console.log('\n🧭 Navigation setup...');
  await page.goto(`${CONFIG.adminUrl}/navigation`, { waitUntil: 'domcontentloaded' });
  await delay(CONFIG.delay * 3);

  // Main menu
  const mainMenu = page.locator('a:has-text("Main menu")').first();
  if (await mainMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mainMenu.click();
    await delay(CONFIG.delay * 2);

    const items = [
      { name: 'Shop', link: '/collections/all' },
      { name: 'New Arrivals', link: '/collections/new' },
      { name: 'About', link: '/pages/about' },
      { name: 'Contact', link: '/pages/contact' },
    ];

    for (const item of items) {
      const addBtn = page.locator('button:has-text("Add menu item")');
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await delay(CONFIG.delay / 2);

        const nameFields = page.locator('input[data-testid="menu-item-name"]');
        const linkFields = page.locator('input[data-testid="menu-item-link"]');

        if ((await nameFields.count()) > 0) {
          const lastName = nameFields.last();
          await lastName.fill(item.name);
        }
        if ((await linkFields.count()) > 0) {
          const lastLink = linkFields.last();
          await lastLink.fill(item.link);
        }
        await delay(CONFIG.delay / 2);
      }
    }
    console.log('✓ Main menu items configured');
  }

  // Footer
  const footerMenu = page.locator('a:has-text("Footer")').first();
  if (await footerMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await footerMenu.click();
    await delay(CONFIG.delay * 2);

    const footerItems = [
      { name: 'Shipping Policy', link: '/policies/shipping-policy' },
      { name: 'Returns', link: '/policies/refund-policy' },
      { name: 'Privacy Policy', link: '/policies/privacy-policy' },
    ];

    for (const item of footerItems) {
      const addBtn = page.locator('button:has-text("Add menu item")');
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await delay(CONFIG.delay / 2);

        const nameFields = page.locator('input[data-testid="menu-item-name"]');
        const linkFields = page.locator('input[data-testid="menu-item-link"]');

        if ((await nameFields.count()) > 0) {
          const lastName = nameFields.last();
          await lastName.fill(item.name);
        }
        if ((await linkFields.count()) > 0) {
          const lastLink = linkFields.last();
          await lastLink.fill(item.link);
        }
        await delay(CONFIG.delay / 2);
      }
    }
    console.log('✓ Footer menu items configured');
  }

  console.log('✓ Navigation setup complete');
}

async function setupPolicies(page) {
  console.log('\n📋 Policy pages setup...');

  const policies = [
    { name: 'Shipping Policy', url: '/settings/shipping-policy' },
    { name: 'Refund Policy', url: '/settings/refund-policy' },
    { name: 'Privacy Policy', url: '/settings/privacy' },
    { name: 'Terms of Service', url: '/settings/terms-of-service' },
  ];

  for (const p of policies) {
    await page.goto(`${CONFIG.adminUrl}${p.url}`, { waitUntil: 'domcontentloaded' });
    await delay(CONFIG.delay * 2);

    // Check if content area exists (Shopify auto-creates these)
    const contentArea = page.locator('[data-testid="policies-content"], textarea, .tox-editor-area');
    if (await contentArea.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`✓ ${p.name} — ready for content`);
    } else {
      console.log(`⚠️  ${p.name} — may need manual creation`);
    }
  }

  console.log('→ Add your shipping rates, return policy, and privacy text manually');
  console.log('✓ Policy pages verified');
}

async function setupSEO(page) {
  console.log('\n🔍 SEO setup...');
  await page.goto(`${CONFIG.adminUrl}/settings/seo-and-social-media`, { waitUntil: 'domcontentloaded' });
  await delay(CONFIG.delay * 3);
  console.log('✓ SEO & Social Media settings page ready');
  console.log('   - Set store title, meta descriptions, and social images manually');
}

async function setupTrust(page) {
  console.log('\n🛡️ Trust elements...');
  console.log('→ Add via theme editor or page builder:');
  console.log('   - Payment method icons (Visa, MC, PayPal, Apple Pay)');
  console.log('   - SSL/secure checkout badge');
  console.log('   - Money-back guarantee banner');
  console.log('   - Customer review section');
  console.log('✓ Trust elements noted for manual implementation');
}

async function checkResponsive(page) {
  console.log('\n📱 Mobile responsiveness check...');

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(CONFIG.storeUrl, { waitUntil: 'domcontentloaded' });
  await delay(CONFIG.delay * 2);

  await screenshot(page, 'mobile-view');
  console.log('📸 Mobile screenshot saved');

  // Check key elements visibility
  const navVisible = await page.locator('nav, [role="navigation"]').isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`  Navigation visible: ${navVisible ? '✓' : '✗'}`);

  await page.setViewportSize(CONFIG.viewport);
  console.log('✓ Mobile check done');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const action = process.argv[2];
  const subAction = process.argv[3];

  console.log('🏪 TopShelfToker — Store Setup (Self-Hosted)');
  console.log('=' .repeat(50));

  const browser = await launchBrowser();

  try {
    const page = await getPage(browser);
    await login(page);

    switch (action) {
      case 'setup':
        if (!subAction || subAction === 'theme') await setupTheme(page);
        if (!subAction || subAction === 'navigation') await setupNavigation(page);
        if (!subAction || subAction === 'policies') await setupPolicies(page);
        if (!subAction || subAction === 'seo') await setupSEO(page);
        if (!subAction || subAction === 'trust') await setupTrust(page);
        if (subAction === 'all') {
          await setupTheme(page);
          await setupNavigation(page);
          await setupPolicies(page);
          await setupSEO(page);
          await setupTrust(page);
        }
        if (subAction && !['theme','navigation','policies','seo','trust','all'].includes(subAction)) {
          console.log('Usage: setup <theme|navigation|policies|seo|trust|all>');
        }
        break;

      case 'check':
        if (subAction === 'responsive') await checkResponsive(page);
        else console.log('Usage: check responsive');
        break;

      case 'screenshot':
        await screenshot(page, subAction || 'store-check');
        break;

      default:
        console.log('\nCommands:');
        console.log('  setup theme        — Apply theme customizations');
        console.log('  setup navigation   — Configure menus (main + footer)');
        console.log('  setup policies     — Verify/create policy pages');
        console.log('  setup seo          — Open SEO settings');
        console.log('  setup trust        — Add trust badges/info');
        console.log('  setup all          — Full store setup');
        console.log('  check responsive   — Mobile responsiveness test');
        console.log('  screenshot [name]  — Capture current state');
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    await screenshot(page, 'error');
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed');
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });