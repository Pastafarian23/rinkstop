// src/app/profile/[slug]/passport/EndorsementsSection.tsx
// RSC. Reads coach_endorsements where player_id = this player.
// Privacy: visibility = 'private' hidden from non-owner, 'sport_scoped' / 'cross_sport' visible to all.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const TYPE_LABELS: Record<string, string> = {
  skills: 'Skills',
  character: 'Character',
  leadership: 'Leadership',
  eligible_for_next_level: 'Eligible for next level',
  rec_ready: 'Recruitment ready',
  other: 'Other',
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  skills:                    { bg: 'rgba(0,150,80,0.18)',  color: '#009650' },
  character:                 { bg: 'rgba(255,184,28,0.18)', color: '#FFB81C' },
  leadership:                { bg: 'rgba(200,16,46,0.18)', color: '#FF6B7A' },
  eligible_for_next_level:   { bg: 'rgba(0,150,80,0.18)',  color: '#009650' },
  rec_ready:                 { bg: 'rgba(200,16,46,0.18)', color: '#FF6B7A' },
  other:                     { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' },
};

export async function EndorsementsSection({
  playerId,
  isOwner,
}: {
  playerId: string;
  isOwner: boolean;
}) {
  // Fetch active endorsements. RLS already enforces visibility rules:
  //   - public (sport_scoped / cross_sport) visible to all
  //   - private visible only to coach + player
  const { data: rows, error } = await supabaseAdmin
    .from('coach_endorsements')
    .select(`
      id, endorsement_type, text, visibility, created_at, status,
      coach:coach_profiles(
        id, profile_id, license_issuing_authority, license_number, years_coaching,
        verification_status,
        profile:profiles!coach_profiles_profile_id_fkey(display_name, username, avatar_url)
      )
    `)
    .eq('player_id', playerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

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
        <h2 style={headingStyle}>Endorsements</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Unable to load endorsements right now.</p>
      </section>
    );
  }

  // Filter out private endorsements if not owner (RLS should handle, but be defensive).
  const visible = (rows ?? []).filter((r) => isOwner || r.visibility !== 'private');

  if (visible.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Endorsements</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          No coach endorsements yet.
        </p>
        {isOwner && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
            Ask a coach you&apos;ve worked with to endorse you. They can verify your record and add a note.
          </p>
        )}
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>
        Endorsements
        <span style={{ marginLeft: 8, fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', textTransform: 'none', letterSpacing: 0, fontFamily: 'inherit' }}>
          {visible.length}
        </span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {visible.map((row) => {
          const coach: any = (row as any).coach;
          const profile: any = coach?.profile;
          const coachName = profile?.display_name || (coach?.profile_id ? `Coach ${coach.profile_id.slice(-6)}` : 'Anonymous coach');
          const coachHref = profile?.username ? `/profile/${profile.username}` : null;
          const typeLabel = TYPE_LABELS[row.endorsement_type] ?? row.endorsement_type;
          const typeStyle = TYPE_COLORS[row.endorsement_type] ?? TYPE_COLORS.other;
          const verifiedBadge = coach?.verification_status === 'platform_verified' || coach?.verification_status === 'federation_verified';
          const dateStr = new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });

          return (
            <div
              key={row.id}
              style={{
                padding: '0.875rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  {coachHref ? (
                    <Link href={coachHref} style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
                      {coachName}
                    </Link>
                  ) : (
                    <span style={{ color: '#fff', fontWeight: 600 }}>{coachName}</span>
                  )}
                  {verifiedBadge && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(0,150,80,0.18)',
                        color: '#009650',
                      }}
                    >
                      Verified coach
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: typeStyle.bg,
                    color: typeStyle.color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {typeLabel}
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>
                {row.text}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6875rem', marginTop: '0.5rem' }}>
                {dateStr}
                {row.visibility === 'private' && ' · private (only you and the coach see this)'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}