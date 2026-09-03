/**
 * Build FAQ entries for a team detail page from real DB data only.
 * Pattern mirrors buildLeagueFAQs and buildCityFAQs in league-context.ts and
 * city-context.ts.
 *
 * Source: 2026-09-03 PR #197 (Layer 3 of aggressive growth plan).
 *   - 2,601 teams × ~5-7 FAQ questions = ~13,000-18,000 new FAQ entries
 *   - All answers sourced from existing DB fields, no fabrication
 *   - Empty data fields omit the question rather than fabricate
 */

export interface TeamFAQEntry {
  question: string;
  answer: string;
}

export interface TeamFAQInput {
  name: string;
  homeCity?: string | null;
  homeCountry?: string | null;
  leagueName?: string | null;
  federationName?: string | null;
  organizationName?: string | null;
  level?: string | null;
  ageLabel?: string | null;
  foundedOn?: string | null;
  description?: string | null;
}

export function buildTeamFAQs(input: TeamFAQInput): TeamFAQEntry[] {
  const {
    name,
    homeCity,
    homeCountry,
    leagueName,
    federationName,
    organizationName,
    level,
    ageLabel,
    foundedOn,
    description,
  } = input;

  const out: TeamFAQEntry[] = [];
  const location = [homeCity, homeCountry].filter(Boolean).join(', ');
  const levelDisplay = level ? level.replace(/_/g, ' ') : '';
  const foundedYear = foundedOn ? String(foundedOn).slice(0, 4) : '';

  // Q1: What is {team}?
  if (location) {
    out.push({
      question: `What is ${name}?`,
      answer:
        `${name} is a hockey team from ${location}, listed on RinkStop's open hockey directory. ` +
        (description
          ? description.replace(/<[^>]+>/g, '').slice(0, 200)
          : `${name} compete at the ${levelDisplay || 'competitive'} level${ageLabel ? ` in the ${ageLabel} age group` : ''}.`),
    });
  } else {
    out.push({
      question: `What is ${name}?`,
      answer: `${name} is a hockey team listed on RinkStop's open hockey directory${leagueName ? `, competing in the ${leagueName}` : ''}.`,
    });
  }

  // Q2: What league does {team} play in?
  if (leagueName) {
    out.push({
      question: `What league does ${name} play in?`,
      answer:
        `${name} compete in the ${leagueName}${location ? ` (${location})` : ''}. ` +
        `Find the full ${leagueName} standings, schedule, and rosters on RinkStop.`,
    });
  }

  // Q3: Where is {team} based?
  if (location) {
    out.push({
      question: `Where is ${name} based?`,
      answer:
        `${name} are based in ${location}. ` +
        `RinkStop lists nearby rinks, leagues, and teams so you can find the team's home venue and competing clubs in the same area.`,
    });
  }

  // Q4: When was {team} founded?
  if (foundedYear) {
    out.push({
      question: `When was ${name} founded?`,
      answer: `${name} were founded in ${foundedYear}. Historical roster and result data may be available on the team's RinkStop profile.`,
    });
  }

  // Q5: What age group does {team} play at?
  if (ageLabel) {
    out.push({
      question: `What age group does ${name} play at?`,
      answer: `${name} compete in the ${ageLabel} age group. Age groups in the RinkStop directory follow IIHF conventions for international hockey and USA Hockey conventions for North America.`,
    });
  }

  // Q6: What level of hockey does {team} play at?
  if (levelDisplay) {
    out.push({
      question: `What level of hockey does ${name} play at?`,
      answer: `${name} compete at the ${levelDisplay} level. RinkStop's directory covers every level from learn-to-play and youth leagues through professional and senior amateur.`,
    });
  }

  // Q7: Who operates {team}?
  if (organizationName) {
    out.push({
      question: `Who operates ${name}?`,
      answer: `${name} are operated by ${organizationName}. For league affiliation, see the team's federation listing on RinkStop.`,
    });
  } else if (federationName) {
    out.push({
      question: `Who sanctions ${name}?`,
      answer: `${name} are sanctioned by ${federationName}. Federation affiliation determines which league and competition rules the team plays under.`,
    });
  }

  return out;
}
