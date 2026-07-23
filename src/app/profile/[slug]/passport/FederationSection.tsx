// src/app/profile/[slug]/passport/FederationSection.tsx
// RSC. Reads from public.federation_registrations for this player.
//
// Tier 2 (2026-07-23): only APPROVED registrations are surfaced on the public
// passport. Pending + rejected stay private. Drafts are owner-only and never
// public. federation API integration is post-v1.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type ApprovedRegistration = {
  registration_number: string;
  verified_at: string | null;
  federation: { slug: string; name: string } | null;
};

export async function FederationSection({
  playerId,
  isOwner,
}: {
  playerId: string;
  isOwner: boolean;
}) {
  const { data: rows, error } = await supabaseAdmin
    .from('federation_registrations')
    .select('registration_number, verified_at, federation:federations(slug, name)')
    .eq('player_id', playerId)
    .eq('submission_status', 'approved');

  const approved: ApprovedRegistration[] = (rows ?? []).map((r: any) => ({
    registration_number: r.registration_number,
    verified_at: r.verified_at,
    federation: Array.isArray(r.federation) && r.federation.length > 0 ? r.federation[0] : null,
  })).filter((r) => r.federation);

  const sectionStyle = {
    padding: '1.25rem 1.5rem 1.5rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  } as const;

  const headingStyle = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.75rem',
  };

  if (error) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Federation</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Unable to load federation data right now.</p>
      </section>
    );
  }

  if (approved.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Federation</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          No federation registration recorded yet.
        </p>
        {isOwner && (
          <Link
            href="/dashboard/passport/federation"
            className="text-sm text-[#FFB81C] hover:text-[#FFB81C]/80"
            style={{ textDecoration: 'underline' }}
          >
            Add your federation number →
          </Link>
        )}
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Federation</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {approved.map((r, idx) => (
          <div
            key={`${r.federation!.slug}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              background: 'rgba(0,150,80,0.08)',
              border: '1px solid rgba(0,150,80,0.25)',
              borderRadius: 6,
              fontSize: '0.875rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{r.federation!.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                {r.registration_number}
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#009650', fontWeight: 700, textTransform: 'uppercase' }}>
              ✓ Verified
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
