/**
 * src/components/profile/UnifiedPersonProfile.tsx
 *
 * The unified public person profile.
 *
 * WHAT IT RENDERS
 *   1. The identity block — name, photo, birth date, nationality.
 *   2. The roles block — every role the person holds (player, coach, scout…),
 *      each linking to that role's existing public directory page.
 *   3. The records block — every source record the person owns. For a merged
 *      identity this is where the two source records visibly become one
 *      person.
 *
 * WHAT IT DELIBERATELY DOES NOT RENDER
 *   • No contact details. The source rows are read through narrow column
 *     lists that exclude email, phone and google_phone.
 *   • No ownership claims. This page never creates a claim and never
 *     asserts one.
 *   • No SEO prose copy. The directory page keeps the substantive content and
 *     the keyword title; this page is identity + roles + records, so the two
 *     are complementary rather than competing.
 *
 * STYLING
 *   Dark theme, matching the rest of RinkStop's public pages:
 *     page bg #041E42 · card bg rgba(0,0,0,0.25) · border rgba(255,255,255,0.08)
 *     heading #fff · body rgba(255,255,255,0.7) · accent #C8102E
 */

import Link from 'next/link';
import type { UnifiedPerson, UnifiedRole, UnifiedSourceRecord } from '@/lib/unified-profile';

const ROLE_LABEL: Record<string, string> = {
  player: 'Player',
  coach: 'Coach',
  official: 'Official',
  scout: 'Scout',
  staff: 'Staff',
  executive: 'Executive',
  referee: 'Referee',
};

const SOURCE_LABEL: Record<string, string> = {
  rinkstop_players: 'RinkStop player record',
  nhl_players: 'NHL player record',
  nhl_coaching_staff: 'NHL coaching staff record',
  team_members: 'Team member record',
  coach_profiles: 'Coach profile record',
  profiles_account: 'Account',
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.5rem',
          marginBottom: '0.875rem',
          flexWrap: 'wrap',
        }}
      >
        <h2
          className="font-sport uppercase"
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
          }}
        >
          {title}
        </h2>
        {hint && (
          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function RoleCard({ role }: { role: UnifiedRole }) {
  const label = ROLE_LABEL[role.roleType] ?? role.roleType;
  const sub = [
    role.teamName,
    role.leagueName,
    role.season,
    role.position,
    role.jerseyNumber ? `#${role.jerseyNumber}` : null,
    role.roleDetail,
  ]
    .filter(Boolean)
    .join(' · ');

  const inner = (
    <>
      <span
        aria-hidden
        style={{
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          flexShrink: 0,
        }}
      >
        {role.roleType === 'player' ? '🏒' : role.roleType === 'coach' ? '🧢' : '🎬'}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          className="font-semibold truncate"
          style={{ margin: 0, fontSize: '0.875rem', display: 'block' }}
        >
          {role.name ?? label}
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            display: 'block',
            textTransform: 'capitalize',
          }}
        >
          {sub || label}
        </span>
      </span>
    </>
  );

  const style = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '0.625rem',
    padding: '0.625rem',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    textDecoration: 'none',
    color: '#fff',
  };

  if (!role.href) {
    return <div style={style}>{inner}</div>;
  }

  return (
    <Link href={role.href} style={style} data-unified-role={role.roleType}>
      {inner}
    </Link>
  );
}

function SourceCard({ record }: { record: UnifiedSourceRecord }) {
  const label = SOURCE_LABEL[record.source] ?? record.source;
  const facts = record.facts.map((f) => `${f.label}: ${f.value}`).join(' · ');

  const inner = (
    <>
      <span
        aria-hidden
        style={{
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          flexShrink: 0,
        }}
      >
        {record.source === 'profiles_account' ? '👤' : '📄'}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          className="font-semibold truncate"
          style={{ margin: 0, fontSize: '0.875rem', display: 'block' }}
        >
          {record.name ?? label}
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            display: 'block',
          }}
        >
          {facts || label}
        </span>
      </span>
      {record.mergedAt && (
        <span
          style={{
            fontSize: '0.625rem',
            color: 'rgba(255,184,28,0.75)',
            border: '1px solid rgba(255,184,28,0.35)',
            borderRadius: 4,
            padding: '0.1rem 0.35rem',
            flexShrink: 0,
          }}
        >
          merged
        </span>
      )}
    </>
  );

  const style = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '0.625rem',
    padding: '0.625rem',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    textDecoration: 'none',
    color: '#fff',
  };

  if (!record.href) {
    return <div style={style}>{inner}</div>;
  }

  return (
    <Link href={record.href} style={style} data-unified-source={record.source}>
      {inner}
    </Link>
  );
}

export default function UnifiedPersonProfile({ person }: { person: UnifiedPerson }) {
  const facts: Array<{ label: string; value: string }> = [];
  if (person.birthDate) facts.push({ label: 'Born', value: person.birthDate });
  if (person.nationality) facts.push({ label: 'Nationality', value: person.nationality });
  if (person.publicId) facts.push({ label: 'Public ID', value: person.publicId });

  const playerRoles = person.roles.filter((r) => r.roleType === 'player');
  const otherRoles = person.roles.filter((r) => r.roleType !== 'player');

  return (
    <div
      data-unified-person={person.id}
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '2rem 1rem 4rem',
      }}
    >
      {/* ─── IDENTITY ─────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0A1A33 0%, #041E42 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            height: 'clamp(120px, 18vw, 180px)',
            borderBottom: '3px solid var(--red)',
            background: 'linear-gradient(135deg, #041E42 0%, #0A2A5E 35%, #C8102E 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 'clamp(2.5rem, 9vw, 4.5rem)',
              fontWeight: 900,
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.07)',
              userSelect: 'none',
            }}
          >
            RINKSTOP
          </span>
        </div>

        <div
          style={{
            padding: '0 1.25rem 1.25rem',
            marginTop: '-2.75rem',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photoUrl}
              alt={person.displayName}
              style={{
                display: 'block',
                width: 'clamp(80px, 12vw, 112px)',
                height: 'clamp(80px, 12vw, 112px)',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--red)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                background: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                width: 'clamp(80px, 12vw, 112px)',
                height: 'clamp(80px, 12vw, 112px)',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--red) 0%, #8b0a1e 100%)',
                color: '#fff',
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '2.5rem',
                border: '4px solid var(--red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              {person.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              letterSpacing: '0.04em',
              color: '#fff',
              margin: '0.75rem 0 0.25rem',
            }}
          >
            {person.displayName}
          </h1>

          <p
            style={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.55)',
              margin: 0,
            }}
          >
            {person.roles.length > 0
              ? person.roles
                  .map((r) => ROLE_LABEL[r.roleType] ?? r.roleType)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(' · ')
              : 'Hockey identity on RinkStop'}
          </p>

          {facts.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginTop: '0.75rem',
              }}
            >
              {facts.map((f) => (
                <span
                  key={f.label}
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.65)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 999,
                    padding: '0.2rem 0.7rem',
                  }}
                >
                  {f.label}: {f.value}
                </span>
              ))}
            </div>
          )}

          {person.hasAccount && person.accountUsername && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', margin: '0.75rem 0 0' }}>
              Also on RinkStop as{' '}
              <Link
                href={`/profile/${person.accountUsername}`}
                style={{ color: '#FFB81C', textDecoration: 'none' }}
              >
                @{person.accountUsername}
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* ─── ROLES ────────────────────────────────────────────── */}
        {person.roles.length > 0 && (
          <Section
            title="Roles"
            hint={`${person.roles.length} role${person.roles.length === 1 ? '' : 's'} on RinkStop`}
          >
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {playerRoles.map((r) => (
                <RoleCard key={r.id} role={r} />
              ))}
              {otherRoles.map((r) => (
                <RoleCard key={r.id} role={r} />
              ))}
            </div>
          </Section>
        )}

        {/* ─── SOURCE RECORDS ───────────────────────────────────── */}
        <Section
          title="Records"
          hint={`${person.sources.length} source record${person.sources.length === 1 ? '' : 's'}`}
        >
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {person.sources.map((s) => (
              <SourceCard key={`${s.source}:${s.sourceId}`} record={s} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
