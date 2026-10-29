/**
 * src/lib/stripe-payment-links.ts
 *
 * Per-tier Stripe Payment Links. One-click checkout URLs that work without
 * an authenticated session. Anyone visiting a payment link URL gets a
 * Stripe Checkout page that, after successful payment, redirects back to
 * the success URL configured on the link (typically /dashboard/welcome).
 *
 * Created via Stripe API on 2026-09-30 — see ops log:
 *   plink_1ULHZHCJiUbEZVbnlphYIhRv  verified_identity  $24.99/yr
 *   plink_1ULHZWCJiUbEZVbn69r9SCM8  identity_plus      $59.99/yr
 *   plink_1ULHZpCJiUbEZVbnHoK3I0zV  verified_identity  $24.99/yr (dup)
 *   plink_1ULHZqCJiUbEZVbnFZEz2y2L  identity_plus      $59.99/yr (dup)
 *   plink_1ULHZqCJiUbEZVbnWXr0nttI  club_starter       $149/yr  (retired)
 *   plink_1ULHZqCJiUbEZVbnF7c7NdYT  club_pro           $399/yr  (retired)
 *   plink_1ULHZrCJiUbEZVbn3ugjIbJN  club_elite         $999/yr  (retired)
 *   plink_1ULHZrCJiUbEZVbnTyaVE7to  league             $1,999/yr (retired)
 *   plink_1ULHZrCJiUbEZVbnXZYgZrQM  business_listing   $99/yr   (retired)
 *   plink_1ULHZsCJiUbEZVbnkGPSw3ho  business_plus      $299/yr  (retired)
 *
 * 2026-10-22 tier consolidation — canonical organization links:
 *   plink_1UTOh2CJiUbEZVbnWMUwAxKC  org_plus           $99/yr
 *   plink_1UTOh2CJiUbEZVbnS59BW1rO  org_pro            $299/yr
 *   plink_1UTOh3CJiUbEZVbnh54MSB8R  org_elite          $599/yr
 *
 * The retired links are kept in the map (archived products still resolve
 * old links and historic invoices) but they are NOT offered on the pricing
 * page — the pricing page only reads the canonical keys.
 *
 * The duplicates are harmless (both work, Stripe will use the most-recent
 * one referenced). For the canonical "verified_identity" use the
 * plink_1ULHZpCJiUbEZVbnHoK3I0zV link — created with explicit
 * after_completion.redirect to /dashboard/welcome?session_id=…
 *
 * Hard-coded here intentionally. The Payment Links are stable IDs that
 * Stripe persists — if you need a new one, generate via curl + Stripe API
 * and update this file.
 */

export type StripePaymentLinkTier =
  | 'verified_identity'
  | 'identity_plus'
  | 'org_plus'
  | 'org_pro'
  | 'org_elite'
  // Retired tiers — links preserved so old links/invoices still resolve.
  | 'club_starter'
  | 'club_pro'
  | 'club_elite'
  | 'league'
  | 'business_listing'
  | 'business_plus'
  | 'dataset_license';

/**
 * Public, shareable payment links per tier. Anyone visiting these URLs
 * reaches a Stripe-hosted checkout page that does NOT require Clerk auth
 * upfront — Stripe collects the email + payment, then redirects to the
 * success URL (which DOES require auth, but at that point the user has
 * paid and is willing to sign in / sign up).
 */
export const STRIPE_PAYMENT_LINKS: Record<StripePaymentLinkTier, string> = {
  verified_identity: 'https://buy.stripe.com/00waEW5fh9hR2yz1LMeIw02',
  identity_plus: 'https://buy.stripe.com/6oU8wOazB8dN2yzduueIw03',
  // Canonical organization tiers (2026-10-22).
  org_plus: 'https://buy.stripe.com/8x2dR8fTVgKjc998aaeIw0b',
  org_pro: 'https://buy.stripe.com/9B6eVc6jl1Pp8WX4XYeIw0c',
  org_elite: 'https://buy.stripe.com/00w14m0Z19hRa11bmmeIw0d',
  // Retired (archived 2026-10-22) — kept for link/invoice resolution only.
  club_starter: 'https://buy.stripe.com/aFacN44bd9hRdddduueIw04',
  club_pro: 'https://buy.stripe.com/cNi7sKgXZ3Xx8WXbmmeIw05',
  club_elite: 'https://buy.stripe.com/cNi14m5fheCbfll0HIeIw06',
  league: 'https://buy.stripe.com/dRmdR8dLNgKjfll1LMeIw07',
  business_listing: 'https://buy.stripe.com/00w9AS5fh79Jgpp2PQeIw08',
  business_plus: 'https://buy.stripe.com/8x23cu6jl79J6OP1LMeIw09',
  // 2026-10-29: switched from the old link (plink_1ULK0VCJiUbEZVbnNi51XqVO,
  // buy.stripe.com/aFa3cuazB8dN3CD1LMeIw0a). The old link's product was
  // auto-created by Stripe, so its description could not be edited, and it
  // advertised stale counts to buyers: "1,857 rinks, 2,601 teams, 305
  // leagues, 6,351 players" vs the real deliverable of 1,859 / 2,639 / 294 /
  // 6,352. The new link points at a product WE created, so its copy is
  // editable and accurate.
  //
  // The old link is left ACTIVE (not deleted) so any link already shared or
  // bookmarked still resolves. Do not delete it without Arnel's approval.
  dataset_license: 'https://buy.stripe.com/dRmeVcgXZ3Xx3CDgGGeIw0e',
};

export function getStripePaymentLink(tier: StripePaymentLinkTier): string {
  return STRIPE_PAYMENT_LINKS[tier];
}