'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PassportShareBarProps {
  /** The full URL to share, e.g. "https://rinkstop.com/passport/RS1-PHASE4PLAYER01" */
  url: string;
  /** Display name of the holder, used in pre-filled share text */
  holderName: string;
  /** Passport ID, used in pre-filled share text */
  passportId: string;
}

/**
 * ShareBar — passport shareability surface. Single row of share actions:
 *
 *   [ Share on X ]  [ Share on LinkedIn ]  [ Copy link ]
 *
 * Why this exists:
 *   The Hockey Passport is the most distinctive thing RinkStop produces.
 *   A holder who feels proud of their passport is the single best free
 *   distribution channel we have. Every shared link routes a new visitor
 *   through /passport/[id] which surfaces:
 *     1. The premium document aesthetic (sell-by-showing)
 *     2. The challenge progress (creates FOMO for non-holders)
 *     3. The owner-only upgrade CTA (when viewed signed-in by the owner)
 *
 * X.com intent: pre-fills a tweet with the holder's name + passport ID.
 * LinkedIn intent: same for professional networks (hockey coaches share
 *   their players' passports).
 * Copy link: navigator.clipboard.writeText + ephemeral toast confirmation.
 *
 * All three actions open in a new tab (X.com, LinkedIn) or stay on page
 * (Copy). Safe to render for any visitor — no personal data leaks because
 * the share URLs only contain the holder name (already public on the page).
 */
export default function PassportShareBar({ url, holderName, passportId }: PassportShareBarProps) {
  const [copied, setCopied] = useState(false);

  // Pre-filled tweet text. URL must be appended manually because intent URLs
  // truncate URLs in their preview.
  const tweetText = encodeURIComponent(
    `Just verified my Hockey Passport on @rinkstopnews — ${passportId}. The official credential for hockey players worldwide. 🏒\n\n`,
  );
  const tweetUrl = encodeURIComponent(url);

  // LinkedIn sharing. LinkedIn's share-intent endpoint is unofficial and
  // limited, but it works for the basic case.
  const liText = encodeURIComponent(
    `${holderName} — verified Hockey Passport on RinkStop (${passportId}).`,
  );

  async function handleCopy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers / non-https: create a textarea.
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      // Auto-dismiss after 2.5s
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Silent fail — user can still right-click copy.
    }
  }

  const baseBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '0.55rem 1rem',
    borderRadius: 8,
    fontSize: '0.8125rem',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s, background 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      data-passport-share-bar
      aria-label="Share this passport"
      style={{
        marginTop: 16,
        padding: '14px 16px',
        background: 'rgba(255,184,28,0.04)',
        border: '1px solid rgba(255,184,28,0.18)',
        borderRadius: 10,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.18em',
          color: '#FFB81C',
          textTransform: 'uppercase',
          marginRight: 4,
        }}
      >
        Share
      </span>

      <a
        href={`https://twitter.com/intent/tweet?text=${tweetText}${tweetUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        data-share="x"
        aria-label="Share on X (formerly Twitter)"
        style={{
          ...baseBtn,
          background: '#000',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden focusable="false" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span>Share on X</span>
      </a>

      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${tweetUrl}&summary=${liText}`}
        target="_blank"
        rel="noopener noreferrer"
        data-share="linkedin"
        aria-label="Share on LinkedIn"
        style={{
          ...baseBtn,
          background: '#0A66C2',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden focusable="false" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.06 2.06 0 0 1-2.23-2.064 2.061 2.061 0 1 1 4.13 0 2.061 2.061 0 0 1-1.9 2.064zM3.43 20.452h3.83V9H3.43zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
        </svg>
        <span>Share on LinkedIn</span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        data-share="copy"
        aria-label="Copy passport URL to clipboard"
        style={{
          ...baseBtn,
          background: copied ? 'rgba(20,184,166,0.18)' : 'rgba(255,255,255,0.05)',
          color: copied ? '#14B8A6' : 'rgba(255,255,255,0.85)',
          border: copied ? '1px solid rgba(20,184,166,0.5)' : '1px solid rgba(255,255,255,0.18)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {copied ? (
            <path d="M20 6L9 17l-5-5"/>
          ) : (
            <>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </>
          )}
        </svg>
        <span>{copied ? 'Copied!' : 'Copy link'}</span>
      </button>
    </div>
  );
}