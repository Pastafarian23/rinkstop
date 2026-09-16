// Highlightly adapter for audit — fetches match boxscore for SHL, Liiga, DEL, KHL, and Swiss NL fallback
const fs = require('fs');
const env = {};
for (const line of fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = env.HIGHLIGHTLY_API_KEY;

const LEAGUE_IDS = {
  // Highlightly ID → friendly name
  '40781': 'SHL',           // Swedish Hockey League
  '11847': 'Liiga',         // Finnish (Hokiliiga)
  '16953': 'DEL',           // German
  '30569': 'KHL',           // Russian
  // No Swiss NL available in Highlightly
};

// Map our internal league names → Highlightly league ID
const LEAGUE_NAME_TO_ID = {
  'Swedish Hockey League': '40781',
  'Hokiliiga': '11847',
  'Liiga': '11847',
  'Deutsche Eishockey Liga': '16953',
  'Kontinental Hockey League': '30569',
};

async function fetchMatchesForDate(highLid, dateIso) {
  // dateIso: YYYY-MM-DD
  const url = `https://hockey.highlightly.net/matches?leagueId=${highLid}&date=${dateIso}&limit=20`;
  const r = await fetch(url, {
    headers: {
      'x-rapidapi-key': KEY,
      'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
    },
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.data || j || [];
}

function normalizeMatch(m) {
  // Handle both `home`/`away` and `homeTeam`/`awayTeam` field naming
  const homeName = m.home?.name || m.homeTeam?.name;
  const awayName = m.away?.name || m.awayTeam?.name;
  const scoreRaw = m.state?.score?.current;
  if (!scoreRaw) return null;
  const parts = scoreRaw.split('-').map(s => s.trim());
  if (parts.length !== 2) return null;
  const homeScore = parseInt(parts[0], 10);
  const awayScore = parseInt(parts[1], 10);
  if (isNaN(homeScore) || isNaN(awayScore)) return null;
  return {
    homeTeamName: homeName,
    awayTeamName: awayName,
    homeScore,
    awayScore,
    date: m.date?.slice(0, 10),
    state: m.state?.description,
    ot: m.state?.score?.overTime || null,
    so: m.state?.score?.penalties || null,
  };
}

async function findMatchByTeams(highLid, dateIso, homeTeamHint, awayTeamHint) {
  // Try ±2 days for lookup flexibility
  const dates = [dateIso];
  const baseD = new Date(dateIso + 'T00:00:00Z');
  for (let i = 1; i <= 2; i++) {
    const d = new Date(baseD.getTime() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
    const d2 = new Date(baseD.getTime() - i * 86400000);
    dates.push(d2.toISOString().slice(0, 10));
  }

  for (const d of dates) {
    const matches = await fetchMatchesForDate(highLid, d);
    for (const raw of matches) {
      const norm = normalizeMatch(raw);
      if (!norm) continue;
      const hint = (s) => s.toLowerCase().includes(homeTeamHint.toLowerCase()) || s.toLowerCase().includes(awayTeamHint.toLowerCase());
      const homeMatch = norm.homeTeamName.toLowerCase().includes(homeTeamHint.toLowerCase()) || norm.homeTeamName.toLowerCase().includes(awayTeamHint.toLowerCase());
      const awayMatch = norm.awayTeamName.toLowerCase().includes(awayTeamHint.toLowerCase()) || norm.awayTeamName.toLowerCase().includes(homeTeamHint.toLowerCase());
      if (homeMatch || awayMatch || hint(norm.homeTeamName) || hint(norm.awayTeamName)) {
        return norm;
      }
    }
  }
  return null;
}

module.exports = { LEAGUE_IDS, LEAGUE_NAME_TO_ID, fetchMatchesForDate, normalizeMatch, findMatchByTeams };

// Test
if (require.main === module) {
  (async () => {
    // Test: get KHL match on 2026-05-02
    const matches = await fetchMatchesForDate('30569', '2026-05-02');
    console.log('KHL 2026-05-02:', matches.length, 'matches');
    for (const m of matches) {
      const n = normalizeMatch(m);
      if (n) console.log(`  ${n.homeTeamName} ${n.homeScore}-${n.awayScore} ${n.awayTeamName}`);
    }
  })();
}
