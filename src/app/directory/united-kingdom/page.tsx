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

export const dynamic = 'force-dynamic';

export default async function UnitedKingdomPage() {
  const [{ count: ukRinksCount }, { data: ukRinks }] = await Promise.all([
    supabase.from('rinks').select('*', { count: 'exact', head: true }).eq('country', 'United Kingdom'),
    supabase
      .from('rinks')
      .select('id, slug, name, city, address, phone, website_url, notes')
      .eq('country', 'United Kingdom').eq('is_active', true)
      .order('name').limit(30),
  ]);

  // Get unique cities with rinks
  const { data: allUkRinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', 'United Kingdom').eq('is_active', true);

  const cityMap = new Map<string, number>();
  (allUkRinks || []).forEach((r: { city?: string }) => {
    if (r.city) cityMap.set(r.city, (cityMap.get(r.city) || 0) + 1);
  });

  const ukCities = Array.from(cityMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([city, count]) => ({
      city,
      count,
      slug: city.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-'),
    }));

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
          text: "The Elite Ice Hockey League (EIHL) is the UK's top professional hockey league with 11 teams across England, Scotland, Wales, and Northern Ireland. The league operates from September to March, culminating in a playoff championship.",
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
          <p style={{ color: textMuted, fontSize: 16, maxWidth: 560, margin: '0 auto 32px' }}>
            {ukRinksCount ?? 0} ice rinks across England, Scotland, Wales & Northern Ireland. From EIHL arenas to local community rinks.
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 48 }}>
            {[
              { label: 'Ice Rinks', value: String(ukRinksCount ?? 0), sub: 'across the UK' },
              { label: 'EIHL Teams', value: '11', sub: 'professional league' },
              { label: 'NIHL Teams', value: '40+', sub: 'semi-pro league' },
              { label: 'Elite Players', value: '300+', sub: 'professional rosters' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: red, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: textMain, marginTop: 6 }}>{label}</div>
                <div style={{ fontSize: 12, color: textDim, marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* UK Cities with Rinks */}
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>
            CITIES WITH ICE RINKS
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 48 }}>
            {ukCities.map(({ city, count, slug }) => (
              <Link
                key={city}
                href={`/directory/united-kingdom/${slug}`}
                style={{
                  background: card,
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'border-color 0.2s',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: textMain }}>{city}</span>
                <span style={{ fontSize: 12, color: textDim }}>{count} {count === 1 ? 'rink' : 'rinks'} →</span>
              </Link>
            ))}
          </div>

          {/* EIHL Teams */}
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>
            EIHL — ELITE ICE HOCKEY LEAGUE
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 48 }}>
            {[
              { name: 'Sheffield Steelers', city: 'Sheffield', website: 'https://www.sheffieldsteels.com' },
              { name: 'Cardiff Devils', city: 'Cardiff', website: 'https://www.cardiffdevils.com' },
              { name: 'Nottingham Panthers', city: 'Nottingham' },
              { name: 'Coventry Blaze', city: 'Coventry' },
              { name: 'Belfast Giants', city: 'Belfast' },
              { name: 'Guildford Flames', city: 'Guildford' },
              { name: 'Manchester Storm', city: 'Manchester' },
              { name: 'Milton Keynes Lightning', city: 'Milton Keynes' },
              { name: 'Bradford Bulldogs', city: 'Bradford' },
              { name: 'Peterborough Phantoms', city: 'Peterborough' },
              { name: 'Stoke Pythons', city: 'Stoke-on-Trent' },
            ].map(({ name, city, website }) => (
              <div key={name} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textMain }}>{name}</div>
                  <div style={{ fontSize: 12, color: textDim }}>{city}</div>
                </div>
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: red, fontSize: 12, textDecoration: 'none' }}>🌐</a>
                )}
              </div>
            ))}
          </div>

          {/* Featured Rinks */}
          {ukRinks && ukRinks.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>
                FEATURED ICE RINKS
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {ukRinks.map((rink) => (
                  <div key={rink.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: textMain, marginBottom: 4 }}>{rink.name}</h3>
                    <div style={{ fontSize: 13, color: textMuted, marginBottom: 8 }}>{rink.city ?? ''}</div>
                    {rink.address && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>{rink.address}</div>}
                    {rink.phone && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📞 {rink.phone}</div>}
                    {rink.website_url && (
                      <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: red, textDecoration: 'none', display: 'block', marginBottom: 4 }}>
                        🌐 Visit website
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div style={{ maxWidth: 720, margin: '0 auto 80px' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { q: 'How many UK-born players are in the NHL?', a: "As of 2024-25, fewer than 10 UK-born players have ever played in the NHL. The UK produces occasional NHL-caliber talent, but development pathways remain smaller than in Canada, the US, or Sweden." },
                { q: 'What is the EIHL?', a: "The Elite Ice Hockey League (EIHL) is the UK's top professional hockey league with 11 teams across England, Scotland, Wales, and Northern Ireland." },
                { q: 'How many ice rinks does the UK have?', a: 'The UK has 60+ permanent ice rinks according to the EIHA, though not all have active hockey programs.' },
              ].map(({ q, a }) => (
                <div key={q} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '20px 24px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: textMain, marginBottom: 8 }}>{q}</h3>
                  <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.6, margin: 0 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}