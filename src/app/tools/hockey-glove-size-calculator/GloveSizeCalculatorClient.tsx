'use client';

// src/app/tools/hockey-glove-size-calculator/GloveSizeCalculatorClient.tsx
//
// Interactive glove sizing tool. Visual styling mirrors
// /tools/hockey-stick-size-calculator exactly (dark theme, inline styles,
// Bebas Neue on big numbers, #C8102E red accents, #FFB81C gold result text).
//
// Two input modes:
//   (A) By height — feet + inches pickers (parent-friendly)
//   (B) By measurement — fingertip-to-elbow inches (more accurate)
//
// Position nudge: forward standard, defense +0.5", goalie +1".
// Final size clamped to 8"–15" retail range, rounded to whole inch.
//
// Industry data verified against Bauer / Pure Hockey / Game Time Sports
// / Peranis Hockey World / Hockey Hero (5+ sources agree on the
// height→size and measurement→size tables).
//
// Self-test mirror: /tmp/glove-size-selftest.mjs

import { useState, useMemo, useEffect } from 'react';
import ShareButton from '@/components/ShareButton';
import { buildToolShare } from '@/lib/share';

type Position = 'forward' | 'defense' | 'goalie';
type Mode = 'height' | 'measurement';

interface GloveRecommendation {
  sizeIn: number;
  ageHint: string;
  positionNote: string;
  notes: string[];
}

interface HeightBucket {
  minIn: number;
  maxIn: number;
  sizeIn: number;
  ageHint: string;
}

interface MeasurementBucket {
  minIn: number;
  maxIn: number;
  sizeIn: number;
}

const HEIGHT_BUCKETS: HeightBucket[] = [
  { minIn: 0,   maxIn: 42,  sizeIn: 8,  ageHint: '3–5' },
  { minIn: 43,  maxIn: 48,  sizeIn: 9,  ageHint: '5–7' },
  { minIn: 49,  maxIn: 54,  sizeIn: 10, ageHint: '7–9' },
  { minIn: 55,  maxIn: 60,  sizeIn: 11, ageHint: '9–11' },
  { minIn: 61,  maxIn: 64,  sizeIn: 12, ageHint: '10–12' },
  { minIn: 65,  maxIn: 68,  sizeIn: 13, ageHint: '12–14' },
  { minIn: 69,  maxIn: 72,  sizeIn: 14, ageHint: '14+' },
  { minIn: 73,  maxIn: 999, sizeIn: 15, ageHint: '14+ / Adult' },
];

const MEASUREMENT_BUCKETS: MeasurementBucket[] = [
  { minIn: 0,   maxIn: 9,   sizeIn: 8  },
  { minIn: 9,   maxIn: 10,  sizeIn: 9  },
  { minIn: 10,  maxIn: 11,  sizeIn: 10 },
  { minIn: 11,  maxIn: 12,  sizeIn: 11 },
  { minIn: 12,  maxIn: 13,  sizeIn: 12 },
  { minIn: 13,  maxIn: 14,  sizeIn: 13 },
  { minIn: 14,  maxIn: 15,  sizeIn: 14 },
  { minIn: 15,  maxIn: 999, sizeIn: 15 },
];

function calcGloveByHeight(heightIn: number, position: Position): GloveRecommendation {
  const bucket = HEIGHT_BUCKETS.find((b) => heightIn >= b.minIn && heightIn <= b.maxIn)
    ?? HEIGHT_BUCKETS[HEIGHT_BUCKETS.length - 1];

  let adjustedSize = bucket.sizeIn;
  let positionNote = 'Forward — standard sizing.';

  if (position === 'goalie') {
    adjustedSize = bucket.sizeIn + 1;
    positionNote = 'Goalie +1" — blocker room.';
  } else if (position === 'defense') {
    adjustedSize = bucket.sizeIn + 0.5;
    positionNote = 'Defense +0.5" — shot-block reach.';
  }

  const finalSize = Math.max(8, Math.min(15, Math.round(adjustedSize)));

  const notes: string[] = [];
  notes.push(`Age band ${bucket.ageHint} yrs.`);
  if (position === 'goalie') notes.push('Goalies wear one size larger to fit the blocker.');
  if (position === 'defense') notes.push('Defensemen often go up a half size for shot-blocking reach.');
  notes.push('Fingertips should barely touch the end of the glove when your hand is in a fist.');

  return { sizeIn: finalSize, ageHint: bucket.ageHint, positionNote, notes };
}

function calcGloveByMeasurement(measurementIn: number, position: Position): GloveRecommendation {
  const bucket = MEASUREMENT_BUCKETS.find((b) => measurementIn >= b.minIn && measurementIn < b.maxIn)
    ?? MEASUREMENT_BUCKETS[MEASUREMENT_BUCKETS.length - 1];

  let adjustedSize = bucket.sizeIn;
  let positionNote = 'Forward — standard sizing.';

  if (position === 'goalie') {
    adjustedSize = bucket.sizeIn + 1;
    positionNote = 'Goalie +1" — blocker room.';
  } else if (position === 'defense') {
    adjustedSize = bucket.sizeIn + 0.5;
    positionNote = 'Defense +0.5" — shot-block reach.';
  }

  const finalSize = Math.max(8, Math.min(15, Math.round(adjustedSize)));

  const ageGuess = HEIGHT_BUCKETS.find((b) => finalSize === b.sizeIn)?.ageHint ?? '14+';
  const notes: string[] = [];
  notes.push(`Measurement method — recommended over height-based.`);
  notes.push(`Estimated age band ${ageGuess} yrs.`);
  if (position === 'goalie') notes.push('Goalies wear one size larger to fit the blocker.');
  if (position === 'defense') notes.push('Defensemen often go up a half size for shot-blocking reach.');

  return { sizeIn: finalSize, ageHint: ageGuess, positionNote, notes };
}

export default function GloveSizeCalculatorClient() {
  const [mode, setMode] = useState<Mode>('height');

  // Height mode — feet + inches pickers
  const [feet, setFeet] = useState<number>(4);
  const [inches, setInches] = useState<number>(6);
  const [measurement, setMeasurement] = useState<number>(11.5);
  const [position, setPosition] = useState<Position>('forward');

  const heightIn = feet * 12 + inches;

  const rec = useMemo<GloveRecommendation | null>(() => {
    if (mode === 'height') {
      if (heightIn < 24 || heightIn > 96) return null;
      return calcGloveByHeight(heightIn, position);
    } else {
      if (measurement < 5 || measurement > 20) return null;
      return calcGloveByMeasurement(measurement, position);
    }
  }, [mode, heightIn, measurement, position]);

  // Fire calculator_used once on first render where rec is non-null
  useEffect(() => {
    if (!rec) return;
    if (typeof window === 'undefined') return;
    if ((window as unknown as { __gloveCalcUsed?: boolean }).__gloveCalcUsed) return;
    (window as unknown as { __gloveCalcUsed?: boolean }).__gloveCalcUsed = true;
    try {
      const NAV = navigator as unknown as { sendBeacon?: (u: string, d: Blob) => boolean };
      if (typeof NAV.sendBeacon === 'function') {
        NAV.sendBeacon(
          '/api/track',
          new Blob([JSON.stringify({ name: 'calculator_used', pathname: '/tools/hockey-glove-size-calculator', props: { tool: 'hockey_glove_size_calculator', mode, position } })], { type: 'application/json' }),
        );
      }
    } catch {
      // never block
    }
  }, [rec, mode, position]);

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
            Hockey Glove Size Calculator
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto' }}>
            Real glove sizing from industry standards — height or arm measurement, with position-matched adjustments.{' '}
            <span style={{ color: '#FFB81C' }}>No email required.</span>
          </p>
        </div>

        {/* Mode toggle (segmented control) */}
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '1.5rem',
          background: '#0f0f0f', border: '1px solid #1e1e1e',
          borderRadius: '8px', padding: '4px',
        }}>
          {(['height', 'measurement'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '0.75rem 1rem',
                  background: active ? '#C8102E' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff', fontSize: '0.95rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >
                {m === 'height' ? 'By height' : 'By arm measurement'}
              </button>
            );
          })}
        </div>

        {/* Input form */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {mode === 'height' ? (
              <>
                <div>
                  <label style={labelStyle}>Player height</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <select
                        value={feet}
                        onChange={(e) => setFeet(Number(e.target.value))}
                        style={inputStyle}
                        data-testid="feet"
                      >
                        {[2, 3, 4, 5, 6].map((f) => (
                          <option key={f} value={f}>{f} ft</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <select
                        value={inches}
                        onChange={(e) => setInches(Number(e.target.value))}
                        style={inputStyle}
                        data-testid="inches"
                      >
                        {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                          <option key={i} value={i}>{i} in</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={helperStyle}>
                    Standing height, no skates. Default 4'6".
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="measurement" style={labelStyle}>
                  Arm measurement: {measurement}″
                </label>
                <input
                  id="measurement"
                  type="range"
                  min={5}
                  max={20}
                  step={0.25}
                  value={measurement}
                  onChange={(e) => setMeasurement(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#C8102E' }}
                />
                <div style={helperStyle}>
                  Fingertip to elbow, in inches. With arm slightly bent.
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Position</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['forward', 'defense', 'goalie'] as Position[]).map((p) => {
                  const active = position === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPosition(p)}
                      style={{
                        flex: 1, padding: '0.625rem 0.75rem',
                        background: active ? '#C8102E' : '#1a1a1a',
                        border: active ? '1px solid #C8102E' : '1px solid #2a2a2a',
                        borderRadius: '6px', color: '#fff', fontSize: '0.95rem',
                        fontWeight: active ? 700 : 500, cursor: 'pointer',
                        fontFamily: 'inherit', textTransform: 'capitalize',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <div style={helperStyle}>
                Affects sizing — goalies +1", defensemen +0.5".
              </div>
            </div>
          </div>
        </div>

        {/* Results card */}
        {rec && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(255,184,28,0.08) 100%)',
            border: '1px solid rgba(200,16,46,0.3)', borderRadius: '12px',
            padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 600 }}>
              Recommended glove size
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '1.5rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                  Size
                </div>
                <div style={{
                  fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                  fontSize: 'clamp(3rem, 8vw, 5rem)', color: '#FFB81C',
                  lineHeight: 1, letterSpacing: '0.02em',
                }} data-testid="size-value">
                  {rec.sizeIn}″
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                  Age
                </div>
                <div style={{
                  fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#FFB81C',
                  lineHeight: 1, letterSpacing: '0.02em',
                }}>
                  {rec.ageHint}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', marginTop: '12px' }}>
              {rec.positionNote} For {mode === 'height' ? `${feet}′${inches}″` : `${measurement}″ arm measurement`}, {position}.
            </div>
          </div>
        )}

        {/* Sizing notes card */}
        {rec && rec.notes.length > 0 && (
          <div style={{
            background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
            padding: '1.5rem', marginBottom: '1.5rem',
          }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
              Sizing notes
            </h2>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {rec.notes.map((note, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Fit check */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
            Fit check — how the glove should feel
          </h2>
          <div style={{
            display: 'grid', gap: '0.75rem', color: 'rgba(255,255,255,0.75)',
            fontSize: '0.9rem', lineHeight: 1.5,
          }}>
            <div>
              <strong style={{ color: '#FFB81C' }}>Good fit:</strong>{' '}
              Fingertips barely touch the end of the glove with a closed fist. Small gap is ideal.
            </div>
            <div>
              <strong style={{ color: '#FFB81C' }}>Too big:</strong>{' '}
              If you can fit a full finger past your fingertips, go down a half size.
            </div>
            <div>
              <strong style={{ color: '#FFB81C' }}>Too small:</strong>{' '}
              Fingertips push hard against the end, can't make a fist comfortably, go up a half size.
            </div>
            <div>
              <strong style={{ color: '#FFB81C' }}>Wrist mobility:</strong>{' '}
              With arm bent at 90°, the cuff should overlap the elbow pad without a gap or long overlap.
            </div>
          </div>
        </div>

        {/* Sizing chart reference */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
            Sizing chart reference
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                By height
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>Height</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>Glove</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {HEIGHT_BUCKETS.map((b) => {
                    const label = b.maxIn === 999
                      ? `${Math.floor(b.minIn / 12)}′${b.minIn % 12}″+`
                      : b.minIn === 0
                        ? `up to ${Math.floor(b.maxIn / 12)}′${b.maxIn % 12}″`
                        : `${Math.floor(b.minIn / 12)}′${b.minIn % 12}″–${Math.floor(b.maxIn / 12)}′${b.maxIn % 12}″`;
                    return (
                      <tr key={b.sizeIn} style={{ borderBottom: '1px solid #1e1e1e' }}>
                        <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.8)' }}>{label}</td>
                        <td style={{ padding: '6px 8px', color: '#FFB81C', fontWeight: 700 }}>{b.sizeIn}″</td>
                        <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>{b.ageHint}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                By arm measurement (fingertip-to-elbow)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>Measurement</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>Glove</th>
                  </tr>
                </thead>
                <tbody>
                  {MEASUREMENT_BUCKETS.map((b, i) => {
                    const label = b.maxIn === 999
                      ? `${b.minIn}″+`
                      : b.minIn === 0
                        ? `under ${b.maxIn}″`
                        : `${b.minIn}″–${b.maxIn}″`;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1e1e1e' }}>
                        <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.8)' }}>{label}</td>
                        <td style={{ padding: '6px 8px', color: '#FFB81C', fontWeight: 700 }}>{b.sizeIn}″</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cross-link to other tools */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Got the glove, now the stick?</strong>{' '}
            Free stick-sizing tool — length, flex, and curve by height and weight.
          </div>
          <a
            href="/tools/hockey-stick-size-calculator"
            style={{
              display: 'inline-block', padding: '0.55rem 1.25rem',
              background: 'transparent', color: '#FFB81C',
              border: '1px solid #FFB81C', borderRadius: '6px',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Stick sizer →
          </a>
        </div>

        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Curious about total cost?</strong>{' '}
            Get a free estimate for the season — registration, equipment, ice time, tournaments, travel.
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
          Height lookup uses the Game Time Sports / Peranis chart (8 standard
          height buckets, 8"–15" retail range). Arm measurement lookup uses
          the Bauer / Pure Hockey fingertip-to-elbow chart (8 buckets, same
          retail range). Goalies add +1" for blocker room, defensemen add
          +0.5" for shot-block reach. Final size clamped to 8"–15" retail
          range and rounded to the nearest whole inch. Size and age mapping
          verified across 4+ industry sources — Bauer, Pure Hockey, Game
          Time Sports, Peranis Hockey World, and Hockey Hero.
        </div>

        {/* Share */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShareButton
            payload={buildToolShare({
              name: 'Hockey Glove Size Calculator',
              slug: 'hockey-glove-size-calculator',
            })}
            variant="brand"
          />
        </div>

        {/* Tertiary CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <a
            href="/directory/rinks"
            style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e',
              borderRadius: '8px', padding: '1rem',
              color: '#fff', textDecoration: 'none',
            }}
          >
            <div style={{ color: '#FFB81C', fontWeight: 700, marginBottom: '4px' }}>
              Find a rink →
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
              Local pro shops that fit hockey gloves in-store.
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
              Own a rink or shop? →
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
