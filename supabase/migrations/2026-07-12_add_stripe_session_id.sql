-- Adds stripe_session_id to profiles so the /welcome page can look up a
-- guest's pending email after Stripe Checkout (before they sign up via Clerk).
-- The guest's email is stored by the Stripe webhook in the email column.
-- This column lets /welcome find the profile without requiring auth.
ALTER TABLE profiles
  ADD COLUMN stripe_session_id TEXT UNIQUE;
