// src/app/draft/nationality.ts -- nationality display + search helpers
//
// Picks store nationality as ISO 3-letter codes (e.g. 'CAN', 'USA', 'SWE').
// This module provides:
//   - NATIONALITY_NAME:  code -> full English name (for display)
//   - NATIONALITY_CODE:  alias / full name -> code (for search input)
//   - normalizeNationality(): case-insensitive search normalizer
//   - nationalityMatches(): true if a pick's nationality matches user input
//     in either code OR full-name form
//
// Adding a new country? Append to both maps. Keep them in sync.

export const NATIONALITY_NAME: Record<string, string> = {
  AUT: 'Austria',
  BLR: 'Belarus',
  CAN: 'Canada',
  CAY: 'Cayman Islands',
  CHE: 'Switzerland', // 2-letter alt for SUI
  CHN: 'China',
  CRO: 'Croatia',
  CZE: 'Czech Republic',
  DEN: 'Denmark',
  FIN: 'Finland',
  FRA: 'France',
  GBR: 'United Kingdom',
  GER: 'Germany',
  HUN: 'Hungary',
  ITA: 'Italy',
  JPN: 'Japan',
  KAZ: 'Kazakhstan',
  LAT: 'Latvia',
  MDA: 'Moldova',
  NED: 'Netherlands',
  NOR: 'Norway',
  POL: 'Poland',
  RUS: 'Russia',
  SLO: 'Slovenia',
  SVK: 'Slovakia',
  SUI: 'Switzerland',
  SWE: 'Sweden',
  UKR: 'Ukraine',
  USA: 'United States',
  // 2-letter alt codes (Hockey-Reference style)
  HU: 'Hungary',
  US: 'United States',
  CA: 'Canada',
  SE: 'Sweden',
  FI: 'Finland',
};

// Reverse map: full name (lowercased) -> code
const NAME_TO_CODE: Record<string, string> = {};
for (const [code, name] of Object.entries(NATIONALITY_NAME)) {
  // Skip 2-letter alt codes to keep the reverse map clean
  if (code.length === 3) {
    NAME_TO_CODE[name.toLowerCase()] = code;
  }
}

/** Convert any input (code, full name, or empty) to a canonical 3-letter code. */
export function normalizeNationality(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (NATIONALITY_NAME[upper]) {
    // Map 2-letter alt codes to 3-letter canonical (US -> USA, HU -> HUN, etc.)
    if (upper.length === 2) {
      if (upper === 'US') return 'USA';
      if (upper === 'HU') return 'HUN';
      if (upper === 'CA') return 'CAN';
      if (upper === 'SE') return 'SWE';
      if (upper === 'FI') return 'FIN';
      if (upper === 'CH') return 'SUI';
    }
    return upper;
  }
  const lower = trimmed.toLowerCase();
  if (NAME_TO_CODE[lower]) return NAME_TO_CODE[lower];
  return null;
}

/** Display name for a nationality code, or the code itself if unknown. */
export function displayNationality(code: string | null | undefined): string {
  if (!code) return '';
  const upper = code.toUpperCase();
  return NATIONALITY_NAME[upper] ?? code;
}

/** True if `pick.nationality` matches the user's `query` in either form. */
export function nationalityMatches(
  pickNationality: string | null | undefined,
  query: string | null | undefined,
): boolean {
  if (!query || !query.trim()) return true;
  const code = normalizeNationality(pickNationality);
  const needle = normalizeNationality(query);
  if (!code) return false;
  if (!needle) {
    // Couldn't normalize — fall back to substring on the code and full name
    const q = query.trim().toLowerCase();
    return (
      code.toLowerCase().includes(q) ||
      displayNationality(code).toLowerCase().includes(q)
    );
  }
  return code === needle;
}
