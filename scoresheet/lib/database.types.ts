/**
 * scoresheet/lib/database.types.ts
 *
 * Supabase Database type for the 4 scoresheet tables.
 *
 * Mirrors the shape of supabase/migrations/2026-10-03_scoresheet_foundation.sql
 * in the parent rinkstop-platform project. Apply that migration first,
 * then re-generate with `supabase gen types typescript` for full coverage.
 *
 * For now, this is hand-written to the columns we use. Re-generate after
 * the migration is applied to catch anything we missed.
 */

import type { GameMode, GameStatus, GameType, TeamSource } from '@/types/scoresheet';

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          owner_user_id: string;
          mode: GameMode;
          status: GameStatus;
          home_team_name: string;
          home_team_color: string | null;
          home_team_source: TeamSource;
          home_team_rinkstop_id: string | null;
          home_roster: any | null;
          away_team_name: string;
          away_team_color: string | null;
          away_team_source: TeamSource;
          away_team_rinkstop_id: string | null;
          away_roster: any | null;
          venue_name: string | null;
          rink_id: string | null;
          sheet_label: string | null;
          home_coach_name: string | null;
          home_coach_rinkstop_id: string | null;
          away_coach_name: string | null;
          away_coach_rinkstop_id: string | null;
          scheduled_at: string | null;
          game_type: GameType;
          period_length_seconds: number;
          periods_total: number;
          overtime_length_seconds: number;
          shootout_enabled: boolean;
          started_at: string | null;
          ended_at: string | null;
          current_period: number;
          clock_running: boolean;
          clock_seconds: number;
          home_score: number;
          away_score: number;
          rinkstop_integration: 'off' | 'pending' | 'linked' | 'submitted' | 'posted';
          rinkstop_fixture_id: string | null;
          qr_identifier: string;
          public_share_enabled: boolean;
          public_share_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          mode: GameMode;
          status?: GameStatus;
          home_team_name: string;
          home_team_color?: string | null;
          home_team_source?: TeamSource;
          home_team_rinkstop_id?: string | null;
          home_roster?: any;
          away_team_name: string;
          away_team_color?: string | null;
          away_team_source?: TeamSource;
          away_team_rinkstop_id?: string | null;
          away_roster?: any;
          venue_name?: string | null;
          rink_id?: string | null;
          sheet_label?: string | null;
          home_coach_name?: string | null;
          home_coach_rinkstop_id?: string | null;
          away_coach_name?: string | null;
          away_coach_rinkstop_id?: string | null;
          scheduled_at?: string | null;
          game_type?: GameType;
          period_length_seconds?: number;
          periods_total?: number;
          overtime_length_seconds?: number;
          shootout_enabled?: boolean;
          started_at?: string | null;
          ended_at?: string | null;
          current_period?: number;
          clock_running?: boolean;
          clock_seconds?: number;
          home_score?: number;
          away_score?: number;
          rinkstop_integration?: 'off' | 'pending' | 'linked' | 'submitted' | 'posted';
          rinkstop_fixture_id?: string | null;
          qr_identifier?: string;
          public_share_enabled?: boolean;
          public_share_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['games']['Insert']>;
      };
      game_events: {
        Row: {
          id: string;
          game_id: string;
          period: number;
          clock_seconds: number;
          sequence_number: number;
          team_side: 'home' | 'away';
          event_type: string;
          scorer_jersey: number | null;
          primary_assist_jersey: number | null;
          secondary_assist_jersey: number | null;
          goalie_jersey: number | null;
          strength: string | null;
          shot_quality: string | null;
          penalty_jersey: number | null;
          penalty_type: string | null;
          penalty_minutes: number | null;
          shooter_jersey: number | null;
          save_quality: string | null;
          description: string | null;
          scorer_player_id: string | null;
          primary_assist_player_id: string | null;
          secondary_assist_player_id: string | null;
          goalie_player_id: string | null;
          penalized_player_id: string | null;
          recorded_at: string;
          recorded_by: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          period: number;
          clock_seconds: number;
          sequence_number: number;
          team_side: 'home' | 'away';
          event_type: string;
          scorer_jersey?: number | null;
          primary_assist_jersey?: number | null;
          secondary_assist_jersey?: number | null;
          goalie_jersey?: number | null;
          strength?: string | null;
          shot_quality?: string | null;
          penalty_jersey?: number | null;
          penalty_type?: string | null;
          penalty_minutes?: number | null;
          shooter_jersey?: number | null;
          save_quality?: string | null;
          description?: string | null;
          scorer_player_id?: string | null;
          primary_assist_player_id?: string | null;
          secondary_assist_player_id?: string | null;
          goalie_player_id?: string | null;
          penalized_player_id?: string | null;
          recorded_at?: string;
          recorded_by: string;
        };
        Update: Partial<Database['public']['Tables']['game_events']['Insert']>;
      };
      game_collaborators: {
        Row: {
          game_id: string;
          user_id: string;
          role: 'owner' | 'co_scorekeeper' | 'viewer';
          invited_at: string;
          accepted_at: string | null;
        };
        Insert: {
          game_id: string;
          user_id: string;
          role: 'owner' | 'co_scorekeeper' | 'viewer';
          invited_at?: string;
          accepted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['game_collaborators']['Insert']>;
      };
      user_favorite_teams: {
        Row: {
          user_id: string;
          team_name: string;
          rinkstop_team_id: string | null;
          team_color: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          team_name: string;
          rinkstop_team_id?: string | null;
          team_color?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_favorite_teams']['Insert']>;
      };
    };
  };
}
