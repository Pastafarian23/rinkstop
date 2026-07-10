// src/app/profile/[slug]/passport/FederationSection.tsx
// RSC. Reads players.usa_hockey_number + hockey_canada_number.
// v1 is manual entry; federation API integration is post-v1.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type FederationRow = {
  id: string;
  name: string;
  country: string;
};

export async function FederationSection({
  playerId,
  isOwner,
}: {
  playerId: string;
  isOwner: boolean;
}) {
  const { data: player, error } = await supabaseAdmin
    .from('players')
    .select('usa_hockey_number, hockey_canada_number')
    .eq('id', playerId)
    .maybeSingle();

  // We need the federations table to render labels properly. v1: fetch just the two we know about.
  // Future: query federations table by country once federation table is populated.
  const federations: FederationRow[] = [
    { id: 'usa_hockey',     name: 'USA Hockey',     country: 'United States' },
    { id: 'hockey_canada',  name: 'Hockey Canada',  country: 'Canada' },
  ];

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

  const hasAny =
    !!(player?.usa_hockey_number && player.usa_hockey_number.trim()) ||
    !!(player?.hockey_canada_number && player.hockey_canada_number.trim());

  if (!hasAny) {
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
        {federations.map((f) => {
          const num =
            f.id === 'usa_hockey'
              ? player?.usa_hockey_number
              : player?.hockey_canada_number;
          if (!num || !num.trim()) return null;
          return (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: '#fff', margin: 0 }}>{f.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', margin: '0.125rem 0 0 0' }}>
                  {f.country} · Reg # <span style={{ fontFamily: 'monospace', color: '#FFB81C' }}>{num}</span>
                </p>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(0,150,80,0.18)',
                  color: '#009650',
                  whiteSpace: 'nowrap',
                }}
              >
                Self-reported
              </span>
            </div>
          );
        })}
      </div>
      {isOwner && (
        <p style={{ marginTop: '0.75rem' }}>
          <Link
            href="/dashboard/passport/federation"
            className="text-xs text-[#FFB81C] hover:text-[#FFB81C]/80"
            style={{ textDecoration: 'underline' }}
          >
            Edit federation numbers
          </Link>
        </p>
      )}
    </section>
  );
}