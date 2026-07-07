# Phase 1b-4 — Consumer Notifications (Prep Doc)

**Status:** DRAFT. NOT YET REVIEWED BY ARNEL. No code has been written.
**Author:** KiloClaw
**Date:** 2026-07-07
**Source of truth:** Phase 1a prep doc (`docs/phase-1a-consumer-first-prep.md`); Phase 1b-1 prep doc; Phase 1b-2 prep doc (just drafted, awaiting review).
**Related:** `supabase/migrations/2026-06-19_drafts_and_notifications.sql` (existing `team_notifications` pattern); 1b-1 `player_documents` (data source for "doc expired" notifications); 1b-2 (future data source for "new achievement" notifications).

---

## 0. Why this piece is fourth in 1b

The Hockey Passport has three layers:
1. **Identity** — verification, photo, account type (1a, shipped)
2. **Documents** — birth certificates, waivers, medical forms (1b-1, shipped + audited)
3. **Achievements + Timeline** — milestones, team history, manual achievements (1b-2, prep pending)

Each of these surfaces has a **stale state** that the user can't easily track:
- "My kid's medical form expires in 30 days — when did I upload that?"
- "I just verified my identity 14 days ago, when does verification expire?"
- "We just won a tournament — I should add that as an achievement before I forget the date."

A **personal notifications inbox** turns passive surfaces into proactive ones. Per the 1a prep doc: the family "is the unit of organization" and the parent "is the actor." Notifications that go to the parent (not the team) close the loop on the personal-fluency story.

This piece **closes 1 of the remaining "coming soon" hits** (`FamilySetupWizard.tsx:107` Step 5 "Coming next" — though Step 5 is actually about calendar import, not notifications, so this piece closes 0 visible hits; see Q1 below).

The real value is **enabling the rest of 1b** to surface what's already happening. Without notifications, "your doc expires in 30 days" requires the parent to remember to check. With notifications, the platform tells them.

---

## 1. What this piece does (and does not do)

### Does

- Adds a new table `consumer_notifications` — the parent-facing notification inbox.
- Adds a derivation pattern that auto-creates notifications from key events:
  - **Document expiry warning** — when a `player_documents.expires_at` is within 30 days, a "Your {doc_title} expires in {N} days" notification is created (and re-created at 7 days, 1 day).
  - **Document expired** — when a `player_documents.expires_at` has passed, the doc is shown as expired on read (1b-1 does this) AND a "Your {doc_title} has expired" notification is created.
  - **Identity renewal due** — when `profiles.identity_verified_at` is older than 365 days (re-verification cadence), a "Your identity verification is due for renewal" notification is created.
  - **Achievement milestone** — when a parent adds a `player_achievements` row, a "You added: {title}" notification is created (parent-only; this is just a confirmation that the achievement is on file).
- Adds the standard "in-app inbox" surface (per `team_notifications` pattern):
  - Unread count in the consumer card on `/dashboard`
  - New "NOTIFICATIONS" card or section on `/dashboard/family`
  - Existing `NotificationBell` component extended to show consumer notifications alongside team notifications
- Adds a `read_at` semantics (mark-as-read) endpoint
- Tier gate: matches 1b-1 (identity_plus+ OR business_listing+) — free users get a "subscribe to Identity Plus" upsell on the card.
- RLS: only the user_id owner can SELECT, only the user can mark-as-read (UPDATE on read_at). No DELETE in v1 (matches the destructive-action protocol).

### Does NOT do (deferred)

- **Email notifications** — there's an existing `email_payment_notifications` preference pattern (2026-06-20 migration). v1 of 1b-4 is in-app only. Email-side work is a v2 piece that integrates with the email-preferences lib.
- **Push notifications (mobile)** — depends on the mobile app not being in v1 scope. v2.
- **Org-side notifications** — those are `team_notifications` (already shipped 2026-06-19). This piece is personal only.
- **Achievement share-by-link** — out of scope.
- **Notification preferences UI** — the existing `NotificationSettingsForm` at `/dashboard/settings/notifications` is for email prefs (payment + draft). v1 of 1b-4 doesn't add a consumer-notifications preferences page; if you want to mute a kind (e.g., "don't tell me about doc expirations"), the user has no UI for that. The notification still gets created; they just see it. **Open question: add a `kind`-level mute column to the table or defer the preferences UI to v2?**
- **Aggregated daily digest** — v2.

### Out of scope per the original spec's guardrail

- Authentication, pricing tiers, billing, verification, permissions, workspace architecture — **untouched**.
- `team_notifications` table — **untouched**. This is a separate notification channel for a different actor.
- 1b-1, 1b-2 surfaces — **untouched** in their read paths. 1b-4 is additive (notifications derive from the source tables; the source tables don't change).

---

## 2. Schema

### New table: `public.consumer_notifications`

```sql
CREATE TABLE public.consumer_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  -- The 'user_id' here is the parent (managed_profiles.manager_user_id),
  -- NOT the player. Personal notifications go to the actor.

  kind            text NOT NULL CHECK (kind IN (
                    'document_expiring_30d',
                    'document_expiring_7d',
                    'document_expiring_1d',
                    'document_expired',
                    'identity_renewal_due',
                    'achievement_added'
                  )),

  -- The source of the notification (for dedup + linking back to the source).
  -- We use a string source_key to dedup: e.g., 'player_documents:abc-123:expired'.
  source_key      text NOT NULL,

  -- The player this notification is about (most kinds are player-scoped).
  player_id       uuid REFERENCES public.players(id) ON DELETE CASCADE,

  -- Pre-formatted display strings. Cheap to read; no joins on the inbox.
  title           text NOT NULL,
  body            text,

  -- Free-form: doc_id, achievement_id, etc. for "click to view source" links.
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,

  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Idempotency: same user + same source_key + same kind can only exist once
  -- UNLESS it was already marked read (re-derivation is allowed after read).
  -- This dedups at the DB level. See section 4 for the algorithm.
  UNIQUE (user_id, source_key, kind)
);

CREATE INDEX consumer_notifications_user_unread_idx
  ON public.consumer_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX consumer_notifications_user_read_idx
  ON public.consumer_notifications (user_id, read_at)
  WHERE read_at IS NOT NULL;

CREATE INDEX consumer_notifications_player_idx
  ON public.consumer_notifications (player_id, created_at DESC);
```

**Decisions in the schema:**

- **`user_id` is the parent, not the player** — personal notifications go to the actor (the parent who manages the child). This matches the `team_notifications` pattern.
- **`source_key` is a string for dedup** — e.g., `player_documents:abc-123:expired` or `player_documents:abc-123:expiring:30d`. The UNIQUE constraint on `(user_id, source_key, kind)` means the derivation function can be called repeatedly without creating duplicates.
- **`kind` enum is 6 values** for v1. Adding more kinds is a v2 migration (no need to enum-rewrite for an additive check).
- **`UNIQUE (user_id, source_key, kind)` with the `read_at` semantics** — if a user marks a notification read, we want re-derivation to re-create it. So the UNIQUE is on (user_id, source_key, kind), and a re-derivation can DELETE the read row + INSERT a new one. This is the "re-derivation allowed after read" semantic from the comment. **Open question: simpler semantics — never re-derive after first creation?**
- **No DELETE in v1 RLS** — same as 1b-1 and 1b-2.

### New Supabase Storage? **No.** This piece doesn't store files. ✓

### RLS policies

```sql
ALTER TABLE public.consumer_notifications ENABLE ROW LEVEL SECURITY;

-- Read: only the user can see their own notifications.
CREATE POLICY consumer_notifications_select_own ON public.consumer_notifications
  FOR SELECT USING (user_id = current_user_id());

-- Mark-as-read: only the user can update their own notifications, and only
-- the read_at column (v1). Future v2 may add a "dismiss" semantic.
CREATE POLICY consumer_notifications_update_own ON public.consumer_notifications
  FOR UPDATE USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- No DELETE policy in v1. Matches 1b-1 + 1b-2 destructive-action protocol.
-- (Server-side cleanup is allowed via service-role for re-derivation.)
```

---

## 3. File changes

### 3.1 New files

| File | Purpose |
|---|---|
| `supabase/migrations/2026-07-08_consumer_notifications.sql` | Table + indexes + RLS |
| `src/lib/notification-deriver.ts` | Pure functions: each kind has a `deriveForUser(userId, playerIds)` that returns an array of `Omit<ConsumerNotification, 'id' | 'created_at' | 'read_at'>` shaped rows. The route then INSERTs those rows with `onConflictDoNothing` (idempotent). |
| `src/app/api/consumer-notifications/route.ts` | GET (list with pagination, unread filter), POST (re-derive for current user — idempotent) |
| `src/app/api/consumer-notifications/[id]/route.ts` | PATCH (mark read), DELETE? (no — v1 archive-only) |
| `src/components/notifications/ConsumerNotificationBell.tsx` | Bell icon with unread count badge. Extends the existing `NotificationBell` to also read `consumer_notifications`. |
| `src/components/notifications/ConsumerNotificationList.tsx` | Inbox view: list of notifications grouped by date (Today / Yesterday / This week / Older), per-row title + body + relative time + mark-as-read button |

### 3.2 Modified files

| File | Change | Risk |
|---|---|---|
| `src/app/dashboard/page.tsx` | Add a "NOTIFICATIONS" consumer card showing unread count + top 4 most recent. Replaces the "ALERTS" placeholder if any exists. | **Low.** Additive card or replacement of placeholder. |
| `src/app/dashboard/family/page.tsx` | Add a "Family Notifications" section showing notifications that relate to the user's children. | **Low.** Additive. |
| `src/components/NotificationBell.tsx` | Extend to also fetch `consumer_notifications` and combine with `team_notifications` in a unified inbox. | **Medium.** Existing bell is team-only; this is a behavior change for the bell. Will write a per-channel count instead of just total. |

### 3.3 No-touch list (must-keep-working audit)

- [ ] `team_notifications` table + UI (separate channel; do not regress)
- [ ] `player_documents` table + 1b-1 surfaces (read paths untouched; the deriver READS this table)
- [ ] `player_achievements` table + 1b-2 surfaces (read paths untouched; the deriver READS this table)
- [ ] `team_documents` table + Phase 2 surfaces
- [ ] All Phase 1a consumer cards (1b-1 already added PENDING DOCUMENTS; do not regress)
- [ ] All Family Hub sections
- [ ] All Wizard steps
- [ ] Tier gates, account-type gates (consumer_notifications gate is on tier, same as 1b-1)
- [ ] Authentication, pricing tiers, billing, verification, permissions, workspace architecture

---

## 4. The derivation algorithm (the heart of this piece)

The deriver is a **pure function** that takes a `userId` and the user's linked player IDs, queries the source tables, and returns notification-shaped rows. The route runs the deriver, then INSERTs each row with `onConflictDoNothing` (the UNIQUE constraint on `(user_id, source_key, kind)` ensures dedup).

```typescript
// pseudocode — src/lib/notification-deriver.ts

export async function deriveNotifications(
  userId: string,
  playerIds: string[]
): Promise<NewNotification[]> {
  const notifications: NewNotification[] = [];

  // Source 1: document expiry (1b-1 surface)
  const docs = await supabaseAdmin
    .from('player_documents')
    .select('id, player_id, title, expires_at, status')
    .in('player_id', playerIds)
    .neq('status', 'archived')
    .not('expires_at', 'is', null);
  for (const d of docs.data || []) {
    if (!d.expires_at) continue;
    const today = new Date().toISOString().slice(0, 10);
    const days = daysBetween(today, d.expires_at);
    if (days < 0) {
      // Expired
      notifications.push({
        user_id: userId,
        kind: 'document_expired',
        source_key: `player_documents:${d.id}:expired`,
        player_id: d.player_id,
        title: `${d.title} has expired`,
        body: `Re-upload a current version to keep your child's Hockey Passport up to date.`,
        metadata: { document_id: d.id },
      });
    } else if (days <= 1) {
      notifications.push({
        user_id: userId,
        kind: 'document_expiring_1d',
        source_key: `player_documents:${d.id}:expiring:1d`,
        player_id: d.player_id,
        title: `${d.title} expires tomorrow`,
        body: `Re-upload now to avoid a gap in your child's Hockey Passport.`,
        metadata: { document_id: d.id },
      });
    } else if (days <= 7) {
      notifications.push({
        user_id: userId,
        kind: 'document_expiring_7d',
        source_key: `player_documents:${d.id}:expiring:7d`,
        player_id: d.player_id,
        title: `${d.title} expires in ${days} days`,
        body: `Plan ahead: re-upload before ${d.expires_at}.`,
        metadata: { document_id: d.id },
      });
    } else if (days <= 30) {
      notifications.push({
        user_id: userId,
        kind: 'document_expiring_30d',
        source_key: `player_documents:${d.id}:expiring:30d`,
        player_id: d.player_id,
        title: `${d.title} expires in ${days} days`,
        body: `Heads-up: this document is due for renewal.`,
        metadata: { document_id: d.id },
      });
    }
    // days > 30 → no notification
  }

  // Source 2: identity renewal (1a surface)
  const profile = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (profile?.identity_verified_at) {
    const verifiedAt = new Date(profile.identity_verified_at);
    const today = new Date();
    const days = Math.floor((today.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 365) {
      notifications.push({
        user_id: userId,
        kind: 'identity_renewal_due',
        source_key: `profiles:${userId}:identity_renewal`,
        player_id: null,
        title: 'Your identity verification is due for renewal',
        body: 'Re-verify to keep your verification checkmark on RinkStop.',
        metadata: {},
      });
    }
  }

  // Source 3: achievement added (1b-2 surface — conditional on 1b-2 being shipped)
  // Only enabled when the player_achievements table exists. The route does a
  // feature-flag check.
  // [Will implement in Step 2 only if 1b-2 is shipped; otherwise skipped.]

  return notifications;
}
```

**The route handler:**

```typescript
// pseudocode
export async function POST(request: NextRequest) {
  // 1. Auth + tier gate
  // 2. Load user's linked player IDs
  // 3. Run deriveNotifications
  // 4. INSERT ... ON CONFLICT DO NOTHING (idempotent)
  // 5. Return updated unread count
}
```

**When does derivation run?**
- **v1 trigger:** Manual via a "Refresh notifications" button on the consumer card, OR automatic on each page load of `/dashboard` (cheap if the player count is small and the deriver is O(1) per source row).
- **v2 trigger:** Postgres trigger on `player_documents.expires_at` updates, plus a daily scheduled job for "today is X days before expiry" checks.

**Open question: which trigger strategy for v1?** My recommendation: **auto on page load** for v1. The cost is ~10ms per `/dashboard` load (4-5 source queries, all O(player) and small). v2 adds the trigger.

---

## 5. The user-facing path

### What the user sees

1. Parent navigates to `/dashboard`. A new "NOTIFICATIONS" card shows the unread count + top 4 most recent (badge: "3 new" or "all caught up" if zero unread).
2. Clicking the card opens the full inbox — either a `/dashboard/notifications` page or a side-panel. **Open question: dedicated page or side-panel?** My recommendation: dedicated page (matches the existing `/dashboard/settings/notifications` URL pattern).
3. Each notification has:
   - Icon by kind (📄 for documents, ✅ for identity, 🏆 for achievements)
   - Title (bold if unread)
   - Body (preview)
   - Relative time ("2 hours ago", "yesterday")
   - Mark-as-read button (or auto-marks-read on click-through to the source)
4. Clicking a notification navigates to the source (e.g., document notification → `/dashboard/family` documents section, anchored to the doc).
5. Bell icon in the nav (extending `NotificationBell`) shows the total unread count (consumer + team, summed).

### Edge cases the prep covers

- **No linked children** → no document/achievement notifications. Only identity renewal.
- **Free tier** → upsell on the consumer card: "Subscribe to Identity Plus to get doc-expiry notifications."
- **Re-derivation race** → the UNIQUE constraint prevents duplicates even if two requests race.
- **Mark-as-read on click** → a "clicked" notification is auto-marked-read; a separate "mark as unread" UI is not in v1.

---

## 6. Rollback plan

### Schema rollback
```sql
DROP TABLE IF EXISTS public.consumer_notifications;
-- RLS policies drop with the table
```

### Code rollback
- Revert the modified files (1 SQL migration, 2 component files, 2 route files, 1 page file).
- Re-deploy. The NOTIFICATIONS card disappears; the bell returns to team-only.

### Data preservation
- Migration is additive (CREATE TABLE only).
- Modified files only ADD new sections or REPLACE placeholders.
- `NotificationBell` extension is additive (combines two channels); reverting the file restores the team-only bell.

### Worst case
- `git revert <merge-commit> + git push origin main`.

---

## 7. Ship gate (per 2026-06-24 protocol)

### Step 1 — Preparation (this doc, currently in progress)
- [x] Scope statement written (this doc)
- [x] Affected file list (section 3)
- [x] Dependency check (sections 1, 2, 4)
- [x] Rollback plan (section 6)
- [x] Must-keep-working audit list (section 3.3)
- [ ] **Arnel gives explicit "go" on implementation**

### Step 2 — Implementation (only after Step 1 is approved)
- One commit per file (one-piece-at-a-time rule)
- `pnpm run build` clean
- Local smoke: re-derive triggers a doc-expiry notification; mark-as-read works

### Step 3 — Pre-deploy audit
- Smoke test: parent with expiring doc sees the notification; clicking marks it read
- Smoke test: identity renewal fires after 365 days (use a synthetic old date in dev)
- Smoke test: re-derivation doesn't create duplicates (UNIQUE works)
- Smoke test: free tier gets upsell
- Smoke test: must-keep-working features still work (1b-1, 1b-2 if shipped, 1a, Phase 2, `team_notifications`)

### Step 4 — Ship
- One merge commit to `main`, Vercel auto-deploys
- Confirm live site works
- Confirm `consumer_notifications` table exists in production

### Step 5 — Post-ship audit
- Smoke test on production
- Watch Vercel logs for errors 10-15 min

---

## 8. Open questions for Arnel

1. **Inbox UX — dedicated page or side-panel?** My recommendation: dedicated page at `/dashboard/notifications` (matches existing `/dashboard/settings/notifications` URL pattern).

2. **Re-derivation strategy for v1 — page-load auto or manual button?** My recommendation: auto on page load. ~10ms cost, simple.

3. **Mark-as-read on click-through?** My recommendation: yes (mark read when user navigates to source).

4. **Re-derive after mark-read semantic — UNIQUE on (user_id, source_key, kind) and re-derive can DELETE+INSERT, OR never re-derive after first creation?** My recommendation: UNIQUE + DELETE+INSERT on re-derive. Allows expired → expiring_30d → expiring_7d transitions.

5. **Kind-level mute preferences in v1?** My recommendation: defer to v2. v1: all kinds surface, no per-kind UI.

6. **Email channel in v1?** My recommendation: in-app only. Email is v2.

7. **Identity renewal cadence** — 365 days? My recommendation: 365 days, but verify the current `profiles.identity_verified_at` semantics first.

8. **`player_achievements` deriver source** — included now (assumes 1b-2 ships) or deferred until 1b-2 is shipped? My recommendation: feature-flag the source. Code is gated on whether the table exists at runtime.

9. **`team_notifications` + `consumer_notifications` combined in one bell or separate?** My recommendation: combined in the existing bell, with a per-channel count breakdown in the dropdown.

10. **Free-tier upsell** — show a small "Upgrade to get doc-expiry alerts" link in the card, or block the card entirely? My recommendation: show the card with the upsell (matches the consumer-cards pattern for free-tier features).

---

## 9. Estimated effort (after Arnel approval)

| Step | Effort | Notes |
|---|---|---|
| Step 1 prep | DONE | this doc |
| Step 2 implementation | 1 piece, 4-6 hours | similar to 1b-1; less storage work, more derivation logic |
| Step 3 pre-deploy audit | 1-2 hours | similar shape to 1b-1's audit |
| Step 4 ship | ~30 min | merge + Vercel |
| Step 5 post-ship audit | 15 min + 15 min log watch | routine |
| **Total** | **6-8 hours, one session, one piece** | fits the 2026-06-24 one-piece-at-a-time rule |

---

## 10. After this piece (the rest of 1b, briefly)

- **1b-3 (player_media)** — photos/videos at the player level. Same shape as 1b-1 (table + storage bucket + upload UI) but with image variants and video transcoding. Larger piece.
- **Phase 3** — org adoption surface. Needs its own prep doc.

Each gets its own prep doc and its own session per the 2026-06-24 protocol.

---

## 11. Status + outstanding (2026-07-07 13:30 CDT)

### Built (on disk)
- **Nothing.** Prep doc only.

### Pre-deploy audit (Step 3) — N/A (no code yet)

### Outstanding (gate-step)
- [ ] **Arnel approves this prep doc** (Step 1 gate)
- [ ] All 10 open questions answered

### v2 backlog (not part of 1b-4, parked)
- Email notification channel
- Push notification channel (mobile)
- Kind-level mute preferences
- Daily digest
- Persistent re-derivation triggers (DB triggers + scheduled job)
- "Achievement shared by your team" notification (org-side grant → personal inbox)