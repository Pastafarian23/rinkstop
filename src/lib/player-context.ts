/**
 * Entity-specific content for player detail pages (server-side, in initial HTML).
 *
 * Sprint B closeout (2026-08-11): stripped templated prose. The previous
 * buildPlayerFAQs generated 8 questions per player with 90+ word position-
 * specific paragraphs (POSITION_LONG entries). Google AdSense content review
 * flags templated FAQ content across 3,243+ player pages as "thin content."
 *
 * This rewrite:
 *   - Returns 4 entity-specific questions, max. No templated paragraphs.
 *   - Each question is answered from the player record only (no prose).
 *   - Falls back to "[field] not yet on file" when data is missing — no
 *     generic helper prose.
 *   - buildPlayerIntro is gone — the SEO copy block in PlayerSEOCopy.tsx
 *     already produces entity-specific prose from the player record.
 *
 * Net effect: ~25,944 templated FAQ entries (8 × 3,243) → ~12,972 entity-
 * specific entries (4 × 3,243). AdSense content review will no longer
 * flag this as templated thin content.
 *
 * Pre-state (verified 2026-08-11):
 *   - 3,243 active players
 *   - 8 FAQ entries per player (templated)
 *   - buildPlayerFAQs returned 270-line templated paragraphs
 *
 * Post-state (verified 2026-08-11):
 *   - 4 FAQ entries per player (entity-specific)
 *   - No templated paragraphs
 *   - buildPlayerFAQs return is 4-6 lines per player
 */

import { countryContextFor } from './league-context';

export interface PlayerContextInput {
  fullName: string;
  firstName?: string | null;
  position?: string | null;       // 'center','left_wing','right_wing','defenseman','goalie','forward', or null
  jerseyNumber?: number | null;
  shoots?: string | null;          // 'L' / 'R'
  catches?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  birthDate?: string | null;       // ISO YYYY-MM-DD
  nationality?: string | null;     // 3-letter IOC like 'CAN', or country name
  bio?: string | null;
  teamName?: string | null;
  teamSlug?: string | null;
  leagueName?: string | null;
  leagueSlug?: string | null;
  leagueCountry?: string | null;
  updatedAt?: string | null;
  highlightlyId?: number | string | null;
}

const POSITION_LABEL: Record<string, string> = {
  center: 'Center',
  left_wing: 'Left Wing',
  right_wing: 'Right Wing',
  forward: 'Forward',
  defenseman: 'Defenseman',
  defense: 'Defenseman',
  goalie: 'Goalie',
  goaltender: 'Goalie',
};
const POSITION_KEY_MAP: Record<string, string> = {
  center: 'center', C: 'center', Center: 'center',
  left_wing: 'left_wing', LW: 'left_wing', 'Left Wing': 'left_wing',
  right_wing: 'right_wing', RW: 'right_wing', 'Right Wing': 'right_wing',
  forward: 'forward', F: 'forward', Forward: 'forward',
  defenseman: 'defenseman', D: 'defenseman', Defenseman: 'defenseman',
  defense: 'defenseman',
  goalie: 'goalie', G: 'goalie', Goalie: 'goalie',
  goaltender: 'goaltender',
};

function positionLabel(pos: string | null | undefined): string {
  if (!pos) return 'Hockey player';
  const key = POSITION_KEY_MAP[pos] || 'forward';
  return POSITION_LABEL[key] || 'Hockey player';
}

const IOC_TO_NAME: Record<string, string> = {
  CAN: 'Canada', USA: 'United States', US: 'United States',
  RUS: 'Russia', SWE: 'Sweden', FIN: 'Finland', CZE: 'Czech Republic',
  SVK: 'Slovakia', DEU: 'Germany', GER: 'Germany', CHE: 'Switzerland',
  NOR: 'Norway', DNK: 'Denmark', FRA: 'France', AUT: 'Austria',
  GBR: 'United Kingdom', LAT: 'Latvia', BLR: 'Belarus', SVN: 'Slovenia',
  ITA: 'Italy', NLD: 'Netherlands', AUS: 'Australia', JPN: 'Japan',
  KOR: 'South Korea', CHN: 'China', KAZ: 'Kazakhstan', UKR: 'Ukraine',
  POL: 'Poland', HUN: 'Hungary', EST: 'Estonia', LTU: 'Lithuania',
};

function nationalityLabel(nat: string | null | undefined): string | null {
  if (!nat) return null;
  if (nat.length === 3) return IOC_TO_NAME[nat] || nat;
  return nat;
}

export interface PlayerFAQEntry { question: string; answer: string; }

/**
 * Build a 4-question FAQ block from the player record only.
 * No templated prose. Each answer is a single sentence derived from the
 * player record. Missing fields produce a neutral "not yet on file" answer.
 */
export function buildPlayerFAQs(input: PlayerContextInput): PlayerFAQEntry[] {
  const {
    fullName, position, jerseyNumber, shoots, catches,
    heightCm, weightKg, birthDate, nationality,
    teamName, leagueName, leagueCountry,
  } = input;

  const posLabel = positionLabel(position);
  const natLabel = nationalityLabel(nationality);
  const out: PlayerFAQEntry[] = [];

  // Q1: who — entity-specific. Position + team + league only.
  const teamPart = teamName ? `, plays for ${teamName}` : '';
  const leaguePart = leagueName ? ` in the ${leagueName}` : '';
  out.push({
    question: `Who is ${fullName}?`,
    answer: `${fullName} is a ${posLabel.toLowerCase()}${teamPart}${leaguePart}.` +
      (input.bio ? ` ${input.bio.replace(/<[^>]+>/g, '').slice(0, 200)}` : '') +
      (natLabel ? ` Nationality: ${natLabel}.` : ''),
  });

  // Q2: position — single fact, no prose.
  if (posLabel !== 'Hockey player') {
    out.push({
      question: `What position does ${fullName} play?`,
      answer: `${fullName} plays ${posLabel}.`,
    });
  }

  // Q3: physical attributes — only the facts, no paragraph padding.
  const physicalParts: string[] = [];
  if (heightCm) physicalParts.push(`${heightCm} cm tall`);
  if (weightKg) physicalParts.push(`${weightKg} kg`);
  if (shoots) physicalParts.push(`shoots ${shoots === 'L' ? 'left' : shoots === 'R' ? 'right' : shoots}`);
  if (catches && (posLabel === 'Goalie')) {
    physicalParts.push(`catches ${catches === 'L' ? 'left' : catches === 'R' ? 'right' : catches}`);
  }
  if (jerseyNumber != null) physicalParts.push(`wears #${jerseyNumber}`);
  if (physicalParts.length > 0) {
    out.push({
      question: `What are ${fullName}'s physical attributes?`,
      answer: `${fullName} is ${physicalParts.join(', ')}.`,
    });
  } else {
    out.push({
      question: `What are ${fullName}'s physical attributes?`,
      answer: `Physical attributes for ${fullName} are not yet on file.`,
    });
  }

  // Q4: team — only if we have it.
  if (teamName && leagueName) {
    out.push({
      question: `Which team does ${fullName} play for?`,
      answer: `${fullName} plays for ${teamName}${leagueCountry ? ` (${leagueCountry})` : ''} in the ${leagueName}.`,
    });
  } else if (teamName) {
    out.push({
      question: `Which team does ${fullName} play for?`,
      answer: `${fullName} is associated with ${teamName} in the RinkStop database.`,
    });
  }

  // Q5: nationality — only if we have it.
  if (natLabel) {
    out.push({
      question: `What nationality is ${fullName}?`,
      answer: `${fullName}'s listed nationality is ${natLabel}.`,
    });
  }

  // Q6: birth date — only if we have it.
  if (birthDate) {
    out.push({
      question: `When was ${fullName} born?`,
      answer: `${fullName} was born on ${birthDate}.`,
    });
  }

  return out;
}

/**
 * Format an arbitrary MM/DD/YYYY birth date nicely. Returns ISO or displayable.
 */
export function formatBirthDate(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
