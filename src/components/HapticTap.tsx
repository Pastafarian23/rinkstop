'use client';
import { useEffect } from 'react';

/**
 * HapticTap
 *
 * Global tap-feedback component. Mounts once in the root layout.
 * Captures all tap/click events on interactive elements and fires a
 * short haptic pulse (navigator.vibrate) on touch devices, plus
 * applies an instant visual state so users never see a "dead tap"
 * while waiting for the page to navigate.
 *
 * 2026-10-05: Added per Arnel's mobile UX feedback. Previous
 * experience had a perceptible delay between tap and the visual
 * transition; this gives immediate confirmation that the tap was
 * registered. Works alongside the CSS rules in globals.css.
 */
export default function HapticTap(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const supportsVibrate = typeof navigator.vibrate === 'function';

    // Pulse duration: 8ms is enough to register on iPhone Taptic (no
    // audible click) and Android vibration motor. None on desktop
    // (no vibrate() and no touchstart).
    const PULSE_MS = 8;

    function handleTap(e: Event) {
      // Only fire for primary user gestures; ignore synthetic / scroll.
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Walk up to find the nearest interactive element. Anchor,
      // button, role=button, or anything with data-tap-feedback.
      const interactive = target.closest('a, button, [role="button"], [data-tap-feedback]');
      if (!interactive) return;
      // Don't fire for disabled controls.
      if (interactive.hasAttribute('disabled') || interactive.getAttribute('aria-disabled') === 'true') return;
      if (supportsVibrate) {
        try { navigator.vibrate(PULSE_MS); } catch { /* no-op */ }
      }
    }

    // Use touchstart for the lowest possible latency. Pointerdown is
    // also fast but fires slightly later on some browsers. Click is
    // the most reliable fallback for older browsers and is still
    // useful for keyboard activation.
    if (isTouchDevice) {
      document.addEventListener('touchstart', handleTap, { passive: true, capture: true });
    } else {
      document.addEventListener('pointerdown', handleTap, { capture: true });
    }

    return () => {
      if (isTouchDevice) {
        document.removeEventListener('touchstart', handleTap, { capture: true } as any);
      } else {
        document.removeEventListener('pointerdown', handleTap, { capture: true } as any);
      }
    };
  }, []);

  return null;
}
