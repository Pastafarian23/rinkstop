'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchIcon, FilterIcon, ExternalLinkIcon } from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────
interface YouthProgram {
  id: string;
  name: string;
  description?: string;
  program_type: 'learn_to_play' | 'house_league' | 'travel_team' | 'high_school' | 'girls_only';
  city?: string;
  province_state?: string;
  country: string;
  website_url?: string;
  age_min?: number;
  age_max?: number;
  contact_email?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PROGRAM_TYPE_LABELS: Record<string, string> = {
  learn_to_play: 'Learn to Play',
  house_league: 'House League',
  travel_team: 'Travel Team',
  high_school: 'High School',
  girls_only: "Girls' Only",
};

const PROGRAM_TYPE_COLOR: Record<string, string> = {
  learn_to_play: 'rgba(255,184,28,0.15)',
  house_league: 'rgba(16,120,200,0.15)',
  travel_team: 'rgba(200,16,46,0.15)',
  high_school: 'rgba(50,180,80,0.15)',
  girls_only: 'rgba(180,80,200,0.15)',
};

const COUNTRIES = ['Canada', 'USA', 'Philippines', 'United Kingdom', 'Singapore', 'Thailand', 'India', 'South Africa'];

const AGE_RANGE = (p: YouthProgram) => {
  if (!p.age_min && !p.age_max) return 'All ages';
  if (p.age_min && p.age_max) return `Ages ${p.age_min}–${p.age_max}`;
  if (p.age_min) return `Ages ${p.age_min}+`;
  return `Up to age ${p.age_max}`;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function YouthProgramsPage() {
  const [programs, setPrograms] = useState<YouthProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    setLoading(true);
    fetch(`/api/youth-programs?${params}`)
      .then(r => r.json())
      .then(d => {
        setPrograms(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [country]);

  const filtered = programs.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.country || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', paddingTop: '1.25rem', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/youth-hockey" style={{ color: '#555555' }}>Youth Hockey</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Programs</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="label" style={{ marginBottom: '0.5rem' }}>Youth Hockey</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          YOUTH PROGRAMS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Local youth hockey programs from around the world. Know one we&apos;re missing? Add it below.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
        marginBottom: '1.25rem', padding: '0.875rem 1rem',
        background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555555' }}>
          <FilterIcon className="w-4 h-4" />
        </div>

        {/* Country select */}
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          style={{
            background: 'var(--s2)', border: '1px solid var(--border)',
            color: country ? '#fff' : 'var(--muted)',
            borderRadius: '4px', padding: '0.5rem 2rem 0.5rem 0.75rem',
            fontSize: '0.8125rem', cursor: 'pointer', minWidth: 160,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.625rem center',
          }}
        >
          <option value="">All Countries</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555555', pointerEvents: 'none' }}>
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {(search || country) && (
          <button
            onClick={() => { setSearch(''); setCountry(''); }}
            style={{
              background: 'transparent', border: '1.5px solid rgba(255,255,255,0.3)',
              color: '#fff', borderRadius: '3px', padding: '0.5rem 0.875rem',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.07em', textTransform: 'uppercase',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          {filtered.length === 0
            ? 'No programs found'
            : `${filtered.length} program${filtered.length !== 1 ? 's' : ''}`}
          {country ? ` in ${country}` : ''}
          {search ? ` matching "${search}"` : ''}
        </p>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.875rem',
        marginBottom: '2.5rem',
      }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '70%', marginBottom: '0.625rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '45%', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: '0.75rem', width: '55%' }} />
              </div>
            ))
          : filtered.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
                  {country ? `No programs listed in ${country} yet.` : 'No programs found matching your search.'}
                </p>
                <Link href="/directory/youth-hockey" style={{ color: 'var(--red)', fontSize: '0.875rem', fontWeight: 600 }}>
                  ← Back to Youth Hockey Hub
                </Link>
              </div>
            )
            : filtered.map(program => (
              <div
                key={program.id}
                style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1.125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
              >
                {/* Type badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '0.15rem 0.4rem', borderRadius: '3px',
                    background: PROGRAM_TYPE_COLOR[program.program_type] || 'rgba(200,16,46,0.15)',
                    color: 'var(--red)',
                  }}>
                    {PROGRAM_TYPE_LABELS[program.program_type] || program.program_type}
                  </span>
                  {program.website_url && (
                    <a
                      href={program.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Name */}
                <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.3 }}>
                  {program.name}
                </h3>

                {/* Location */}
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem' }}>
                  {[program.city, program.province_state, program.country].filter(Boolean).join(', ') || program.country}
                </p>

                {/* Age range */}
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                  {AGE_RANGE(program)}
                </p>

                {/* Description */}
                {program.description && (
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.6, marginTop: '0.125rem' }}>
                    {program.description.length > 100 ? program.description.slice(0, 100) + '…' : program.description}
                  </p>
                )}
              </div>
            ))
        }
      </div>

      {/* Add Your Program CTA */}
      <div style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: 'clamp(1.5rem, 4vw, 2rem)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h3 className="font-sport" style={{ fontSize: '1.375rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.375rem' }}>
            ADD YOUR PROGRAM
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', maxWidth: '420px', lineHeight: 1.6 }}>
            Know a youth hockey program that isn&apos;t listed? Help other parents and coaches find it. It takes two minutes.
          </p>
        </div>
        <a
          href="mailto:support@rinkstop.com?subject=Add Youth Hockey Program"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--red)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.8125rem',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            padding: '0.625rem 1.25rem',
            borderRadius: '3px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          + Add Program
        </a>
      </div>
    </div>
  );
}
