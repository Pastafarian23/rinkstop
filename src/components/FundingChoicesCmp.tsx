'use client';

/**
 * FundingChoicesCmp — Google-certified TCF v2.3 CMP loader + consent bridge.
 *
 * Loads Google's Privacy & Messaging API (formerly Funding Choices) script.
 * The script is TCF v2.3-certified by default — required by AdSense for
 * personalized ad serving to EU/UK users.
 *
 * Behavior:
 * - Loads `https://fundingchoicesmessages.google.com/i/pub-{ID}?ers=1`
 *   (the `ers=1` param enables EU/UK redirect handling).
 * - Sets `window.adsbygoogle.pauseAdRequests = 1` BEFORE the adsbygoogle
 *   script loads, so AdSense never receives a premature "no consent"
 *   state. PR2's <Script strategy="afterInteractive"> will pick up the
 *   paused state and wait for consent to flip before filling ads.
 * - Subscribes to TCF API events (`__tcfapi('addEventListener', ...)`)
 *   and mirrors consent state into our localStorage cookie so AdSlot
 *   (PR2) can react. This is the bridge between Google's CMP and our
 *   first-party consent key.
 * - Falls back to silence if `window.__tcfapi` isn't available — the
 *   existing CookieConsent banner still handles consent via its own
 *   Accept/Decline buttons in that case.
 *
 * NOTE: The Funding Choices publisher ID is the same as our AdSense ID
 * (pub-3703811522107586). Arnel pastes the env var on Vercel after
 * AdSense approval; until then this component returns null.
 */

import Script from 'next/script';
import { useEffect } from 'react';
import type { TcfTcData } from '@/lib/adsense';

const CONSENT_KEY = 'cookie_consent';
const CONSENT_EVENT = 'rinkstop:consent-changed';

function setConsent(value: 'accepted' | 'declined') {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

/** True if purpose 1 (store/access info on device) is consented under TCF. */
function hasPurpose1Consent(tcData: TcfTcData | null | undefined): boolean {
  return Boolean(tcData?.purpose?.consents?.['1'] === true);
}

export default function FundingChoicesCmp() {
  const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;

  // Pause AdSense ad requests until consent is known. Must run before
  // adsbygoogle.js executes. next/script strategy="afterInteractive"
  // for adsbygoogle runs on main thread; this useEffect runs in the
  // same tick on first paint, well before afterInteractive fires.
  useEffect(() => {
    if (!publisherId) return;
    const g = (window.adsbygoogle = window.adsbygoogle || []);
    if (typeof g.pauseAdRequests !== 'number') {
      g.pauseAdRequests = 1;
    }
  }, [publisherId]);

  // Subscribe to TCF events once the CMP API is available.
  useEffect(() => {
    if (!publisherId) return;
    if (typeof window.__tcfapi !== 'function') return;

    const handler = (raw: unknown, success: boolean) => {
      if (!success) return;
      const tcData = raw as TcfTcData | null;
      if (!tcData) return;
      if (tcData.eventStatus === 'useractioncomplete' || tcData.eventStatus === 'tcloaded') {
        const g = (window.adsbygoogle = window.adsbygoogle || []);
        if (hasPurpose1Consent(tcData)) {
          // User accepted at least purpose 1 → flip AdSense on
          setConsent('accepted');
          if (g.pauseAdRequests === 1) g.pauseAdRequests = 0;
        } else {
          // User declined → keep paused
          setConsent('declined');
          if (g.pauseAdRequests !== 1) g.pauseAdRequests = 1;
        }
      }
    };

    try {
      window.__tcfapi('addEventListener', 2, handler);
    } catch (err) {
      console.warn('[FundingChoicesCmp] __tcfapi addEventListener failed', err);
    }
  }, [publisherId]);

  if (!publisherId) return null;

  return (
    <>
      {/* Google Privacy & Messaging API (CMP). TCF v2.3 certified.
          The `ers=1` param enables EU/UK redirect handling. Loaded
          BEFORE adsbygoogle so the CMP can gate the ad script. */}
      <Script
        id="funding-choices-cmp"
        strategy="beforeInteractive"
        src={`https://fundingchoicesmessages.google.com/i/${publisherId}?ers=1`}
      />
      {/* `googlefcPresent` iframe — Funding Choices looks for this to
          detect whether the publisher's site has loaded. Without it,
          FC sometimes won't render its UI. Standard boilerplate per
          Google's Privacy & Messaging API docs. */}
      <Script
        id="googlefc-present"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `function signalGooglefcPresent(){if(!window.frames['googlefcPresent']){if(document.body){const iframe=document.createElement('iframe');iframe.style='width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px;display:none';iframe.name='googlefcPresent';document.body.appendChild(iframe)}else{setTimeout(signalGooglefcPresent,0)}}}signalGooglefcPresent()`,
        }}
      />
    </>
  );
}