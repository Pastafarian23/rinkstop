import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ city: string }>;
}

function formatCityName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityName = formatCityName(city);
  const title = `Best Ice Rinks in ${cityName}`;

  return {
    title,
    description: `Discover the best ice rinks in ${cityName}. Find hockey arenas, public skating facilities, and learn-to-play programs. Your complete ${cityName} rink guide.`,
    openGraph: {
      title: `Best Ice Rinks in ${cityName}`,
      description: `Find the top-rated ice rinks and hockey facilities in ${cityName}.`,
      type: 'website',
    },
  };
}

export default async function BestIceRinksPage({ params }: Props) {
  const { city } = await params;
  const cityName = formatCityName(city);

  // Find rinks in this city
  const escapedCity = cityName.replace(/[%_]/g, '\\$&');
  const { data: rinks } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, address, city, province, country, description, phone, website')
    .ilike('city', `*${escapedCity}*`)
    .not('slug', 'is', null)
    .order('name')
    .limit(20);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Rinks', href: '/directory/rinks' },
    { label: `Best in ${cityName}` },
  ];

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <Breadcrumb items={breadcrumbItems} />

      {/* Hero */}
      <section style={{ marginBottom: '3rem', textAlign: 'center', padding: '2.5rem 1rem', background: 'linear-gradient(135deg, #041E42 0%, #0a2d5c 100%)', borderRadius: '12px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.15em', color: '#C8102E', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Local Hockey Guide</div>
        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          BEST ICE RINKS IN {cityName.toUpperCase()}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', maxWidth: '550px', margin: '0 auto', lineHeight: 1.7 }}>
          {cityName}'s top hockey arenas, public skating venues, and learn-to-play facilities — ranked for quality, accessibility, and local reputation.
        </p>
      </section>

      {/* City Overview */}
      <section style={{ marginBottom: '2rem', padding: '1.5rem 2rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>ABOUT HOCKEY IN {cityName.toUpperCase()}</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
          {cityName} has emerged as a significant hockey market with {rinks?.length || 0} registered ice facilities serving players of all ages and skill levels. From youth learn-to-play programs to competitive adult leagues, {cityName}'s hockey community continues to grow. Browse the directory below to find the right rink for your next game, practice, or public skate session.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link href={`/hockey/${slugify(cityName)}`} style={{ padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none' }}>
            Full {cityName} Hockey Directory →
          </Link>
          <Link href="/directory/rinks" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none' }}>
            Browse All Rinks
          </Link>
        </div>
      </section>

      {/* Rinks List */}
      {rinks && rinks.length > 0 ? (
        <section>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
            TOP RINKS IN {cityName.toUpperCase()} ({rinks.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rinks.map((rink, idx) => (
              <div key={rink.slug} style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', background: idx < 3 ? '#C8102E' : 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem', color: '#fff', flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                    <Link href={`/rinks/${slugify(cityName)}/${rink.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>{rink.name}</Link>
                  </h3>
                  {rink.address && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>📍 {rink.address}</p>}
                  {rink.description && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{rink.description}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link href={`/rinks/${slugify(cityName)}/${rink.slug}`} style={{ padding: '0.375rem 0.875rem', background: '#C8102E', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none' }}>View Details</Link>
                    <Link href="/directory/youth-hockey/learn-to-play" style={{ padding: '0.375rem 0.875rem', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none' }}>Learn to Play</Link>
                    <Link href="/directory/games" style={{ padding: '0.375rem 0.875rem', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none' }}>Find Games</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--s2)', borderRadius: '12px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', fontSize: '1rem' }}>No rinks found for this city yet.</p>
          <Link href="/directory/rinks" style={{ display: 'inline-block', padding: '0.625rem 1.25rem', background: '#C8102E', color: '#fff', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>Browse All Rinks →</Link>
        </section>
      )}

      {/* Schema markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": `Best Ice Rinks in ${cityName}`,
          "description": `Discover the best ice rinks in ${cityName}. Find hockey arenas, public skating facilities, and learn-to-play programs.`,
          "url": `https://rinkstop.com/best-ice-rinks/${city.toLowerCase()}`,
          "mainEntity": {
            "@type": "ItemList",
            "name": `Ice Rinks in ${cityName}`,
            "itemListElement": (rinks || []).map((rink, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "item": {
                "@type": "SportsActivityLocation",
                "name": rink.name,
                "address": rink.address,
                "addressLocality": cityName,
                "addressCountry": rink.country
              }
            }))
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://rinkstop.com" },
              { "@type": "ListItem", "position": 2, "name": "Rinks", "item": "https://rinkstop.com/directory/rinks" },
              { "@type": "ListItem", "position": 3, "name": `Best in ${cityName}`, "item": `https://rinkstop.com/best-ice-rinks/${city.toLowerCase()}` }
            ]
          }
        })
      }} />
    </main>
  );
}