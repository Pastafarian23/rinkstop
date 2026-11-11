import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStaffRecord } from '@/lib/staff-record';
import { withDefaultOg } from '@/lib/metadata-defaults';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 86400;
export const dynamicParams = true;

function buildDescription(r: {
  full_name: string;
  role: string;
  current_team_name: string | null;
  league_name: string | null;
}): string {
  const roleLabel = r.role === 'coach' ? 'hockey coach' : `${r.role}`;
  const team = r.current_team_name
    ? r.league_name
      ? ` with the ${r.current_team_name} in the ${r.league_name}`
      : ` with the ${r.current_team_name}`
    : '';
  return `${r.full_name} — ${roleLabel}${team}. Profile on RinkStop.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getStaffRecord(id);

  if (!record) {
    return { title: 'Coach Not Found | RinkStop', robots: { index: false, follow: false } };
  }

  const description = buildDescription(record);
  const title = `${record.full_name} — ${record.role === 'coach' ? 'Coach' : 'Coach'}${
    record.current_team_name ? ` | ${record.current_team_name}` : ''
  } | RinkStop`;

  return {
    title,
    description,
    alternates: { canonical: `https://rinkstop.com/directory/coaches/${id}` },
    openGraph: withDefaultOg({
      title: `${record.full_name} — Coach${record.current_team_name ? ` | ${record.current_team_name}` : ''}`,
      description,
      url: `https://rinkstop.com/directory/coaches/${id}`,
      type: 'profile',
      ...(record.headshot_url
        ? { images: [{ url: record.headshot_url, width: 200, height: 200, alt: record.full_name }] }
        : {}),
    }),
    twitter: {
      card: 'summary_large_image',
      title: `${record.full_name} — Coach`,
      description,
      ...(record.headshot_url ? { images: [record.headshot_url] } : {}),
    },
  };
}

export default async function CoachPage({ params }: Props) {
  const { id } = await params;
  const record = await getStaffRecord(id);

  if (!record) notFound();

  const teamName = record.current_team_name;

  return (
    <>
      <main
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '2.5rem 1.25rem 4rem',
        }}
      >
        <nav style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <Link
            href="/directory/coaches"
            style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            ← All coaches
          </Link>
        </nav>

        <header
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}
        >
          {record.headshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.headshot_url}
              alt={record.full_name}
              width={120}
              height={120}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                background: '#1a2D45',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: '#1a2D45',
                color: 'rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {record.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ minWidth: '240px' }}>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: '#fff',
                lineHeight: 1.1,
                margin: '0 0 0.5rem',
              }}
            >
              {record.full_name}
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.05rem',
                margin: '0 0 0.75rem',
              }}
            >
              {record.role === 'coach' ? 'Coach' : record.role}
              {teamName ? ` · ${teamName}` : ''}
              {record.league_name ? ` · ${record.league_name}` : ''}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  background: 'rgba(255,184,28,0.15)',
                  color: '#FFB81C',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {record.role === 'coach' ? 'Coach' : record.role}
              </span>
              {record.was_player ? (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                  }}
                >
                  Former player
                </span>
              ) : null}
              {!record.is_active ? (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.5)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                  }}
                >
                  Inactive
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <section
          style={{
            background: 'var(--s2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2
            style={{
              color: '#fff',
              fontSize: '1.15rem',
              margin: '0 0 0.75rem',
            }}
          >
            About {record.full_name}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
            {record.full_name} is a hockey {record.role === 'coach' ? 'coach' : record.role}
            {teamName ? ` for the ${teamName}` : ''}
            {record.league_name ? ` in the ${record.league_name}` : ''}.{' '}
            {record.was_player
              ? 'They also played professionally before moving into coaching.'
              : 'Their coaching profile, team and league details are listed here for teams, agents and fans to find.'}
          </p>
        </section>

        {teamName ? (
          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', margin: '0 0 0.75rem' }}>
              Team
            </h2>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                background: 'var(--s2)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
              }}
            >
              {record.current_team_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={record.current_team_logo}
                  alt=""
                  width={40}
                  height={40}
                  style={{ width: 40, height: 40, objectFit: 'contain' }}
                />
              ) : null}
              <span style={{ color: '#fff', fontWeight: 600 }}>{teamName}</span>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
