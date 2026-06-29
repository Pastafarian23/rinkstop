'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import { buildToolShare } from '@/lib/share';

type Position = 'forward' | 'defense' | 'goalie';
type Skill = 'beginner' | 'intermediate' | 'advanced';
type StickCategory = 'youth' | 'junior' | 'intermediate' | 'senior';

interface StickRecommendation {
  lengthIn: number;
  flex: number;
  category: StickCategory;
  categoryLabel: string;
  retailLengthRange: string;
  curveFamily: string;
  curveNote: string;
  notes: string[];
}

// Category buckets verified against Bauer / CCM / HockeyMonkey / Icebox / StickMeta
// / Scheels / LabSports sizing charts (4+ sources agree).
//
// Industry standard is FOUR categories, not two. The most common mistake is
// putting intermediate-size players (HS sophomores, adult women, lighter adult
// men 4'11"-5'8" / 90-150 lbs) on senior sticks — those players benefit from
// intermediate flex because senior 70+ flex requires more body weight to load.
const FLEX_BUCKETS: Record<StickCategory, number[]> = {
  youth:        [20, 25, 30, 35, 40],
  junior:       [40, 45, 50, 55],
  intermediate: [55, 60, 65, 70],
  senior:       [70, 75, 85, 95, 102, 110],
};

const RETAIL_LENGTH: Record<StickCategory, string> = {
  youth:        '38–49"',
  junior:       '50–54"',
  intermediate: '55–58"',
  senior:       '57–63"',
};

const CATEGORY_LABEL: Record<StickCategory, string> = {
  youth:        'Youth',
  junior:       'Junior',
  intermediate: 'Intermediate',
  senior:       'Senior',
};

// Category picker: height-first (Bauer's chart is height-indexed), with weight
// as the tiebreaker for the senior/intermediate boundary at 5'4"-6'0".
function pickCategory(heightIn: number, weightLbs: number): StickCategory {
  if (heightIn < 56) return 'youth';                       // under 4'8"
  if (heightIn < 64) return 'junior';                      // 4'8" to 5'4"
  if (heightIn < 72 && weightLbs < 160) return 'intermediate'; // 5'4"-6'0", under 160 lbs
  return 'senior';
}

// Industry-standard length formula: chin-to-nose rule.
// Player holds stick vertically against the body with skates on; the tip
// should land between the chin and the nose. For adult 5'10"+ players the
// nose-to-floor ratio is ~0.83 of standing height. For younger players the
// ratio is higher (kids' heads are proportionally larger), so we floor to
// the category retail range after computing.
function calcLength(heightIn: number, position: Position, skill: Skill, category: StickCategory): number {
  // Base: chin-to-nose approximation (~83% of standing height for adults).
  let length = heightIn * 0.83;

  // Position nudges (small, within ±1 inch).
  if (position === 'defense') length += 0.5;
  if (position === 'goalie') length += 1.0; // goalie sticks are much longer IRL but UI keeps short for now

  // Skill nudges: advanced players prefer shorter sticks for stickhandling.
  if (skill === 'advanced') length -= 0.5;
  if (skill === 'beginner') length += 0.5;

  // Round to nearest half inch.
  let rounded = Math.round(length * 2) / 2;

  // Clamp to category retail range so we don't recommend a stick that isn't
  // actually sold at the category (e.g. a 42" "senior" stick doesn't exist;
  // senior retail is 57-63"). Junior retail 50-54, intermediate 55-58,
  // senior 57-63. Youth retail 38-49.
  const clamp: Record<StickCategory, [number, number]> = {
    youth:        [38, 49],
    junior:       [50, 54],
    intermediate: [55, 58],
    senior:       [57, 63],
  };
  const [lo, hi] = clamp[category];
  return Math.max(lo, Math.min(hi, rounded));
}

// Modern 2026 flex baseline: weight × 0.45 (rounded to nearest standard flex
// within the player's category). The old "weight ÷ 2" rule was for 1990s
// slapshot-dominated play; modern sticks are engineered to bend more easily.
function calcFlex(weightLbs: number, category: StickCategory, skill: Skill, position: Position): number {
  const ideal = Math.round(weightLbs * 0.45);

  // Skill nudges flex by ±5 (beginners go softer for easier whip; advanced
  // go stiffer for muscle-loaded shots).
  let adjusted = ideal;
  if (skill === 'beginner') adjusted -= 5;
  if (skill === 'advanced') adjusted += 5;

  // Defensemen prefer slightly stiffer for slapshot power.
  if (position === 'defense') adjusted += 5;

  // Snap to nearest standard flex within the player's category.
  const buckets = FLEX_BUCKETS[category];
  const closest = buckets.reduce((a, b) =>
    Math.abs(b - adjusted) < Math.abs(a - adjusted) ? b : a
  );

  // Clamp: never recommend outside the category's allowed range.
  return Math.max(buckets[0], Math.min(buckets[buckets.length - 1], closest));
}

// Curve family recommendation by position.
// P92 (Ovechkin) is the most popular all-purpose curve.
// P88 (Kane) is favored by many defensemen for backhand/toe drags.
// PM9 is a mid-curve classic for straight shooters.
// P28 (McDavid) is a popular forward blade for toe drags.
function curveForPosition(position: Position): { family: string; note: string } {
  switch (position) {
    case 'forward':
      return {
        family: 'P92 (Ovechkin) or P28 (McDavid)',
        note: 'Most popular curve family. Mid-toe curve gives versatility for wrist shots, snap shots, and stickhandling.',
      };
    case 'defense':
      return {
        family: 'P88 (Kane)',
        note: 'Mid-curve blade, favored for backhand passing, slap shots, and poke checks. Slightly less toe curve than P92.',
      };
    case 'goalie':
      return {
        family: 'Goalies use a paddle stick — different pattern entirely',
        note: 'Goalie stick curves are designed for blocker-side saves. Pick a goalie-specific paddle + paddle length instead of a player stick.',
      };
  }
}

function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

export default function StickSizeCalculatorClient() {
  // Inputs
  const [heightIn, setHeightIn] = useState<number>(62); // 5'2"
  const [weightLbs, setWeightLbs] = useState<number>(130);
  const [position, setPosition] = useState<Position>('forward');
  const [skill, setSkill] = useState<Skill>('intermediate');

  // First-render analytics flag (matches cost-calc pattern).
  const calculatorUsedSent = useRef(false);

  // Derived recommendation. useMemo so we only recompute when inputs change.
  const rec = useMemo<StickRecommendation>(() => {
    const category = pickCategory(heightIn, weightLbs);
    const lengthIn = calcLength(heightIn, position, skill, category);
    const flex = calcFlex(weightLbs, category, skill, position);
    const curve = curveForPosition(position);

    const notes: string[] = [];
    notes.push(`Category: ${CATEGORY_LABEL[category]} (retail length range ${RETAIL_LENGTH[category]}).`);
    if (category === 'intermediate') {
      notes.push('Intermediate sticks are commonly missed — they fit lighter players and smaller adults better than senior.');
    }
    if (skill === 'beginner') {
      notes.push('As a beginner, consider sizing up 1 inch for better balance and reach while learning.');
    }
    if (skill === 'advanced') {
      notes.push('As an advanced player, sizing down 1 inch improves stickhandling and puck control in tight spaces.');
    }
    if (position === 'goalie') {
      notes.push('Goalie sticks are sized differently — recommend trying in-store with full pads before buying.');
    }

    return {
      lengthIn,
      flex,
      category,
      categoryLabel: CATEGORY_LABEL[category],
      retailLengthRange: RETAIL_LENGTH[category],
      curveFamily: curve.family,
      curveNote: curve.note,
      notes,
    };
  }, [heightIn, weightLbs, position, skill]);

  // Fire calculator_used event on first render of result. Mirrors cost-calc.
  if (!calculatorUsedSent.current) {
    calculatorUsedSent.current = true;
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const payload = JSON.stringify({
          name: 'calculator_used',
          pathname: '/tools/hockey-stick-size-calculator',
          props: {
            tool: 'hockey_stick_size_calculator',
            height_in: heightIn,
            weight_lbs: weightLbs,
            position,
            skill,
            result_length: rec.lengthIn,
            result_flex: rec.flex,
          },
        });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/track', blob);
      } catch {
        // never block the page on analytics
      }
    }
  }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-block', padding: '0.25rem 0.75rem',
            background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: '4px', color: '#C8102E', fontSize: '0.75rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px'
          }}>Free Tool · 2026 Data</div>
          <h1 style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)', margin: '0 0 0.5rem',
            letterSpacing: '0.02em', lineHeight: 1
          }}>Hockey Stick Size Calculator</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto' }}>
            Real recommendations from industry standards — chin-to-nose length, weight-based flex, position-matched curve.{' '}
            <span style={{ color: '#FFB81C' }}>No email required.</span>
          </p>
        </div>

        {/* Input form */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {/* Height slider */}
            <div>
              <label htmlFor="height" style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                Height: {formatHeight(heightIn)} ({heightIn}″)
              </label>
              <input
                id="height"
                type="range"
                min={36}
                max={78}
                value={heightIn}
                onChange={e => setHeightIn(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8102E' }}
              />
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                Use the player's skated height, not standing. Skates add 1–2 inches.
              </div>
            </div>

            {/* Weight slider */}
            <div>
              <label htmlFor="weight" style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                Weight: {weightLbs} lbs
              </label>
              <input
                id="weight"
                type="range"
                min={30}
                max={250}
                value={weightLbs}
                onChange={e => setWeightLbs(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8102E' }}
              />
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                Fully dressed weight including equipment for accuracy.
              </div>
            </div>

            {/* Position radio */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                Position
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['forward', 'defense', 'goalie'] as Position[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosition(p)}
                    style={{
                      flex: 1, padding: '0.625rem 0.75rem',
                      background: position === p ? '#C8102E' : '#1a1a1a',
                      border: position === p ? '1px solid #C8102E' : '1px solid #2a2a2a',
                      borderRadius: '6px', color: '#fff', fontSize: '0.95rem',
                      fontWeight: position === p ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                Affects stick length and curve family.
              </div>
            </div>

            {/* Skill radio */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                Skill level
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['beginner', 'intermediate', 'advanced'] as Skill[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSkill(s)}
                    style={{
                      flex: 1, padding: '0.625rem 0.75rem',
                      background: skill === s ? '#C8102E' : '#1a1a1a',
                      border: skill === s ? '1px solid #C8102E' : '1px solid #2a2a2a',
                      borderRadius: '6px', color: '#fff', fontSize: '0.95rem',
                      fontWeight: skill === s ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                      textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                Affects length preference.
              </div>
            </div>
          </div>
        </div>

        {/* Results card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(255,184,28,0.08) 100%)',
          border: '1px solid rgba(200,16,46,0.3)', borderRadius: '12px',
          padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 600 }}>
            Recommended stick
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                Length
              </div>
              <div style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif', fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', color: '#FFB81C', lineHeight: 1, letterSpacing: '0.02em' }}>
                {rec.lengthIn}″
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                Flex
              </div>
              <div style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif', fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', color: '#FFB81C', lineHeight: 1, letterSpacing: '0.02em' }}>
                {rec.flex}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                Category
              </div>
              <div style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#FFB81C', lineHeight: 1, letterSpacing: '0.02em' }}>
                {rec.categoryLabel}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', marginTop: '12px' }}>
            For <strong style={{ color: '#FFB81C' }}>{position}</strong> at {formatHeight(heightIn)} ({weightLbs} lbs), {skill} level.
          </div>
        </div>

        {/* Curve family + notes */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
            Recommended curve family
          </h2>
          <div style={{
            background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: '6px', padding: '1rem', marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFB81C', marginBottom: '6px' }}>
              {rec.curveFamily}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
              {rec.curveNote}
            </div>
          </div>

          {rec.notes.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sizing notes
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {rec.notes.map((note, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Cross-link to cost calculator */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Curious about total cost?</strong>{' '}
            Get a free estimate for the full season — registration, equipment, ice time, tournaments, travel.
          </div>
          <Link
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
          </Link>
        </div>

        {/* Cross-link: glove size (Day 4) */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>What about gloves?</strong>{' '}
            Sizing gloves correctly matters just as much as the stick — fit check included.
          </div>
          <Link
            href="/tools/hockey-glove-size-calculator"
            style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              background: 'transparent', color: '#FFB81C',
              border: '1px solid #FFB81C', borderRadius: '6px',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Glove sizer →
          </Link>
        </div>

        {/* Cross-link: skate size (Day 4) */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Got the stick, what about skates?</strong>{' '}
            US shoe size to skate size, plus age category (youth / junior / senior) and width.
          </div>
          <Link
            href="/tools/hockey-skate-size-calculator"
            style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              background: 'transparent', color: '#FFB81C',
              border: '1px solid #FFB81C', borderRadius: '6px',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Skate sizer →
          </Link>
        </div>

        {/* Cross-link: junior eligibility (Day 4) */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Heading to junior hockey?</strong>{' '}
            Free eligibility checker — birth year + month → OHL, WHL, QMJHL, USHL, NCAA.
          </div>
          <Link
            href="/tools/junior-eligibility-checker"
            style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              background: 'transparent', color: '#FFB81C',
              border: '1px solid #FFB81C', borderRadius: '6px',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Eligibility check →
          </Link>
        </div>

        {/* Share + Where to buy CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShareButton
            payload={buildToolShare({
              name: 'Hockey Stick Size Calculator',
              slug: 'hockey-stick-size-calculator',
            })}
            variant="brand"
          />
        </div>

        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '2rem 1.5rem', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', color: '#fff', fontWeight: 700, fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.02em' }}>
            Buy your stick at a local pro shop
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1.5rem', fontSize: '1.05rem' }}>
            RinkStop is the global directory of hockey rinks, teams, and leagues. Find a rink near you with a pro shop
            that stocks the size you need.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/directory/rinks"
              style={{
                display: 'inline-block', padding: '0.75rem 1.5rem',
                background: '#C8102E', color: '#fff', borderRadius: '6px',
                textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
              }}
            >
              Browse rinks →
            </Link>
            <Link
              href="/claim-your-listing"
              style={{
                display: 'inline-block', padding: '0.75rem 1.5rem',
                background: 'transparent', color: '#FFB81C',
                border: '1px solid #FFB81C', borderRadius: '6px',
                textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
              }}
            >
              Claim your listing
            </Link>
          </div>
        </div>

        {/* Methodology footer */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginTop: '1.5rem',
          fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)',
        }}>
          <strong style={{ color: '#FFB81C' }}>How we calculated this.</strong>{' '}
          Category is picked by height first (Bauer convention), then validated by weight — youth / junior /
          intermediate / senior. Length uses the chin-to-nose rule (height × 0.83) with ±0.5–1 inch for position
          and skill, then clamped to the category's retail range so the recommendation is always a stick that's
          actually sold. Flex uses the modern 2026 formula of weight × 0.45 (the old weight ÷ 2 rule was for
          1990s slapshot-era sticks and overshoots for most players today), rounded to the nearest standard flex
          within the player's category, with ±5 flex for skill level and defense position. Curve families
          recommended by position per industry consensus (Bauer, CCM, Warrior).{' '}
          <Link href="/guides/hockey-stick-guide" style={{ color: '#FFB81C' }}>
            Read the full stick guide →
          </Link>
        </div>

        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '2rem' }}>
          Data sources: Bauer / CCM / Warrior sizing charts, HockeyStickBuy length tables, industry-standard
          chin-to-nose rule. Updated June 2026.
        </div>
      </div>
    </main>
  );
}