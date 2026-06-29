'use client';

// src/app/tools/hockey-skate-size-calculator/SkateSizeCalculatorClient.tsx
//
// Interactive skate sizing tool. Visual styling mirrors
// /tools/hockey-glove-size-calculator exactly (dark theme, inline styles,
// Bebas Neue on big numbers, #C8102E red accents, #FFB81C gold result text).
//
// Inputs:
//   - US shoe size (number, 1-15)
//   - Shoe type: Women / Men / Kid
//   - Age (years, for category gating when not provided by shoe size)
//
// Calc (industry-verified Bauer / CCM via Pure Hockey):
//   Skate size = US shoe size - 1 (women's) OR - 1.5 (men's) OR - 1 (kid's)
//
// Age category gates which skate SKUs the buyer should look for:
//   Youth (shoe 9-13.5 kid), Junior (kid 1-7.5 / women 1-5.5),
//   Intermediate (kid/women 5-7 / men 5-7), Senior (men 7+ / women 8.5+)
//
// Width recommendation: D (standard, ~65-70% adults), EE (wide).
//   Women skew narrower (D-); big kids / older men skew EE.
//
// Self-test mirror: /tmp/skate-size-selftest.mjs

import { useState, useMemo, useEffect } from 'react';
import ShareButton from '@/components/ShareButton';
import { buildToolShare } from '@/lib/share';

type ShoeType = 'women' | 'men' | 'kid';
type Category = 'Youth' | 'Junior' | 'Intermediate' | 'Senior';
type Width = 'D (standard)' | 'EE (wide)' | 'D- (narrow)';

interface SkateRecommendation {
  skateSize: number;
  category: Category;
  width: Width;
  widthReason: string;
  notes: string[];
}

function categoryFromShoeSize(shoeType: ShoeType, shoeSize: number): Category {
  // Bauer chart (verified 2026-06-29 via Pure Hockey):
  //   Kid:     Y(9–13.5) → J(1–7.5) → I(7.5+ but < adult SKU) → Senior (adult sizing)
  //   Women:   J(1–5.5)  → I(6–7)     → Senior (7.5+)
  //   Men:     I(5–7)    → Senior (7.5+)
  if (shoeType === 'kid') {
    if (shoeSize >= 9 && shoeSize <= 13.5) return 'Youth';
    if (shoeSize >= 1 && shoeSize <= 7.5) return 'Junior';
    // Kid 8+ is past the Junior chart; treat as Intermediate until adult sizing kicks in
    if (shoeSize >= 8 && shoeSize < 9) return 'Intermediate';
    if (shoeSize >= 14) return 'Senior'; // beyond kid chart — adult sizing
    return 'Junior';
  }
  if (shoeType === 'women') {
    if (shoeSize >= 1 && shoeSize <= 5.5) return 'Junior';
    if (shoeSize >= 6 && shoeSize <= 7) return 'Intermediate';
    if (shoeSize >= 7.5) return 'Senior';
    return 'Junior'; // < 1 women's, default junior
  }
  // men
  if (shoeSize >= 5 && shoeSize <= 7) return 'Intermediate';
  return 'Senior'; // 7.5+
}

function widthForPlayer(shoeType: ShoeType, shoeSize: number, age: number): { width: Width; reason: string } {
  // Women under 6.5 → narrower D-
  // Men 11+ and big kids 6+ → wider EE
  if (shoeType === 'women' && shoeSize < 6.5) return { width: 'D- (narrow)', reason: 'Lower-volume women’s foot — try Bauer / CCM narrow fit (D-).' };
  if (shoeType === 'men' && shoeSize >= 11) return { width: 'EE (wide)', reason: 'Larger men’s size — most brands offer EE wide-fit at 10.5+.' };
  if (shoeType === 'kid' && shoeSize >= 6 && age >= 12) return { width: 'EE (wide)', reason: 'Older kids with wider feet — try EE-wide fit, especially on Bauer Nexus.' };
  return { width: 'D (standard)', reason: 'D-width fits ~65-70% of adults. Standard off-the-shelf.' };
}

function calcSkate(shoeType: ShoeType, shoeSize: number, age: number): SkateRecommendation {
  let skateSize: number;
  if (shoeType === 'women') skateSize = shoeSize - 1;
  else if (shoeType === 'men') skateSize = shoeSize - 1.5;
  else skateSize = shoeSize - 1; // kid

  // Round half sizes properly (8.5 stays 8.5, 7.25 → 7.5)
  skateSize = Math.round(skateSize * 2) / 2;

  const category = categoryFromShoeSize(shoeType, shoeSize);
  const { width, reason } = widthForPlayer(shoeType, shoeSize, age);

  const notes: string[] = [];
  notes.push(`Industry formula: ${shoeType === 'men' ? 'shoe size − 1.5' : 'shoe size − 1'}. Half sizes preserved.`);
  notes.push(`Age category: ${category} — look for ${category.toLowerCase()} SKU when buying.`);
  notes.push(`Width: ${width} — ${reason}`);
  if (category === 'Intermediate') notes.push('Intermediate skates are built for growing teens — slightly lower shell volume.');
  if (category === 'Junior' && age >= 14) notes.push('If the player is 14+, lean toward intermediate for the season.');

  return {
    skateSize: Math.max(1, skateSize),
    category,
    width,
    widthReason: reason,
    notes,
  };
}

export default function SkateSizeCalculatorClient() {
  const [shoeType, setShoeType] = useState<ShoeType>('men');
  const [shoeSize, setShoeSize] = useState<number>(10);
  const [age, setAge] = useState<number>(30);

  const rec = useMemo<SkateRecommendation | null>(() => {
    if (shoeSize < 1 || shoeSize > 17) return null;
    if (age < 3 || age > 99) return null;
    return calcSkate(shoeType, shoeSize, age);
  }, [shoeType, shoeSize, age]);

  useEffect(() => {
    if (!rec) return;
    if (typeof window === 'undefined') return;
    if ((window as unknown as { __skateCalcUsed?: boolean }).__skateCalcUsed) return;
    (window as unknown as { __skateCalcUsed?: boolean }).__skateCalcUsed = true;
    try {
      const NAV = navigator as unknown as { sendBeacon?: (u: string, d: Blob) => boolean };
      if (typeof NAV.sendBeacon === 'function') {
        NAV.sendBeacon(
          '/api/track',
          new Blob([JSON.stringify({ name: 'calculator_used', pathname: '/tools/hockey-skate-size-calculator', props: { tool: 'hockey_skate_size_calculator', shoeType, shoeSize, age } })], { type: 'application/json' }),
        );
      }
    } catch {
      // never block
    }
  }, [rec, shoeType, shoeSize, age]);

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
            Hockey Skate Size Calculator
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto' }}>
            Real skate sizing from Bauer / CCM industry standards — US shoe size to skate size, with category and width.{' '}
            <span style={{ color: '#FFB81C' }}>No email required.</span>
          </p>
        </div>

        {/* Input form */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {/* Shoe type */}
            <div>
              <label style={labelStyle}>Shoe type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['women', 'men', 'kid'] as ShoeType[]).map((t) => {
                  const active = shoeType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setShoeType(t);
                        // Sensible defaults when switching types
                        if (t === 'kid') setShoeSize(3);
                        else if (t === 'women') setShoeSize(8);
                        else setShoeSize(10);
                      }}
                      style={{
                        flex: 1, padding: '0.625rem 0.75rem',
                        background: active ? '#C8102E' : '#1a1a1a',
                        border: active ? '1px solid #C8102E' : '1px solid #2a2a2a',
                        borderRadius: '6px', color: '#fff', fontSize: '0.95rem',
                        fontWeight: active ? 700 : 500, cursor: 'pointer',
                        fontFamily: 'inherit', textTransform: 'capitalize',
                      }}
                    >
                      {t === 'kid' ? 'Kid' : t === 'men' ? 'Men' : 'Women'}
                    </button>
                  );
                })}
              </div>
              <div style={helperStyle}>
                Affects formula: women / kid use −1, men use −1.5.
              </div>
            </div>

            {/* Shoe size */}
            <div>
              <label htmlFor="shoeSize" style={labelStyle}>
                US Shoe size: {shoeSize}
              </label>
              <input
                id="shoeSize"
                type="range"
                min={shoeType === 'kid' ? 9 : 1}
                max={shoeType === 'kid' ? 14 : shoeType === 'women' ? 12 : 15}
                step={0.5}
                value={shoeSize}
                onChange={(e) => setShoeSize(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8102E' }}
                data-testid="shoe-size"
              />
              <div style={helperStyle}>
                Standard US shoe size. Half sizes supported.
              </div>
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" style={labelStyle}>
                Player age: {age} yrs
              </label>
              <input
                id="age"
                type="range"
                min={3}
                max={75}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8102E' }}
              />
              <div style={helperStyle}>
                Used for category gate (youth/junior/intermediate/senior) and width hint.
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
              Recommended skate
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                  Size
                </div>
                <div style={{
                  fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                  fontSize: 'clamp(3rem, 8vw, 5rem)', color: '#FFB81C',
                  lineHeight: 1, letterSpacing: '0.02em',
                }} data-testid="skate-size">
                  {rec.skateSize}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                  Category
                </div>
                <div style={{
                  fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#FFB81C',
                  lineHeight: 1, letterSpacing: '0.02em',
                }}>
                  {rec.category}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 600 }}>
                  Width
                </div>
                <div style={{
                  fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#FFB81C',
                  lineHeight: 1, letterSpacing: '0.02em',
                }} data-testid="width">
                  {rec.width}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', marginTop: '12px' }}>
              For {shoeType}’s shoe size {shoeSize}, {age} yrs old — {rec.widthReason}
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
            Fit check — how the skate should feel
          </h2>
          <div style={{
            display: 'grid', gap: '0.75rem', color: 'rgba(255,255,255,0.75)',
            fontSize: '0.9rem', lineHeight: 1.5,
          }}>
            <div>
              <strong style={{ color: '#FFB81C' }}>Good fit:</strong>{' '}
              Toes brush the front of the boot when standing straight. When
              you bend the knee to 90°, toes pull back ¼ inch from the front.
            </div>
            <div>
              <strong style={{ color: '#FFB81C' }}>Too big:</strong>{' '}
              Heel lifts when you skate. Toes don’t touch the front when
              standing. Foot slides side to side.
            </div>
            <div>
              <strong style={{ color: '#FFB81C' }}>Too small:</strong>{' '}
              Toes curl under the front even when knees are bent. Numbness
              after 5 minutes of skating. Blisters on the big toe.
            </div>
            <div>
              <strong style={{ color: '#FFB81C' }}>Width hint:</strong>{' '}
              Pressure on the sides of the forefoot after 10 minutes means
              you need wider (EE) — Bauer Nexus and CCM Tacks run widest.
            </div>
          </div>
        </div>

        {/* Category guide reference */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
            Skate category reference (Bauer / CCM)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(255,255,255,0.6)' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(255,255,255,0.6)' }}>Kid shoe</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(255,255,255,0.6)' }}>Women’s</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(255,255,255,0.6)' }}>Men’s</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'rgba(255,255,255,0.6)' }}>Typical age</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                <td style={{ padding: '8px', color: '#FFB81C', fontWeight: 700 }}>Youth</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>9–13.5</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.5)' }}>—</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.5)' }}>—</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.6)' }}>Under 9</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                <td style={{ padding: '8px', color: '#FFB81C', fontWeight: 700 }}>Junior</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>1–7.5</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>1–5.5</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.5)' }}>—</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.6)' }}>8–11</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                <td style={{ padding: '8px', color: '#FFB81C', fontWeight: 700 }}>Intermediate</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>5–7</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>5–7</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>5–7</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.6)' }}>10–13</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', color: '#FFB81C', fontWeight: 700 }}>Senior</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.5)' }}>—</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>8.5+</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.8)' }}>7+</td>
                <td style={{ padding: '8px', color: 'rgba(255,255,255,0.6)' }}>Teen+ adult</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cross-link to other tools */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Skate sized — what about gloves?</strong>{' '}
            Free glove-sizing tool — by height or arm measurement, with position nudge.
          </div>
          <a
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
          Skate size formula verified across Bauer, CCM, and Pure Hockey
          sizing charts: women’s and kid’s shoe size minus 1, men’s minus
          1.5. Half sizes preserved. Category boundaries (Youth / Junior
          / Intermediate / Senior) match Bauer and CCM SKU naming.
          Width recommendation uses the standard D (medium, ~65-70% of
          adults), EE (wide — Bauer Nexus / CCM Tacks run widest), and
          D- narrow for smaller women’s sizes.
        </div>

        {/* Share */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShareButton
            payload={buildToolShare({
              name: 'Hockey Skate Size Calculator',
              slug: 'hockey-skate-size-calculator',
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
              Find a pro shop →
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
              Local rinks with skate fitting and bake-in services.
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