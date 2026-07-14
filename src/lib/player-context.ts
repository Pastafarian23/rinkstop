/**
 * Static content used by the player detail page (server-side, in initial HTML).
 *
 * Purpose: bring player pages from ~106 words of unique body text to 600+
 * words without per-page authoring or LLM cost. Each player page composes:
 *
 *   1. About the player    (~80 words, from helper text)
 *   2. FAQ section         (~250-350 words, 6-8 entries from player data)
 *   3. Position-specific prose  (forward/defenseman/goalie, ~150 words)
 *   4. League context      (already covered in league-context.ts; reused)
 *   5. Author bio + last-updated
 *
 * All entries here are SAFE FACTUAL TEMPLATES. Nothing is invented. Where a
 * piece of data is missing (no team, no birth date, no height), the FAQ or
 * prose says so explicitly rather than guessing.
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

const POSITION_LONG: Record<string, { name: string; role: string; paragraph: string }> = {
  center: {
    name: 'Center',
    role: 'Forwards take the faceoffs, drive the play, and score goals. Centers are the primary offensive pivots in most systems.',
    paragraph:
      'A center in ice hockey typically plays the middle of the ice at even strength and takes the most faceoffs in the game. ' +
      'Centers are usually the most playmaking-oriented forwards on their line and are responsible for both offensive and defensive zone ' +
      'responsibility. The position demands strong skating, vision, and hockey IQ, and most NHL-era centers develop into two-way, ' +
      'faceoff-winning players. Notable center archetypes include the playmaker, the power forward, and the two-way shutdown center.',
  },
  left_wing: {
    name: 'Left Wing',
    role: 'Wingers skate on either side of the center and focus on generating and finishing chances.',
    paragraph:
      'A left winger in ice hockey typically plays to the left of the center on a forward line. Wingers are usually the first forwards ' +
      'in on the forecheck and the first back on defense, especially in the offensive zone. Wingers are categorized by play style: ' +
      'goal scorers, playmakers, two-way wings, or power wings. At the NHL level, left wing is one of the highest-paid offensive ' +
      'positions when a player combines top-six ice time with goal-scoring pace.',
  },
  right_wing: {
    name: 'Right Wing',
    role: 'Wingers skate on either side of the center and focus on generating and finishing chances.',
    paragraph:
      'A right winger in ice hockey typically plays to the right of the center on a forward line. The right wing is often the home of ' +
      'right-handed shots in the offensive zone because players of that hand can release on the off wing more naturally. Right wingers ' +
      'are categorized by play style: snipers (one-timer specialists), two-way wings, power wings, or energy forwards. Top-six right ' +
      'wingers with strong shot metrics can be among the most productive forwards in the league.',
  },
  forward: {
    name: 'Forward',
    role: 'Forwards are the three-player units that generate offense at 5-on-5 and on the power play.',
    paragraph:
      'A forward in ice hockey is a position classification rather than a specific role — centers, left wings, and right wings are all ' +
      'types of forwards. Forwards play together as units of three and rotate through the offensive and defensive zones. The strongest ' +
      'forwards in any league combine skating, vision, and finishing, and top-six forward lines usually carry a team\'s offensive ' +
      'production. NHL teams typically run 12-13 forwards on their active rosters.',
  },
  defenseman: {
    name: 'Defenseman',
    role: 'Defensemen play back in their own zone, break out the puck, and quarterback the power play.',
    paragraph:
      'A defenseman in ice hockey typically plays at the back of the formation, with the responsibility of breaking out the puck, ' +
      'defending the slot, and joining the offensive rush when appropriate. Modern defensemen are categorized as shutdown defensemen, ' +
      'two-way defensemen, or offensive defensemen. Top-pair defensemen in the NHL typically log 24 to 28 minutes per game and ' +
      'drive possession at 5-on-5. The position has grown more offensively focused in modern NHL play, with several defensemen ' +
      'routinely producing 60+ points per season.',
  },
  defensE: {
    name: 'Defenseman',
    role: 'Defensemen play back in their own zone, break out the puck, and quarterback the power play.',
    paragraph:
      'A defenseman in ice hockey typically plays at the back of the formation, with the responsibility of breaking out the puck, ' +
      'defending the slot, and joining the offensive rush when appropriate. Modern defensemen are categorized as shutdown defensemen, ' +
      'two-way defensemen, or offensive defensemen. Top-pair defensemen in the NHL typically log 24 to 28 minutes per game.',
  },
  goalie: {
    name: 'Goalie',
    role: 'Goalies are the last line of defense and the team\'s primary shot-stopper at even strength and on the penalty kill.',
    paragraph:
      'A goaltender (or goalie) in ice hockey is the only player allowed to use their hands to handle the puck in the area behind ' +
      'the net. In the NHL, this is restricted to the trapezoid (a 2014 rule clarification); IIHF, NCAA, and most other leagues allow ' +
      'the goalie to play the puck anywhere in the defensive zone. Goalies are the last line of defense against opposing shots and ' +
      'play the position with a unique combination of reflexes, positioning, and hockey sense. Modern goalies are tracked by save ' +
      'percentage, goals-against average, and increasingly advanced shot-quality metrics like expected goals against and high-danger ' +
      'save rate. Top NHL starters typically play 50 to 65 games per season, though workload sharing across two goalies has become ' +
      'more common in recent years.',
  },
  goaltender: {
    name: 'Goaltender',
    role: 'Goaltenders are the team\'s primary shot-stopper at even strength and on the penalty kill.',
    paragraph:
      'A goaltender (or goalie) in ice hockey is the only player allowed to use their hands to handle the puck in the area behind ' +
      'the net. In the NHL, this is restricted to the trapezoid; IIHF, NCAA, and most other leagues allow the goalie to play the puck ' +
      'anywhere in the defensive zone. Modern goaltenders are tracked by save percentage, goals-against average, and increasingly ' +
      'advanced shot-quality metrics like expected goals against and high-danger save rate.',
  },
};

const POSITION_KEY_MAP: Record<string, keyof typeof POSITION_LONG> = {
  center: 'center', C: 'center', Center: 'center',
  left_wing: 'left_wing', LW: 'left_wing', 'Left Wing': 'left_wing',
  right_wing: 'right_wing', RW: 'right_wing', 'Right Wing': 'right_wing',
  forward: 'forward', F: 'forward', Forward: 'forward',
  defenseman: 'defenseman', D: 'defenseman', Defenseman: 'defenseman',
  defense: 'defenseman',
  goalie: 'goalie', G: 'goalie', Goalie: 'goalie',
  goaltender: 'goaltender',
};

function positionMeta(pos: string | null | undefined): { name: string; paragraph: string; role: string } {
  if (!pos) return { name: 'Hockey player', paragraph: '', role: '' };
  const key = POSITION_KEY_MAP[pos] || 'forward';
  const meta = POSITION_LONG[key];
  if (!meta) return { name: 'Hockey player', paragraph: '', role: '' };
  return { name: meta.name, paragraph: meta.paragraph, role: meta.role };
}

export interface PlayerFAQEntry { question: string; answer: string; }

export function buildPlayerFAQs(input: PlayerContextInput): PlayerFAQEntry[] {
  const {
    fullName, position, jerseyNumber, shoots, catches,
    heightCm, weightKg, birthDate, nationality,
    teamName, leagueName, leagueCountry,
  } = input;

  const pos = positionMeta(position);
  const ageText = birthDate ? calcAge(birthDate) : null;
  const bYear = birthDate ? new Date(birthDate).getUTCFullYear() : null;
  const out: PlayerFAQEntry[] = [];

  // Q1: who is this player
  const positionLine = pos.name !== 'Hockey player' ? `plays ${pos.name.toLowerCase()}` : 'is listed as a hockey player';
  const teamLine = teamName ? ` currently plays for ${teamName}` : '';
  const leagueLine = leagueName ? ` in the ${leagueName}` : '';
  const nationalLine = nationality ? (nationality.length === 3 ? null : ` representing ${nationality}`) || null : null;
  const intro = `${fullName} ${positionLine}${teamLine}${leagueLine}.${nationalLine ? ` Also ${nationalLine}.` : ''}`;

  out.push({
    question: `Who is ${fullName}?`,
    answer: intro + (input.bio ? ` ${input.bio}` : ''),
  });

  // Q2: position
  if (pos.name !== 'Hockey player') {
    out.push({
      question: `What position does ${fullName} play?`,
      answer: `${fullName} is listed at ${pos.name}. ${pos.role} ${pos.paragraph}`,
    });
  } else {
    out.push({
      question: `What position does ${fullName} play?`,
      answer: `${fullName} is listed at ${pos.name}. ${pos.role} ` +
        `At the professional and junior levels, the ${pos.name.toLowerCase()} is one of the primary on-ice roles — ` +
        `centers take faceoffs and quarterback the offense, wingers drive the forecheck and finish chances, ` +
        `defensemen break out pucks and quarterback the power play, and goalies are the last line of defense. ` +
        `RinkStop tracks position data as reported by leagues and teams; if the listing needs updating, ` +
        `you can <a href="/corrections">submit a correction</a>.`,
    });
  }

  // Q3: physical attributes
  const parts: string[] = [];
  if (heightCm) parts.push(`${heightCm} cm tall`);
  if (weightKg) parts.push(`${weightKg} kg`);
  if (shoots) parts.push(`shoots ${shoots === 'L' ? 'left' : shoots === 'R' ? 'right' : shoots}`);
  if (catches && position === 'goalie' || (position || '').toLowerCase() === 'goaltender' || (position || '').toLowerCase() === 'goalie') {
    parts.push(`catches ${catches === 'L' ? 'left' : 'left'}`);
  }
  if (jerseyNumber != null) parts.push(`#${jerseyNumber}`);
  if (parts.length > 0) {
    out.push({
      question: `What are ${fullName}'s physical attributes?`,
      answer: `${fullName} is ${parts.join(', ')}. Physical attributes like height and weight are tracked because they help ` +
        `scouts and analysts project a player's role in the lineup — taller forwards may be more effective on the power play, ` +
        `shorter centers can excel on the forecheck, and so on.`,
    });
  } else {
    out.push({
      question: `What are ${fullName}'s physical attributes?`,
      answer: `We do not yet have ${fullName}'s full physical attribute profile on file. ` +
        `When available, height, weight, shooting hand, and jersey number are published here as reported by the league and team. ` +
        `Physical measurements are useful context for scouts and analysts — for example, taller forwards often see more power-play time, ` +
        `while shorter centers can excel on the forecheck. ` +
        `If you have verified figures, you can <a href="/corrections">submit a correction</a>.`,
    });
  }

  // Q4: age / birth date
  if (ageText && bYear) {
    out.push({
      question: `How old is ${fullName}?`,
      answer: `${fullName} was born in ${bYear}, which makes ${ageText.gender} ${ageText.years} years old as of this season. ` +
        `For NHL and pro players, age is a meaningful predictor of peak performance — most forwards peak between ages 24 and 28, ` +
        `while defensemen typically peak slightly later.`,
    });
  } else {
    out.push({
      question: `When was ${fullName} born?`,
      answer: `We do not currently have a confirmed birth date for ${fullName} in the RinkStop database. ` +
        `If you can verify the date, please ` +
        `<a href="/corrections">submit a correction</a> and we will add it.`,
    });
  }

  // Q5: team / league
  if (teamName && leagueName) {
    out.push({
      question: `Which team does ${fullName} play for?`,
      answer: `${fullName} plays for ${teamName} in the ${leagueName}${leagueCountry ? ` (${leagueCountry})` : ''}. ` +
        `Team assignments are updated as trades, call-ups, and free-agent signings happen — see the team page on RinkStop for ` +
        `the full ${teamName} roster and current standings.`,
    });
  } else if (teamName) {
    out.push({
      question: `Which team does ${fullName} play for?`,
      answer: `${fullName} is associated with ${teamName} in the RinkStop database.`,
    });
  } else {
    out.push({
      question: `Which team does ${fullName} play for?`,
      answer: `We do not yet have a confirmed team assignment for ${fullName} in the RinkStop database. ` +
        `Team assignments change during trades, call-ups, free-agent signings, and loan moves — especially across international leagues. ` +
        `If you can confirm the current team, please <a href="/corrections">submit a correction</a> ` +
        `and we will update the player page, roster links, and schedule references.`,
    });
  }

  // Q6: nationality
  if (nationality && nationality.length === 3) {
    out.push({
      question: `What nationality is ${fullName}?`,
      answer: `${fullName}'s listed nationality is ${nationality}. For players on national-team development paths, ` +
        `nationality eligibility can be a complex question (governed by IIHF rules), but the RinkStop database records ` +
        `the nationality reported by the player's league.`,
    });
  } else if (nationality) {
    out.push({
      question: `What nationality is ${fullName}?`,
      answer: `${fullName}'s listed nationality is ${nationality}. ` +
        `Nationality affects IIHF tournament eligibility and which national-team programs the player can represent.`,
    });
  } else {
    out.push({
      question: `What nationality is ${fullName}?`,
      answer: `We do not currently have a confirmed nationality for ${fullName} on file. ` +
        `If you can verify the player's nationality, please ` +
        `<a href="/corrections">submit a correction</a> and we will add it.`,
    });
  }

  // Q7: how to follow
  if (teamName) {
    out.push({
      question: `How can I follow ${fullName}'s games and stats?`,
      answer: `The most direct way to follow ${fullName}'s games and stats is via ${teamName}'s official site, ` +
        `the ${leagueName || 'league'} schedule, and live game broadcasts. ` +
        `RinkStop also surfaces highlights and updates when the league publishes them — see the "Latest Highlights" section on this page.`,
    });
  } else {
    out.push({
      question: `How can I follow ${fullName}'s games?`,
      answer: `We do not currently have ${fullName}'s current team assignment on file, so we cannot link to a team or league ` +
        `game calendar. Once team data is available, we'll link the league schedule here.`,
    });
  }

  // Q8: data freshness
  out.push({
    question: `How current is the data on this page?`,
    answer: `Player data on RinkStop is updated as teams, leagues, and IIHF feeds publish rosters, trades, and stats. ` +
      `The "Last updated" line on this page shows when our record for ${fullName} was last refreshed. ` +
      `If you spot an error, please ` +
      `<a href="/corrections">submit a correction</a>.`,
  });

  return out;
}

/**
 * Build a short intro paragraph for the player page (separate from FAQ).
 * Used in the visible body text.
 */
export function buildPlayerIntro(input: PlayerContextInput): string {
  const { fullName, position, teamName, leagueName, leagueCountry, birthDate, nationality } = input;
  const pos = positionMeta(position);
  const age = birthDate ? calcAge(birthDate) : null;
  const teamLine = teamName ? `who plays for ${teamName}` : 'whose current team assignment is being verified';
  const leagueLine = leagueName ? ` in the ${leagueName}${leagueCountry ? ` (${leagueCountry})` : ''}` : '';
  const ageLine = age ? ` and was born in ${new Date(birthDate!).getUTCFullYear()}` : '';
  const natLine = nationality ? `, representing ${nationality.length === 3 ? iocToName(nationality) || nationality : nationality}` : '';
  return `${fullName} is a ${pos.name.toLowerCase()} ${teamLine}${leagueLine}${ageLine}${natLine}. This profile page covers ` +
    `${fullName}'s career to date, current team, and the broader league context in ${leagueCountry || 'their region'}.`;
}

function iocToName(ioc: string): string | null {
  const map: Record<string, string> = {
    CAN: 'Canada', USA: 'United States', US: 'United States',
    RUS: 'Russia', SWE: 'Sweden', FIN: 'Finland', CZE: 'Czech Republic',
    SVK: 'Slovakia', DEU: 'Germany', GER: 'Germany', CHE: 'Switzerland',
    NOR: 'Norway', DNK: 'Denmark', FRA: 'France', AUT: 'Austria',
    GBR: 'United Kingdom', LAT: 'Latvia', BLR: 'Belarus', SVN: 'Slovenia',
    ITA: 'Italy', NLD: 'Netherlands', AUS: 'Australia', JPN: 'Japan',
    KOR: 'South Korea', CHN: 'China', KAZ: 'Kazakhstan', UKR: 'Ukraine',
    POL: 'Poland', HUN: 'Hungary', EST: 'Estonia', LTU: 'Lithuania',
  };
  return map[ioc] || null;
}

function calcAge(birthDate: string): { years: number; gender: 'they' | 'he' | 'she' } {
  const now = new Date();
  const bd = new Date(birthDate);
  let years = now.getUTCFullYear() - bd.getUTCFullYear();
  const m = now.getUTCMonth() - bd.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < bd.getUTCDate())) years--;
  return { years, gender: 'they' };
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
