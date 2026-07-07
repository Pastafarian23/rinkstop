# Phase 1c-1 — Advanced Messaging (Direct Messages) — Prep Doc

**Status:** DRAFT. Approved by Arnel 2026-07-07 ("continue with B1, work straight to complete these").
**Author:** KiloClaw
**Date:** 2026-07-07
**Source of truth:** Pricing page (https://rinkstop.com/pricing) — "Advanced messaging" advertised at Identity Plus ($59.99/yr) and Business Plus ($299/yr).
**Related:** `team_messages` table (org-side broadcast, ships differently; not in scope for this piece).

---

## 0. Why this piece

The pricing page lists "Advanced messaging" under both Identity Plus and Business Plus. Today the only messaging is `team_messages` (org→members broadcast). Parents on Identity Plus have no way to DM a coach or business. Businesses on Business Plus have no way to DM customers. Both tiers advertise this feature.

This piece adds the missing DM layer.

## 1. What this piece does

- Adds a `direct_messages` table for 1:1 user-to-user messages
- Adds a `direct_message_threads` table for thread management (find-or-create on first message)
- Adds API routes: GET threads, GET thread messages, POST new message, POST mark-read
- Adds a `/dashboard/messages` page (left-rail thread list + right pane conversation)
- Adds a small Messages bell/link in the dashboard nav (matches the existing NotificationBell pattern)
- Tier gate: Identity Plus+ OR Business Plus+ (matches the advertising)
- "Send a message" CTA on a coach's profile page (Identity Plus only)
- "Send a message" CTA on a business listing page (Business Plus only)
- No group messaging, no DMs to non-users, no file attachments (v2)

### Does NOT do (deferred)

- Real-time updates (websocket/SSE) — v1 is fetch-on-mount
- Typing indicators, read receipts beyond "read at"
- Group DMs
- File attachments (images/videos in DMs)
- Block/mute
- Forwarding, replying to specific messages (linear thread)
- Search within messages

## 2. Schema

### New table: `direct_message_threads`

```sql
CREATE TABLE public.direct_message_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ordered pair so (a,b) and (b,a) collapse to the same thread.
  user_a_id       text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  user_b_id       text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Constraint: user_a_id < user_b_id lexicographically (canonical ordering)
  CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);
```

### New table: `direct_messages`

```sql
CREATE TABLE public.direct_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
  sender_id       text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

CREATE INDEX direct_messages_thread_idx ON public.direct_messages (thread_id, created_at DESC);
CREATE INDEX direct_messages_unread_idx ON public.direct_messages (thread_id) WHERE read_at IS NULL;
```

### RLS

```sql
-- Threads: only the two participants can see/modify
CREATE POLICY dm_threads_select ON public.direct_message_threads
  FOR SELECT USING (user_a_id = current_user_id() OR user_b_id = current_user_id());
CREATE POLICY dm_threads_insert ON public.direct_message_threads
  FOR INSERT WITH CHECK (user_a_id = current_user_id() OR user_b_id = current_user_id());
CREATE POLICY dm_threads_update ON public.direct_message_threads
  FOR UPDATE USING (user_a_id = current_user_id() OR user_b_id = current_user_id());

-- Messages: only thread participants can see; only the sender can write
CREATE POLICY dm_messages_select ON public.direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = current_user_id() OR t.user_b_id = current_user_id())
    )
  );
CREATE POLICY dm_messages_insert ON public.direct_messages
  FOR INSERT WITH CHECK (
    sender_id = current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = current_user_id() OR t.user_b_id = current_user_id())
    )
  );
CREATE POLICY dm_messages_update ON public.direct_messages
  FOR UPDATE USING (
    -- A participant can mark a message read (recipient side)
    sender_id != current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = current_user_id() OR t.user_b_id = current_user_id())
    )
  );
```

## 3. Tier gating

The pricing page promises:
- Identity Plus: "Advanced messaging" — parents on this tier
- Business Plus: "Messaging" — businesses on this tier
- Free and Verified Identity: NO messaging

Tier check (server-side, applies to POST /api/direct-messages):
```typescript
function canUserDM(tier: string, accountTypes: string[]): boolean {
  const tierOk = tierAtLeastSameTrack(tier, 'identity_plus')
              || tierAtLeastSameTrack(tier, 'business_listing');
  // Either parent tier OR business tier unlocks DM
  return tierOk;
}
```

But **both** users must be on a tier that allows DM. The recipient doesn't have to be on a tier — they receive the message; the tier gate is on the **sender**. If the sender is on Identity Plus or Business Plus+, the message can be sent. (Receiving is free.)

For the **recipient CTA** ("Send a message to this person"), we surface it for Identity Plus+ and Business Plus+ users. Verified Identity users see a "subscribe to message" upsell on coach profile pages.

## 4. File changes

### New files

| File | Purpose |
|---|---|
| `supabase/migrations/2026-07-11_direct_messages.sql` | Both tables, indexes, RLS |
| `src/app/api/direct-messages/threads/route.ts` | GET (list threads for current user) |
| `src/app/api/direct-messages/threads/[id]/route.ts` | GET (thread with messages) |
| `src/app/api/direct-messages/threads/[id]/messages/route.ts` | POST (send), GET (load) |
| `src/app/api/direct-messages/threads/[id]/read/route.ts` | POST (mark thread read) |
| `src/app/dashboard/messages/page.tsx` | Server-rendered shell |
| `src/app/dashboard/messages/MessagesClient.tsx` | Client component: left-rail + right pane |
| `src/components/messages/DMThreadList.tsx` | Thread list (sorted by last_message_at desc) |
| `src/components/messages/DMThread.tsx` | Conversation pane (messages + send box) |
| `src/components/messages/DMMessage.tsx` | Single message bubble |

### Modified files

| File | Change |
|---|---|
| `src/components/dashboard/SidebarNav.tsx` (or equivalent) | Add "Messages" link |
| `src/app/directory/coaches/[slug]/page.tsx` (or similar) | Add "Send message" CTA (Identity Plus+ only) |
| `src/app/directory/listings/[id]/page.tsx` (or similar) | Add "Send message" CTA (Business Plus+ only) |

## 5. The user-facing path

1. **Dashboard nav** has a "Messages" link with an unread count badge.
2. Clicking takes the user to `/dashboard/messages`. Layout: left rail (thread list, sorted by most recent), right pane (open thread).
3. Opening a thread shows messages in chronological order. New messages are sent via the bottom input box; the list refreshes via `router.refresh()`.
4. **From a coach's profile** (Identity Plus+): a "Send message" button opens a new thread with that coach. The button is hidden for Verified Identity / Free users.
5. **From a business listing** (Business Plus+): a "Send message" button opens a new thread with the business owner. The button is hidden for Business Listing / Free users.

### Edge cases

- **Sending to yourself** — blocked at the route (canonical pair would have user_a_id == user_b_id, fails the CHECK).
- **Both users on Free tier** — sender gets 403.
- **First message** — creates the thread atomically in the POST (insert thread if not exists, then insert message).
- **Long message** — body capped at 5000 chars (route + DB CHECK).
- **Empty body** — rejected (DB CHECK + route).
- **Mark as read on open** — the GET /threads/[id] route marks all unread messages from the other party as read.

## 6. Rollback

- Drop the two tables: `DROP TABLE direct_messages, direct_message_threads`
- Revert the modified files
- 1-step per file (no destructive changes to existing tables)

## 7. Ship gate

Standard 5-step protocol. Step 1 (this doc) approved. Steps 2-5 next.

## 8. Open questions

None — the design is straightforward. If anything is unclear in code, I'll flag it.

## 9. Estimated effort

- Migration + RLS: 30 min
- 4 API routes: 1.5 hours
- 5 components + page wiring: 2 hours
- 2 page-CTAs (coach profile, business listing): 30 min
- Build + smoke test: 30 min
- Audit: 30 min
- **Total: ~5 hours**
