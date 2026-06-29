'use client';

// src/app/tools/hockey-glove-size-calculator/GloveSizeCalculatorClient.tsx
//
// Interactive glove sizing tool.
//
// Two modes:
//   (A) By height (cm or ft/in) — for parents who haven't measured their kid
//   (B) By measurement — fingertip-to-elbow (inches)
//
// Position nudge: goalies wear 1" larger (blocker room), defensemen
// often wear 0.5" larger (shot-block reach). Forwards standard.
//
// Industry data verified against Bauer / Pure Hockey / Game Time Sports
// / Peranis Hockey World / Hockey Hero (5+ sources agree on the
// height→size and measurement→size tables).
//
// Self-test mirror: /tmp/glove-size-selftest.mjs
//   Build verifies types. Self-test verifies calc logic against 16
//   representative profiles (8 height-based + 8 measurement-based).

import { useState, useMemo } from 'react';
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
  minIn: number;    // inclusive lower bound (inches)
  maxIn: number;    // inclusive upper bound (inches)
  sizeIn: number;
  ageHint: string;
}

interface MeasurementBucket {
  minIn: number;    // inclusive lower bound (measurement inches)
  maxIn: number;    // inclusive upper bound (measurement inches)
  sizeIn: number;
}

// Industry-standard height-to-glove-size lookup.
// (Sources: Game Time Sports + Peranis height chart, 2026)
const HEIGHT_BUCKETS: HeightBucket[] = [
  { minIn: 0,   maxIn: 42,  sizeIn: 8,  ageHint: '3–5 yrs' },     // up to 3'6"
  { minIn: 43,  maxIn: 48,  sizeIn: 9,  ageHint: '5–7 yrs' },     // 3'7"-4'0"
  { minIn: 49,  maxIn: 54,  sizeIn: 10, ageHint: '7–9 yrs' },     // 4'1"-4'6"
  { minIn: 55,  maxIn: 60,  sizeIn: 11, ageHint: '9–11 yrs' },    // 4'7"-5'0"
  { minIn: 61,  maxIn: 64,  sizeIn: 12, ageHint: '10–12 yrs' },   // 5'1"-5'4"
  { minIn: 65,  maxIn: 68,  sizeIn: 13, ageHint: '12–14 yrs' },   // 5'5"-5'8"
  { minIn: 69,  maxIn: 72,  sizeIn: 14, ageHint: '14+ yrs' },     // 5'9"-6'0"
  { minIn: 73,  maxIn: 999, sizeIn: 15, ageHint: '14+ / adult' }, // 6'1"+
];

// Industry-standard arm-measurement-to-glove-size lookup.
// (Sources: Bauer + Pure Hockey fingertip-to-elbow chart, 2026)
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

  const notes: string[] = [];
  let adjustedSize = bucket.sizeIn;
  let positionNote = '';

  if (position === 'goalie') {
    adjustedSize = bucket.sizeIn + 1;
    positionNote = 'Goalie: +1" for blocker room.';
    notes.push('Goalies wear one size larger to fit the blocker and allow blocker movement.');
  } else if (position === 'defense') {
    adjustedSize = bucket.sizeIn + 0.5;
    positionNote = 'Defense: +0.5" for shot-block reach.';
    notes.push('Defensemen often go up a half size for stick-blocking reach.');
  } else {
    positionNote = 'Forward: standard sizing.';
  }

  // Clamp to standard glove retail range (8"–15"+ — round to whole inch).
  const finalSize = Math.max(8, Math.min(15, Math.round(adjustedSize)));

  notes.push(`Estimated age range based on height: ${bucket.ageHint}.`);
  notes.push('If the brand chart lists half sizes in your range, round DOWN from this for snug fit, UP for growing room.');

  return {
    sizeIn: finalSize,
    ageHint: bucket.ageHint,
    positionNote,
    notes,
  };
}

function calcGloveByMeasurement(measurementIn: number, position: Position): GloveRecommendation {
  const bucket = MEASUREMENT_BUCKETS.find((b) => measurementIn >= b.minIn && measurementIn < b.maxIn)
    ?? MEASUREMENT_BUCKETS[MEASUREMENT_BUCKETS.length - 1];

  const notes: string[] = [];
  let adjustedSize = bucket.sizeIn;
  let positionNote = '';

  if (position === 'goalie') {
    adjustedSize = bucket.sizeIn + 1;
    positionNote = 'Goalie: +1" for blocker room.';
    notes.push('Goalies wear one size larger to fit the blocker and allow blocker movement.');
  } else if (position === 'defense') {
    adjustedSize = bucket.sizeIn + 0.5;
    positionNote = 'Defense: +0.5" for shot-block reach.';
    notes.push('Defensemen often go up a half size for stick-blocking reach.');
  } else {
    positionNote = 'Forward: standard sizing.';
  }

  const finalSize = Math.max(8, Math.min(15, Math.round(adjustedSize)));

  // Measurement is more direct — guess age band from size.
  const ageGuess = AGE_BY_SIZE[finalSize] ?? '14+ yrs';
  notes.push(`Measurement method is more accurate than height-based, so this is the recommended size.`);
  notes.push(`Estimated age band: ${ageGuess}.`);

  return {
    sizeIn: finalSize,
    ageHint: ageGuess,
    positionNote,
    notes,
  };
}

const AGE_BY_SIZE: Record<number, string> = {
  8:  '3–5 yrs',
  9:  '5–7 yrs',
  10: '7–9 yrs',
  11: '9–11 yrs',
  12: '10–12 yrs',
  13: '12–14 yrs',
  14: '14+ yrs',
  15: '14+ / adult',
};

export default function GloveSizeCalculatorClient() {
  const [mode, setMode] = useState<Mode>('height');

  // Height mode state (feet + inches)
  const [feet, setFeet] = useState<number>(4);
  const [inches, setInches] = useState<number>(6);

  // Measurement mode state (inches only)
  const [measurement, setMeasurement] = useState<number>(11);

  const [position, setPosition] = useState<Position>('forward');

  const rec = useMemo<GloveRecommendation | null>(() => {
    if (mode === 'height') {
      const heightIn = feet * 12 + inches;
      if (heightIn < 24 || heightIn > 96) return null;
      return calcGloveByHeight(heightIn, position);
    } else {
      if (measurement < 5 || measurement > 20) return null;
      return calcGloveByMeasurement(measurement, position);
    }
  }, [mode, feet, inches, measurement, position]);

  const feetOptions = [2, 3, 4, 5, 6];
  const inchesOptions = Array.from({ length: 12 }, (_, i) => i);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Hockey Glove Size Calculator
        </h1>
        <p className="text-gray-600">
          Find the right hockey glove size by height or by measuring your arm.
          Two input modes — height is faster, arm measurement is more accurate.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setMode('height')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            mode === 'height'
              ? 'border-[#C8102E] text-[#C8102E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          By height
        </button>
        <button
          onClick={() => setMode('measurement')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            mode === 'measurement'
              ? 'border-[#C8102E] text-[#C8102E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          By arm measurement
        </button>
      </div>

      {/* Form */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {mode === 'height' ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Player height
            </label>
            <div className="flex gap-3 items-end mb-6">
              <div>
                <select
                  value={feet}
                  onChange={(e) => setFeet(Number(e.target.value))}
                  className="block w-24 px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-[#C8102E] focus:border-[#C8102E]"
                  data-testid="feet"
                >
                  {feetOptions.map((f) => (
                    <option key={f} value={f}>
                      {f} ft
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={inches}
                  onChange={(e) => setInches(Number(e.target.value))}
                  className="block w-24 px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-[#C8102E] focus:border-[#C8102E]"
                  data-testid="inches"
                >
                  {inchesOptions.map((i) => (
                    <option key={i} value={i}>
                      {i} in
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              No measurement needed. Use the child's standing height
              (without skates).
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Arm measurement (fingertip to elbow, in inches)
            </label>
            <div className="flex gap-3 items-end">
              <input
                type="number"
                min={5}
                max={20}
                step={0.25}
                value={measurement}
                onChange={(e) => setMeasurement(Number(e.target.value))}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-[#C8102E] focus:border-[#C8102E]"
                data-testid="measurement"
              />
              <span className="text-gray-500">inches</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              With the player's arm slightly bent at the elbow, measure from
              the tip of the middle finger to the elbow. Hockey gloves are
              sized in inches.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Position
          </label>
          <div className="flex gap-4">
            {(['forward', 'defense', 'goalie'] as const).map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="position"
                  value={p}
                  checked={position === p}
                  onChange={() => setPosition(p)}
                  className="text-[#C8102E] focus:ring-[#C8102E]"
                  data-testid={`position-${p}`}
                />
                <span className="text-gray-800 capitalize">{p}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Result */}
      {rec && (
        <section
          className="bg-gradient-to-br from-[#041E42] to-[#0a2a55] text-white rounded-lg p-6 mb-6"
          data-testid="result"
          data-glove-size={rec.sizeIn}
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-[#FFB81C] mb-1">
            Recommended glove size
          </p>
          <p className="text-6xl font-bold mb-2" data-testid="size-value">
            {rec.sizeIn}"
          </p>
          <p className="text-gray-300 mb-4">
            {rec.positionNote} {rec.ageHint !== '' && <>· Estimated age: {rec.ageHint}</>}
          </p>

          <ul className="space-y-2 text-sm text-gray-200">
            {rec.notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#FFB81C]">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Fit check + sizing chart */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">
          Fit check — how the glove should feel
        </h2>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>
            <strong>Good fit:</strong> Fingertips barely touch the end of the glove when your hand is in a fist.
            Small gap between fingertip and glove end is ideal.
          </li>
          <li>
            <strong>Too big:</strong> If you can fit a full finger past your fingertips inside the glove, go down a half size.
          </li>
          <li>
            <strong>Too small:</strong> If the fingertips push hard against the end and you can't make a fist comfortably, go up a half size.
          </li>
          <li>
            <strong>Wrist mobility:</strong> With the glove on and your arm bent at 90°, the cuff should overlap the elbow pad without a gap or a long overlap.
          </li>
        </ul>
      </section>

      {/* Sizing chart */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-3">
          Sizing chart reference
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-medium text-gray-800 mb-2">By height</p>
            <table className="w-full text-left">
              <thead className="text-gray-500 text-xs">
                <tr>
                  <th className="py-1">Height</th>
                  <th className="py-1">Glove</th>
                  <th className="py-1">Age</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="py-1">up to 3'6"</td><td className="py-1">8"</td><td className="py-1">3–5</td></tr>
                <tr className="border-t"><td className="py-1">3'7"–4'0"</td><td className="py-1">9"</td><td className="py-1">5–7</td></tr>
                <tr className="border-t"><td className="py-1">4'1"–4'6"</td><td className="py-1">10"</td><td className="py-1">7–9</td></tr>
                <tr className="border-t"><td className="py-1">4'7"–5'0"</td><td className="py-1">11"</td><td className="py-1">9–11</td></tr>
                <tr className="border-t"><td className="py-1">5'1"–5'4"</td><td className="py-1">12"</td><td className="py-1">10–12</td></tr>
                <tr className="border-t"><td className="py-1">5'5"–5'8"</td><td className="py-1">13"</td><td className="py-1">12–14</td></tr>
                <tr className="border-t"><td className="py-1">5'9"–6'0"</td><td className="py-1">14"</td><td className="py-1">14+</td></tr>
                <tr className="border-t"><td className="py-1">6'1"+</td><td className="py-1">15"</td><td className="py-1">adult</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-medium text-gray-800 mb-2">By arm measurement (fingertip-to-elbow)</p>
            <table className="w-full text-left">
              <thead className="text-gray-500 text-xs">
                <tr>
                  <th className="py-1">Measurement</th>
                  <th className="py-1">Glove</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="py-1">8–9"</td><td className="py-1">8"</td></tr>
                <tr className="border-t"><td className="py-1">9–10"</td><td className="py-1">9"</td></tr>
                <tr className="border-t"><td className="py-1">10–11"</td><td className="py-1">10"</td></tr>
                <tr className="border-t"><td className="py-1">11–12"</td><td className="py-1">11"</td></tr>
                <tr className="border-t"><td className="py-1">12–13"</td><td className="py-1">12"</td></tr>
                <tr className="border-t"><td className="py-1">13–14"</td><td className="py-1">13"</td></tr>
                <tr className="border-t"><td className="py-1">14–15"</td><td className="py-1">14"</td></tr>
                <tr className="border-t"><td className="py-1">15+"</td><td className="py-1">15"</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cross-link to other tools */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">
          Other hockey sizing tools
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Once your player has the right glove, you'll also need:
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <li>
            <a
              href="/tools/hockey-stick-size-calculator"
              className="block px-4 py-3 rounded-md border border-gray-200 hover:border-[#C8102E] hover:bg-gray-50"
            >
              <span className="font-semibold text-gray-900">Stick size</span>
              <span className="block text-gray-600">
                Length, flex, and curve by height, weight, position.
              </span>
            </a>
          </li>
          <li>
            <a
              href="/tools/hockey-cost-calculator"
              className="block px-4 py-3 rounded-md border border-gray-200 hover:border-[#C8102E] hover:bg-gray-50"
            >
              <span className="font-semibold text-gray-900">Cost calculator</span>
              <span className="block text-gray-600">
                Youth hockey budget — registration, equipment, travel.
              </span>
            </a>
          </li>
          <li>
            <a
              href="/directory/rinks"
              className="block px-4 py-3 rounded-md border border-gray-200 hover:border-[#C8102E] hover:bg-gray-50"
            >
              <span className="font-semibold text-gray-900">Find a rink</span>
              <span className="block text-gray-600">
                Local rinks and pro shops that fit hockey gloves in-store.
              </span>
            </a>
          </li>
          <li>
            <a
              href="/claim-your-listing"
              className="block px-4 py-3 rounded-md border border-gray-200 hover:border-[#C8102E] hover:bg-gray-50"
            >
              <span className="font-semibold text-gray-900">Own a rink or shop?</span>
              <span className="block text-gray-600">
                Claim your listing — free, takes 2 min.
              </span>
            </a>
          </li>
        </ul>
      </section>

      {/* Methodology */}
      <footer className="text-xs text-gray-500 leading-relaxed">
        <p>
          <strong style={{ color: '#FFB81C' }}>How we calculated this.</strong>{' '}
          Height lookup uses the Game Time Sports / Peranis chart (8 standard
          height buckets, 8"–15" retail range). Arm measurement lookup uses
          the Bauer / Pure Hockey fingertip-to-elbow chart (8 buckets, same
          retail range). Goalies add +1" for blocker room, defensemen add
          +0.5" for shot-block reach. Final size clamped to 8"–15" retail
          range and rounded to the nearest whole inch. Size and age mapping
          verified across 4 industry sources — Bauer, Pure Hockey, Game
          Time Sports, and Peranis Hockey World.
        </p>
      </footer>

      {/* Share */}
      <div className="mt-6 flex justify-end">
        <ShareButton
          payload={buildToolShare({
            slug: 'hockey-glove-size-calculator',
            name: 'Hockey Glove Size Calculator',
            description:
              'Free hockey glove sizing tool with two modes: by height or by arm measurement.',
          })}
        />
      </div>
    </main>
  );
}
