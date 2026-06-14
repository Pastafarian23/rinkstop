#!/usr/bin/env node
/**
 * datasources/nhlcom-article-data.mjs
 *
 * Article-quality data source for NHL games. Returns the full structured
 * "facts block" that the new article generator needs to produce a
 * 100% factual article.
 *
 * The previous pipeline had the LLM invent the article from a YouTube
 * video, then verify it against Highlightly (which often returned
 * "Not started" for finished games). The new pipeline inverts that:
 * we pull the actual boxscore from NHL.com (the source of truth), and
 * the LLM only writes narrative between the verified facts.
 *
 * This module pulls the same data that the article body needs:
 *   - Final score
 *   - Goal scorers (with timestamps, period, strength, assists)
 *   - Goalies (with saves, GA, SA, TOI)
 *   - Three stars
 *   - Shots by period
 *   - Power play / penalty kill summary
 *   - Game date and venue
 *
 * Returns data in the shape of a "facts block" the LLM can render into
 * prose without inventing anything.
 *
 * Usage:
 *   const facts = await fetchNhlGameFacts(2025030414);
 */

const NHL_API = 'https://api-web.nhle.com/v1';

/**
 * Fetch the full structured facts block for an NHL game.
 *
 * @param {number|string} gameId - NHL.com game id (e.g., 2025030414)
 * @returns {Promise<object|null>} facts block, or null if the game is
 *   scheduled/in-progress/finished but data is incomplete
 */
export async function fetchNhlGameFacts(gameId) {
  if (!gameId) return null;
  const [landing, boxscore] = await Promise.all([
    fetch(`${NHL_API}/gamecenter/${gameId}/landing`, { signal: AbortSignal.timeout(15000) }),
    fetch(`${NHL_API}/gamecenter/${gameId}/boxscore`, { signal: AbortSignal.timeout(15000) }),
  ]);
  if (!landing.ok || !boxscore.ok) return null;
  const lj = await landing.json();
  const bj = await boxscore.json();

  // Bail early if the game isn't over. The article is only factually
  // complete when the gameState is OFF.
  if (lj.gameState !== 'OFF' && lj.gameState !== 'FINAL') {
    return { gameState: lj.gameState, complete: false };
  }

  const home = lj.homeTeam || {};
  const away = lj.awayTeam || {};

  // Goals
  const goals = [];
  for (const period of (lj.summary?.scoring || [])) {
    for (const g of (period.goals || [])) {
      goals.push({
        period: period.periodDescriptor?.number ?? null,
        periodType: period.periodDescriptor?.periodType ?? null,
        timeInPeriod: g.timeInPeriod || null,
        teamAbbrev: (typeof g.teamAbbrev === 'object' ? g.teamAbbrev?.default : g.teamAbbrev) || null,
        scorer: g.name?.default || null,
        scorerId: g.playerId || null,
        isPowerPlay: g.strength === 'pp',
        isShortHanded: g.strength === 'sh',
        isEmptyNet: g.goalModifier === 'empty-net',
        isPenaltyShot: g.goalModifier === 'penalty-shot',
        assists: (g.assists || [])
          .filter(a => a && a.name?.default)
          .map(a => ({ name: a.name.default, id: a.playerId || null })),
        scoreAfter: { away: g.awayScore ?? null, home: g.homeScore ?? null },
      });
    }
  }

  // Shots by period
  const shotsByPeriod = (lj.summary?.shotsByPeriod || []).map(p => ({
    period: p.periodDescriptor?.number ?? null,
    away: p.away ?? 0,
    home: p.home ?? 0,
  }));

  // Goalies (from boxscore)
  const goalies = [];
  for (const teamKey of ['homeTeam', 'awayTeam']) {
    const t = bj.playerByGameStats?.[teamKey];
    if (!t) continue;
    for (const g of (t.goalies || [])) {
      if (!g.toi || g.toi === '00:00') continue;
      const goalieName = g.name?.default || null;
      if (!goalieName) continue;  // skip goalies with no name
      goalies.push({
        team: teamKey === 'homeTeam' ? home.abbrev : away.abbrev,
        name: goalieName,
        jerseyNumber: g.sweaterNumber ?? null,
        position: g.positionCode || 'G',
        toi: g.toi,
        saves: g.saves ?? 0,
        shotsAgainst: g.shotsAgainst ?? 0,
        goalsAgainst: g.goalsAgainst ?? 0,
        savePct: g.shotsAgainst ? Number(((g.saves / g.shotsAgainst) * 100).toFixed(1)) : null,
        decision: g.decision || null, // W, L, OTL, SOL
      });
    }
  }
  // Goalies also need playerId for cross-linking to players table.
  // The boxscore goalies object only has name, not playerId, so we
  // re-derive it from the player-by-game-stats or fall back to null.

  // Three stars
  const stars = (lj.summary?.threeStars || []).slice(0, 3).map(s => ({
    star: s.star ?? null,
    team: s.teamAbbrev || null,
    name: s.name?.default || null,
    position: s.position || null,
    goals: s.goals ?? 0,
    assists: s.assists ?? 0,
    points: s.points ?? 0,
    plusMinus: s.plusMinus ?? null,
  }));

  // Power play / PK from teamGameStats (if available)
  const teamGameStats = (lj.summary?.teamGameStats || []).map(t => {
    const out = { team: t.teamAbbrev };
    for (const cat of (t.categories || [])) {
      for (const stat of (cat.stats || [])) {
        out[stat.name] = stat.value;
      }
    }
    return out;
  });

  // Game meta
  const startTime = new Date(lj.startTimeUTC);
  const dateStr = startTime.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });
  const timeStr = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
  });

  const winner = (away.score ?? 0) > (home.score ?? 0) ? away : home;
  const loser = (away.score ?? 0) > (home.score ?? 0) ? home : away;
  const finalHome = home.score ?? null;
  const finalAway = away.score ?? null;
  const periodType = lj.periodDescriptor?.periodType || 'REG';
  const wasOT = periodType === 'OT';
  const wasSO = periodType === 'SO';

  return {
    complete: true,
    source: 'nhl.com',
    gameId: String(gameId),
    gameState: lj.gameState,
    date: dateStr,
    time: timeStr,
    startTimeUTC: lj.startTimeUTC,
    venue: lj.venue?.default || null,
    venueCity: lj.venueLocation?.city || null,
    attendance: lj.attendance ?? null,
    gameType: lj.gameType, // 2=regular, 3=playoff
    seriesStatus: lj.seriesStatus || null, // playoff only
    home: {
      abbrev: home.abbrev,
      name: home.placeName?.default + ' ' + home.commonName?.default,
      placeName: home.placeName?.default,
      commonName: home.commonName?.default,
      score: finalHome,
      logo: home.logo || null,
    },
    away: {
      abbrev: away.abbrev,
      name: away.placeName?.default + ' ' + away.commonName?.default,
      placeName: away.placeName?.default,
      commonName: away.commonName?.default,
      score: finalAway,
      logo: away.logo || null,
    },
    winner,
    loser,
    finalScore: `${finalAway ?? '?'}-${finalHome ?? '?'}`,
    wasOT,
    wasSO,
    periodType,
    goals,
    shotsByPeriod,
    goalies,
    stars,
    teamGameStats,
  };
}

/**
 * Format a facts block into a deterministic article. This is the
 * "no-LLM" baseline that the LLM version adds narrative around.
 *
 * @param {object} facts - from fetchNhlGameFacts
 * @returns {string} markdown
 */
export function renderFactsAsArticle(facts) {
  if (!facts?.complete) return null;

  const w = facts.winner;
  const l = facts.loser;
  const wName = w?.placeName?.default ? `${w.placeName.default} ${w.commonName?.default || ''}`.trim() : (w?.name || 'Winner');
  const lName = l?.placeName?.default ? `${l.placeName.default} ${l.commonName?.default || ''}`.trim() : (l?.name || 'Loser');
  const winScore = w.score;
  const loseScore = l.score;

  // Lead sentence: who won, what series/round, where.
  const seriesBit = facts.seriesStatus
    ? ` (${facts.seriesStatus.seriesTitle || 'Stanley Cup Final'}, ${facts.seriesStatus.seriesGameLabel || ''})`
    : '';
  const headline = `${wName} top ${lName} ${winScore}-${loseScore}${facts.wasOT ? ' in overtime' : facts.wasSO ? ' in a shootout' : ''}${seriesBit}`;

  const lines = [];
  lines.push(`# ${headline}`);
  lines.push('');
  lines.push(`${facts.date} — ${facts.away.placeName} ${facts.away.commonName} ${facts.away.score}, ${facts.home.placeName} ${facts.home.commonName} ${facts.home.score}. Final.${facts.wasOT ? ' (OT)' : ''}${facts.wasSO ? ' (SO)' : ''}`);
  lines.push('');

  // Three stars
  if (facts.stars.length) {
    lines.push('## Three stars');
    for (const s of facts.stars) {
      const pts = (s.goals + s.assists) > 0 ? ` (${s.goals}G, ${s.assists}A)` : '';
      lines.push(`- ${s.star}. ${s.name} (${s.team})${pts}`);
    }
    lines.push('');
  }

  // Goals
  if (facts.goals.length) {
    lines.push('## Goal summary');
    for (const g of facts.goals) {
      const pp = g.isPowerPlay ? ' PPG' : '';
      const sh = g.isShortHanded ? ' SHG' : '';
      const en = g.isEmptyNet ? ' EN' : '';
      const ps = g.isPenaltyShot ? ' PS' : '';
      const assists = g.assists.length ? ` (${g.assists.map(a => a.name).join(', ')})` : '';
      const teamName = g.teamAbbrev === facts.home.abbrev ? facts.home.commonName : facts.away.commonName;
      const periodLabel = g.period === 1 ? '1st' : g.period === 2 ? '2nd' : g.period === 3 ? '3rd' : `OT`;
      const trail = `${g.scoreAfter?.away ?? '?'}-${g.scoreAfter?.home ?? '?'}`;
      lines.push(`- ${periodLabel} ${g.timeInPeriod} — ${g.scorer}, ${teamName}${assists}${pp}${sh}${en}${ps}. Score now ${trail}.`);
    }
    lines.push('');
  }

  // Goalies
  if (facts.goalies.length) {
    lines.push('## Goalies');
    for (const g of facts.goalies) {
      const teamName = g.team === facts.home.abbrev ? facts.home.commonName : facts.away.commonName;
      lines.push(`- ${g.name} (${teamName}): ${g.saves} SV on ${g.shotsAgainst} SH, ${g.goalsAgainst} GA, ${g.savePct ?? '—'} SV%, ${g.toi} TOI. Decision: ${g.decision || '—'}.`);
    }
    lines.push('');
  }

  // Shots
  if (facts.shotsByPeriod.length) {
    lines.push('## Shots on goal');
    let awayTotal = 0, homeTotal = 0;
    for (const p of facts.shotsByPeriod) {
      const periodLabel = p.period === 1 ? '1st' : p.period === 2 ? '2nd' : p.period === 3 ? '3rd' : `OT${(p.period || 0) - 3}`;
      lines.push(`- ${periodLabel}: ${p.away} (${facts.away.commonName}) to ${p.home} (${facts.home.commonName})`);
      awayTotal += p.away || 0;
      homeTotal += p.home || 0;
    }
    lines.push(`- Total: ${awayTotal} to ${homeTotal}`);
    lines.push('');
  }

  // Power play
  const ppStats = facts.teamGameStats.find(t => t.powerPlayGoals !== undefined);
  if (ppStats) {
    lines.push('## Special teams');
    for (const t of facts.teamGameStats) {
      if (t.powerPlayGoals === undefined) continue;
      const teamName = t.team === facts.home.abbrev ? facts.home.commonName : facts.away.commonName;
      lines.push(`- ${teamName}: ${t.powerPlayGoals}/${t.powerPlayOpportunities} on the power play.`);
    }
    lines.push('');
  }

  // Meta
  lines.push('## Game meta');
  lines.push(`- Venue: ${facts.venue}${facts.venueCity ? `, ${facts.venueCity}` : ''}`);
  lines.push(`- Start (PT): ${facts.time}`);
  if (facts.attendance) lines.push(`- Attendance: ${facts.attendance.toLocaleString()}`);
  lines.push(`- Source: NHL.com gamecenter (game id ${facts.gameId})`);
  lines.push('');

  return lines.join('\n');
}
