/**
 * AdSense ad unit slot IDs.
 *
 * PLACEHOLDERS — replace with the real slot IDs Arnel gets from the
 * AdSense UI after approval. Each slot ID is an integer AdSense
 * generates per ad unit (display, in-article, in-feed). They're set
 * in the AdSense UI under Ads → By ad unit.
 *
 * Format per AdSense docs:
 *   data-ad-slot="1234567890"
 *
 * Until approval, the AdSlot component will receive these placeholders.
 * Google's script loader will accept them silently and no ad will fill —
 * that's fine and harmless. Once Arnel pastes real IDs here, ads will
 * start serving. One edit, one PR, no code change needed elsewhere.
 *
 * If a slot ID is missing/empty, AdSlot returns null. That keeps the
 * code safe to ship before approval.
 */

export const ADSENSE_SLOTS = {
  /** Below-the-fold display ad on the homepage. */
  HOME_DISPLAY: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_DISPLAY ?? '',
  /** In-feed ad on directory index pages (/directory/rinks, /teams, /players, etc.). */
  DIRECTORY_INFEED: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY_INFEED ?? '',
  /** In-article ad on /blog/[slug] and /news/[slug]. */
  ARTICLE_INARTICLE: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_INARTICLE ?? '',
  /** Below-the-fold display ad on rink/team/player detail pages. */
  DETAIL_DISPLAY: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_DISPLAY ?? '',
} as const;

/** True if the AdSense publisher ID env var is set. */
export const ADSENSE_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID);