/**
 * Shared reader for the first-party cookie-consent choice.
 *
 * The source of truth is `localStorage.cookie_consent` — see
 * src/components/ConsentBanner.tsx. Multiple surfaces need to READ it to
 * decide whether to compete with the banner for the visitor's attention:
 *
 *   - ConsentBanner       — shows the banner
 *   - FoundersClubPopup   — must NOT open a full-screen promo modal over it
 *   - UpgradeNudgePopup   — must NOT open a full-screen modal over it
 *
 * Reading it in three places independently is how the stacking bug happened:
 * the promo modal never consulted the consent state at all, so both fired on
 * the same first visit.
 */

export type ConsentValue = 'accepted' | 'declined';

export const CONSENT_STORAGE_KEY = 'cookie_consent';

/**
 * Fired on `window` when the visitor answers the consent prompt.
 *
 * 2026-11-13 (growth sprint): surfaces that DEFER while consent is
 * pending (the promo modal, the upgrade modal, the IntentBanner) need to
 * know the moment the decision is made. Without this event they would
 * stay hidden until the next full page load — so a visitor who clicked
 * "Accept" would not see the signup banner until they navigated.
 */
export const CONSENT_DECIDED_EVENT = 'rinkstop:consent-decided';

/** Announce that a consent decision was recorded. Safe to call repeatedly. */
export function announceConsentDecision(value: ConsentValue): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_DECIDED_EVENT, { detail: value }));
  } catch {
    // CustomEvent unavailable — the listener will pick it up on next mount.
  }
}

/**
 * Returns the recorded consent choice, or null when the visitor has not
 * decided yet (or storage is unavailable).
 *
 * Returns null in private-mode / blocked-localStorage cases. Callers must
 * treat null as "consent pending" — that is the safe direction, because a
 * legal consent prompt outranks a promotional modal.
 */
export function readConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (v === 'accepted' || v === 'declined') return v;
    return null;
  } catch {
    // localStorage blocked (private mode, quota, etc.). Treat as
    // un-prompted so the visitor can still see the banner.
    return null;
  }
}

/**
 * True when the visitor has already made a consent choice (accepted or
 * declined). Both count — a decline is still a DECISION, and the consent
 * banner is gone either way.
 */
export function hasConsentDecision(): boolean {
  return readConsent() !== null;
}
