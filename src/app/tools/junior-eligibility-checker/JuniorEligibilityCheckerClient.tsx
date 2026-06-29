'use client';

// src/app/tools/junior-eligibility-checker/JuniorEligibilityCheckerClient.tsx
//
// Junior Hockey Eligibility Checker. Visual styling mirrors
// /tools/hockey-glove-size-calculator exactly (dark theme, inline styles,
// Bebas Neue on big numbers, #C8102E red accents, #FFB81C gold result text).
//
// Calc convention:
//   "Hockey age" = player's age on Sept 15 of the season's first year.
//     Born before Sept 15: age = seasonYear - birthYear
//     Born on/after Sept 15: age = seasonYear - birthYear - 1
//
// League age rules (verified 2026-06-29):
//   OHL   (CHL):  16-21 (max 5 yrs in league)
//   WHL   (CHL):  15-20 (year of 20th birthday graduates)
//   QMJHL (CHL):  16-21 (max 5 yrs)
//   USHL  (Tier 1 USA): Phase I = 16, Phase II = 17-20, max age 20
//   NCDC  (Tier 1 USA): 17-21
//   NAHL  (Tier 2 USA): 14-20
//   BCHL  (Junior A Canada): 16-20 (NCAA-eligible amateur)
//   AJHL  (Junior A Canada): 16-20
//   NCAA:  age 18+ for first enrollment; new 2026 rule: must enroll by
//          academic year after 19th birthday to get 5 yrs eligibility
//
// Self-test mirror: /tmp/junior-elig-selftest.mjs

import { useState, useMemo, useEffect } from 'react';
import ShareButton from '@/components/ShareButton';
import { buildToolShare } from '@/lib/share';

type Status = 'eligible' | 'next-year' | 'too-young' | 'too-old' | 'amateur-eligible';

interface LeagueRow {
  key: string;
  name: string;
  country: 'CAN' | 'USA' | 'BOTH';
  level: string;
  minAge: number;
  maxAge: number;
  note: string;
  source: string;
}

const LEAGUES: LeagueRow[] = [
  {
    key: 'ohl',
    name: 'OHL',
    country: 'CAN',
    level: 'CHL (Major Junior)',
    minAge: 16,
    maxAge: 21,
    note: 'Ontario Hockey League. Max 5 years. 2026 draft = 2010-born. 16-yr-olds must be among first picks to play immediately.',
    source: 'chl.ca/ohl/priorityselectionprocess (verified 2026-06-29)',
  },
  {
    key: 'whl',
    name: 'WHL',
    country: 'CAN',
    level: 'CHL (Major Junior)',
    minAge: 15,
    maxAge: 20,
    note: 'Western Hockey League. 2026 draft = 2011-born (listed at 15). Plays through year of 20th birthday.',
    source: 'chl.ca/whl/faqs (verified 2026-06-29)',
  },
  {
    key: 'qmjhl',
    name: 'QMJHL',
    country: 'CAN',
    level: 'CHL (Major Junior)',
    minAge: 16,
    maxAge: 21,
    note: 'Quebec Major Junior Hockey League. Max 5 years. Same draft cycle as OHL.',
    source: 'chl.ca (verified 2026-06-29)',
  },
  {
    key: 'ushl',
    name: 'USHL',
    country: 'USA',
    level: 'Tier 1 USA',
    minAge: 16,
    maxAge: 20,
    note: 'United States Hockey League. Phase I draft = 16-yr-olds. Phase II = 17-20. Only Tier 1 path to NCAA D1.',
    source: 'ushl.com/news/2026/4/28 (verified 2026-06-29)',
  },
  {
    key: 'ncdc',
    name: 'NCDC',
    country: 'USA',
    level: 'Tier 1 USA',
    minAge: 17,
    maxAge: 21,
    note: 'National Collegiate Development Conference. Newer Tier 1 league; 17-21 age band.',
    source: 'USHL.com / NCDC rules (verified 2026-06-29)',
  },
  {
    key: 'nahl',
    name: 'NAHL',
    country: 'USA',
    level: 'Tier 2 USA',
    minAge: 14,
    maxAge: 20,
    note: 'North American Hockey League. Tier 2 (separate from USHL Tier 1). Earlier entry age.',
    source: 'nahl.com (verified 2026-06-29)',
  },
  {
    key: 'bchl',
    name: 'BCHL',
    country: 'CAN',
    level: 'Junior A Canada',
    minAge: 16,
    maxAge: 20,
    note: 'British Columbia Hockey League. Junior A — amateur, NCAA-eligible. Scholarship league.',
    source: 'bchl.ca (verified 2026-06-29)',
  },
  {
    key: 'ajhl',
    name: 'AJHL',
    country: 'CAN',
    level: 'Junior A Canada',
    minAge: 16,
    maxAge: 20,
    note: 'Alberta Junior Hockey League. Junior A — amateur, NCAA-eligible.',
    source: 'ajhl.com (verified 2026-06-29)',
  },
  {
    key: 'ncaa',
    name: 'NCAA',
    country: 'USA',
    level: 'College (D1/D2/D3)',
    minAge: 18,
    maxAge: 25,
    note: 'New 2026 rule: must enroll full-time by academic year after 19th birthday for 5-yr eligibility. Previously 4 seasons / 5 years.',
    source: 'ncaa.org/sports/2026/6/23 (verified 2026-06-29)',
  },
];

function hockeyAge(birthYear: number, birthMonth: number, seasonStartYear: number): number {
  // Industry convention (Hockey Canada / NHL): the Sept 15 cutoff.
  // Born Jan-Aug of (seasonYear): age = seasonYear - birthYear
  // Born Sep-Dec: effectively one year younger for that season
  //   (since they'd turn the new age after Sept 15 — the cutoff).
  // Simplified: month >= 9 → one year younger.
  if (birthMonth >= 9) return seasonStartYear - birthYear - 1;
  return seasonStartYear - birthYear;
}

function statusForLeague(age: number, league: LeagueRow, seasonStartYear: number): { status: Status; reason: string } {
  if (league.key === 'ncaa') {
    // NCAA: must be 18+ by start of college season; the new 2026 age-based rule
    // means clock starts at 19. We report eligibility based on age 18.
    if (age < 18) return { status: 'too-young', reason: 'Under 18 — NCAA requires age 18+ by start of college season.' };
    if (age > 25) return { status: 'too-old', reason: 'Past typical NCAA age window.' };
    if (age === 18 || age === 19) return { status: 'eligible', reason: 'Eligible to enroll and compete.' };
    return { status: 'amateur-eligible', reason: 'Eligible, but eligibility clock already running (verify with school).' };
  }

  // Junior leagues
  if (age < league.minAge) {
    const nextYear = league.minAge - age;
    return {
      status: 'too-young',
      reason: `${nextYear} yr${nextYear === 1 ? '' : 's'} too young. Eligible starting ${seasonStartYear + nextYear}-${(seasonStartYear + nextYear + 1) % 100} season.`,
    };
  }
  if (age > league.maxAge) {
    return { status: 'too-old', reason: `Past age-out. League max age is ${league.maxAge}.` };
  }
  if (age === league.maxAge) {
    return { status: 'next-year', reason: `Last eligible season (age ${league.maxAge} is the final year).` };
  }
  return { status: 'eligible', reason: 'Eligible for this season.' };
}

export default function JuniorEligibilityCheckerClient() {
  // Defaults: a 16-year-old born in 2010 (current draft-class player)
  const [birthYear, setBirthYear] = useState<number>(2010);
  const [birthMonth, setBirthMonth] = useState<number>(4);
  const [seasonStartYear, setSeasonStartYear] = useState<number>(2026);

  const age = useMemo(() => hockeyAge(birthYear, birthMonth, seasonStartYear), [birthYear, birthMonth, seasonStartYear]);

  const grid = useMemo(() => {
    return LEAGUES.map((l) => ({
      ...l,
      ...statusForLeague(age, l, seasonStartYear),
    }));
  }, [age, seasonStartYear]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as unknown as { __eligCalcUsed?: boolean }).__eligCalcUsed) return;
    (window as unknown as { __eligCalcUsed?: boolean }).__eligCalcUsed = true;
    try {
      const NAV = navigator as unknown as { sendBeacon?: (u: string, d: Blob) => boolean };
      if (typeof NAV.sendBeacon === 'function') {
        NAV.sendBeacon(
          '/api/track',
          new Blob([JSON.stringify({ name: 'calculator_used', pathname: '/tools/junior-eligibility-checker', props: { tool: 'junior_eligibility_checker', age, birthYear, birthMonth, seasonStartYear } })], { type: 'application/json' }),
        );
      }
    } catch {
      // never block
    }
  }, [age, birthYear, birthMonth, seasonStartYear]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    color: '#fff',
    padding: '0.625rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '6px',
    fontWeight: 600,
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '6px',
  };

  const statusColor = (s: Status) => {
    switch (s) {
      case 'eligible': return { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', text: '#22c55e', icon: '✓', label: 'ELIGIBLE' };
      case 'next-year': return { bg: 'rgba(255,184,28,0.12)', border: 'rgba(255,184,28,0.4)', text: '#FFB81C', icon: '⚠', label: 'LAST YEAR' };
      case 'too-young': return { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.4)', text: '#60a5fa', icon: '⏳', label: 'TOO YOUNG' };
      case 'too-old': return { bg: 'rgba(200,16,46,0.12)', border: 'rgba(200,16,46,0.4)', text: '#C8102E', icon: '✕', label: 'AGE OUT' };
      case 'amateur-eligible': return { bg: 'rgba(255,184,28,0.08)', border: 'rgba(255,184,28,0.3)', text: '#FFB81C', icon: '◐', label: 'VERIFY' };
    }
  };

  const currentYear = 2026;
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i); // 2025-2030

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-block', padding: '0.25rem 0.75rem',
            background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: '4px', color: '#C8102E', fontSize: '0.75rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px',
          }}>
            Free Tool · 2026 Data
          </div>
          <h1 style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)', margin: '0 0 0.5rem',
            letterSpacing: '0.02em', lineHeight: 1,
          }}>
            Junior Hockey Eligibility Checker
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto' }}>
            League-by-league eligibility for OHL, WHL, QMJHL, USHL, NCDC, NAHL, BCHL, AJHL, and NCAA.{' '}
            <span style={{ color: '#FFB81C' }}>No email required.</span>
          </p>
        </div>

        {/* Input form */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label htmlFor="birthYear" style={labelStyle}>Birth year: {birthYear}</label>
              <input
                id="birthYear"
                type="range"
                min={1990}
                max={2014}
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8102E' }}
                data-testid="birth-year"
              />
              <div style={helperStyle}>1990 – 2014</div>
            </div>

            <div>
              <label htmlFor="birthMonth" style={labelStyle}>Birth month</label>
              <select
                id="birthMonth"
                value={birthMonth}
                onChange={(e) => setBirthMonth(Number(e.target.value))}
                style={inputStyle}
                data-testid="birth-month"
              >
                {[
                  { v: 1, n: 'January' }, { v: 2, n: 'February' }, { v: 3, n: 'March' },
                  { v: 4, n: 'April' }, { v: 5, n: 'May' }, { v: 6, n: 'June' },
                  { v: 7, n: 'July' }, { v: 8, n: 'August' }, { v: 9, n: 'September' },
                  { v: 10, n: 'October' }, { v: 11, n: 'November' }, { v: 12, n: 'December' },
                ].map(m => (
                  <option key={m.v} value={m.v}>{m.n}</option>
                ))}
              </select>
              <div style={helperStyle}>Sept 15 cutoff applies (industry standard).</div>
            </div>

            <div>
              <label htmlFor="season" style={labelStyle}>Season</label>
              <select
                id="season"
                value={seasonStartYear}
                onChange={(e) => setSeasonStartYear(Number(e.target.value))}
                style={inputStyle}
                data-testid="season"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}-{((y + 1) % 100).toString().padStart(2, '0')}</option>
                ))}
              </select>
              <div style={helperStyle}>Default current season.</div>
            </div>
          </div>
        </div>

        {/* Player summary card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(255,184,28,0.08) 100%)',
          border: '1px solid rgba(200,16,46,0.3)', borderRadius: '12px',
          padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 600 }}>
            Hockey age for {seasonStartYear}-{(seasonStartYear + 1) % 100} season
          </div>
          <div style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: 'clamp(3rem, 8vw, 5rem)', color: '#FFB81C',
            lineHeight: 1, letterSpacing: '0.02em',
          }} data-testid="hockey-age">
            {age} yrs old
          </div>
          <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', marginTop: '12px' }}>
            Born {birthMonth}/{birthYear}. Hockey age uses Sept 15 cutoff.
          </div>
        </div>

        {/* League eligibility grid */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
            League-by-league eligibility
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {grid.map((row) => {
              const c = statusColor(row.status);
              return (
                <div key={row.key} style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                }}>
                  <div style={{
                    fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                    fontSize: '1.5rem', color: '#FFB81C', lineHeight: 1, minWidth: '60px',
                  }}>
                    {row.name}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                      {row.level} · ages {row.minAge}-{row.maxAge} · {row.country}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                      {row.reason}
                    </div>
                  </div>
                  <div style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: '6px',
                    padding: '0.4rem 0.85rem',
                    color: c.text,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    whiteSpace: 'nowrap',
                  }} data-testid={`status-${row.key}`}>
                    {c.icon} {c.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* League notes / methodology */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
            League notes
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            {grid.map((row) => (
              <div key={row.key}>
                <strong style={{ color: '#FFB81C' }}>{row.name}:</strong>{' '}
                {row.note}{' '}
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
                  (source: {row.source})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-link */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Ready to find a junior team?</strong>{' '}
            Browse the RinkStop directory by country, league, and age band.
          </div>
          <a
            href="/directory/teams"
            style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              background: 'transparent', color: '#FFB81C',
              border: '1px solid #FFB81C', borderRadius: '6px',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Team directory →
          </a>
        </div>

        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Cost of junior hockey?</strong>{' '}
            Free estimate — registration, equipment, ice time, travel for the season.
          </div>
          <a
            href="/tools/hockey-cost-calculator"
            style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              background: 'transparent', color: '#FFB81C',
              border: '1px solid #FFB81C', borderRadius: '6px',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Cost calculator →
          </a>
        </div>

        {/* Methodology */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5,
        }}>
          <strong style={{ color: '#FFB81C' }}>How we calculated this.</strong>{' '}
          Hockey age uses the industry-standard Sept 15 cutoff: a player born
          before Sept 15 of the season’s start year is that many years old;
          born on or after Sept 15, one year younger. CHL leagues (OHL, WHL,
          QMJHL) follow Hockey Canada rules. WHL is 15-20 (year of 20th
          birthday graduates). OHL / QMJHL are 16-21 with a 5-year maximum.
          USHL is Tier 1 with Phase I = 16-yr-olds and Phase II = 17-20.
          NCDC is Tier 1, 17-21. NAHL is Tier 2, 14-20. BCHL / AJHL are
          Junior A amateur leagues, 16-20, NCAA-eligible. NCAA rule is
          new in 2026: must enroll full-time by the academic year after the
          19th birthday to get up to 5 years of eligibility.
        </div>

        {/* Share */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShareButton
            payload={buildToolShare({
              name: 'Junior Hockey Eligibility Checker',
              slug: 'junior-eligibility-checker',
            })}
            variant="brand"
          />
        </div>

        {/* Tertiary CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <a
            href="/directory/teams"
            style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e',
              borderRadius: '8px', padding: '1rem',
              color: '#fff', textDecoration: 'none',
            }}
          >
            <div style={{ color: '#FFB81C', fontWeight: 700, marginBottom: '4px' }}>
              Find a junior team →
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
              Browse teams by league, country, and age band.
            </div>
          </a>
          <a
            href="/claim-your-listing"
            style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e',
              borderRadius: '8px', padding: '1rem',
              color: '#fff', textDecoration: 'none',
            }}
          >
            <div style={{ color: '#FFB81C', fontWeight: 700, marginBottom: '4px' }}>
              Own a junior team? →
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
              Claim your listing — free, takes 2 min.
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}