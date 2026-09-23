-- ============================================================
-- SECURITY FIX: Add explicit FOR ALL policies (with USING false) to
-- tables that had partial policies (no DELETE clause).
--
-- Date: 2026-09-23
-- Per comprehensive security audit: 143 tables had policies for
-- SELECT/INSERT/UPDATE but NOT DELETE. RLS denies DELETE by default,
-- but adding explicit FOR ALL USING (false) makes the intent
-- unambiguous + prevents future regressions if someone adds a
-- permissive DELETE policy without thinking.
--
-- Strategy: for each table that has policies but no DELETE policy,
-- add: CREATE POLICY "<table>: no public delete"
--          ON public.<table> FOR DELETE TO public USING (false)
--
-- This blocks anon + authenticated from DELETE. service_role bypasses
-- RLS entirely so it can still DELETE.
--
-- Skipped: tables with ALL policy already (those cover DELETE)
-- Skipped: tables with NO policies at all (qr_revocations — handled
--          separately)
-- ============================================================

BEGIN;

CREATE POLICY "admin_arranged_bookings: no public delete"
  ON public.admin_arranged_bookings
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "admin_audit_log: no public delete"
  ON public.admin_audit_log
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "analytics_events: no public delete"
  ON public.analytics_events
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "auth_audit_log: no public delete"
  ON public.auth_audit_log
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "bad_words: no public delete"
  ON public.bad_words
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "booking_requests: no public delete"
  ON public.booking_requests
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "brands: no public delete"
  ON public.brands
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "certifications: no public delete"
  ON public.certifications
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "claims: no public delete"
  ON public.claims
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "coach_endorsements: no public delete"
  ON public.coach_endorsements
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "coach_profiles: no public delete"
  ON public.coach_profiles
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "coach_team_history: no public delete"
  ON public.coach_team_history
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "coaches: no public delete"
  ON public.coaches
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "consumer_notifications: no public delete"
  ON public.consumer_notifications
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "contact_submissions: no public delete"
  ON public.contact_submissions
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "corrections: no public delete"
  ON public.corrections
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "country_currency: no public delete"
  ON public.country_currency
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "cron_health_snapshots: no public delete"
  ON public.cron_health_snapshots
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "dashboard_error_logs: no public delete"
  ON public.dashboard_error_logs
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "didit_sessions: no public delete"
  ON public.didit_sessions
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "direct_message_threads: no public delete"
  ON public.direct_message_threads
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "direct_messages: no public delete"
  ON public.direct_messages
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "document_signatures: no public delete"
  ON public.document_signatures
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "email_captures: no public delete"
  ON public.email_captures
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "email_subscribers: no public delete"
  ON public.email_subscribers
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "equipment_assignments: no public delete"
  ON public.equipment_assignments
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "equipment_items: no public delete"
  ON public.equipment_items
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "equipment_rentals: no public delete"
  ON public.equipment_rentals
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "event_divisions: no public delete"
  ON public.event_divisions
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "event_submissions: no public delete"
  ON public.event_submissions
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "federation_registrations: no public delete"
  ON public.federation_registrations
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "federations: no public delete"
  ON public.federations
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "fixtures: no public delete"
  ON public.fixtures
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "fixtures_audit: no public delete"
  ON public.fixtures_audit
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "founding_partner_signups: no public delete"
  ON public.founding_partner_signups
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "game_goalie_stats: no public delete"
  ON public.game_goalie_stats
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "game_players: no public delete"
  ON public.game_players
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "game_shot_summary: no public delete"
  ON public.game_shot_summary
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "game_stats_audit: no public delete"
  ON public.game_stats_audit
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "games_cache: no public delete"
  ON public.games_cache
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "highlight_backups: no public delete"
  ON public.highlight_backups
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "highlightly_career_stats: no public delete"
  ON public.highlightly_career_stats
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "highlightly_leagues: no public delete"
  ON public.highlightly_leagues
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "highlightly_matches: no public delete"
  ON public.highlightly_matches
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "highlightly_standings: no public delete"
  ON public.highlightly_standings
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "highlightly_sync_log: no public delete"
  ON public.highlightly_sync_log
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "highlightly_teams: no public delete"
  ON public.highlightly_teams
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "hockey_player_stats_season: no public delete"
  ON public.hockey_player_stats_season
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "hockey_player_team_history: no public delete"
  ON public.hockey_player_team_history
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "hockey_seasons: no public delete"
  ON public.hockey_seasons
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "ice_listings: no public delete"
  ON public.ice_listings
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "identity_reminders: no public delete"
  ON public.identity_reminders
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "iihf_member_nations: no public delete"
  ON public.iihf_member_nations
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "ingest_audit_log: no public delete"
  ON public.ingest_audit_log
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "ingest_verify_failed: no public delete"
  ON public.ingest_verify_failed
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "leads: no public delete"
  ON public.leads
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "league_members: no public delete"
  ON public.league_members
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "leagues: no public delete"
  ON public.leagues
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "listing_submissions: no public delete"
  ON public.listing_submissions
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "messages: no public delete"
  ON public.messages
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "national_teams: no public delete"
  ON public.national_teams
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "newsletter_subscribers: no public delete"
  ON public.newsletter_subscribers
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "nhl_coaching_staff: no public delete"
  ON public.nhl_coaching_staff
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "nhl_matches: no public delete"
  ON public.nhl_matches
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "nhl_players: no public delete"
  ON public.nhl_players
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "nhl_standings: no public delete"
  ON public.nhl_standings
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "nhl_sync_log: no public delete"
  ON public.nhl_sync_log
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "nhl_team_season_stats: no public delete"
  ON public.nhl_team_season_stats
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "nhl_teams: no public delete"
  ON public.nhl_teams
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "organizations: no public delete"
  ON public.organizations
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "passport_events: no public delete"
  ON public.passport_events
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "passport_links: no public delete"
  ON public.passport_links
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "passport_qr_revocations: no public delete"
  ON public.passport_qr_revocations
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "passports: no public delete"
  ON public.passports
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "payment_records: no public delete"
  ON public.payment_records
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "payments: no public delete"
  ON public.payments
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "pending_username_review: no public delete"
  ON public.pending_username_review
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "plan_progress: no public delete"
  ON public.plan_progress
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "play_by_play: no public delete"
  ON public.play_by_play
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_achievements: no public delete"
  ON public.player_achievements
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_document_audit: no public delete"
  ON public.player_document_audit
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_documents: no public delete"
  ON public.player_documents
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_media: no public delete"
  ON public.player_media
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_practice_sessions: no public delete"
  ON public.player_practice_sessions
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_stats: no public delete"
  ON public.player_stats
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_team_history: no public delete"
  ON public.player_team_history
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "player_trade_log: no public delete"
  ON public.player_trade_log
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "players: no public delete"
  ON public.players
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "playoff_updates: no public delete"
  ON public.playoff_updates
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "post_review_edits: no public delete"
  ON public.post_review_edits
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "posts: no public delete"
  ON public.posts
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "profile_country_context: no public delete"
  ON public.profile_country_context
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "profile_cover_image_history: no public delete"
  ON public.profile_cover_image_history
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "profile_photo_history: no public delete"
  ON public.profile_photo_history
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "profile_posts: no public delete"
  ON public.profile_posts
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "profile_search_history: no public delete"
  ON public.profile_search_history
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "profiles: no public delete"
  ON public.profiles
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "public_booking_inquiries: no public delete"
  ON public.public_booking_inquiries
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "publish_audit_log: no public delete"
  ON public.publish_audit_log
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rate_limit_hits: no public delete"
  ON public.rate_limit_hits
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rental_contracts: no public delete"
  ON public.rental_contracts
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rental_payments: no public delete"
  ON public.rental_payments
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "reserved_slugs: no public delete"
  ON public.reserved_slugs
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "reviews: no public delete"
  ON public.reviews
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_contact_discovery: no public delete"
  ON public.rink_contact_discovery
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_contract_signatures: no public delete"
  ON public.rink_contract_signatures
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_contracts: no public delete"
  ON public.rink_contracts
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_employees: no public delete"
  ON public.rink_employees
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_events: no public delete"
  ON public.rink_events
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_messages: no public delete"
  ON public.rink_messages
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_org_connections: no public delete"
  ON public.rink_org_connections
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_owners: no public delete"
  ON public.rink_owners
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_programming: no public delete"
  ON public.rink_programming
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_rental_settings: no public delete"
  ON public.rink_rental_settings
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_reviews_legacy: no public delete"
  ON public.rink_reviews_legacy
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_staff: no public delete"
  ON public.rink_staff
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rink_threads: no public delete"
  ON public.rink_threads
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rinks: no public delete"
  ON public.rinks
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "rinks_places_cache: no public delete"
  ON public.rinks_places_cache
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "scan_events: no public delete"
  ON public.scan_events
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "stamps: no public delete"
  ON public.stamps
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "stripe_webhook_events: no public delete"
  ON public.stripe_webhook_events
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "support_tickets: no public delete"
  ON public.support_tickets
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_aliases: no public delete"
  ON public.team_aliases
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_document_recipients: no public delete"
  ON public.team_document_recipients
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_documents: no public delete"
  ON public.team_documents
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_invites: no public delete"
  ON public.team_invites
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_locations: no public delete"
  ON public.team_locations
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_members: no public delete"
  ON public.team_members
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_messages: no public delete"
  ON public.team_messages
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_name_review: no public delete"
  ON public.team_name_review
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_notifications: no public delete"
  ON public.team_notifications
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_rsvps: no public delete"
  ON public.team_rsvps
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_slug_redirects: no public delete"
  ON public.team_slug_redirects
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "team_stats: no public delete"
  ON public.team_stats
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "teams: no public delete"
  ON public.teams
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "threads: no public delete"
  ON public.threads
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "user_credentials: no public delete"
  ON public.user_credentials
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "username_changes: no public delete"
  ON public.username_changes
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "username_holds: no public delete"
  ON public.username_holds
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "venue_events: no public delete"
  ON public.venue_events
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "venues: no public delete"
  ON public.venues
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY "webhook_events: no public delete"
  ON public.webhook_events
  FOR DELETE
  TO public
  USING (false);

COMMIT;
