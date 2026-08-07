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

/** window.adsbygoogle: an array you can push to, plus Google's pauseAdRequests flag.
 *  Push accepts any object (AdSense just reads known keys). */
export interface AdsbygoogleQueue extends Array<Record<string, unknown>> {
  pauseAdRequests?: number;
}

declare global {
  interface Window {
    adsbygoogle?: AdsbygoogleQueue;
    /** Google Funding Choices / TCF v2 API. Available after the CMP loads. */
    __tcfapi?: (
      command: 'addEventListener' | 'removeEventListener' | 'getTCData' | 'getVendorList' | 'ping',
      version: number,
      callback: (tcData: unknown, success: boolean) => void,
      parameter?: number | string
    ) => void;
  }
}

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

/** Hardcoded publisher ID — the env var is dead since Arnel deleted the AdSense
 *  connection in 2026-08. The publisher ID is no longer a secret (Google
 *  distributes it in every pageview for verification). Hardcoded so the
 *  site renders ads regardless of env-var presence. */
export const ADSENSE_PUBLISHER_ID = 'ca-pub-3703811522107586';
export const ADSENSE_ENABLED = true;

/** Per-purpose TCF v2 consent record. */
export interface TcfPurposeConsents {
  consents?: Record<string, boolean>;
  legitimateInterests?: Record<string, boolean>;
}

export interface TcfTcData {
  eventStatus?: 'tcloaded' | 'cmpuishown' | 'useractioncomplete' | 'error';
  tcString?: string;
  purpose?: TcfPurposeConsents;
  isEUBound?: boolean;
}