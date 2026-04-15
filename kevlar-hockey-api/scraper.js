const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

async function main() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  // Teams
  let teams;
  try {
    teams = await fetchJson('https://statsapi.web.nhl.com/api/v1/teams');
    console.log('Fetched teams from NHL API');
  } catch (e) {
    console.error('NHL API fetch failed, using fallback sample');
    teams = { teams: [
      { id: 1, name: 'New Jersey Devils', venue: { name: 'Prudential Center', city: 'Newark' }, division: { name: 'Metropolitan' } },
      { id: 2, name: 'New York Islanders', venue: { name: 'Barclays Center', city: 'Brooklyn' }, division: { name: 'Metropolitan' } }
    ]};
  }
  fs.writeFileSync(path.join(dataDir, 'teams.json'), JSON.stringify(teams, null, 2));

  // Current season (use current date to infer season year)
  const now = new Date();
  const year = now.getFullYear();
  const season = (now.getMonth() + 1) >= 7 ? `${year}${year+1}` : `${year-1}${year}`;

  // Upcoming schedule (next 7 days)
  let schedule;
  try {
    const scheduleUrl = `https://statsapi.web.nhl.com/api/v1/schedule?season=${season}&startDate=${now.toISOString().slice(0,10)}&endDate=${new Date(now.getTime()+7*24*60*60*1000).toISOString().slice(0,10)}`;
    schedule = await fetchJson(scheduleUrl);
    console.log('Fetched schedule');
  } catch (e) {
    console.error('Schedule fetch failed, using fallback');
    schedule = { dates: [] };
  }
  fs.writeFileSync(path.join(dataDir, 'schedule.json'), JSON.stringify(schedule, null, 2));

  // Recent scores (past 7 days)
  let scores;
  try {
    const pastStart = new Date(now.getTime()-7*24*60*60*1000).toISOString().slice(0,10);
    const scoresUrl = `https://statsapi.web.nhl.com/api/v1/schedule?season=${season}&startDate=${pastStart}&endDate=${now.toISOString().slice(0,10)}`;
    scores = await fetchJson(scoresUrl);
    console.log('Fetched scores');
  } catch (e) {
    console.error('Scores fetch failed, using fallback');
    scores = { dates: [] };
  }
  fs.writeFileSync(path.join(dataDir, 'scores.json'), JSON.stringify(scores, null, 2));

  // Standings
  let standings;
  try {
    standings = await fetchJson('https://statsapi.web.nhl.com/api/v1/standings');
    console.log('Fetched standings');
  } catch (e) {
    console.error('Standings fetch failed, using fallback');
    standings = { records: [] };
  }
  fs.writeFileSync(path.join(dataDir, 'standings.json'), JSON.stringify(standings, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

