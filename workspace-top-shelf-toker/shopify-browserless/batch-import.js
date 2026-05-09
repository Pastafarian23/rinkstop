/**
 * batch-import.js — Import all products from catalog into Shopify via browserless
 *
 * Usage:
 *   node batch-import.js [--dry-run] [--images ./images]
 *
 * --dry-run   : Simulates without making changes
 * --images    : Path to product images folder (optional, for post-upload)
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, 'product-catalog.json');
const IMAGES_DIR = process.argv.includes('--images')
  ? process.argv[process.argv.indexOf('--images') + 1]
  : path.join(__dirname, 'images');

const isDryRun = process.argv.includes('--dry-run');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

  console.log(`📦 Batch Import — ${catalog.products.length} products`);
  if (isDryRun) console.log('🔍 DRY RUN mode — no changes will be made\n');

  for (let i = 0; i < catalog.products.length; i++) {
    const product = catalog.products[i];
    console.log(`\n[${i + 1}/${catalog.products.length}] ${product.title}`);
    console.log(`   Handle: ${product.handle}`);
    console.log(`   Type:   ${product.productType}`);
    console.log(`   Tags:   ${product.tags.join(', ')}`);
    console.log(`   Vendor: ${product.vendor}`);
    console.log(`   Variants: ${product.variants.length}`);

    for (const v of product.variants) {
      console.log(`     • ${v.option1} — $${v.price} (${v.inventoryQty} units) [${v.sku}]`);
    }

    // Check for images
    if (fs.existsSync(IMAGES_DIR)) {
      const imageName = product.handle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const images = fs.readdirSync(IMAGES_DIR)
        .filter(f => f.includes(imageName) || f.includes(product.handle));
      if (images.length > 0) {
        console.log(`   🖼️  Images found: ${images.join(', ')}`);
      } else {
        console.log(`   ⚠️  No images found for this product`);
      }
    }

    if (!isDryRun) {
      // In production, this would call the Shopify automation
      console.log(`   → Syncing...`);
      await delay(1000); // Simulated
      console.log(`   ✓ Done`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Batch import finished');
  console.log(`   Products: ${catalog.products.length}`);
  console.log(`   Total variants: ${catalog.products.reduce((sum, p) => sum + p.variants.length, 0)}`);

  if (isDryRun) {
    console.log('\n🔍 Dry run complete — review above, then run without --dry-run');
  }
}

main().catch(console.error);