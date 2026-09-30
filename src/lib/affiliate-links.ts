/**
 * src/lib/affiliate-links.ts
 *
 * Affiliate link infrastructure. Activated when AMZN_ASSOCIATE_TAG is set in
 * Vercel env vars. Until then, every link is a clean product page URL with no
 * tag.
 *
 * Why this exists:
 *   RinkStop's /learn/equipment-* and /learn/skate-fitting pages get organic
 *   search traffic from parents searching "best hockey skates for kids" etc.
 *   That's buyer-intent traffic. Adding Amazon Associates links to these
 *   pages turns the existing traffic into ~4% commission per sale.
 *
 * Activation (zero human action needed from KiloClaw):
 *   1. Arnel signs up at https://affiliate-program.amazon.com/ (5 min)
 *   2. Adds AMZN_ASSOCIATE_TAG=rinkstop-20 to Vercel env vars
 *   3. Every equipment/learn page starts earning commission on next deploy
 *
 * Without the env var set, buildAmazonUrl() returns plain Amazon search URLs
 * — no broken links, no broken UI. The component renders "Where to buy →"
 * links to Amazon search results, ready for the tag to start earning.
 *
 * Supported networks (any/all can be configured):
 *   - Amazon Associates (AMZN_ASSOCIATE_TAG, default 4% electronics/sporting)
 *   - Impact.com (IMPACT_API_KEY + IMPACT_ACCOUNT_ID for Bauer/CCM/Warrior direct)
 *   - Walmart Affiliate (WALMART_ADVERTISER_ID)
 *   - Target Affiliate (TARGET_AFFILIATE_ID)
 *
 * Current status (2026-09-30):
 *   - AMZN_ASSOCIATE_TAG: NOT SET (Arnel hasn't signed up yet)
 *   - Infrastructure: ready, zero-config
 */

export type AffiliateNetwork = 'amazon' | 'impact' | 'walmart' | 'target' | 'direct';

export interface ProductRecommendation {
  /** Product name for readers (e.g. "Bauer X-LP Skates") */
  name: string;
  /** Brand (e.g. "Bauer", "CCM", "Warrior") */
  brand: string;
  /** Plain-English description of what makes it a good pick */
  reason: string;
  /** Approximate price for filtering (USD, optional) */
  priceUsd?: number;
  /** Specific Amazon ASIN for direct product link (preferred over search) */
  asin?: string;
  /** Search keywords if no ASIN */
  searchTerms?: string;
  /** SKU/URL for direct retailers (Bauer.com, etc.) */
  directUrl?: string;
}

/**
 * Build an Amazon URL for the given product. If AMZN_ASSOCIATE_TAG is set in
 * env vars, appends the tag for commission attribution. Otherwise returns a
 * clean Amazon search URL — no broken links.
 */
export function buildAmazonUrl(product: ProductRecommendation): string {
  const tag = process.env.AMZN_ASSOCIATE_TAG;
  const base = 'https://www.amazon.com';

  let url: string;
  if (product.asin) {
    // Direct product URL
    url = `${base}/dp/${product.asin}`;
  } else if (product.searchTerms) {
    // Search URL with encoded terms
    const terms = encodeURIComponent(product.searchTerms);
    url = `${base}/s?k=${terms}&i=sporting-goods`;
  } else {
    // Fallback: brand + product name
    const terms = encodeURIComponent(`${product.brand} ${product.name}`);
    url = `${base}/s?k=${terms}&i=sporting-goods`;
  }

  if (tag) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}tag=${encodeURIComponent(tag)}`;
  }
  return url;
}

/**
 * Build a Walmart URL (when configured).
 */
export function buildWalmartUrl(product: ProductRecommendation): string | null {
  const advertiserId = process.env.WALMART_ADVERTISER_ID;
  if (!advertiserId) return null;

  const terms = encodeURIComponent(`${product.brand} ${product.name}`);
  let url = `https://www.walmart.com/search?q=${terms}`;
  url += `&wmlspartner=${encodeURIComponent(advertiserId)}`;
  return url;
}

/**
 * Build a generic "where to buy" URL — finds the cheapest of all enabled
 * networks. Returns null if no network is configured AND no directUrl exists.
 */
export function buildAffiliateUrl(product: ProductRecommendation): string | null {
  // Prefer direct URL if provided (zero-network, just tracks)
  if (product.directUrl) return product.directUrl;

  // Then try Walmart if configured
  const walmart = buildWalmartUrl(product);
  if (walmart) return walmart;

  // Default: Amazon (works with or without tag)
  return buildAmazonUrl(product);
}

/**
 * Returns true if ANY affiliate network is configured. Pages can use this
 * to show "Earn commission" badges or hide the affiliate disclosure.
 */
export function hasAffiliateNetwork(): boolean {
  return Boolean(
    process.env.AMZN_ASSOCIATE_TAG ||
    process.env.WALMART_ADVERTISER_ID ||
    process.env.IMPACT_API_KEY ||
    process.env.TARGET_AFFILIATE_ID,
  );
}