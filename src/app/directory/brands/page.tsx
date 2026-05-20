'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLinkIcon } from '@/components/icons';

const FILTER_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'skates', label: 'Skates' },
  { key: 'sticks', label: 'Sticks' },
  { key: 'pads', label: 'Goalie' },
  { key: 'apparel', label: 'Apparel' },
  { key: 'accessories', label: 'Accessories' },
];

const CATEGORY_COLORS: Record<string, string> = {
  skates:     '#1d4ed8',
  sticks:     '#b91c1c',
  pads:       '#047857',
  apparel:    '#7c3aed',
  accessories:'#b45309',
};

const CATEGORY_BG: Record<string, string> = {
  skates:     'rgba(29,78,216,0.15)',
  sticks:     'rgba(185,28,28,0.15)',
  pads:       'rgba(4,120,87,0.15)',
  apparel:    'rgba(124,58,237,0.15)',
  accessories:'rgba(180,83,9,0.15)',
};

function BrandLogo({ name, category }: { name: string; category: string }) {
  const initial = name.charAt(0);
  const color = CATEGORY_COLORS[category] ?? '#374151';
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '0.02em',
      }}
    >
      {initial}
    </div>
  );
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    fetch(`/api/brands?${params}`)
      .then(r => r.json())
      .then(d => {
        setBrands(d || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeCategory]);

  // Count all brands for badge display
  const [totalCount, setTotalCount] = useState(0);
  useEffect(() => {
    fetch('/api/brands')
      .then(r => r.json())
      .then(d => setTotalCount((d || []).length))
      .catch(() => {});
  }, []);

  const filteredCount = brands.length;
  const displayCount = activeCategory === 'all' ? totalCount : filteredCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Brands</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="label">Directory</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1
            className="font-sport"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}
          >
            HOCKEY BRANDS
          </h1>
          <span
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '4px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.75rem',
              color: '#888',
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            {displayCount} BRANDS
          </span>
        </div>
        <p style={{ color: '#555555', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '640px' }}>
          Equipment, apparel, and accessories from the brands trusted by players at every level  --  with affiliate links to shop directly.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {FILTER_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              padding: '0.35rem 0.875rem',
              borderRadius: '999px',
              border: activeCategory === cat.key
                ? `1px solid ${CATEGORY_COLORS[cat.key] ?? '#555'}`
                : '1px solid #1f1f1f',
              background: activeCategory === cat.key
                ? (CATEGORY_BG[cat.key] ?? 'rgba(55,65,81,0.3)')
                : '#0d0d0d',
              color: activeCategory === cat.key
                ? (CATEGORY_COLORS[cat.key] ?? '#ccc')
                : '#666',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.04em',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Brand Grid */}
      {loading ? (
        <div style={{ color: '#444', padding: '3rem 0', textAlign: 'center' }}>Loading brands...</div>
      ) : brands.length === 0 ? (
        <div style={{ color: '#444', padding: '3rem 0', textAlign: 'center' }}>No brands found.</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {brands.map((brand: any) => {
            const catColor = CATEGORY_COLORS[brand.category] ?? '#374151';
            const catBg = CATEGORY_BG[brand.category] ?? 'rgba(55,65,81,0.15)';
            const catLabel = FILTER_CATEGORIES.find(c => c.key === brand.category)?.label ?? brand.category;

            return (
              <div
                key={brand.id}
                className="card-default"
                style={{ padding: '1.125rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}
              >
                {/* Logo circle */}
                <BrandLogo name={brand.name} category={brand.category} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                      {brand.name}
                    </h3>
                    {/* External link */}
                    {brand.website_url && (
                      <a
                        href={brand.website_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        style={{ color: '#333', flexShrink: 0, marginTop: '2px' }}
                        title={`Visit ${brand.name}`}
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Category badge */}
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '0.3rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: catBg,
                      border: `1px solid ${catColor}`,
                      color: catColor,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {catLabel}
                  </span>

                  {/* Description */}
                  <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                    {brand.description}
                  </p>

                  {/* Origin + CTA */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem' }}>
                    {brand.country_of_origin && (
                      <span style={{ fontSize: '0.6875rem', color: '#444', letterSpacing: '0.04em' }}>
                        {brand.country_of_origin}
                      </span>
                    )}
                    {brand.website_url && (
                      <a
                        href={brand.website_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: '#c8102e',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                        }}
                      >
                        Shop ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Affiliate Disclosure */}
      <p style={{ color: '#333', fontSize: '0.7rem', marginTop: '2rem', textAlign: 'center', letterSpacing: '0.03em' }}>
        Affiliate links are marked with{' '}
        <span style={{ color: '#c8102e' }}>↗</span>{' '}
        and may earn a commission at no cost to you. We only link to brands we trust.
      </p>
    </div>
  );
}