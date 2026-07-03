// src/app/draft/types.ts -- shared types for draft picks modules
//
// PickStats is the shape used by both DRAFT_2025_STATS and DRAFT_2026_STATS.
// The two years have different literal values (e.g. 2025 has 0 forfeits,
// 2026 has 1) but the same shape.

export interface PickStats {
  readonly totalPicks: number;
  readonly realPicks: number;
  readonly forfeits: number;
  readonly uniqueTeams: number;
  readonly rounds: number;
  readonly nationalities: number;
  readonly leagues: number;
}
