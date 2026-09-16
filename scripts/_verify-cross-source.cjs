// Cross-source verification: given multiple cache rows for the same game, decide PASS / FAIL.
// Direction-agnostic: two rows that record the same game with opposite home/away should
// land in the same bucket if they agree on outcome.
//
// Rules:
//   - If 2+ rows agree on outcome (no other outcome ties or beats them)  → PASS_HIGH.
//   - If 1 row exists with finished=true                                   → PASS_SINGLE.
//   - If 2+ rows exist with different outcomes                            → FAIL_DISAGREE.
//   - If 0 rows                                                           → CANNOT_VERIFY.

const { norm } = require('./_games-cache.cjs');

function verifyFromCache(rows) {
  if (rows.length === 0) return { status: 'CANNOT_VERIFY', sources: [], boxscore: null };

  // Build per-row outcome and key it by (winningTeam, scores). Two rows that record
  // the same game with opposite home/away should yield the same winningTeam if they agree.
  // If they disagree on WHO won, they land in different buckets.
  const items = rows.map(r => {
    const homeW = norm(r.home_team_name);
    const awayW = norm(r.away_team_name);
    let winningTeam, losingTeam, winScore, loseScore;
    if (r.home_score > r.away_score) {
      winningTeam = homeW; losingTeam = awayW;
      winScore = r.home_score; loseScore = r.away_score;
    } else if (r.away_score > r.home_score) {
      winningTeam = awayW; losingTeam = homeW;
      winScore = r.away_score; loseScore = r.home_score;
    } else {
      winningTeam = homeW; losingTeam = awayW;
      winScore = r.home_score; loseScore = r.away_score;
    }
    // Canonical key: (winner | scores). Different winners -> different buckets.
    const key = winningTeam + '|' + winScore + '-' + loseScore;
    return {
      row: r,
      winningTeam, losingTeam, winScore, loseScore,
      key,
    };
  }).filter(Boolean).filter(it => it.row.home_score != null && it.row.away_score != null);

  if (items.length === 0) return { status: 'CANNOT_VERIFY', sources: rows.map(r => r.source), boxscore: null };

  // Bucket by canonical key
  const buckets = {};
  for (const it of items) {
    if (!buckets[it.key]) buckets[it.key] = { items: [], winningTeam: it.winningTeam, winScore: it.winScore, loseScore: it.loseScore };
    buckets[it.key].items.push(it);
  }
  const sortedBuckets = Object.values(buckets).sort((a, b) => b.items.length - a.items.length);

  if (sortedBuckets.length === 1 && sortedBuckets[0].items.length === 1) {
    // single source
    const it = sortedBuckets[0].items[0];
    const r = it.row;
    return {
      status: 'PASS_SINGLE',
      sources: [r.source],
      boxscore: {
        source: 'single-source (' + r.source + ')',
        data: {
          home_team_name: r.home_team_name,
          away_team_name: r.away_team_name,
          home_team_normalized: norm(r.home_team_name),
          away_team_normalized: norm(r.away_team_name),
          home_score: r.home_score,
          away_score: r.away_score,
          raw: r.raw,
        },
      },
    };
  }

  if (sortedBuckets.length === 1 && sortedBuckets[0].items.length >= 2) {
    // 2+ sources, all agree
    const b = sortedBuckets[0];
    const firstRow = b.items[0].row;
    return {
      status: 'PASS_HIGH',
      sources: b.items.map(it => it.row.source),
      boxscore: {
        source: 'multi-source (' + b.items.map(it => it.row.source).join(', ') + ')',
        data: {
          home_team_name: firstRow.home_team_name,
          away_team_name: firstRow.away_team_name,
          home_team_normalized: norm(firstRow.home_team_name),
          away_team_normalized: norm(firstRow.away_team_name),
          home_score: firstRow.home_score,
          away_score: firstRow.away_score,
          raw: firstRow.raw,
        },
      },
    };
  }

  // 2+ buckets with different outcomes = disagreement
  const summary = sortedBuckets.map(b =>
    b.items[0].winningTeam + ' wins ' + b.items[0].winScore + '-' + b.items[0].loseScore +
    ' (from ' + b.items.map(it => it.row.source).join(', ') + ')'
  ).join(' vs ');
  return {
    status: 'FAIL_DISAGREE',
    sources: items.map(it => it.row.source),
    boxscore: null,
    detail: summary,
  };
}

// Verify an article score claim against a boxscore.
function verifyClaimAgainstBoxscore(claim, boxscore) {
  if (!boxscore) return { status: 'CANNOT_VERIFY', reason: 'no boxscore' };

  const c = claim;
  const articleWinner = c.winner || c.teamA;
  const articleLoser  = c.loser  || c.teamB;
  const articleWS = c.winnerScore !== undefined ? c.winnerScore : c.scoreA;
  const articleLS = c.loserScore  !== undefined ? c.loserScore  : c.scoreB;

  const winnerW = norm(articleWinner);
  const loserW  = norm(articleLoser);
  const boxHome = norm(boxscore.home_team_name);
  const boxAway = norm(boxscore.away_team_name);

  let matched;
  if (winnerW === boxHome && loserW === boxAway) {
    matched = { winnerScore: boxscore.home_score, loserScore: boxscore.away_score };
  } else if (winnerW === boxAway && loserW === boxHome) {
    matched = { winnerScore: boxscore.away_score, loserScore: boxscore.home_score };
  } else {
    return {
      status: 'FAIL',
      reason: `teams don't match: article says "${articleWinner}" vs "${articleLoser}" but boxscore has "${boxscore.home_team_name}" vs "${boxscore.away_team_name}"`,
    };
  }

  if (matched.winnerScore !== articleWS || matched.loserScore !== articleLS) {
    return {
      status: 'FAIL',
      reason: `score mismatch: article says ${articleWinner} ${articleWS}, ${articleLoser} ${articleLS} but boxscore says ${matched.winnerScore}-${matched.loserScore}`,
    };
  }

  return { status: 'PASS' };
}

module.exports = { verifyFromCache, verifyClaimAgainstBoxscore, norm };

// Self-test
if (require.main === module) {
  const cases = [
    { name: 'agreement, same orientation', rows: [
      {source:'a', home_team_name:'Eisbaren', away_team_name:'Adler', home_score:3, away_score:1, finished:true},
      {source:'b', home_team_name:'Eisbaren', away_team_name:'Adler', home_score:3, away_score:1, finished:true},
    ]},
    { name: 'agreement, opposite orientation', rows: [
      {source:'a', home_team_name:'Eisbaren', away_team_name:'Adler', home_score:3, away_score:1, finished:true},
      {source:'b', home_team_name:'Adler',   away_team_name:'Eisbaren', home_score:1, away_score:3, finished:true},
    ]},
    { name: 'disagreement (real fail)', rows: [
      {source:'a', home_team_name:'Eisbaren', away_team_name:'Adler', home_score:3, away_score:1, finished:true},
      {source:'b', home_team_name:'Eisbaren', away_team_name:'Adler', home_score:1, away_score:3, finished:true},
    ]},
    { name: 'single source', rows: [
      {source:'a', home_team_name:'Eisbaren', away_team_name:'Adler', home_score:5, away_score:0, finished:true},
    ]},
    { name: 'no rows', rows: [] },
  ];
  for (const c of cases) {
    console.log(`\n## ${c.name}`);
    console.log(JSON.stringify(verifyFromCache(c.rows), null, 2));
  }
}
