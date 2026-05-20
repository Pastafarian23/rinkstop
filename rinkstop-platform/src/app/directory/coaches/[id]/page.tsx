'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CoachDetail() {
  const { id } = useParams();
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/coaches?id=${id}`).then(r => r.json()).then(d => {
      setCoach(d?.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>Loading...</div>
    </main>
  );

  if (!coach) return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <a href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <a href="/directory" style={{ color: '#555', textDecoration: 'none' }}>Directory</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <a href="/directory/coaches" style={{ color: '#555', textDecoration: 'none' }}>Coaches</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Not Found</span>
      </nav>
      <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>Coach not found</p>
        <Link href="/directory/coaches" style={{ color: '#C8102E' }}>← Back to Coaches</Link>
      </div>
    </main>
  );

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <a href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <a href="/directory" style={{ color: '#555', textDecoration: 'none' }}>Directory</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <a href="/directory/coaches" style={{ color: '#555', textDecoration: 'none' }}>Coaches</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{coach.first_name} {coach.last_name}</span>
      </nav>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, flexShrink: 0 }}>
            {(coach.first_name?.[0] || '') + (coach.last_name?.[0] || '')}
          </div>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, marginBottom: '0.5rem' }}>
              {coach.first_name} {coach.last_name}
            </h1>
            {coach.position && <p style={{ color: '#C8102E', fontSize: '0.9375rem', fontWeight: 600 }}>{coach.position}</p>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {coach.certification_level && (
            <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.2)', borderRadius: '6px', padding: '1rem' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>Certification</p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#C8102E' }}>{coach.certification_level}</p>
            </div>
          )}
          {coach.nationality && (
            <div style={{ background: 'var(--s3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>Nationality</p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff' }}>{coach.nationality}</p>
            </div>
          )}
          {coach.email && (
            <div style={{ background: 'var(--s3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>Email</p>
              <a href={`mailto:${coach.email}`} style={{ fontSize: '0.875rem', color: '#C8102E', textDecoration: 'none' }}>{coach.email}</a>
            </div>
          )}
          {coach.phone && (
            <div style={{ background: 'var(--s3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>Phone</p>
              <a href={`tel:${coach.phone}`} style={{ fontSize: '0.875rem', color: '#fff', textDecoration: 'none' }}>{coach.phone}</a>
            </div>
          )}
        </div>

        {coach.teams?.name && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--s3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>Team</p>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{coach.teams.name}</p>
          </div>
        )}
      </div>
    </main>
  );
}