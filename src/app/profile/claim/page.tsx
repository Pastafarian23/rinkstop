/**
 * /profile/claim — invite-gated federation claim.
 *
 * Context (Arnel, 2026-10-29 18:07 CDT): "It shouldn't be a public facing
 * button to claim easily. I will send the invite link to profile/claim to
 * vetted contacts."
 *
 * So this page has NO public entry point:
 *   - no token  → hard 404 (not a soft "please log in" — the page does not
 *     exist for the public)
 *   - token + not signed in → shows what they were invited to, and sends them
 *     to sign in/up with the token preserved in the redirect
 *   - token + signed in → validates the token against their email, redeems
 *     it, and creates a PENDING federation claim for Arnel to approve
 *
 * The token IS the credential: 32 bytes of base64url entropy, single-use by
 * default, expiring, revocable, and bound to a specific email address.
 */

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import {
  getInviteByToken,
  redeemInvite,
  FEDERATION_CLAIM_TYPE,
} from '@/lib/federation-ownership';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Federation claim',
  robots: { index: false, follow: false },
};

const cardStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: '3rem auto',
  padding: '2rem',
  background: '#0f0f0f',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  color: '#fff',
  fontFamily: 'inherit',
};

const h1Style: React.CSSProperties = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '2rem',
  letterSpacing: '0.05em',
  margin: '0 0 0.5rem',
  color: '#fff',
};

const mutedStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.62)',
  fontSize: '0.95rem',
  lineHeight: 1.6,
};

export default async function FederationClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp?.token || '').trim();

  // No token → the page does not exist. Not a redirect, not a login wall.
  if (!token) notFound();

  const validation = await getInviteByToken(token);
  if (!validation.ok) {
    return (
      <main style={{ padding: '1rem' }}>
        <div style={cardStyle}>
          <h1 style={h1Style}>CLAIM LINK NOT VALID</h1>
          <p style={mutedStyle}>{validation.message}</p>
          <p style={{ ...mutedStyle, marginTop: '1.25rem' }}>
            <Link href="/" style={{ color: '#14B8A6' }}>← Back to RinkStop</Link>
          </p>
        </div>
      </main>
    );
  }

  const invite = validation.invite;

  // Resolve the signed-in user (if any).
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  const signedIn = Boolean(session.userId && userId);

  // --- Not signed in: show the invitation, send them to sign in ---
  if (!signedIn) {
    const redirectTo = `/profile/claim?token=${encodeURIComponent(token)}`;
    return (
      <main style={{ padding: '1rem' }}>
        <div style={cardStyle}>
          <div
            style={{
              display: 'inline-block',
              padding: '0.3rem 0.7rem',
              borderRadius: 999,
              background: 'rgba(56,189,248,0.12)',
              border: '1px solid rgba(56,189,248,0.32)',
              color: '#7DD3FC',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            Invitation
          </div>

          <h1 style={h1Style}>CLAIM YOUR FEDERATION LISTING</h1>

          <p style={{ ...mutedStyle, fontSize: '1.05rem' }}>
            You have been invited to manage the{' '}
            <strong style={{ color: '#fff' }}>{invite.federation_name}</strong> listing on
            RinkStop.
          </p>

          <ul
            style={{
              ...mutedStyle,
              margin: '1.25rem 0',
              paddingLeft: '1.25rem',
              listStyle: 'none',
            }}
          >
            {[
              'Update your federation name, logo, website and contact details',
              'Add and manage your member leagues and clubs',
              'See your member rinks, teams and leagues in one place',
            ].map((item) => (
              <li key={item} style={{ marginBottom: '0.55rem' }}>
                <span style={{ color: '#C8102E', marginRight: '0.5rem' }}>✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div
            style={{
              margin: '1.5rem 0',
              padding: '0.9rem 1.1rem',
              background: 'rgba(255,184,28,0.07)',
              border: '1px solid rgba(255,184,28,0.28)',
              borderRadius: 8,
              fontSize: '0.88rem',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.55,
            }}
          >
            This invitation was sent to <strong style={{ color: '#FFB81C' }}>{invite.email}</strong>.
            Please sign in (or create an account) with that exact email address.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href={`/login?redirect_url=${encodeURIComponent(redirectTo)}`}
              style={{
                display: 'inline-block',
                padding: '0.7rem 1.25rem',
                background: '#C8102E',
                color: '#fff',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              Sign in to claim
            </Link>
            <Link
              href={`/sign-up?redirect_url=${encodeURIComponent(redirectTo)}`}
              style={{
                display: 'inline-block',
                padding: '0.7rem 1.25rem',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              Create an account
            </Link>
          </div>

          <p style={{ ...mutedStyle, fontSize: '0.8rem', marginTop: '1.5rem' }}>
            This link expires {new Date(invite.expires_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            . If it stops working, reply to the email it came from and we will send a new one.
          </p>
        </div>
      </main>
    );
  }

  // --- Signed in: check whether they already have a pending/approved claim ---
  const { data: existingClaims } = await supabaseAdmin
    .from('claims')
    .select('id, status, entity_name, entity_id, created_at')
    .eq('user_id', userId)
    .eq('claim_type', FEDERATION_CLAIM_TYPE)
    .eq('entity_id', invite.federation_id)
    .order('created_at', { ascending: false })
    .limit(1);

  const existing = existingClaims?.[0];
  if (existing && existing.status === 'pending') {
    return (
      <main style={{ padding: '1rem' }}>
        <div style={cardStyle}>
          <h1 style={h1Style}>CLAIM SUBMITTED</h1>
          <p style={mutedStyle}>
            Your claim to manage <strong style={{ color: '#fff' }}>{invite.federation_name}</strong>{' '}
            is in our review queue. We will approve it shortly and email you when it is live.
          </p>
          <p style={{ ...mutedStyle, marginTop: '1.25rem' }}>
            <Link href="/dashboard" style={{ color: '#14B8A6' }}>← Go to your dashboard</Link>
          </p>
        </div>
      </main>
    );
  }
  if (existing && existing.status === 'approved') {
    redirect(`/dashboard/federation/${invite.federation_slug}`);
  }

  // --- Email binding check before we consume anything ---
  const inviteEmail = (invite.email || '').trim().toLowerCase();
  const signedInEmail = (userEmail || '').trim().toLowerCase();
  if (signedInEmail !== inviteEmail) {
    return (
      <main style={{ padding: '1rem' }}>
        <div style={cardStyle}>
          <h1 style={h1Style}>WRONG ACCOUNT</h1>
          <p style={mutedStyle}>
            This invitation was sent to{' '}
            <strong style={{ color: '#FFB81C' }}>{invite.email}</strong>, but you are signed in as{' '}
            <strong style={{ color: '#fff' }}>{signedInEmail || '(no email on file)'}</strong>.
          </p>
          <p style={{ ...mutedStyle, marginTop: '1rem' }}>
            Sign out and sign back in with the address the invitation was sent to.
          </p>
          <p style={{ ...mutedStyle, marginTop: '1.25rem' }}>
            <Link href="/" style={{ color: '#14B8A6' }}>← Back to RinkStop</Link>
          </p>
        </div>
      </main>
    );
  }

  // --- Redeem the invite (atomic check-and-consume) ---
  const redeemed = await redeemInvite(token, signedInEmail, userId);
  if (!redeemed.ok) {
    return (
      <main style={{ padding: '1rem' }}>
        <div style={cardStyle}>
          <h1 style={h1Style}>CLAIM LINK NOT VALID</h1>
          <p style={mutedStyle}>{redeemed.message}</p>
          <p style={{ ...mutedStyle, marginTop: '1.25rem' }}>
            <Link href="/" style={{ color: '#14B8A6' }}>← Back to RinkStop</Link>
          </p>
        </div>
      </main>
    );
  }

  // --- Create the pending claim ---
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from('claims')
    .insert({
      user_id: userId,
      claim_type: FEDERATION_CLAIM_TYPE,
      entity_name: invite.federation_name,
      entity_id: invite.federation_id,
      reason: `Invitation accepted by ${invite.email}${invite.contact_name ? ` (${invite.contact_name})` : ''}.${invite.note ? ` Note: ${invite.note}` : ''}`,
      proof: `federation_claim_invite:${invite.id}`,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single();

  if (claimErr) {
    console.error('[profile/claim] claim insert failed:', claimErr);
    return (
      <main style={{ padding: '1rem' }}>
        <div style={cardStyle}>
          <h1 style={h1Style}>SOMETHING WENT WRONG</h1>
          <p style={mutedStyle}>
            We could not submit your claim. Please reply to the email this invitation came from
            and we will fix it.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '1rem' }}>
      <div style={cardStyle}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.3rem 0.7rem',
            borderRadius: 999,
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.32)',
            color: '#4ADE80',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          Received
        </div>

        <h1 style={h1Style}>CLAIM SUBMITTED</h1>

        <p style={{ ...mutedStyle, fontSize: '1.05rem' }}>
          Your request to manage{' '}
          <strong style={{ color: '#fff' }}>{invite.federation_name}</strong> is in our review
          queue. We will approve it and email you as soon as it is live — usually the same day.
        </p>

        <p style={{ ...mutedStyle, marginTop: '1.5rem' }}>
          <Link href="/dashboard" style={{ color: '#14B8A6' }}>
            ← Go to your dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
