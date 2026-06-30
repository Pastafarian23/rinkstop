'use client';

// src/app/tools/hockey-goalie-gear-sizer/GoalieGearSizerClient.tsx
//
// Interactive goalie gear sizing tool. Visual styling mirrors
// /tools/hockey-glove-size-calculator exactly (dark theme, inline styles,
// Bebas Neue on big numbers, #C8102E red accents, #FFB81C gold result text).
// Mobile-safe: vertical-stack rows, flex-wrap on all primary content,
// small (0.7rem) status badges.
//
// Inputs:
//   - Height (feet + inches pickers)
//   - Weight (range slider)
//   - Age (range slider)
//   - ATK (ankle-to-knee, inches) — optional, drives pad size precisely
//   - Hand length (palm heel to middle-finger tip, inches) — optional,
//     drives blocker + catch glove precisely
//
// Output: 5-piece gear list
//   1. Leg pads (size label + ATK range + total pad height with thigh rise)
//   2. Blocker (size label + hand-length range)
//   3. Catch glove (size label + hand-length range)
//   4. Chest protector (size label + age + weight range)
//   5. Goalie stick (size category + paddle length recommendation)
//
// Industry data verified 2026-06-30 against 4+ sources (see page.tsx).
//
// Self-test mirror: /tmp/goalie-gear-selftest.mjs

import { useState, useMemo, useEffect } from 'react';
import ShareButton from '@/components/ShareButton';
import { buildToolShare } from '@/lib/share';

type Category = 'Youth' | 'Junior' | 'Intermediate' | 'Senior';

interface LegPadResult {
  category: Category;
  sizeLabel: string;
  atkRange: string;
  totalHeightIn: number;
  notes: string[];
}

interface GloveResult {
  category: Category;
  sizeLabel: string;
  handRange: string;
  notes: string[];
}

interface ChestResult {
  category: Category;
  sizeLabel: string;
  ageRange: string;
  weightRange: string;
  notes: string[];
}

interface StickResult {
  category: Category;
  paddleLengthIn: number;
  fullLengthIn: number;
  notes: string[];
}

interface AllResult {
  pads: LegPadResult;
  blocker: GloveResult;
  catchGlove: GloveResult;
  chest: ChestResult;
  stick: StickResult;
}

// Estimate ATK from height (industry rule of thumb: ATK ≈ ~30% of height)
function estimateATK(heightIn: number, age: number): number {
  // Younger kids have proportionally longer legs but shorter ATK
  // because bones are still growing. Approximation: ATK / height
  //   youth ≈ 0.27
  //   adult ≈ 0.30
  let ratio: number;
  if (age <= 10) ratio = 0.27;
  else if (age <= 14) ratio = 0.285;
  else ratio = 0.30;
  return Math.round(heightIn * ratio * 10) / 10; // 1 decimal place
}

// Estimate hand length from height (industry rule: hand ≈ 11% of height)
function estimateHandLength(heightIn: number): number {
  return Math.round(heightIn * 0.11 * 10) / 10;
}

// LEG PADS — based on ATK (ankle-to-knee)
function calcLegPads(atkIn: number): LegPadResult {
  let category: Category;
  let sizeLabel: string;
  let atkRange: string;
  let basePadHeight: number;

  if (atkIn < 14) {
    category = 'Youth';
    if (atkIn < 13) { sizeLabel = 'S'; atkRange = '12.5-13"'; basePadHeight = 19; }
    else if (atkIn < 13.5) { sizeLabel = 'M'; atkRange = '13-14"'; basePadHeight = 20; }
    else { sizeLabel = 'L'; atkRange = '13.5-14.5"'; basePadHeight = 21; }
  } else if (atkIn < 18) {
    category = 'Junior';
    if (atkIn < 15) { sizeLabel = 'S'; atkRange = '14-15"'; basePadHeight = 22; }
    else if (atkIn < 16.5) { sizeLabel = 'M'; atkRange = '15-16.5"'; basePadHeight = 23; }
    else { sizeLabel = 'L'; atkRange = '16.5-17.5"'; basePadHeight = 24; }
  } else if (atkIn < 20) {
    category = 'Intermediate';
    if (atkIn < 17.5) { sizeLabel = 'S'; atkRange = '16-17.5"'; basePadHeight = 25; }
    else if (atkIn < 18.5) { sizeLabel = 'M'; atkRange = '17.5-18.5"'; basePadHeight = 26; }
    else { sizeLabel = 'L'; atkRange = '18-19"'; basePadHeight = 27; }
  } else {
    category = 'Senior';
    if (atkIn < 19) { sizeLabel = 'XS'; atkRange = '18-19"'; basePadHeight = 28; }
    else if (atkIn < 20) { sizeLabel = 'S'; atkRange = '19-20"'; basePadHeight = 29; }
    else if (atkIn < 20.5) { sizeLabel = 'M'; atkRange = '19.5-20.5"'; basePadHeight = 30; }
    else if (atkIn <= 21.5) { sizeLabel = 'L'; atkRange = '20-21.5"'; basePadHeight = 31; }
    else { sizeLabel = 'XL'; atkRange = '21.5-22.5"'; basePadHeight = 32; }
  }

  const notes: string[] = [];
  notes.push(`ATK (ankle-to-knee) measurement = ${atkIn}". Measure from center of ankle bone to middle of knee cap.`);
  notes.push(`Base pad height ≈ ${basePadHeight}". +1 to +2 thigh rise is common for adult butterfly goalies.`);
  notes.push(`Knee should land in the center of the knee stack when in butterfly position.`);
  if (category === 'Senior' && atkIn < 19) notes.push(`Smaller senior pad — consider Intermediate if you prefer lower profile.`);

  return { category, sizeLabel, atkRange, totalHeightIn: basePadHeight, notes };
}

// BLOCKER + CATCH GLOVE — based on hand length
function calcGloveByHand(handIn: number, piece: 'blocker' | 'catch'): GloveResult {
  let category: Category;
  let sizeLabel: string;
  let handRange: string;

  if (handIn < 5.5) {
    category = 'Youth';
    if (handIn < 5) { sizeLabel = 'S'; handRange = '4.75-5"'; }
    else { sizeLabel = 'M'; handRange = '5-5.5"'; }
  } else if (handIn < 6.25) {
    category = 'Junior';
    sizeLabel = 'S/M';
    handRange = '5.5-6.25"';
  } else if (handIn < 7) {
    category = 'Intermediate';
    sizeLabel = 'S/M';
    handRange = '6.25-7"';
  } else {
    category = 'Senior';
    if (handIn < 7.5) { sizeLabel = 'S'; handRange = '7-7.5"'; }
    else if (handIn < 8) { sizeLabel = 'M'; handRange = '7.5-8"'; }
    else { sizeLabel = 'L/XL'; handRange = '8-8.5"'; }
  }

  const notes: string[] = [];
  if (piece === 'blocker') {
    notes.push(`Blocker size matches palm width. Same sizing as catch glove.`);
    notes.push(`Hand length measured palm-heel to middle-finger tip.`);
  } else {
    notes.push(`Catch glove palm matches hand measurement.`);
    notes.push(`Same sizing chart as blocker — by hand length.`);
  }
  notes.push(`Fit tip: hand should fill the palm snugly with no gap at fingertips.`);
  if (category === 'Senior' && handIn >= 7 && handIn <= 7.5) notes.push(`Senior S — small senior, often preferred by goalies with narrow hands.`);

  return { category, sizeLabel, handRange, notes };
}

// CHEST PROTECTOR — by height + age + weight
function calcChest(heightIn: number, age: number, weightLb: number): ChestResult {
  let category: Category;
  let sizeLabel: string;
  let ageRange: string;
  let weightRange: string;

  if (heightIn < 50) {
    // < 4'2"
    category = 'Youth';
    if (heightIn < 47) { sizeLabel = 'S/M'; ageRange = '5-7 yrs'; weightRange = '40-53 lbs'; }
    else { sizeLabel = 'L/XL'; ageRange = '6-8 yrs'; weightRange = '46-57 lbs'; }
  } else if (heightIn < 60) {
    // 4'2" - 4'11"
    if (age <= 10) { category = 'Junior'; sizeLabel = 'S/M'; ageRange = '8-10 yrs'; weightRange = '55-68 lbs'; }
    else { category = 'Junior'; sizeLabel = 'L/XL'; ageRange = '9-11 yrs'; weightRange = '62-79 lbs'; }
  } else if (heightIn < 67) {
    // 4'11" - 5'6"
    category = 'Intermediate';
    if (heightIn < 62) { sizeLabel = 'S'; ageRange = '11-12 yrs'; weightRange = '77-90 lbs'; }
    else if (heightIn < 65) { sizeLabel = 'M'; ageRange = '12-13 yrs'; weightRange = '88-99 lbs'; }
    else { sizeLabel = 'L'; ageRange = '13-14 yrs'; weightRange = '97-130 lbs'; }
  } else {
    // 5'7"+
    category = 'Senior';
    if (heightIn < 69) { sizeLabel = 'S'; ageRange = '13+'; weightRange = '99-150 lbs'; }
    else if (heightIn < 71) { sizeLabel = 'M'; ageRange = '14+'; weightRange = '130-170 lbs'; }
    else if (heightIn < 73) { sizeLabel = 'L'; ageRange = '15+'; weightRange = '150-190 lbs'; }
    else { sizeLabel = 'XL'; ageRange = '15+'; weightRange = '180+ lbs'; }
  }

  const notes: string[] = [];
  notes.push(`Bauer 2024 chart: height + age + weight all factor in.`);
  notes.push(`Best fit comes from trying on with chest fully covered, arms mobile.`);
  if (category === 'Senior' && age < 14) notes.push(`Senior S is sized for 13+ — verify arm length before committing.`);
  if (category === 'Youth' && age > 10) notes.push(`Age 10+ at Youth size — likely a Junior if you're buying for the season.`);

  return { category, sizeLabel, ageRange, weightRange, notes };
}

// GOALIE STICK — by height + age
function calcStick(heightIn: number, age: number): StickResult {
  let category: Category;
  let paddleLengthIn: number;

  if (heightIn < 50) {
    category = 'Youth';
    if (heightIn < 44) { paddleLengthIn = 18; }
    else if (heightIn < 47) { paddleLengthIn = 19; }
    else { paddleLengthIn = 20; }
  } else if (heightIn < 57) {
    category = 'Junior';
    if (heightIn < 51) { paddleLengthIn = 21; }
    else if (heightIn < 54) { paddleLengthIn = 22; }
    else { paddleLengthIn = 23; }
  } else if (heightIn < 64) {
    category = 'Intermediate';
    if (heightIn < 62) { paddleLengthIn = 23; }
    else { paddleLengthIn = 24; }
  } else if (heightIn < 65) {
    // 5'5" boundary — 5'4" can still be Intermediate per GoalieCoaches
    category = 'Intermediate';
    paddleLengthIn = 24;
  } else {
    category = 'Senior';
    if (heightIn < 70) { paddleLengthIn = 24; }
    else if (heightIn < 74) { paddleLengthIn = 24.5; }
    else { paddleLengthIn = 25; }
  }

  const notes: string[] = [];
  notes.push(`Paddle length: top of shoulder to where paddle meets blade.`);
  notes.push(`Total stick length = paddle + shaft (~6-7"). ${paddleLengthIn}" paddle ≈ ${paddleLengthIn + 6}" total.`);
  if (category === 'Senior' && age < 14) notes.push(`Senior stick at <14 — heavy. Intermediate is lighter if not yet high school level.`);
  if (category === 'Intermediate' && age >= 14) notes.push(`Intermediate sticks are lighter than Senior. Valid trade-off for mobility.`);

  return { category, paddleLengthIn, fullLengthIn: paddleLengthIn + 6, notes };
}

export default function GoalieGearSizerClient() {
  // Defaults: a typical adult male goalie (~5'11", 180 lb, 25 yrs)
  const [feet, setFeet] = useState<number>(5);
  const [inches, setInches] = useState<number>(11);
  const [weightLb, setWeightLb] = useState<number>(180);
  const [age, setAge] = useState<number>(25);
  const [useAuto, setUseAuto] = useState<boolean>(true);
  const [manualATK, setManualATK] = useState<number>(20);
  const [manualHand, setManualHand] = useState<number>(7.5);

  const heightIn = feet * 12 + inches;
  const atkIn = useAuto ? estimateATK(heightIn, age) : manualATK;
  const handIn = useAuto ? estimateHandLength(heightIn) : manualHand;

  const result = useMemo<AllResult | null>(() => {
    if (heightIn < 36 || heightIn > 90) return null;
    if (weightLb < 30 || weightLb > 350) return null;
    if (age < 4 || age > 80) return null;
    if (atkIn < 8 || atkIn > 25) return null;
    if (handIn < 3 || handIn > 10) return null;
    return {
      pads: calcLegPads(atkIn),
      blocker: calcGloveByHand(handIn, 'blocker'),
      catchGlove: calcGloveByHand(handIn, 'catch'),
      chest: calcChest(heightIn, age, weightLb),
      stick: calcStick(heightIn, age),
    };
  }, [heightIn, weightLb, age, atkIn, handIn]);

  useEffect(() => {
    if (!result) return;
    if (typeof window === 'undefined') return;
    if ((window as unknown as { __goalieUsed?: boolean }).__goalieUsed) return;
    (window as unknown as { __goalieUsed?: boolean }).__goalieUsed = true;
    try {
      const NAV = navigator as unknown as { sendBeacon?: (u: string, d: Blob) => boolean };
      if (typeof NAV.sendBeacon === 'function') {
        NAV.sendBeacon(
          '/api/track',
          new Blob([JSON.stringify({ name: 'calculator_used', pathname: '/tools/hockey-goalie-gear-sizer', props: { tool: 'hockey_goalie_gear_sizer', heightIn, weightLb, age, useAuto } })], { type: 'application/json' }),
        );
      }
    } catch {
      // never block
    }
  }, [result, heightIn, weightLb, age, useAuto]);

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
            Hockey Goalie Gear Sizer
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto' }}>
            Five pieces in one pass — pads, blocker, catch glove, chest protector, and stick.{' '}
            <span style={{ color: '#FFB81C' }}>No email required.</span>
          </p>
        </div>

        {/* Input form */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            {/* Height */}
            <div>
              <label style={labelStyle}>Height</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <select value={feet} onChange={(e) => setFeet(Number(e.target.value))} style={inputStyle} data-testid="feet">
                    {[3, 4, 5, 6, 7].map((f) => (<option key={f} value={f}>{f} ft</option>))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <select value={inches} onChange={(e) => setInches(Number(e.target.value))} style={inputStyle} data-testid="inches">
                    {Array.from({ length: 12 }, (_, i) => i).map((i) => (<option key={i} value={i}>{i} in</option>))}
                  </select>
                </div>
              </div>
              <div style={helperStyle}>No skates.</div>
            </div>

            {/* Weight */}
            <div>
              <label htmlFor="weight" style={labelStyle}>Weight: {weightLb} lbs</label>
              <input
                id="weight"
                type="range"
                min={30}
                max={350}
                value={weightLb}
                onChange={(e) => setWeightLb(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8102E' }}
              />
              <div style={helperStyle}>Drives chest protector size.</div>
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" style={labelStyle}>Age: {age}</label>
              <input
                id="age"
                type="range"
                min={4}
                max={80}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8102E' }}
              />
              <div style={helperStyle}>Drives chest + stick category.</div>
            </div>
          </div>

          {/* ATK + Hand — optional precise mode */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #1e1e1e' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={useAuto}
                onChange={(e) => setUseAuto(e.target.checked)}
                style={{ accentColor: '#C8102E' }}
              />
              Use my precise measurements (ATK + hand length)
            </label>
            {!useAuto && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label htmlFor="atk" style={labelStyle}>ATK (ankle-to-knee): {manualATK}″</label>
                  <input
                    id="atk"
                    type="range"
                    min={8}
                    max={25}
                    step={0.5}
                    value={manualATK}
                    onChange={(e) => setManualATK(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#C8102E' }}
                  />
                  <div style={helperStyle}>Floor (bare foot) up to center of knee cap, with knee slightly bent.</div>
                </div>
                <div>
                  <label htmlFor="hand" style={labelStyle}>Hand length: {manualHand}″</label>
                  <input
                    id="hand"
                    type="range"
                    min={3}
                    max={10}
                    step={0.25}
                    value={manualHand}
                    onChange={(e) => setManualHand(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#C8102E' }}
                  />
                  <div style={helperStyle}>Palm heel to tip of middle finger.</div>
                </div>
              </div>
            )}
            {useAuto && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
                borderRadius: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
              }}>
                Estimated: ATK ≈ <strong style={{ color: '#FFB81C' }}>{estimateATK(heightIn, age)}″</strong>, Hand ≈ <strong style={{ color: '#FFB81C' }}>{estimateHandLength(heightIn)}″</strong> (from height + age). Toggle above for precise measurements.
              </div>
            )}
          </div>
        </div>

        {/* Results: 5-piece gear list (vertical stack rows for mobile) */}
        {result && (
          <>
            <div style={{
              fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
              letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 600,
            }}>
              Your goalie setup
            </div>

            {/* LEG PADS */}
            <GearCard
              category={result.pads.category}
              sizeLabel={result.pads.sizeLabel}
              pieceName="Leg pads"
              subtitle={`ATK ${result.pads.atkRange}`}
              notes={result.pads.notes}
            />

            {/* BLOCKER */}
            <GearCard
              category={result.blocker.category}
              sizeLabel={result.blocker.sizeLabel}
              pieceName="Blocker"
              subtitle={`Hand ${result.blocker.handRange}`}
              notes={result.blocker.notes}
            />

            {/* CATCH GLOVE */}
            <GearCard
              category={result.catchGlove.category}
              sizeLabel={result.catchGlove.sizeLabel}
              pieceName="Catch glove"
              subtitle={`Hand ${result.catchGlove.handRange}`}
              notes={result.catchGlove.notes}
            />

            {/* CHEST PROTECTOR */}
            <GearCard
              category={result.chest.category}
              sizeLabel={result.chest.sizeLabel}
              pieceName="Chest protector"
              subtitle={`${result.chest.ageRange} · ${result.chest.weightRange}`}
              notes={result.chest.notes}
            />

            {/* GOALIE STICK */}
            <GearCard
              category={result.stick.category}
              sizeLabel={`${result.stick.paddleLengthIn}" paddle / ${result.stick.fullLengthIn}" total`}
              pieceName="Goalie stick"
              subtitle="Top of shoulder to paddle-blade join"
              notes={result.stick.notes}
            />
          </>
        )}

        {/* Fit check + methodology */}
        {result && (
          <>
            <div style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
              padding: '1.5rem', marginTop: '1.5rem', marginBottom: '1.5rem',
            }}>
              <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: '#fff', fontWeight: 700 }}>
                Fit check — what to look for in-store
              </h2>
              <div style={{
                display: 'grid', gap: '0.75rem', color: 'rgba(255,255,255,0.75)',
                fontSize: '0.9rem', lineHeight: 1.5,
              }}>
                <div>
                  <strong style={{ color: '#FFB81C' }}>Pads:</strong>{' '}
                  Knee lands in the center of the knee stack when in butterfly. Thigh rise
                  adds coverage without forcing a taller base pad.
                </div>
                <div>
                  <strong style={{ color: '#FFB81C' }}>Blocker:</strong>{' '}
                  Hand fills the palm snugly, no gap at fingertips. Wrist rotates freely
                  for blocker-side saves.
                </div>
                <div>
                  <strong style={{ color: '#FFB81C' }}>Catch glove:</strong>{' '}
                  Closes cleanly without finger pinch. T-pocket or one-piece break per
                  preference — break-in is the bigger factor than size.
                </div>
                <div>
                  <strong style={{ color: '#FFB81C' }}>Chest protector:</strong>{' '}
                  Full sternum coverage, shoulders mobile. Length should cover belly
                  button — no gap when arms reach overhead.
                </div>
                <div>
                  <strong style={{ color: '#FFB81C' }}>Stick:</strong>{' '}
                  Paddle blade flat on ice when stick is vertical. Top of paddle at
                  mid-thigh when standing stick-hand-down.
                </div>
              </div>
            </div>
          </>
        )}

        {/* Cross-link to other tools */}
        <div style={{
          background: 'rgba(255,184,28,0.05)', border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <strong style={{ color: '#FFB81C' }}>Got the gear, what about cost?</strong>{' '}
            Full goalie setup estimate — pads, glove/blocker combo, chest, mask, stick, skates.
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
          Leg pads by ATK (ankle-to-knee) using Bauer 2024 chart verified
          across 3 sources. Blocker + catch glove by hand length using
          Pure Hockey + True North Goaltending + Bauer charts (hand
          heel to middle-finger tip). Chest protector by Bauer 2024
          height + age + weight chart (GoalieMonkey verified).
          Goalie stick by paddle length using GoalieCoaches chart
          (height-driven, age as secondary). Auto-estimation uses
          ATK ≈ 30% of height (27% for kids 10 and under) and hand
          ≈ 11% of height — industry rules of thumb. Toggle above
          for precise measurements.
        </div>

        {/* Share */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShareButton
            payload={buildToolShare({
              name: 'Hockey Goalie Gear Sizer',
              slug: 'hockey-goalie-gear-sizer',
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
              Find a goalie pro shop →
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
              Local rinks with goalie gear fitting and break-in services.
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
              Own a pro shop? →
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

// Reusable GearCard — mobile-safe vertical stack
function GearCard({
  category,
  sizeLabel,
  pieceName,
  subtitle,
  notes,
}: {
  category: Category;
  sizeLabel: string;
  pieceName: string;
  subtitle: string;
  notes: string[];
}) {
  return (
    <div style={{
      background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px',
      padding: '1rem', marginBottom: '0.75rem',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      {/* Top row: piece name + category badge */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '0.5rem', flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
          fontSize: '1.5rem', color: '#fff', lineHeight: 1,
        }}>
          {pieceName}
        </div>
        <div style={{
          background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.4)',
          borderRadius: '6px', padding: '0.3rem 0.7rem',
          color: '#C8102E', fontSize: '0.7rem',
          fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1px', whiteSpace: 'nowrap',
        }}>
          {category}
        </div>
      </div>
      {/* Subtitle (measurement range) */}
      <div style={{
        fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase', letterSpacing: '1px',
      }}>
        {subtitle}
      </div>
      {/* Size — the headline */}
      <div style={{
        fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
        fontSize: 'clamp(2rem, 5vw, 2.5rem)', color: '#FFB81C',
        lineHeight: 1, letterSpacing: '0.02em',
      }}>
        {sizeLabel}
      </div>
      {/* Notes */}
      <ul style={{
        margin: 0, paddingLeft: '1.25rem',
        color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.5,
      }}>
        {notes.map((n, i) => (<li key={i} style={{ marginBottom: '4px' }}>{n}</li>))}
      </ul>
    </div>
  );
}