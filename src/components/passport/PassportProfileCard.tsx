/**
 * src/components/passport/PassportProfileCard.tsx
 *
 * Inline passport card surfaced on /profile/[slug].
 *
 * Per Arnel directive 2026-09-30 (memory/2026-09-30-passport-monetization.md):
 *   - Step 3 — Surface the passport as the visual centerpiece of the profile.
 *   - Free users see "Get Your Hockey Passport" CTA in this slot.
 *   - Paid users see their actual Passport card (compact version, links to full).
 *
 * RSC. Reads from supabaseAdmin. Returns null if the user has no passport
 * AND the visitor is the owner viewing their free profile (handled by
 * showCta prop instead).
 */

import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { STRIPE_PAYMENT_LINKS } from '@/lib/stripe-payment-links';

const PASSPORT_GOLD = '#FFB81C';
const PASSPORT_NAVY = '#0B1E3F';

interface PassportProfileCardProps {
  /** The profile user being viewed (NOT the caller). */
  profileUserId: string;
  /** Caller's user_id — determines whether to show upgrade CTA. */
  viewerUserId: string | null;
  /** Viewer's tier — 'free' shows CTA, 'verified_identity'+ hides it. */
  viewerTier: string | null;
  /** Owner's username — used to build /profile/{username} link. */
  profileUsername: string | null;
}

interface PassportRow {
  passport_id: string;
  status: string;
  verification_level: string;
  issued_at: string | null;
}

interface HolderProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export default async function PassportProfileCard({
  profileUserId,
  viewerUserId,
  viewerTier,
  profileUsername,
}: PassportProfileCardProps) {
  const isOwner = viewerUserId === profileUserId;

  // Fetch passport row + holder profile in parallel.
  const [passportRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from('passports')
      .select('passport_id, status, verification_level, issued_at')
      .eq('internal_user_id', profileUserId)
      .maybeSingle(),
    supabaseAdmin
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', profileUserId)
      .maybeSingle(),
  ]);

  const passport = passportRes.data as PassportRow | null;
  const profile = profileRes.data as HolderProfile | null;

  // ── CASE 1: User HAS a passport. Show the card.
  if (passport && (passport.status === 'active' || passport.status === 'pending')) {
    const passportUrl = `/passport/${passport.passport_id}`;
    const isActive = passport.status === 'active';
    const isVerified = passport.verification_level === 'id_verified' || passport.verification_level === 'federation_verified';

    return (
      <section
        data-passport-profile-card
        data-passport-status={passport.status}
        data-passport-verification={passport.verification_level}
        aria-label="Hockey Passport"
        style={{
          background: `linear-gradient(160deg, ${PASSPORT_NAVY} 0%, #08152E 100%)`,
          border: `1px solid rgba(255,184,28,0.4)`,
          borderRadius: 14,
          padding: '16px 18px',
          color: '#F8FAFC',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,184,28,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Gold seal */}
          <div
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, #FFD66B 0%, ${PASSPORT_GOLD} 60%, #B45309 100%)`,
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: '#0B1E3F',
              letterSpacing: '0.05em',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
            }}
          >
            RS
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 12,
                letterSpacing: '0.18em',
                color: PASSPORT_GOLD,
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Hockey Passport
            </p>
            <p
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                fontSize: 14,
                fontWeight: 700,
                color: PASSPORT_GOLD,
                margin: '4px 0 0',
                letterSpacing: '0.06em',
              }}
            >
              {passport.passport_id}
            </p>
            <p
              style={{
                fontSize: 12,
                color: isActive ? '#86EFAC' : 'rgba(255,255,255,0.55)',
                margin: '4px 0 0',
                fontWeight: 600,
              }}
            >
              {isActive ? (isVerified ? '✓ ID Verified · Active' : 'Active') : 'Pending activation'}
            </p>
          </div>
          <Link
            href={passportUrl}
            data-passport-view-link
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: PASSPORT_GOLD,
              textDecoration: 'none',
              border: `1px solid ${PASSPORT_GOLD}`,
              borderRadius: 8,
              padding: '8px 14px',
              background: 'rgba(255,184,28,0.08)',
              flexShrink: 0,
            }}
          >
            View Passport →
          </Link>
        </div>
      </section>
    );
  }

  // ── CASE 2: User does NOT have a passport AND viewer is the owner.
  //            Show CTA (only when the viewer is the owner, so visitors don't see ads).
  if (isOwner && (!viewerTier || viewerTier === 'free')) {
    return (
      <section
        data-passport-profile-cta
        aria-label="Get your Hockey Passport"
        style={{
          background: 'linear-gradient(160deg, #0B1E3F 0%, #08152E 100%)',
          border: '1px solid rgba(255,184,28,0.4)',
          borderRadius: 14,
          padding: '18px 20px',
          color: '#F8FAFC',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, #FFD66B 0%, ${PASSPORT_GOLD} 60%, #B45309 100%)`,
              border: '2px dashed rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: '#0B1E3F',
              letterSpacing: '0.05em',
              flexShrink: 0,
              opacity: 0.75,
            }}
          >
            RS
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 13,
                letterSpacing: '0.16em',
                color: PASSPORT_GOLD,
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Get Your Hockey Passport
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.65)',
                margin: '6px 0 0',
                lineHeight: 1.45,
              }}
            >
              Every rink you've played in, stamped. Every league circuit you finish, a shareable badge.
            </p>
          </div>
          <a
            href={STRIPE_PAYMENT_LINKS.verified_identity}
            rel="noopener"
            data-passport-upgrade-cta
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#0B1E3F',
              textDecoration: 'none',
              background: PASSPORT_GOLD,
              borderRadius: 8,
              padding: '10px 16px',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(255,184,28,0.4)',
            }}
          >
            $24.99/yr →
          </a>
        </div>
      </section>
    );
  }

  // ── CASE 3: User has no passport AND viewer is not the owner.
  //            Don't show anything (don't advertise to other visitors).
  return null;
}