import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata: Metadata = {
  title: 'Hockey in the United Kingdom | RinkStop',
  description: 'UK hockey from the EIHL to NIHL — find every rink, team, and league across England, Scotland, Wales, and Northern Ireland.',
  alternates: { canonical: 'https://rinkstop.com/directory/united-kingdom' },
  openGraph: { title: 'Hockey in the United Kingdom | RinkStop', description: 'UK hockey from the EIHL to NIHL.', type: 'article' },
};

export default async function UnitedKingdomPage() {
  const [{ count: ukRinksCount }, { data: ukRinks }] = await Promise.all([
    supabase.from('rinks').select('*', { count: 'exact', head: true }).eq('country', 'UK'),
    supabase
      .from('rinks')
      .select('id, name, city, address, phone, website_url, notes')
      .eq('country', 'UK').eq('is_active', true)
      .order('name').limit(30),
  ]);

  const ukNhlPlayers = [
    { name: 'Connor McDavid', team: 'Edmonton Oilers', position: 'Center', nationality: 'Canadian' },
    { name: 'Auston Matthews', team: 'Toronto Maple Leafs', position: 'Center', nationality: 'American' },
    { name: 'Nathan MacKinnon', team: 'Colorado Avalanche', position: 'Center', nationality: 'Canadian' },
    { name: 'Victor Hedman', team: 'Tampa Bay Lightning', position: 'Defense', nationality: 'Swedish' },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many UK-born players are in the NHL?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'As of 2024-25, fewer than 10 UK-born players have ever played in the NHL. The UK produces occasional NHL-caliber talent, but development pathways remain smaller than in Canada, the US, or Sweden.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the EIHL?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Elite Ice Hockey League (EIHL) is the UK\'s top professional hockey league with 11 teams across England, Scotland, Wales, and Northern Ireland. The league operates from September to March, culminating in a playoff championship.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many ice rinks does the UK have?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The UK has 60+ permanent ice rinks according to the EIHA, though not all have active hockey programs. Numbers vary between the EIHA (60+) and other sources (45-55) due to definition differences on seasonal vs. permanent facilities.',
        },
      },
    ],
  };

  const bg = '#0a0a0a';
  const card = '#0f0f0f';
  const border = '#1e1e1e';
  const red = '#C8102E';
  const textMain = '#fff';
  const textMuted = '#888';
  const textSub = '#aaa';
  const textDim = '#555';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div style={{ background: bg, color: textMain, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

        {/* Breadcrumb */}
        <div style={{ borderBottom: `1px solid ${border}`, background: '#0f0f0f' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px' }}>
            <nav style={{ fontSize: 13, color: textDim }}>
              <a href="/" style={{ color: textDim, textDecoration: 'none' }}>Home</a>
              <span style={{ margin: '0 6px', color: textDim }}>›</span>
              <a href="/directory" style={{ color: textDim, textDecoration: 'none' }}>Directory</a>
              <span style={{ margin: '0 6px', color: textDim }}>›</span>
              <span style={{ color: textSub }}>United Kingdom</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: red, marginBottom: 12 }}>
            Hockey Across the British Isles
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(3rem, 8vw, 5rem)', color: textMain, letterSpacing: '0.04em', lineHeight: 1, marginBottom: 20 }}>
            HOCKEY IN THE<br />UNITED KINGDOM
          </h1>
          <p style={{ fontSize: 18, color: textMuted, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            From the EIHL to NIHL — the UK has a growing hockey scene spanning England, Scotland, Wales, and Northern Ireland.
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'UK Rinks', value: String(ukRinksCount ?? 0), sub: 'in our directory' },
              { label: 'EIHL Teams', value: '11', sub: 'top professional tier' },
              { label: 'NIHL Divisions', value: '12+', sub: 'across UK & Ireland' },
              { label: 'Permanent Rinks', value: '60+', sub: 'across the British Isles' },
            ].map(stat => (
              <div key={stat.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: red, fontFamily: "'Bebas Neue', Impact, sans-serif", lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 14, color: textSub, marginTop: 8 }}>{stat.label}</div>
                <div style={{ fontSize: 11, color: textDim, marginTop: 4 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hockey Culture */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 60px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 32, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 32, color: textMain }}>
            HOCKEY IN THE UK
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {[
              {
                title: 'THE EIHL — TOP TIER',
                body: [
                  'The Elite Ice Hockey League (EIHL) is the premier professional competition in the UK, featuring 11 teams across England, Scotland, Wales, and Northern Ireland. The league operates September to March, culminating in a playoff championship.',
                  'Notable teams include the Belfast Giants (SSE Arena, capacity 18,000), Sheffield Steelers, Cardiff Devils, and Coventry Blaze. Several teams have expanded venues in recent years, with Manchester Storm moving to the AO Arena for 2026-27.',
                  'The league attracts players from North America, Europe, and a growing number of British-born talent through its youth systems and NIHL pathway.',
                ],
              },
              {
                title: 'NIHL — THE FOUNDATION',
                body: [
                  'The National Ice Hockey League (NIHL) is the semi-professional tier below the EIHL, split into NIHL 1 (north and south) and NIHL 2. It serves as the primary development ground for British players at community level.',
                  'The NIHL is split into regional conferences allowing for geographic rivalries and reduced travel costs. Teams like Billingham Stars, Milton Keynes Thunder, and Chelmsford Pacers have built strong local following over decades.',
                  'Above NIHL sits the EPIHL (English Premier Ice Hockey League) as the bridge between NIHL and EIHL. The full UK hockey pyramid ranges from recreational beer league hockey up to the professional EIHL.',
                ],
              },
            ].map(({ title, body }) => (
              <div key={title} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 28 }}>
                <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 20, color: red, letterSpacing: '0.04em', marginBottom: 20 }}>
                  {title}
                </h3>
                {body.map((para, i) => (
                  <p key={i} style={{ fontSize: 14, color: textMuted, lineHeight: 1.75, marginBottom: 16 }}>
                    {para}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Leagues Grid */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 60px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 32, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 32, color: textMain }}>
            UK HOCKEY LEAGUES
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { name: 'EIHL', desc: 'Elite Ice Hockey League — 11 professional teams, top UK tier' },
              { name: 'NIHL 1', desc: 'National Ice Hockey League Division 1 — semi-pro, north & south' },
              { name: 'NIHL 2', desc: 'National Ice Hockey League Division 2 — community level hockey' },
              { name: 'EPIHL', desc: 'English Premier Ice Hockey League — bridge between NIHL and EIHL' },
              { name: 'SNL', desc: 'Scottish National League — Scotland\'s top amateur competition' },
              { name: 'WIHL', desc: 'Welsh Ice Hockey League — recreational and development focused' },
            ].map(league => (
              <div key={league.name} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 20, transition: 'border-color 0.2s' }}>
                <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 18, color: red, letterSpacing: '0.04em', marginBottom: 8 }}>
                  {league.name}
                </h3>
                <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.5 }}>{league.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* UK Rinks Grid */}
        {ukRinks && ukRinks.length > 0 && (
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 32, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 32, color: textMain }}>
              ICE RINKS IN THE UK
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {ukRinks.map((rink) => (
                <Link
                  key={rink.id}
                  href={`/directory/rinks/${rink.id}`}
                  style={{
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: 10,
                    padding: 20,
                    transition: 'border-color 0.2s',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: textMain, marginBottom: 4 }}>{rink.name}</h3>
                  <div style={{ fontSize: 13, color: textMuted, marginBottom: 8 }}>{rink.city ?? ''}</div>
                  {rink.address && (
                    <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>{rink.address}</div>
                  )}
                  {rink.phone && (
                    <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📞 {rink.phone}</div>
                  )}
                  {rink.website_url && (
                    <a
                      href={rink.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: red, textDecoration: 'none', display: 'block', marginBottom: 4 }}
                    >
                      🌐 Visit website
                    </a>
                  )}
                  {rink.notes && (
                    <div style={{ fontSize: 11, color: textMuted, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${border}`, fontStyle: 'italic', lineHeight: 1.5 }}>
                      {rink.notes}
                    </div>
                  )}
                </Link>
              ))}
            </div>
            {ukRinksCount && ukRinksCount > 30 && (
              <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: textDim }}>
                Showing 30 of {ukRinksCount} rinks in our directory.{' '}
                <a href="/directory" style={{ color: red }}>Browse all →</a>
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 60px' }}>
          <div style={{ background: `linear-gradient(135deg, ${bg} 0%, #041E42 100%)`, border: `1px solid ${border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 32, color: textMain, letterSpacing: '0.04em', marginBottom: 16 }}>
              KNOW A UK RINK WE&apos;RE MISSING?
            </h2>
            <p style={{ fontSize: 15, color: textMuted, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              Help us build the most complete hockey directory in the world. If you know a rink, team, or league in the UK that should be listed, let us know.
            </p>
            <a
              href="/add-listing"
              style={{
                display: 'inline-block',
                background: red,
                color: '#fff',
                padding: '12px 32px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              Submit a Listing
            </a>
          </div>
        </div>

      </div>
    </>
  );
}