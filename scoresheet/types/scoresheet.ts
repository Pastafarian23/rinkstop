/**
 * scoresheet/types/scoresheet.ts
 *
 * Core types for the RinkStop Scoresheet app.
 *
 * Hockey-only. Each sport will get its own type namespace when we add new
 * sports. This is intentionally NOT a generic multi-sport abstraction —
 * the Replit version was over-engineered for the actual scope.
 *
 * Shared with the main rinkstop.com app via re-export from a future
 * `packages/shared` workspace. For now, this file is the source of truth
 * and rinkstop.com will import it when Phase B (RinkStop integration)
 * ships.
 */

// ──────────────────────────────────────────────────────────────────────
// Game modes
// ──────────────────────────────────────────────────────────────────────

/**
 * Two distinct user flows:
 * - `live`: full scorekeeper at a real game. Roster required, all event
 *   types available, PDF export, official timing.
 * - `watch`: passive fan tracking. Tap "Home goal" / "Away goal" as you
 *   watch. Roster optional, no detailed events, no official timing.
 */
export type GameMode = 'live' | 'watch';

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  live: 'Live Scoring',
  watch: 'Watch Mode',
};

// ──────────────────────────────────────────────────────────────────────
// Game status lifecycle
// ──────────────────────────────────────────────────────────────────────

export type GameStatus = 'draft' | 'scheduled' | 'in_progress' | 'final';

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  final: 'Final',
};

// ──────────────────────────────────────────────────────────────────────
// Team source — where the team came from when the game was created
// ──────────────────────────────────────────────────────────────────────

export type TeamSource = 'manual' | 'rinkstop' | 'favorite';

export const TEAM_SOURCE_LABEL: Record<TeamSource, string> = {
  manual: 'Typed in',
  rinkstop: 'From RinkStop',
  favorite: 'From Favorites',
};

// ──────────────────────────────────────────────────────────────────────
// Game type (regular season, playoff, etc.)
// ──────────────────────────────────────────────────────────────────────

export type GameType = 'regular' | 'playoff' | 'exhibition' | 'tournament' | 'friendly';

export const GAME_TYPE_LABEL: Record<GameType, string> = {
  regular: 'Regular Season',
  playoff: 'Playoff',
  exhibition: 'Exhibition',
  tournament: 'Tournament',
  friendly: 'Friendly / Scrimmage',
};

// ──────────────────────────────────────────────────────────────────────
// Roster
// ──────────────────────────────────────────────────────────────────────

export type Position = 'C' | 'LW' | 'RW' | 'D' | 'G';
export type ShootSide = 'L' | 'R';

export interface RosterPlayer {
  jersey_number: number;
  name: string;
  position: Position;
  shoots?: ShootSide;
  catches?: ShootSide;  // goalies only
  is_goalie: boolean;
  is_captain?: boolean;
}

export type TeamRoster = RosterPlayer[];

// ──────────────────────────────────────────────────────────────────────
// Game record
// ──────────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  owner_user_id: string;
  mode: GameMode;
  status: GameStatus;

  // Teams
  home_team_name: string;
  home_team_color: string | null;
  home_team_source: TeamSource;
  home_team_rinkstop_id: string | null;
  home_roster: TeamRoster | null;

  away_team_name: string;
  away_team_color: string | null;
  away_team_source: TeamSource;
  away_team_rinkstop_id: string | null;
  away_roster: TeamRoster | null;

  // Meta
  venue_name: string | null;
  scheduled_at: string | null;        // ISO
  game_type: GameType;

  // Hockey rules
  period_length_seconds: number;
  periods_total: number;
  overtime_length_seconds: number;
  shootout_enabled: boolean;

  // Live state
  started_at: string | null;
  ended_at: string | null;
  current_period: number;             // 0 = not started, 1-3 = regulation, 4 = OT, 5 = SO
  clock_running: boolean;
  clock_seconds: number;              // within current period
  home_score: number;
  away_score: number;

  // RinkStop integration (Phase B)
  rinkstop_integration: 'off' | 'pending' | 'linked' | 'submitted' | 'posted';
  rinkstop_fixture_id: string | null;

  // Sharing
  qr_identifier: string;
  public_share_enabled: boolean;
  public_share_token: string | null;

  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────────────────────────
// Event log
// ──────────────────────────────────────────────────────────────────────

export type TeamSide = 'home' | 'away';

export type EventType =
  | 'goal'
  | 'assist_primary'
  | 'assist_secondary'
  | 'penalty'
  | 'penalty_killed'
  | 'save'
  | 'shot_on_goal'
  | 'shot_missed'
  | 'period_start'
  | 'period_end'
  | 'overtime_start'
  | 'overtime_end'
  | 'shootout_goal'
  | 'shootout_miss'
  | 'shootout_end'
  | 'game_end'
  | 'goalie_change';

export const SCORING_EVENT_TYPES: EventType[] = ['goal', 'assist_primary', 'assist_secondary'];
export const PENALTY_EVENT_TYPES: EventType[] = ['penalty', 'penalty_killed'];
export const SHOT_EVENT_TYPES: EventType[] = ['shot_on_goal', 'shot_missed', 'save'];

// IIHF + NHL penalty types — controlled vocabulary
export const PENALTY_TYPES = [
  'tripping',
  'hooking',
  'slashing',
  'high-sticking',
  'roughing',
  'interference',
  'holding',
  'cross-checking',
  'boarding',
  'charging',
  'elbowing',
  'kneeing',
  'checking-from-behind',
  'delay-of-game',
  'too-many-men',
  'unsportsmanlike-conduct',
  'misconduct',
  'game-misconduct',
  'match-penalty',
] as const;
export type PenaltyType = typeof PENALTY_TYPES[number];

export type Strength = 'even' | 'pp' | 'sh' | 'penalty_shot' | 'shootout';

export interface GameEvent {
  id: string;
  game_id: string;
  period: number;
  clock_seconds: number;
  sequence_number: number;
  team_side: TeamSide;
  event_type: EventType;

  // Goal-specific
  scorer_jersey: number | null;
  primary_assist_jersey: number | null;
  secondary_assist_jersey: number | null;
  goalie_jersey: number | null;
  strength: Strength | null;
  shot_quality: string | null;

  // Penalty-specific
  penalty_jersey: number | null;
  penalty_type: PenaltyType | null;
  penalty_minutes: number | null;

  // Shot-specific
  shooter_jersey: number | null;
  save_quality: string | null;

  // General
  description: string | null;

  // RinkStop player FKs (set when game is linked)
  scorer_player_id: string | null;
  primary_assist_player_id: string | null;
  secondary_assist_player_id: string | null;
  goalie_player_id: string | null;
  penalized_player_id: string | null;

  recorded_at: string;
  recorded_by: string;
}

// ──────────────────────────────────────────────────────────────────────
// Game collaborators
// ──────────────────────────────────────────────────────────────────────

export type CollaboratorRole = 'owner' | 'co_scorekeeper' | 'viewer';

export interface GameCollaborator {
  game_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_at: string;
  accepted_at: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// User favorite teams
// ──────────────────────────────────────────────────────────────────────

export interface UserFavoriteTeam {
  user_id: string;
  team_name: string;
  rinkstop_team_id: string | null;
  team_color: string | null;
  notes: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────────────────
// Game creation wizard payloads
// ──────────────────────────────────────────────────────────────────────

/**
 * Step 1: Game info. Both modes fill this.
 */
export interface CreateGameStep1 {
  home_team_name: string;
  home_team_color?: string;
  home_team_source: TeamSource;
  home_team_rinkstop_id?: string;
  away_team_name: string;
  away_team_color?: string;
  away_team_source: TeamSource;
  away_team_rinkstop_id?: string;
  venue_name?: string;
  scheduled_at?: string;
  game_type: GameType;
  mode: GameMode;
}

/**
 * Step 2: Roster. Only live mode requires this.
 */
export interface CreateGameStep2 {
  home_roster: TeamRoster;
  away_roster: TeamRoster;
}

/**
 * Step 3: Settings. Optional overrides on hockey defaults.
 */
export interface CreateGameStep3 {
  period_length_seconds?: number;
  periods_total?: number;
  overtime_length_seconds?: number;
  shootout_enabled?: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Live game view model (game + flattened event stream)
// ──────────────────────────────────────────────────────────────────────

export interface LiveGameView {
  game: Game;
  events: GameEvent[];
  // Scoreboard derived state
  home_score: number;
  away_score: number;
  current_period: number;
  clock_seconds: number;
  clock_running: boolean;
  // Roster lookups (for jersey-to-name)
  home_roster_lookup: Record<number, RosterPlayer>;
  away_roster_lookup: Record<number, RosterPlayer>;
}
