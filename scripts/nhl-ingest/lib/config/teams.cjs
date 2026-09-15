/**
 * NHL team configuration.
 *
 * Canonical mapping between:
 *  - RinkStop team_workspaces.id (UUID)
 *  - NHL.com team triCode (3-letter: 'TOR', 'BOS', etc.)
 *  - NHL.com numeric teamId
 *  - Highlightly team id
 *
 * Source of truth for RinkStop UUIDs: team_workspaces table in Supabase.
 * Source of truth for NHL teamIds: api.nhle.com
 * Source of truth for Highlightly IDs: highlightly_leagues table in Supabase
 *
 * 32 active NHL teams for 2025-26 season.
 */

module.exports = {
  // All 32 active NHL teams for 2025-26
  // key = NHL.com triCode (uppercase)
  BY_TRI: {
    ANA: { name: 'Anaheim Ducks',         teamId: 24, rinkstopId: null, highlightlyId: 0 },
    BOS: { name: 'Boston Bruins',          teamId:  7, rinkstopId: null, highlightlyId: 0 },
    BUF: { name: 'Buffalo Sabres',         teamId:  8, rinkstopId: null, highlightlyId: 0 },
    CGY: { name: 'Calgary Flames',         teamId: 20, rinkstopId: null, highlightlyId: 0 },
    CAR: { name: 'Carolina Hurricanes',    teamId: 12, rinkstopId: null, highlightlyId: 0 },
    CHI: { name: 'Chicago Blackhawks',     teamId: 16, rinkstopId: null, highlightlyId: 0 },
    COL: { name: 'Colorado Avalanche',    teamId: 21, rinkstopId: null, highlightlyId: 0 },
    CBJ: { name: 'Columbus Blue Jackets', teamId: 29, rinkstopId: null, highlightlyId: 0 },
    DAL: { name: 'Dallas Stars',          teamId: 25, rinkstopId: null, highlightlyId: 0 },
    DET: { name: 'Detroit Red Wings',     teamId: 17, rinkstopId: null, highlightlyId: 0 },
    EDM: { name: 'Edmonton Oilers',       teamId: 22, rinkstopId: null, highlightlyId: 0 },
    FLA: { name: 'Florida Panthers',      teamId: 13, rinkstopId: null, highlightlyId: 0 },
    LAK: { name: 'Los Angeles Kings',     teamId: 26, rinkstopId: null, highlightlyId: 0 },
    MIN: { name: 'Minnesota Wild',        teamId: 30, rinkstopId: null, highlightlyId: 0 },
    MTL: { name: 'Montreal Canadiens',    teamId:  6, rinkstopId: null, highlightlyId: 0 },
    NSH: { name: 'Nashville Predators',   teamId: 18, rinkstopId: null, highlightlyId: 0 },
    NJD: { name: 'New Jersey Devils',     teamId:  1, rinkstopId: null, highlightlyId: 0 },
    NYI: { name: 'New York Islanders',    teamId:  2, rinkstopId: null, highlightlyId: 0 },
    NYR: { name: 'New York Rangers',      teamId:  3, rinkstopId: null, highlightlyId: 0 },
    OTT: { name: 'Ottawa Senators',        teamId:  9, rinkstopId: null, highlightlyId: 0 },
    PHI: { name: 'Philadelphia Flyers',   teamId:  4, rinkstopId: null, highlightlyId: 0 },
    PIT: { name: 'Pittsburgh Penguins',   teamId:  5, rinkstopId: null, highlightlyId: 0 },
    SJS: { name: 'San Jose Sharks',       teamId: 28, rinkstopId: null, highlightlyId: 0 },
    SEA: { name: 'Seattle Kraken',        teamId: 55, rinkstopId: null, highlightlyId: 0 },
    STL: { name: 'St. Louis Blues',       teamId: 19, rinkstopId: null, highlightlyId: 0 },
    TBL: { name: 'Tampa Bay Lightning',   teamId: 14, rinkstopId: null, highlightlyId: 0 },
    TOR: { name: 'Toronto Maple Leafs',   teamId: 10, rinkstopId: null, highlightlyId: 0 },
    UTA: { name: 'Utah Mammoth',          teamId: 68, rinkstopId: null, highlightlyId: 0 }, // 2024-25: UHC
    VAN: { name: 'Vancouver Canucks',     teamId: 23, rinkstopId: null, highlightlyId: 0 },
    VGK: { name: 'Vegas Golden Knights',  teamId: 54, rinkstopId: null, highlightlyId: 0 },
    WPG: { name: 'Winnipeg Jets',         teamId: 52, rinkstopId: null, highlightlyId: 0 },
    WSH: { name: 'Washington Capitals',   teamId: 15, rinkstopId: null, highlightlyId: 0 },
  },

  // Sorted array of all triCodes
  ALL_TRI_CODES: [
    'ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET',
    'EDM','FLA','LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT',
    'PHI','PIT','SJS','SEA','STL','TBL','TOR','UTA','VAN','VGK','WPG','WSH'
  ],

  // Reverse lookup: NHL teamId → triCode
  BY_NHL_ID: Object.fromEntries(
    Object.entries(
      Object.fromEntries(
        Object.entries(
          Object.fromEntries(
            Object.entries({
              24:'ANA', 7:'BOS', 8:'BUF', 20:'CGY', 12:'CAR', 16:'CHI',
              21:'COL', 29:'CBJ', 25:'DAL', 17:'DET', 22:'EDM', 13:'FLA',
              26:'LAK', 30:'MIN', 6:'MTL', 18:'NSH', 1:'NJD', 2:'NYI',
              3:'NYR', 9:'OTT', 4:'PHI', 5:'PIT', 28:'SJS', 55:'SEA',
              19:'STL', 14:'TBL', 10:'TOR', 68:'UTA', 23:'VAN', 54:'VGK',
              52:'WPG', 15:'WSH'
            })
          )
        ).map(([k,v]) => [parseInt(k), v])
      )
    )
  ),

  // seasonId → season label
  SEASON_LABELS: {
    20242025: '2024-25',
    20252026: '2025-26',
    20262027: '2026-27',
  },

  // season label → seasonId
  SEASON_IDS: {
    '2024-25': 20242025,
    '2025-26': 20252026,
    '2026-27': 20262027,
  },

  // Expected game counts per season type
  EXPECTED_COUNTS: {
    '2025-26': {
      regular_season: 1312,  // 32 teams × 82 games / 2
      preseason:        200,  // approximate
      postseason:       86,   // approximate
    },
    '2024-25': {
      regular_season: 1312,
      preseason:        200,
      postseason:       86,
    },
  },

  // Cross-link keys
  CROSS_LINK: {
    // nhl_game_id format: 2025020014 (seasonId + 7-digit game number)
    // In fixtures.game_data.nhl_game_id
    // In play_by_play via scorer_player_id (NHL numeric player id)
    // In nhl_players.player_id (NHL numeric player id)
    // In nhl_players.id (RinkStop UUID)
    // In highlightly_career_stats.player_id (string, NHL player id as string)
    // In fixtures.home_team_id / away_team_id → team_workspaces.id
    // In play_by_play.fixture_id → fixtures.id
  },
};
