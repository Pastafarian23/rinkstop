'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import { buildToolShare } from '@/lib/share';

type Level = 'house' | 'a' | 'aa' | 'aaa' | 'junior' | 'adult';
type Region = 'sunless' | 'hockey_belt' | 'northeast' | 'west' | 'midatlantic' | 'south' | 'canada' | 'europe';

interface CostBreakdown {
  registration: number;
  teamFees: number;
  equipment: number;
  iceTime: number;
  tournaments: number;
  travel: number;
  hidden: number;
  total: number;
}

const LEVEL_BASE: Record<Level, Omit<CostBreakdown, 'total'>> = {
  // 2026 industry data, mid-range. Adjusted by region multiplier below.
  // Source: USA Hockey 2025-26 fees, Crossbar 10-year data (Tier 2 avg $2,448,
  // Tier 1 avg $7,055), Hockey Budget 2026 data, Sandbar Hockey 2026 survey.
  house: {
    registration: 100,   // USA Hockey + affiliate
    teamFees: 800,       // House league: 1-2 practices/wk, 1 game/wk, no travel
    equipment: 350,      // Amortized: $700 first year, $200-300 replacement
    iceTime: 200,        // Optional skills sessions, public skate passes
    tournaments: 0,      // House doesn't travel for tournaments typically
    travel: 200,         // Gas to/from rink, ~80 trips × 8 miles × $3.40/gal
    hidden: 150,         // Team social, end-of-year banquet, fundraisers
  },
  a: {
    registration: 100,
    teamFees: 2500,      // Tier 2 entry: paid coaching, 1 tournament
    equipment: 500,      // More frequent replacement, higher-quality gear
    iceTime: 500,        // Skills clinics, power skating
    tournaments: 800,    // 2-3 local tournaments
    travel: 600,         // Regional travel begins: hotels, more gas
    hidden: 300,         // Team fees, off-ice training
  },
  aa: {
    registration: 100,
    teamFees: 6000,      // Tier 1 entry: serious program, multiple coaches
    equipment: 700,      // High-end gear, more frequent replacement
    iceTime: 1500,       // Skills academies, shooting coaches
    tournaments: 1800,   // 4-6 tournaments, some regional
    travel: 2500,        // Multi-state travel, more hotel nights
    hidden: 600,         // Spring hockey, off-ice, video review
  },
  aaa: {
    registration: 100,
    teamFees: 12000,     // AAA: $11,000-25,000 typically
    equipment: 1000,     // Multiple sticks, premium everything
    iceTime: 3000,       // Year-round development, private coaching
    tournaments: 4000,   // 5-8 tournaments, showcase events
    travel: 6000,        // Flights, multiple hotel nights, bag fees
    hidden: 1500,        // Showcases, combine fees, mental performance coaches
  },
  junior: {
    registration: 100,
    teamFees: 8000,      // Tier III junior, NAHL tier
    equipment: 700,
    iceTime: 1000,
    tournaments: 2000,
    travel: 4000,        // Billet housing sometimes offsets
    hidden: 800,
  },
  adult: {
    registration: 75,    // USA Hockey adult
    teamFees: 1200,      // Beer league + jersey
    equipment: 250,      // Used gear common in adult
    iceTime: 200,
    tournaments: 0,
    travel: 100,
    hidden: 100,
  },
};

const REGION_MULTIPLIER: Record<Region, number> = {
  // Sun Belt = expensive because few rinks, no community infrastructure
  sunless: 1.8,         // AZ, FL, TX, NV, NM, GA, SC, NC (Sun Belt)
  hockey_belt: 0.8,     // MN, WI, ND, SD, MI, MA (community rinks, low cost)
  northeast: 1.3,       // NY, NJ, CT, PA, RI, NH, VT, ME
  west: 1.5,            // CA, WA, OR, CO, UT (West Coast premium)
  midatlantic: 1.1,     // OH, IN, IL, MO, IA, KS, NE
  south: 1.4,           // TN, AL, MS, LA, AR, OK, KY
  canada: 1.0,          // CAD similar to USD; minor variance
  europe: 1.2,          // Higher facility costs in many EU countries
};

const REGION_LABELS: Record<Region, string> = {
  sunless: 'Sun Belt (AZ, FL, TX, NV, etc.)',
  hockey_belt: 'Hockey Belt (MN, WI, MI, MA, etc.)',
  northeast: 'Northeast (NY, NJ, CT, PA, etc.)',
  west: 'West Coast (CA, WA, OR, CO, etc.)',
  midatlantic: 'Midwest (OH, IN, IL, etc.)',
  south: 'South (TN, AL, KY, OK, etc.)',
  canada: 'Canada',
  europe: 'Europe',
};

const LEVEL_LABELS: Record<Level, { name: string; desc: string }> = {
  house: { name: 'House / Recreational', desc: 'Local league, 1-2 practices/wk, 1 game/wk, minimal travel' },
  a: { name: 'A / Tier 2 Travel', desc: 'Competitive travel team, 2-3 practices/wk, regional tournaments' },
  aa: { name: 'AA / Tier 1 Travel', desc: 'High-level travel, paid coaching, multi-state tournaments' },
  aaa: { name: 'AAA / Showcase', desc: 'Top tier, year-round development, national showcase events' },
  junior: { name: 'Junior (Tier III / NAHL)', desc: 'Ages 16-20, semi-pro track, billet living' },
  adult: { name: 'Adult / Beer League', desc: 'Recreational adult hockey, weekly games' },
};

function calculateCost(level: Level, region: Region, age: number, newEquipment: boolean): CostBreakdown {
  const base = LEVEL_BASE[level];
  const mult = REGION_MULTIPLIER[region];
  const equipmentAdj = newEquipment ? 1.5 : 1.0; // First-year equipment is ~50% more
  const ageAdj = age <= 8 ? 0.85 : age <= 12 ? 1.0 : 1.1; // Younger kids = less tournament travel

  return {
    registration: Math.round(base.registration * mult),
    teamFees: Math.round(base.teamFees * mult * ageAdj),
    equipment: Math.round(base.equipment * equipmentAdj * mult),
    iceTime: Math.round(base.iceTime * mult),
    tournaments: Math.round(base.tournaments * mult * ageAdj),
    travel: Math.round(base.travel * mult * ageAdj),
    hidden: Math.round(base.hidden * mult),
    get total() { return this.registration + this.teamFees + this.equipment + this.iceTime + this.tournaments + this.travel + this.hidden; },
  } as CostBreakdown;
}

const fmt = (n: number) => '$' + n.toLocaleString('en-US');

export default function HockeyCostCalculatorClient() {
  const [level, setLevel] = useState<Level>('house');
  const [region, setRegion] = useState<Region>('hockey_belt');
  const [age, setAge] = useState<number>(10);
  const [newEquipment, setNewEquipment] = useState<boolean>(true);

  // Fire a 'calculator_used' event the first time the user touches any input.
  // We use a ref to make sure it only fires once per page load, not on
  // every change. This is the conversion event — distinguishes 'viewed'
  // (bounced) from 'used' (engaged).
  const interactionTrackedRef = useRef(false);
  function trackInteraction(action: string) {
    if (interactionTrackedRef.current) return;
    interactionTrackedRef.current = true;
    try {
      navigator.sendBeacon?.(
        '/api/track',
        new Blob(
          [
            JSON.stringify({
              name: 'calculator_used',
              pathname: '/tools/hockey-cost-calculator',
              props: { action, initialLevel: level, initialRegion: region, initialAge: age },
            }),
          ],
          { type: 'application/json' }
        )
      );
    } catch {
      // ignore
    }
  }

  const cost = useMemo(() => calculateCost(level, region, age, newEquipment), [level, region, age, newEquipment]);
  const levelInfo = LEVEL_LABELS[level];

  // CTA: route to /directory/rinks/[state] so the user can find rinks in their state
  // after seeing the cost. Directs organic traffic into the directory funnel.
  const stateSlug = region === 'canada' ? 'canada' : region === 'europe' ? 'international' : 'united-states';

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            background: 'rgba(200,16,46,0.1)',
            border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: 4,
            color: '#C8102E',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
          }}>
            Free Tool · 2026 Data
          </div>
          <h1 style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            margin: '0 0 0.5rem',
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}>
            Youth Hockey Cost Calculator
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: 620, margin: '0 auto' }}>
            Real costs from USA Hockey 2025-26 fees, Crossbar 10-year registration data, and 2026 family surveys.{' '}
            <span style={{ color: '#FFB81C' }}>No email required.</span>
          </p>
        </div>

        {/* Inputs */}
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {/* Level */}
            <div>
              <label htmlFor="level" style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 600 }}>
                Level of play
              </label>
              <select
                id="level"
                value={level}
                onChange={(e) => { trackInteraction('level_changed'); setLevel(e.target.value as Level); }}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                }}
              >
                {(Object.keys(LEVEL_LABELS) as Level[]).map((k) => (
                  <option key={k} value={k}>{LEVEL_LABELS[k].name}</option>
                ))}
              </select>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                {levelInfo.desc}
              </div>
            </div>

            {/* Region */}
            <div>
              <label htmlFor="region" style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 600 }}>
                Where you play
              </label>
              <select
                id="region"
                value={region}
                onChange={(e) => { trackInteraction('region_changed'); setRegion(e.target.value as Region); }}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                }}
              >
                {(Object.keys(REGION_LABELS) as Region[]).map((k) => (
                  <option key={k} value={k}>{REGION_LABELS[k]}</option>
                ))}
              </select>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                Region adjusts for rink availability & cost of ice
              </div>
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 600 }}>
                Player age: {age}
              </label>
              <input
                id="age"
                type="range"
                min={6}
                max={20}
                value={age}
                onChange={(e) => { trackInteraction('age_changed'); setAge(parseInt(e.target.value)); }}
                style={{ width: '100%', accentColor: '#C8102E' }}
              />
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                Younger players travel less for tournaments
              </div>
            </div>

            {/* New equipment */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 600 }}>
                Equipment
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setNewEquipment(true)}
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    background: newEquipment ? '#C8102E' : '#1a1a1a',
                    border: '1px solid ' + (newEquipment ? '#C8102E' : '#2a2a2a'),
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: newEquipment ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  First year (new)
                </button>
                <button
                  onClick={() => setNewEquipment(false)}
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    background: !newEquipment ? '#C8102E' : '#1a1a1a',
                    border: '1px solid ' + (!newEquipment ? '#C8102E' : '#2a2a2a'),
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: !newEquipment ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Replacement
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                First year is ~50% more for full gear kit
              </div>
            </div>
          </div>
          {/* Cross-link: stick-size calculator (Day 3 Option A) */}
          <div style={{
            marginTop: '1rem', padding: '0.75rem 1rem',
            background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
            borderRadius: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
          }}>
            💡 <Link href="/tools/hockey-stick-size-calculator" style={{ color: '#FFB81C', fontWeight: 600 }}>
              What size stick do you need?
            </Link>{' '}
            Free stick-size calculator → length, flex, and curve recommendations in 10 seconds.
          </div>

          {/* Cross-link: glove size calculator (Day 4) */}
          <div style={{
            marginTop: '0.5rem', padding: '0.75rem 1rem',
            background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
            borderRadius: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
          }}>
            🧤 <Link href="/tools/hockey-glove-size-calculator" style={{ color: '#FFB81C', fontWeight: 600 }}>
              What size gloves does your player need?
            </Link>{' '}
            Free glove sizing tool → two modes: by height or by arm measurement.
          </div>
        </div>

        {/* Total — the headline number */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(255,184,28,0.08) 100%)',
          border: '1px solid rgba(200,16,46,0.3)',
          borderRadius: 12,
          padding: '2rem 1.5rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: 600 }}>
            Estimated total annual cost
          </div>
          <div style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
            color: '#FFB81C',
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}>
            {fmt(cost.total)}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
            For {levelInfo.name.toLowerCase()} hockey in {REGION_LABELS[region].toLowerCase()} at age {age}
          </div>
        </div>

        {/* Share — full popover (X, Facebook, LinkedIn, WhatsApp, Reddit, Email, Copy).
            Sits right under the total so the user can share the moment they see it. */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <ShareButton
            payload={buildToolShare({
              slug: 'hockey-cost-calculator',
              name: 'Youth Hockey Cost Calculator',
              description: `How much does youth hockey really cost? Free calculator with real 2026 data.`,
            })}
            variant="brand"
          />
        </div>

        {/* Breakdown */}
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
            Where the money goes
          </h2>
          <BreakdownRow label="Registration (USA Hockey + affiliate)" amount={cost.registration} pct={cost.registration / cost.total} />
          <BreakdownRow label={`Team fees (${levelInfo.name.toLowerCase()})`} amount={cost.teamFees} pct={cost.teamFees / cost.total} highlight />
          <BreakdownRow label="Equipment (amortized)" amount={cost.equipment} pct={cost.equipment / cost.total} />
          <BreakdownRow label="Ice time & skills clinics" amount={cost.iceTime} pct={cost.iceTime / cost.total} />
          <BreakdownRow label="Tournaments" amount={cost.tournaments} pct={cost.tournaments / cost.total} />
          <BreakdownRow label="Travel (gas, hotels, flights)" amount={cost.travel} pct={cost.travel / cost.total} />
          <BreakdownRow label="Hidden costs (social, fundraisers, off-ice)" amount={cost.hidden} pct={cost.hidden / cost.total} />
        </div>

        {/* What this estimate includes + the honest disclaimer */}
        <div style={{
          background: 'rgba(255,184,28,0.05)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.75)',
        }}>
          <strong style={{ color: '#FFB81C' }}>How we calculated this.</strong> Base costs from
          {' '}<a href="https://home.playmetrics.com/blog/youth-hockey-pricing-benchmarks" target="_blank" rel="noopener noreferrer" style={{ color: '#FFB81C' }}>Playmetrics/Crossbar 10-year registration data</a>,{' '}
          <a href="https://www.hockeybudget.com/blog/hockey-cost-by-level" target="_blank" rel="noopener noreferrer" style={{ color: '#FFB81C' }}>Hockey Budget 2026 cost analysis</a>, and USA Hockey 2025-26 membership fees. Regional multipliers reflect documented variation — Arizona Tier 2 families pay ~$5,912/season while Alaska pays ~$450. Your actual costs can vary 30-50% based on team, location, and personal choices.
        </div>

        {/* CTA: route to the directory */}
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', color: '#fff', fontWeight: 700, fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.02em' }}>
            Now find rinks in your area
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1.5rem', fontSize: '1.05rem' }}>
            RinkStop is the global directory of hockey rinks, teams, and leagues. Browse {stateSlug === 'united-states' ? 'US' : stateSlug === 'canada' ? 'Canadian' : 'international'} rinks, claim your local rink, or list your team — all free to start.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/directory/${stateSlug}`}
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: '#C8102E',
                color: '#fff',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              Browse rinks →
            </Link>
            <Link
              href="/add-listing"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#FFB81C',
                border: '1px solid #FFB81C',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              Add your rink or team
            </Link>
          </div>
        </div>

        {/* Footer credit */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '2rem' }}>
          Data sources: USA Hockey 2025-26 fees, Playmetrics 10-year dataset, Hockey Budget 2026 cost analysis. Updated June 2026.
        </div>
      </div>
    </main>
  );
}

function BreakdownRow({ label, amount, pct, highlight }: { label: string; amount: number; pct: number; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: '0.95rem', color: highlight ? '#FFB81C' : 'rgba(255,255,255,0.85)', fontWeight: highlight ? 600 : 400 }}>{label}</span>
        <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(amount)}</span>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{
          background: highlight ? '#C8102E' : '#666',
          width: `${Math.max(pct * 100, 2)}%`,
          height: '100%',
          transition: 'width 0.2s ease',
        }} />
      </div>
    </div>
  );
}
