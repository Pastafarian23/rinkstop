// /gear-brands/[slug]
//
// Per-brand landing page. Renders content for the 8 top hockey equipment
// brands from src/lib/gear-brand-data.ts.
//
// Each page has:
//   - Hero: brand name + tagline + product categories
//   - Flagship products: top 3 product lines with prices + key features
//   - Category rankings: 1st/2nd/3rd by category across the industry
//   - Notable athletes: top endorsers
//   - Vs. competitor comparison: 1-2 sentence positioning vs. main rival
//   - Editorial body (~150-200 words) for SEO
//   - FAQPage JSON-LD (4 questions per brand)
//
// All 8 brands are statically rendered via generateStaticParams.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBrandBySlug, getBrandSlugs } from '@/lib/gear-brand-data';
import { trackEvent } from '@/lib/analytics';
import { withDefaultOg } from '@/lib/metadata-defaults';

export function generateStaticParams() {
  return getBrandSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);
  if (!brand) {
    return { title: 'Brand not found' };
  }
  return {
    // WS27 PR6 (2026-09-14): per-brand gear landing page. Absolute title
    // to opt out of root layout's '%s | RinkStop' template suffix.
    title: { absolute: `${brand.name} Hockey Equipment ${brand.founded} — Skates, Sticks, Gear` },
    description: `${brand.name} hockey equipment — ${brand.tagline}. Reviewed: ${brand.flagshipProducts.map((p) => `${p.name} (${p.category.toLowerCase()})`).join(', ')}. ${brand.seoText.slice(0, 120)}`,
    alternates: { canonical: `https://rinkstop.com/gear-brands/${brand.slug}` },
    openGraph: withDefaultOg({
      title: `${brand.name} Hockey Equipment ${brand.founded}`,
      description: `${brand.tagline}. ${brand.seoText.slice(0, 140)}`,
      url: `https://rinkstop.com/gear-brands/${brand.slug}`,
      type: 'website',
    }),
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);
  if (!brand) {
    notFound();
  }

  // WS29 — track gear-brand page views for AI-citation measurement.
  // Captures whether the visitor was an AI bot (most likely case for
  // brand pages), plus content fingerprinting (categories covered,
  // FAQ count) for funnel analysis.
  await trackEvent({
    name: 'gear_brand_page_viewed',
    pathname: `/gear-brands/${slug}`,
    props: {
      brand_slug: slug,
      brand_name: brand.name,
      category_count: brand.categories.length,
      flagship_product_count: brand.flagshipProducts.length,
      notable_athlete_count: brand.notableAthletes.length,
      faq_count: brand.faq.length,
      content_type: 'brand',
    },
  });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: brand.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/gear-brands" style={{ color: 'rgba(255,255,255,0.4)' }}>Hockey Gear Brands</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{brand.name}</span>
      </nav>

      {/* Hero */}
      <div style={{ marginBottom: '2rem' }}>
        <span
          style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: brand.color,
            marginBottom: '0.5rem',
            display: 'block',
          }}
        >
          {brand.tagline}
        </span>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 5vw, 3rem)',
            color: '#fff',
            letterSpacing: '0.02em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {brand.name} Hockey Equipment
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9375rem',
            marginTop: '0.75rem',
            maxWidth: '720px',
          }}
        >
          Founded {brand.founded} · {brand.headquarters}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {brand.categories.map((c) => (
            <span
              key={c}
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Flagship products */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>
          Flagship Products
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {brand.flagshipProducts.map((p) => (
            <div
              key={p.name}
              style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: brand.color,
                }}
              >
                {p.category}
              </span>
              <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                {p.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.5rem' }}>
                {p.priceUsd}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0 }}>
                {p.feature}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Category rankings */}
      {brand.categoryRankings.length > 0 && (
        <section
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>
            Where {brand.name} Ranks
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <tbody>
              {brand.categoryRankings.map((r) => (
                <tr key={r.category} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.65)' }}>
                    {r.category}
                  </td>
                  <td
                    style={{
                      padding: '0.625rem 0.5rem',
                      color: brand.color,
                      fontWeight: 700,
                      textAlign: 'right',
                      width: '4rem',
                    }}
                  >
                    #{r.rank}
                  </td>
                  <td style={{ padding: '0.625rem 0.5rem', color: 'rgba(255,255,255,0.5)' }}>
                    {r.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Notable athletes */}
      {brand.notableAthletes.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: '#fff', fontWeight: 700, marginBottom: '0.75rem' }}>
            Notable {brand.name} Athletes
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {brand.notableAthletes.map((a) => (
              <li
                key={a}
                style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem' }}
              >
                <span style={{ color: brand.color, fontWeight: 600 }}>•</span> {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comparison */}
      {brand.comparison.length > 0 && (
        <section
          style={{
            background: 'linear-gradient(135deg, #0d2137 0%, #061424 100%)',
            border: '1px solid rgba(30,91,156,0.3)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>
            {brand.name} vs. the Competition
          </h2>
          {brand.comparison.map((c) => (
            <div key={c.vsSlug} style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', color: '#4A90D9', fontWeight: 700, marginBottom: '0.4rem' }}>
                {brand.name} vs {c.vsName}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.65, margin: 0 }}>
                {c.summary}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Editorial body */}
      <section style={{ marginBottom: '2rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginBottom: '0.75rem' }}>
          About {brand.name} Hockey
        </h2>
        {brand.seoText.split(/\n\n+/).map((p, i) => (
          <p key={i} style={{ marginBottom: '1rem' }}>{p}</p>
        ))}
      </section>

      {/* FAQ — structured as collapsible details + JSON-LD */}
      <section
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {brand.faq.map((f) => (
            <details
              key={f.q}
              style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}
            >
              <summary
                style={{
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                }}
              >
                {f.q}
              </summary>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.65, marginTop: '0.5rem', marginBottom: 0 }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Cross-link back to the hub */}
      <div
        style={{
          background: 'rgba(13,17,23,0.6)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1.5rem 2rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
          See {brand.name} alongside the other top hockey equipment brands:
        </p>
        <Link
          href="/gear-brands"
          style={{
            display: 'inline-block',
            background: '#C8102E',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '0.6rem 1.5rem',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          ← All Hockey Equipment Brands
        </Link>
      </div>
    </main>
  );
}
