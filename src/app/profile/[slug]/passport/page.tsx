/**
 * src/app/profile/[slug]/passport/page.tsx
 *
 * Profile "Passport" tab destination. Three responsibilities:
 *
 *   1. If the user has a Hockey Passport, redirect to the public passport
 *      page at /passport/[passport_id]. We don't render a second copy of
 *      the document here — the public route is the single source of truth
 *      for the visual credential. This keeps a single page in the index
 *      and prevents canonical-content drift.
 *
 *   2. If the user has no passport (the common case), show the same
 *      upgrade CTA the profile overview uses, with a back-to-profile link.
 *      This is what fixes the "Passport tab goes to a 404" bug — the tab
 *      always resolves, even when there's nothing to display yet.
 *
 *   3. If the slug doesn't match a real user, 404. Same behavior as
 *      /profile/[slug].
 *
 * Created: 2026-10-03 (audit fix #5) — closes the 404 gap on the
 * profile Passport tab.
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { isPublicPassportLookupEnabled } from '@/lib/passport';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function getDirectAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export const dynamic = 'force-dynamic';

export default async function ProfilePassportTab({ params }: PageProps) {
  const { slug } = await params;
  const sb = getDirectAdminClient();
  if (!sb) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)' }}>
          Profile temporarily unavailable. Please try again.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link href={`/profile/${slug}`} style={{ color: '#FFB81C' }}>
            ← Back to profile
          </Link>
        </p>
      </div>
    );
  }

  // Look up user by username (or clerk id as fallback for owner views).
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const { data: user, error: userError } = await sb
    .from('users')
    .select('id, username, display_name')
    .eq(isUuid ? 'id' : 'username', slug)
    .maybeSingle();

  if (userError) {
    console.error('[profile-passport-tab] user lookup error:', userError);
  }
  if (!user) notFound();

  // Look up passport by internal_user_id (Clerk user id stored on the
  // passport row). Active/suspended/pending all have a row; deactivated
  // is the only "no row" case.
  const { data: passport, error: passportError } = await sb
    .from('passports')
    .select('passport_id, status')
    .eq('internal_user_id', user.id)
    .neq('status', 'deactivated')
    .maybeSingle();

  if (passportError) {
    console.error('[profile-passport-tab] passport lookup error:', passportError);
  }

  // If the user has a passport, send them to the public route. This keeps
  // the credential page single-sourced — no second copy in the index.
  if (passport?.passport_id && isPublicPassportLookupEnabled()) {
    redirect(`/passport/${passport.passport_id}`);
  }

  // No passport (or public lookup disabled). Show the upgrade CTA so the
  // tab still has something to display instead of a 404. The user can go
  // back to their profile to continue browsing.
  return (
    <section
      style={{
        maxWidth: 720,
        margin: '2rem auto',
        padding: '1.5rem',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        color: '#F8FAFC',
      }}
    >
      <p
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          letterSpacing: '0.16em',
          color: '#FFB81C',
          fontSize: 13,
          margin: 0,
        }}
      >
        Hockey Passport
      </p>
      <h2
        style={{
          fontSize: '1.5rem',
          margin: '0.25rem 0 0.75rem',
          color: '#fff',
          fontWeight: 700,
        }}
      >
        {user.display_name?.trim() || user.username} doesn&apos;t have a Hockey Passport yet
      </h2>
      <p
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          margin: '0 0 1rem',
        }}
      >
        A Hockey Passport is a verified, portable credential that travels with
        the player across teams, rinks, and leagues. It captures ID-verified
        status, federation affiliations, and a scannable check-in QR for every
        rink visit.
      </p>
      <p
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          margin: '0 0 1.25rem',
        }}
      >
        {user.display_name?.trim() || user.username} can claim their own
        Hockey Passport from their dashboard. This tab will start showing
        their public credential here once it&apos;s issued.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link
          href={`/profile/${user.username ?? slug}`}
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 8,
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          ← Back to profile
        </Link>
        <Link
          href="/learn/hockey-passport-guide"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#FFB81C',
            border: '1px solid #B45309',
            borderRadius: 8,
            color: '#041E42',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          Learn how a Hockey Passport works →
        </Link>
      </div>
    </section>
  );
}
