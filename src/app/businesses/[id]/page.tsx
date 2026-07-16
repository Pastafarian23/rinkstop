import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { CATEGORIES, type Category } from '@/app/dashboard/listings/ListingsManager';
import ShareButton from '@/components/ShareButton';
import { buildBusinessShare } from '@/lib/share';

const VALID_CATEGORIES = new Set<Category>(['pro_shop', 'sharpening', 'camp', 'training', 'equipment', 'other']);

const DAYS_FULL: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('listings')
    .select('business_name, description, location')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();
  if (!data) return { title: 'Business · RinkStop' };
  return {
    title: `${data.business_name} · RinkStop`,
    description: data.description?.slice(0, 160) || `${data.business_name} on RinkStop`,
  };
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id, business_name, category, description, location, contact_email, contact_phone, website, logo_url, photos, hours, tier, is_published, created_at, updated_at')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) notFound();

  const cat = CATEGORIES.find((c) => c.value === data.category);
  const safeCategory: Category = VALID_CATEGORIES.has(data.category as Category) ? (data.category as Category) : 'other';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link
        href="/businesses"
        style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem' }}
      >
        ← All businesses
      </Link>

      <header
        style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.75rem',
          display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start',
        }}
      >
        <div style={{ fontSize: '3rem' }}>{cat?.emoji || '🛍️'}</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.85rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem',
              }}
            >
              {data.business_name}
            </h1>
            {cat && (
              <span
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  padding: '0.15rem 0.5rem', borderRadius: 999,
                  background: 'rgba(20,184,166,0.12)', color: '#14B8A6',
                  border: '1px solid rgba(20,184,166,0.4)',
                }}
              >
                {cat.label}
              </span>
            )}
          </div>
          {data.location && (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: 2 }}>
              📍 {data.location}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          {data.website && (
            <a
              href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
              target="_blank" rel="noopener noreferrer"
              style={{ padding: '0.5rem 1rem', background: '#14B8A6', color: '#0a0a0a', borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Visit website ↗
            </a>
          )}
          <ShareButton
            payload={buildBusinessShare({
              id: data.id,
              business_name: data.business_name,
              category: data.category,
              city: data.location?.split(',')?.[0]?.trim() || null,
              country: data.location?.split(',')?.slice(-1)?.[0]?.trim() || null,
            })}
            variant="dark"
          />
        </div>
      </header>

      {data.photos && data.photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 8,
          }}
        >
          {data.photos.map((url: string, i: number) => (
            <a
              key={url} href={url} target="_blank" rel="noopener noreferrer"
              style={{ aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e1e1e' }}
            >
              <img src={url} alt={`${data.business_name} photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {data.description && (
          <section
            style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem',
                color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem',
              }}
            >
              ABOUT
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {data.description}
            </p>
          </section>
        )}

        <section
          style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem',
              color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem',
            }}
          >
            CONTACT
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#fff', fontSize: '0.9rem' }}>
            {data.contact_email && (
              <a href={`mailto:${data.contact_email}`} style={{ color: '#14B8A6', textDecoration: 'none' }}>
                ✉️ {data.contact_email}
              </a>
            )}
            {data.contact_phone && (
              <a href={`tel:${data.contact_phone}`} style={{ color: '#14B8A6', textDecoration: 'none' }}>
                📞 {data.contact_phone}
              </a>
            )}
            {data.website && (
              <a
                href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: '#14B8A6', textDecoration: 'none', wordBreak: 'break-all' }}
              >
                🌐 {data.website}
              </a>
            )}
            {data.location && (
              <div style={{ color: 'rgba(255,255,255,0.7)' }}>📍 {data.location}</div>
            )}
            {!data.contact_email && !data.contact_phone && !data.website && (
              <div style={{ color: 'rgba(255,255,255,0.4)' }}>No contact info provided.</div>
            )}
          </div>
        </section>

        {data.hours && Object.keys(data.hours).length > 0 && (
          <section
            style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem',
                color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem',
              }}
            >
              HOURS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {DAYS_FULL.map((d) => {
                const h = data.hours?.[d.key];
                return (
                  <div
                    key={d.key}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: h ? '#fff' : 'rgba(255,255,255,0.3)' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{d.label}</span>
                    <span>{h || 'Closed'}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
        }}
      >
        Listed on RinkStop · {safeCategory.replace('_', ' ')}{data.tier !== 'free' ? ` · ${data.tier} tier` : ''}
      </div>
    </div>
  );
}
