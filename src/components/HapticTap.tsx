'use client';
import { useEffect, useRef } from 'react';

/**
 * HapticTap
 *
 * Global tap-feedback component. Mounts once in the root layout.
 * Captures all tap/click events on interactive elements and fires a
 * short haptic pulse, plus applies an instant visual state so users
 * never see a "dead tap" while waiting for the page to navigate.
 *
 * Platforms:
 * - Android Chrome: navigator.vibrate (8ms pulse, instant feedback)
 * - iOS Safari: navigator.vibrate is NOT available. Falls back to
 *   a Web Audio API "click" tone (~10ms, 18kHz, inaudible to most
 *   adults but registered by the iPhone Taptic Engine when the
 *   page is in foreground).
 * - All other touch devices: Web Audio fallback.
 * - Desktop / no touch: CSS-only feedback (scale on :active).
 *
 * 2026-10-12: per Arnel's mobile UX feedback. Previous experience
 * had a perceptible delay between tap and the visual transition; this
 * gives immediate confirmation that the tap was registered. Works
 * alongside the CSS rules in globals.css (tap-feedback class).
 */

// Lazily create a single AudioContext for the lifetime of the page.
// iOS Safari allows AudioContext to "unlock" only after a user gesture;
// first tap may not produce audio, but subsequent taps will.
function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as any;
  const Ctx = W.AudioContext || W.webkitAudioContext;
  if (!Ctx) return null;
  try {
    return new Ctx();
  } catch {
    return null;
  }
}

function playTone(ctx: AudioContext | null): void {
  if (!ctx) return;
  // Resume the context if it was suspended (autoplay policy).
  if (ctx.state === 'suspended') {
    try { void ctx.resume(); } catch { /* no-op */ }
  }
  // Build a very short tone: 18kHz sine, 10ms, 0.06 gain. Outside most
  // adult hearing range (16kHz+), short enough to not be audible, but
  // long enough to trigger iOS Taptic Engine when the audio is routed
  // through the device speaker/headphone.
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 18000;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.01);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.012);
  } catch {
    // Some browsers throw if AudioContext is in a bad state; fail silent.
  }
}

export default function HapticTap(): null {
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const supportsVibrate = typeof navigator.vibrate === 'function';
    if (isTouchDevice) audioRef.current = createAudioContext();

    // Pulse duration: 8ms is enough to register on Android vibration
    // motor. iOS Taptic Engine uses the audio fallback above.
    const PULSE_MS = 8;

    function handleTap(e: Event) {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('a, button, [role="button"], [data-tap-feedback]');
      if (!interactive) return;
      if (interactive.hasAttribute('disabled') || interactive.getAttribute('aria-disabled') === 'true') return;
      // Visual feedback class (instant, before navigation). CSS handles
      // the scale; the JS class triggers the transition immediately so
      // the user sees it even on the same tap.
      interactive.classList.add('is-tapped');
      window.setTimeout(() => interactive.classList.remove('is-tapped'), 180);
      // Haptic
      if (supportsVibrate) {
        try { navigator.vibrate(PULSE_MS); } catch { /* no-op */ }
      } else {
        // iOS / WebKit fallback: inaudible tone. This is what triggers
        // the Taptic Engine on iPhone when the page is foregrounded.
        playTone(audioRef.current);
      }
    }

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
