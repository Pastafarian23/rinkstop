/**
 * POST /api/webhooks/clerk
 *
 * The primary signal that a Clerk user has been created/updated/deleted.
 * Without this we have no source of truth for our `profiles` table — it
 * gets populated lazily the first time the user hits a page that calls
 * `ensureProfile()`. That means: no welcome email, no in-app settings
 * until they visit, and we have no record of users who sign up and never
 * come back.
 *
 * Subscribed events (Arnel must configure in Clerk dashboard):
 *   - user.created
 *   - user.updated
 *   - user.deleted  (we soft-delete: leave profile row, mark gone)
 *
 * Security:
 *   1. Svix signature verification on every request (CLERK_WEBHOOK_SECRET).
 *   2. Reject if timestamp is > 5 min old (Svix handles this).
 *   3. Idempotent: user.updated can fire many times for the same user.
 *
 * Side effects (on user.created only):
 *   - Insert profile row (idempotent: ON CONFLICT DO NOTHING)
 *   - Queue welcome email (best-effort, never blocks)
 *
 * Setup steps for Arnel (one-time, in Clerk dashboard):
 *   1. Webhooks → Add Endpoint
 *   2. URL: https://rinkstop.com/api/webhooks/clerk
 *   3. Events: user.created, user.updated, user.deleted
 *   4. Copy Signing Secret → Vercel env var CLERK_WEBHOOK_SECRET
 *
 * Cost: $0 (Clerk webhooks are free).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { passportService, isPassportEnabled } from '@/lib/passport';

export const dynamic = 'force-dynamic';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification?: { status?: string };
}

interface ClerkUserPayload {
  id: string; // Clerk user id, e.g. "user_2abc..."
  object?: 'user';
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  created_at?: number;
  updated_at?: number;
  deleted?: boolean;
}

interface SvixHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

function readSvixHeaders(req: NextRequest): SvixHeaders | null {
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sig = req.headers.get('svix-signature');
  if (!id || !ts || !sig) return null;
  return { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': sig };
}

function pickPrimaryEmail(payload: ClerkUserPayload): string | null {
  if (!payload.email_addresses || payload.email_addresses.length === 0) return null;
  const primaryId = payload.primary_email_address_id;
  if (primaryId) {
    const found = payload.email_addresses.find((e) => e.id === primaryId);
    if (found?.email_address) return found.email_address;
  }
  return payload.email_addresses[0]?.email_address ?? null;
}

function pickDisplayName(payload: ClerkUserPayload): string | null {
  if (payload.first_name || payload.last_name) {
    return [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() || null;
  }
  if (payload.username) return payload.username;
  return null;
}

/**
 * Pick a default username. We only set one on user.created if Clerk didn't
 * provide a username — never overwrite a user-chosen handle on user.updated.
 */
function pickDefaultUsername(payload: ClerkUserPayload): string | null {
  if (payload.username) return payload.username;
  // Fallback: take the email local part. Username-uniqueness is enforced by
  // a DB constraint + the username-server helpers; we may need to handle
  // collisions, but that's an edge case and we can backfill later.
  const email = pickPrimaryEmail(payload);
  if (!email) return null;
  const local = email.split('@')[0] || '';
  return local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'webhook secret not configured' }, { status: 500 });
  }

  const svix = readSvixHeaders(request);
  if (!svix) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 400 });
  }

  // Svix requires the raw body for signature verification.
  const payload = await request.text();
  const wh = new Webhook(secret);
  let event: { type: string; data: ClerkUserPayload };
  try {
    event = wh.verify(payload, svix) as { type: string; data: ClerkUserPayload };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[clerk-webhook] signature verification failed:', msg);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const { type, data } = event;
  if (!data?.id) {
    return NextResponse.json({ error: 'missing user id' }, { status: 400 });
  }

  try {
    switch (type) {
      case 'user.created':
        return await handleUserCreated(data);
      case 'user.updated':
        return await handleUserUpdated(data);
      case 'user.deleted':
        return await handleUserDeleted(data);
      default:
        // Acknowledge unknown events so Clerk doesn't retry forever.
        return NextResponse.json({ ok: true, skipped: type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[clerk-webhook] handler failed for ${type}: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleUserCreated(data: ClerkUserPayload) {
  const email = pickPrimaryEmail(data);
  const displayName = pickDisplayName(data);
  const username = pickDefaultUsername(data);
  const avatarUrl = data.image_url ?? null;

  // Account-recreation safety: if Clerk creates a new user for an email that
  // already owns a profile row (e.g. account-linking off, so Google OAuth
  // sign-in produces a fresh Clerk user instead of linking to the existing
  // email-based one), inherit the original tier/role from the email-matched
  // row. Without this, the dashboard cannot recognize the owner and falls
  // into the generic "free / Founding" render path even though the actual
  // person signed in.
  //
  // For OWNER accounts (role='super_admin' OR is_founding_member=true on the
  // email-matched row), we ALSO delete the newly-created Clerk user
  // immediately. Account-linking is OFF on this Clerk instance, so every
  // fresh sign-in spawns a brand-new Clerk user for the same email. If we
  // don't delete the new one, the dashboard's next login session may
  // resolve to the new orphan and the user is back in the same broken
  // state we spent the day fixing. Deleting the new Clerk user forces the
  // next sign-in to land back on the canonical Clerk user (which is still
  // active and signed-in-token-valid). This is the structural fix for
  // "orphan Clerk users keep appearing": as long as account-linking is
  // off, we have to delete them at the webhook layer.
  //
  // (Arnel directive 2026-06-30: "Fix the clerk account linking issue.
  //  This should have been done already.")
  // (Arnel directive 2026-07-01: "The problem seems to be in supabase and
  //  the record keeping of users." Structural fix: enforce "one profile per
  //  email" via a partial unique index on profiles(email) (NULLs allowed),
  //  and unify the webhook's delete-new-Clerk-user behavior across ALL tiers
  //  — not just OWNER. Previously only OWNER-tier matches triggered the
  //  delete, which let regular users accumulate duplicate Clerk accounts
  //  pointing at different profile rows for the same email.)
  let inheritedTier = 'free';
  let inheritedRole = 'user';
  let inheritedIsFoundingMember = false;
  let shouldDeleteNewUser = false;
  if (email) {
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('tier, role, is_founding_member, user_id, stripe_subscription_id')
      .ilike('email', email)
      .neq('user_id', data.id) // never inherit from the row we're about to write
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      if (existing.tier && existing.tier !== 'free') inheritedTier = existing.tier;
      if (existing.role && existing.role !== 'user') inheritedRole = existing.role;
      if (existing.is_founding_member) inheritedIsFoundingMember = existing.is_founding_member;
      // Any email match with a different user_id means a duplicate Clerk
      // user is being created. The existing profile row's user_id is the
      // canonical Clerk user (the one with the active session). The fresh
      // duplicate is removed. Applies to ALL tiers, not just OWNER.
      if (existing.user_id && existing.user_id !== data.id) {
        shouldDeleteNewUser = true;
      }
      console.log(
        `[clerk-webhook] user.created for new Clerk id ${data.id} matched existing profile row by email ${email}; inheriting tier=${inheritedTier} role=${inheritedRole}${shouldDeleteNewUser ? ' (will delete new Clerk user)' : ''}`,
      );
      // PENDING GUEST PAYMENT: a profile row exists for this email but has
      // user_id=NULL. This is a guest checkout that completed before the user
      // signed up. We link the new Clerk user to the pending profile by updating
      // the existing row's user_id, display_name, and avatar — we do NOT create
      // a new row or delete the new Clerk user. The pending profile moves from
      // "unclaimed" to "owned" in one targeted update.
      //
      // We also back-fill clerk_user_id into the Stripe subscription metadata
      // so that future renewal webhooks (customer.subscription.updated) can find
      // this user without an email lookup.
      if (existing && !existing.user_id) {
        await supabaseAdmin
          .from('profiles')
          .update({
            user_id: data.id,
            display_name: displayName ?? null,
            avatar_url: avatarUrl,
            username: username ?? null,
          })
          .ilike('email', email);

        // Back-fill clerk_user_id into Stripe subscription metadata for renewals
        if (existing.stripe_subscription_id) {
          const clerkStripeKey = process.env.STRIPE_SECRET_KEY;
          if (clerkStripeKey) {
            try {
              const { Stripe } = await import('stripe');
              const stripeInst = new Stripe(clerkStripeKey, { apiVersion: '2026-04-22.dahlia' as any });
              await stripeInst.subscriptions.update(existing.stripe_subscription_id, {
                metadata: { clerk_user_id: data.id },
              });
            } catch (e: any) {
              console.warn(`[clerk-webhook] failed to back-fill clerk_user_id into subscription ${existing.stripe_subscription_id}: ${e.message}`);
            }
          }
        }

        console.log(
          `[clerk-webhook] user.created linked Clerk id ${data.id} to existing pending-guest profile for email=${email}; tier=${inheritedTier}`,
        );
        // Skip the upsert entirely — the update above is the only write needed.
        return NextResponse.json({ ok: true, event: 'user.created', linkedPendingProfile: true });
      }
    }
  } else if (displayName) {
    // Fallback: a Clerk user may have no email (older/test accounts) but
    // still own a profile row by display_name. Without this, signing in to
    // such a user creates a fresh free-tier row that shadows the canonical
    // premium row, and the user gets locked out of paid features until the
    // duplicate is manually cleaned up. Display-name match is risky for
    // common names, so we also require the existing row to be super_admin
    // (i.e. not a random founder/duplicate collision) before inheriting.
    const { data: byName } = await supabaseAdmin
      .from('profiles')
      .select('tier, role, is_founding_member')
      .eq('display_name', displayName)
      .eq('role', 'super_admin')
      .neq('user_id', data.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byName) {
      if (byName.tier && byName.tier !== 'free') inheritedTier = byName.tier;
      if (byName.role && byName.role !== 'user') inheritedRole = byName.role;
      if (byName.is_founding_member) inheritedIsFoundingMember = byName.is_founding_member;
      console.log(
        `[clerk-webhook] user.created for new Clerk id ${data.id} (no email) matched existing super_admin profile row by display_name=${displayName}; inheriting tier=${inheritedTier} role=${inheritedRole}`,
      );
    }
  }

  // If we already detected a duplicate Clerk user via the email-match
  // query above, skip the upsert entirely — inserting a row we'd delete
  // 5 lines later is wasted work and risks a unique-constraint violation
  // against idx_profiles_email_unique. The delete-new-Clerk-user branch
  // below handles the cleanup.
  let upsertError: { code?: string; message: string } | null = null;
  if (!shouldDeleteNewUser) {
    // Insert idempotently — if the profile already exists (lazy ensureProfile
    // beat us to it), we update from Clerk instead of failing. The unique
    // partial index on profiles(email) catches race-condition duplicates
    // (a second webhook arriving before this one's email-match query ran).
    // On 23505 (unique_violation), we treat it as a duplicate-detected
    // signal and fall through to the delete-new-Clerk-user branch.
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: data.id,
          email,
          display_name: displayName,
          username,
          avatar_url: avatarUrl,
          tier: inheritedTier,
          role: inheritedRole,
          is_founding_member: inheritedIsFoundingMember,
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );
    if (error) {
      // Unique constraint violation on email — the email-match query above
      // missed a race-condition duplicate. Treat as duplicate-detected.
      if (error.code === '23505' && (error.message.includes('profiles_email_unique') || error.message.toLowerCase().includes('duplicate key'))) {
        shouldDeleteNewUser = true;
        upsertError = { code: error.code, message: error.message };
        console.log(`[clerk-webhook] user.created for new Clerk id ${data.id}: upsert hit unique constraint on email=${email}; will delete new Clerk user`);
      } else {
        throw new Error(`profile upsert failed: ${error.message}`);
      }
    }
  }

  // Delete the newly-created Clerk user if a duplicate was detected (by
  // email match OR by the unique constraint catching a race). This is the
  // structural fix for the orphan-Clerk-user accumulation when
  // account-linking is OFF. The canonical Clerk user (the one already tied
  // to the canonical Supabase profile row) remains; the fresh duplicate
  // is removed. The webhook returns 200 to Clerk either way — a non-2xx
  // response would cause Clerk to retry the webhook, which is not what we
  // want.
  //
  // (Arnel directive 2026-07-01: unify delete behavior across all tiers,
  //  not just OWNER. Eliminates the duplicate-Clerk-user accumulation for
  //  regular free-tier users as well.)
  if (shouldDeleteNewUser) {
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (clerkSecret) {
      try {
        const del = await fetch(`https://api.clerk.com/v1/users/${data.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${clerkSecret}` },
          signal: AbortSignal.timeout(5_000),
        });
        console.log(
          `[clerk-webhook] orphan cleanup: DELETE /v1/users/${data.id} status=${del.status} for email=${email}`,
        );
        // Also clean up the orphan Supabase row we just wrote via the upsert
        // so the canonical profile row stays the sole owner row.
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', data.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[clerk-webhook] orphan cleanup failed (non-blocking): ${msg}`);
      }
    } else {
      console.warn('[clerk-webhook] orphan cleanup skipped: CLERK_SECRET_KEY not set');
    }
  }

  // Welcome email (best-effort, never blocks).
  if (email) {
    void sendEmail({
      to: email,
      subject: 'Welcome to RinkStop',
      template: 'welcome',
      data: { displayName, username },
      tag: 'welcome',
    });
  }

  // === Passport issuance (Workstream 1) ===
  // Per Q4 decision: new signups get a Passport at account creation.
  // Per Rule 5: gated behind PASSPORT_ENABLED. Per Rule 6: only writes
  // to new Passport tables (no existing record mutation). Per Rule 7:
  // called as a service-level adapter, not by direct DB write.
  //
  // Non-blocking: if Passport issuance fails, we log and continue.
  // The profile row is already created above; we don't want to fail
  // signup if the Passport subsystem has an issue.
  if (isPassportEnabled()) {
    try {
      await passportService.ensurePassport(data.id, 'signup');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[clerk-webhook] Passport issuance failed for ${data.id}: ${msg}`);
    }
  }

  return NextResponse.json({ ok: true, event: 'user.created', userId: data.id });
}

async function handleUserUpdated(data: ClerkUserPayload) {
  const email = pickPrimaryEmail(data);
  const displayName = pickDisplayName(data);
  const avatarUrl = data.image_url ?? null;

  // Don't touch username on update — user may have set a custom one.
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', data.id);

  if (error) {
    throw new Error(`profile update failed: ${error.message}`);
  }

  // Mirror the photo change to profile_photo_history. This is the
  // sync path for when the photo is changed via Clerk's hosted
  // /user-profile UI (or any other Clerk-side change), so the
  // history stays complete even when the user didn't use our
  // ChangePhotoButton.
  await syncPhotoHistory(data.id, avatarUrl, 'clerk_webhook');

  return NextResponse.json({ ok: true, event: 'user.updated', userId: data.id });
}

/**
 * Append a row to profile_photo_history for any change in the
 * user's avatar. Used by both the user.updated webhook (external
 * changes via Clerk UI) and the manual /api/profiles/me/photo route
 * (changes via ChangePhotoButton). Idempotent: if the new URL
 * matches the current row's URL, no insert happens (avoids
 * duplicate rows from repeated webhook deliveries).
 */
async function syncPhotoHistory(
  userId: string,
  newUrl: string | null,
  source: 'clerk_webhook' | 'manual' | 'reset',
): Promise<void> {
  // Find the current (not-replaced, not-removed) row.
  const { data: current } = await supabaseAdmin
    .from('profile_photo_history')
    .select('id, url')
    .eq('user_id', userId)
    .is('replaced_at', null)
    .is('removed_at', null)
    .maybeSingle();

  const currentUrl = current?.url ?? null;
  // No-op if the URL hasn't actually changed.
  if (currentUrl === newUrl) return;

  if (newUrl === null) {
    // Removal: mark the current row removed_at = now(). No new row.
    if (current) {
      await supabaseAdmin
        .from('profile_photo_history')
        .update({ removed_at: new Date().toISOString() })
        .eq('id', current.id);
    }
  } else {
    // Set/replace: mark current row replaced_at, then insert new row.
    const now = new Date().toISOString();
    if (current) {
      await supabaseAdmin
        .from('profile_photo_history')
        .update({ replaced_at: now })
        .eq('id', current.id);
    }
    await supabaseAdmin.from('profile_photo_history').insert({
      user_id: userId,
      url: newUrl,
      source,
      set_at: now,
    });
  }
}

async function handleUserDeleted(data: ClerkUserPayload) {
  const deletedUserId = data.id;
  const now = new Date().toISOString();

  // 1. Soft-delete the profile — keep row for audit trail
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .update({
      email: null,
      display_name: null,
      avatar_url: null,
      updated_at: now,
    })
    .eq('user_id', deletedUserId);
  if (profileErr) throw new Error(`profile soft-delete failed: ${profileErr.message}`);

  // 2. Mark user as left in all team memberships (prevents orphan team_members rows)
  const { error: memberErr } = await supabaseAdmin
    .from('team_members')
    .update({ left_at: now })
    .eq('user_id', deletedUserId)
    .is('left_at', null);
  if (memberErr) {
    console.error(`[user.deleted] team_members cleanup failed for ${deletedUserId}:`, memberErr.message);
  }

  // 3. Null out created_by on team_workspaces the user created (they can't admin it anymore)
  const { error: workspaceErr } = await supabaseAdmin
    .from('team_workspaces')
    .update({ created_by: null })
    .eq('created_by', deletedUserId);
  if (workspaceErr) {
    console.error(`[user.deleted] team_workspaces cleanup failed for ${deletedUserId}:`, workspaceErr.message);
  }

  // 4. Null out created_by on profile_account_types
  const { error: acctErr } = await supabaseAdmin
    .from('profile_account_types')
    .update({ created_by: null })
    .eq('created_by', deletedUserId);
  if (acctErr) {
    console.error(`[user.deleted] profile_account_types cleanup failed for ${deletedUserId}:`, acctErr.message);
  }

  // 5. Null out created_by on analytics_events (preserve the events themselves)
  const { error: analyticsErr } = await supabaseAdmin
    .from('analytics_events')
    .update({ user_id: null })
    .eq('user_id', deletedUserId);
  if (analyticsErr) {
    console.error(`[user.deleted] analytics_events cleanup failed for ${deletedUserId}:`, analyticsErr.message);
  }

  return NextResponse.json({ ok: true, event: 'user.deleted', userId: deletedUserId });
}
