'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type NudgeAction = 'follow' | 'save' | 'message';

export type NudgeEntityType = 'rink' | 'team' | 'player' | 'league' | 'business' | 'user';

interface SaveFollowNudgeProps {
  /** Which action triggered the nudge. Drives the copy and CTAs. */
  action: NudgeAction;
  /** Entity type — for copy ("this rink" / "this team") and analytics. */
  entityType: NudgeEntityType;
  /** Entity id — for the signup redirect and analytics. */
  entityId: string;
  /** Human-readable entity name — appears in the modal headline. */
  entityName: string;
  /** Recipient name for the Message action (operator / person). */
  messageRecipientName?: string;
  /** Current page path — for the post-signup redirect. */
  currentPath: string;
  /** Whether the modal is open. Parent controls visibility. */
  open: boolean;
  /** Close handler. */
  onClose: () => void;
}

const DISMISS_KEY_PREFIX = 'rinkstop_nudge_dismissed_v1:';
const DISMISS_DAYS = 7;

/**
 * SaveFollowNudge — soft-signup modal that fires when a not-signed-in user
 * tries to Follow, Save, or Message on a directory detail page.
 *
 * Replaces the old behavior of redirecting directly to /login, which lost
 * ~95% of intent. This modal acknowledges the user's intent, explains the
 * value of a free account, and offers a one-click path to signup.
 *
 * The dismiss button writes a timestamped key to localStorage scoped per
 * (action, entityType) so we don't spam a user who already said "no" 30
 * seconds ago, but we DO re-show after 7 days.
 */
export default function SaveFollowNudge({
  action,
  entityType,
  entityId,
  entityName,
  messageRecipientName,
  currentPath,
  open,
  onClose,
}: SaveFollowNudgeProps) {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = getNudgeCopy(action, entityType, entityName, messageRecipientName);
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(currentPath)}`;
  const signInHref = `/login?redirect_url=${encodeURIComponent(currentPath)}`;

  function handleDismiss() {
    try {
      const key = `${DISMISS_KEY_PREFIX}${action}:${entityType}`;
      localStorage.setItem(key, Date.now().toString());
    } catch { /* localStorage blocked — fine, just dismiss for this session */ }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nudge-title"
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: '#0B1622',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '1.75rem',
        maxWidth: 440, width: '100%',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <button
          type="button" onClick={handleDismiss}
          aria-label="Close"
          style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >×</button>

        <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>{copy.icon}</div>

        <h2 id="nudge-title" style={{
          color: '#fff', fontSize: '1.25rem', fontWeight: 700,
          margin: 0, lineHeight: 1.3,
        }}>
          {copy.headline}
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem',
          lineHeight: 1.5, margin: '0.75rem 0 1.25rem',
        }}>
          {copy.body}
        </p>

        <ul style={{
          listStyle: 'none', padding: 0, margin: '0 0 1.5rem',
          color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem',
        }}>
          {copy.bullets.map((b, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              marginBottom: 6, lineHeight: 1.4,
            }}>
              <span style={{ color: '#14B8A6', fontWeight: 700, marginTop: 1 }}>✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link
            href={signUpHref}
            onClick={handleDismiss}
            style={{
              display: 'block', textAlign: 'center',
              padding: '0.75rem 1rem', borderRadius: 8,
              background: '#C8102E', color: '#fff',
              fontWeight: 700, fontSize: '0.95rem',
              textDecoration: 'none', transition: 'background 0.15s',
            }}
          >
            {copy.cta}
          </Link>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Already have an account?</span>
            <Link
              href={signInHref}
              onClick={handleDismiss}
              style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Check whether the user has dismissed this (action, entityType) combo
 * within the last 7 days. Used by the parent to skip showing the modal.
 */
export function isNudgeDismissed(action: NudgeAction, entityType: NudgeEntityType): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = `${DISMISS_KEY_PREFIX}${action}:${entityType}`;
    const v = localStorage.getItem(key);
    if (!v) return false;
    const ts = parseInt(v, 10);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

interface NudgeCopy {
  icon: string;
  headline: string;
  body: string;
  bullets: string[];
  cta: string;
}

function getNudgeCopy(
  action: NudgeAction,
  entityType: NudgeEntityType,
  entityName: string,
  messageRecipientName?: string,
): NudgeCopy {
  const shortName = entityName.length > 30 ? entityName.slice(0, 30) + '…' : entityName;

  if (action === 'save') {
    return {
      icon: '♡',
      headline: `Save ${shortName} to your favorites`,
      body: `Get notified when ${shortName} has new games, schedule changes, or updates from the operator.`,
      bullets: [
        'New-game alerts in your inbox',
        'One dashboard for every rink/team/player you follow',
        'Works on any device, always free',
      ],
      cta: 'Create free account',
    };
  }

  if (action === 'message') {
    return {
      icon: '✉',
      headline: `Message ${messageRecipientName || 'the operator'}`,
      body: `Send a direct message to ${messageRecipientName || 'the operator of ' + shortName}. RinkStop handles the connection and threading.`,
      bullets: [
        'Direct line to the person who runs this rink',
        'No email address required to start',
        'Your message history is saved to your account',
      ],
      cta: 'Create free account',
    };
  }

  // follow
  return {
    icon: '+',
    headline: `Follow ${shortName}`,
    body: `Get a weekly digest of ${shortName}'s games, results, and posts. No spam, unsubscribe anytime.`,
    bullets: [
      `Weekly recap of ${shortName}'s games`,
      'New articles and announcements',
      'Cancellations and reschedule alerts',
    ],
    cta: 'Create free account',
  };
}
