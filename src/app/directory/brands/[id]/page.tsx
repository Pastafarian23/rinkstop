// /directory/brands/[id] — handles both legacy UUID URLs and new slug URLs.
// - UUID → look up the slug, 301 redirect to /directory/brands/[slug]
// - Slug → render the brand detail page
// This pattern works because Next.js doesn't allow two dynamic segments at the
// same level, so we keep [id] and discriminate the input format.

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getBrandBySlug, getBrandSlugMap } from '@/lib/brand-page';
import Link from 'next/link';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;

  // UUID path: we don't render the UUID directly (it 301s to the slug), so
  // we don't have a brand to describe here. Return a generic title.
  if (UUID_RE.test(id)) {
    return { title: 'Brand' };
  }

  // Slug path: render the brand-specific metadata.
  const data = await getBrandBySlug(id);
  if (!data) return { title: 'Brand Not Found' };
  const { brand } = data;

  const category = brand.category ? brand.category.replace(/_/g, ' ') : 'hockey equipment';
  const origin = brand.country_of_origin ? ` from ${brand.country_of_origin}` : '';
  const title = `${brand.name} — ${category} brand${origin} | RinkStop`;
  // Description: entity-specific, no fabricated stats. Use the brand's own
  // description if it has one, otherwise a minimal fallback.
  const description = brand.description
    ? `${brand.name} ${category} brand${origin}. ${brand.description.replace(/\.$/, '')}. Find teams using ${brand.name} on RinkStop.`
    : `${brand.name} — ${category} brand${origin}. Browse teams and gear using ${brand.name} on RinkStop.`;

  return {
    title,
    description,
    alternates: { canonical: `https://rinkstop.com/directory/brands/${id}` },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(brand.logo_url
        ? { images: [{ url: brand.logo_url, width: 400, height: 400, alt: `${brand.name} logo` }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(brand.logo_url ? { images: [brand.logo_url] } : {}),
    },
  };
}

export default async function BrandHandler({ params }: { params: Params }) {
  const { id } = await params;

  // UUID path: look up the slug, redirect
  if (UUID_RE.test(id)) {
    const map = await getBrandSlugMap();
    const slug = map.get(id);
    if (slug) redirect(`/directory/brands/${slug}`);
    // Unknown UUID — fall through to "not found"
    return <NotFoundBrand />;
  }

  // Slug path: render
  const data = await getBrandBySlug(id);
  if (!data) return <NotFoundBrand />;
  const { brand, teams } = data;

  // JSON-LD: Brand + BreadcrumbList. Server-rendered, no client script injection.
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  const brandJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Brand',
        name: brand.name,
        ...(brand.description ? { description: brand.description } : {}),
        ...(brand.logo_url ? { logo: brand.logo_url } : {}),
        ...(brand.website_url ? { url: brand.website_url } : {}),
        ...(brand.country_of_origin
          ? { location: { '@type': 'Place', name: brand.country_of_origin } }
          : {}),
        ...(brand.category ? { category: brand.category.replace(/_/g, ' ') } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Brands', item: `${BASE_URL}/directory/brands` },
          { '@type': 'ListItem', position: 3, name: brand.name, item: `${BASE_URL}/directory/brands/${id}` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandJsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/directory/brands" className="text-teal-400 text-sm mb-4 inline-block">
        ← Back to Brands
      </Link>

      <div className="flex items-center gap-6 mb-6">
        {brand.logo_url ? (
          <img
            src={brand.logo_url}
            alt={`${brand.name} logo`}
            className="w-16 h-16 rounded-lg object-contain bg-slate-700 border-2 border-slate-600"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center text-2xl border-2 border-slate-600"
            style={{ fontWeight: 700, color: '#fff' }}
          >
            {brand.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white">{brand.name}</h1>
          <p className="text-teal-400 capitalize">
            {(brand.category || '').replace('_', ' ')}
          </p>
        </div>
      </div>

      <div className="h-[2px] bg-brand-gradient rounded-full w-32 mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
          <h2 className="font-semibold mb-3 text-white">Details</h2>
          <dl className="space-y-2 text-sm">
            {brand.country_of_origin && (
              <div>
                <dt className="text-slate-500">Origin</dt>
                <dd className="text-slate-300">
                  <Link
                    href={`/directory/${brand.country_of_origin.toLowerCase().replace(/ /g, '-')}`}
                    className="hover:text-teal-400"
                  >
                    {brand.country_of_origin}
                  </Link>
                </dd>
              </div>
            )}
            {brand.website_url && (
              <div>
                <dt className="text-slate-500">Website</dt>
                <dd>
                  <a
                    href={brand.website_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="text-teal-400 hover:underline break-all"
                  >
                    {brand.website_url}
                  </a>
                </dd>
              </div>
            )}
            {brand.category && (
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="text-slate-300 capitalize">{(brand.category || '').replace('_', ' ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {brand.description && (
          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <h2 className="font-semibold mb-3 text-white">About</h2>
            <p className="text-slate-300 leading-relaxed">{brand.description}</p>
          </div>
        )}
      </div>

      {teams.length > 0 && (
        <div className="mt-8 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
          <h2 className="font-semibold mb-4 text-white">
            Teams Using {brand.name} ({teams.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teams.map(t => (
              <Link
                key={t.id}
                href={`/directory/teams/${t.slug || t.id}`}
                className="bg-slate-800/50 p-3 rounded-lg hover:bg-slate-800 transition-colors block"
              >
                <p className="text-white font-medium">{t.name}</p>
                <p className="text-slate-500 text-sm">
                  {t.city ? `${t.city}, ${t.country}` : t.country}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

function NotFoundBrand() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h1 className="text-2xl font-bold text-white mb-2">Brand not found</h1>
      <p className="text-slate-400 mb-6">The brand you're looking for doesn't exist in our directory.</p>
      <Link href="/directory/brands" className="text-teal-400 hover:underline">
        ← Back to all brands
      </Link>
    </div>
  );
}
