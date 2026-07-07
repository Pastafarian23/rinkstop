# Phase 1b-2 — Player Achievements + Career Timeline (Prep Doc)

**Status:** DRAFT. NOT YET REVIEWED BY ARNEL. No code has been written.
**Author:** KiloClaw
**Date:** 2026-07-07
**Source of truth:** Phase 1a prep doc (`docs/phase-1a-consumer-first-prep.md`); Phase 1b-1 audit report (`docs/phase-1b-1-audit-report.md`); Consumer-First Growth spec (Telegram msg #32712-32713, 2026-07-05 06:04 CDT).
**Related:** `supabase/migrations/2026-07-06_player_documents.sql` (already applied); 1b-1 surfaces on `/dashboard/family` and `/dashboard/profile`.

---

## 0. Why this piece is second in 1b

After 1b-1 ships, the **Hockey Passport** concept has the first layer in place: identity, verification, and uploaded documents. The next two layers — **achievements** and **career timeline** — are what turns a passport from "list of files" into a story. Per the 1a prep doc: "Your Hockey Passport is the permanent record of your child's hockey career — verified identity, photo, achievements, and team history."

This piece closes 3 "coming soon" / "coming next" hits on user-facing surfaces:
1. `/dashboard/family` line 569 — Career timeline placeholder ("Coming next")
2. `/dashboard/profile` line 431 — Achievements placeholder ("Coming soon")
3. `/dashboard/profile` line 444 — Career timeline placeholder ("Coming soon")

Achievements + Career Timeline together remove 3 of the remaining 5 "coming soon" hits. (The other 2 are 1b-3 media + 1b-4 notifications.)

**My earlier message of "5 of 11" was wrong.** I miscounted. The actual count is 3 of 5 remaining 1b-related hits. This prep doc corrects that.

---

## 1. What this piece does (and does not do)

### Does

- Adds two tables: `player_achievements` (manual, parent-entered milestones) and `player_timeline_events` (derived from existing data + a few new event sources).
- Adds derivation logic that fills `player_timeline_events` on read (no scheduled job in v1) from:
  - `team_members.joined_at` → "Joined Team {team_name}"
  - `team_members.left_at` → "Left Team {team_name}"
  - `profiles.identity_verified_at` → "Identity Verified" (if column exists; otherwise skip this event source)
  - `player_documents.created_at` → "Uploaded {category_label}" (one event per doc)
  - `player_achievements.achieved_at` → "{achievement_title}" (manual events)
- Adds a UI for parents to add a manual achievement (title, optional date, optional description, optional category).
- Adds a UI on `/dashboard/family` (per-child career timeline) and `/dashboard/profile` (achievements + career timeline sections).
- Adds a read-only list with optional category icons.
- Tier gate: matches 1b-1 (identity_plus+ OR business_listing+).
- RLS: parent of the player (via `managed_profiles`) can SELECT, INSERT (achievements only), UPDATE (achievements only, for "I made a typo"), no DELETE in v1.
- Updates the `consumer_card_data` for the consumer "RECENT ACHIEVEMENTS" card on `/dashboard` to read from `player_achievements`.

### Does NOT do (deferred)

- **Tournament results** — there's no `tournaments` table. v1 timeline includes team join/leave + identity + documents + manual achievements. Adding tournament results is a separate piece (would need a `tournaments` table, `tournament_results` join table, etc.).
- **Stat-derived achievements** ("100 career goals", "most saves in a season") — would need a stats source. Phase 1b-3 media + stats work is separate.
- **Achievement notifications** — depends on 1b-4 `consumer_notifications`. v1: achievements just appear in the list.
- **Org-side achievement grants** ("Coach awards Team MVP") — would need org-side write paths. v1: parent-only writes. v2: org-side grants if you want to model "this team awarded your kid X."
- **Public sharing** — achievements are visible to the parent (and the player-self in v2). Org-side reads come with the org-side document flow in 1b-2 v2.

### Out of scope per the original spec's guardrail

- Authentication, pricing tiers, billing, verification, permissions, workspace architecture — **untouched**.
- Existing 1b-1 surfaces (player_documents, document_signatures, team_documents) — **untouched**.

---

## 2. Schema (the only DB change in this piece)

### New table: `public.player_achievements`

```sql
CREATE TABLE public.player_achievements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  granted_by      text NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description     text CHECK (description IS NULL OR char_length(description) <= 500),
  category        text NOT NULL DEFAULT 'milestone' CHECK (category IN (
                    'milestone', 'tournament', 'award', 'team',
                    'personal', 'stat', 'other'
                  )),
  achieved_at     date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX player_achievements_player_idx
  ON public.player_achievements (player_id, achieved_at DESC);

CREATE INDEX player_achievements_player_category_idx
  ON public.player_achievements (player_id, category, achieved_at DESC);
```

**Decisions in the schema:**

- **`player_id → players.id CASCADE`** — same as 1b-1, allows players to be removed and cascade their data.
- **`granted_by → profiles.user_id RESTRICT`** — the parent who entered the achievement is on record. Org-side grants in v2 will use a different pattern.
- **`achieved_at` is a `date`, not a `timestamptz`** — achievements are dated, not timestamped. ("Won tournament on March 5, 2026" not "2026-03-05T18:30:00Z".)
- **7 category enum values** — milestone, tournament, award, team, personal, stat, other. Matches the 1a prep doc's "Awards and milestones" framing plus common parents categories.
- **No DELETE in v1 RLS** — same destructive-action protocol as 1b-1. Archive by setting `description` to `"[hidden]"` and updating the title? Actually, no — for v1, parent can edit but not delete. If a parent wants to "remove" an achievement, they edit it to a "withdrawn" state or contact support. **Open question: add an `archived` boolean like 1b-1 has on `status`?**

### New table: `public.player_timeline_events` (optional, recommended)

```sql
CREATE TABLE public.player_timeline_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  event_type      text NOT NULL CHECK (event_type IN (
                    'joined_team', 'left_team', 'identity_verified',
                    'document_uploaded', 'achievement_granted'
                  )),
  event_date      date NOT NULL,
  source_table    text NOT NULL,    -- 'team_members' | 'profiles' | 'player_documents' | 'player_achievements'
  source_id       text NOT NULL,    -- string because the source id type varies (uuid or text)
  title           text NOT NULL,    -- pre-formatted for display, e.g. "Joined Team Chicago Hawks"
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- free-form: team_id, doc_id, achievement_id, etc.
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX player_timeline_events_player_idx
  ON public.player_timeline_events (player_id, event_date DESC);
```

**Why a table and not just a view:**
- A view (e.g., `player_timeline_events_view`) would compute the join at read time. That's fine for low-volume reads, but every page load would re-compute. A materialised table is one-time-write on source-change + cheap read.
- **v1: compute on read** is simpler. If reads become slow at scale, we can materialise later. **Open question: table now, or view now + materialise in v2?**

For the prep doc, I'll propose the **table** approach (write-on-source-change). The derivation runs in the API route when listing events: when a player gets a new `team_members` row, we insert a `player_timeline_events` row. But that requires source-event hooks (a trigger or a post-write API). For v1 simplicity, I'll propose **the table is filled on-demand by the GET endpoint** (idempotent insert-if-not-exists) — so a parent loading `/dashboard/family` triggers the backfill. The cost is one extra write per page load for a player with N events, but N is small and the backfill is idempotent.

**Actually**, the simplest v1 is: **the timeline is computed entirely on read** in a single SQL query (a UNION across the source tables). No new table, no backfill logic. The "player_timeline_events" entity lives as a query shape, not a table.

**Open question for Arnel: do you want a `player_timeline_events` table (persistent, allows future "remember what the timeline looked like X days ago" features), or pure on-read computation (simpler, no storage cost, no sync issue)?**

For this prep doc, I'll default to **on-read computation** (no new table) and document the trade-off. If Arnel wants a persistent table, the schema above is the design.

### RLS policies

For `player_achievements`:

```sql
-- Read: parent of the player (matches 1b-1 RLS pattern)
CREATE POLICY player_achievements_select ON public.player_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_achievements.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- Insert: parent of the player only (v1 — org-side grants in v2)
CREATE POLICY player_achievements_insert ON public.player_achievements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_achievements.player_id
        AND mp.manager_user_id = current_user_id()
    )
    AND granted_by = current_user_id()
  );

-- Update: parent of the player only
CREATE POLICY player_achievements_update ON public.player_achievements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_achievements.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- No DELETE policy in v1. Matches 1b-1 destructive-action protocol.
```

For `player_timeline_events` (if persisted): same pattern as `player_achievements`. The route would do the inserts as service-role, so no RLS needed for INSERT (server uses service_role key).

---

## 3. File changes

### 3.1 New files

| File | Purpose |
|---|---|
| `supabase/migrations/2026-07-07_player_achievements.sql` | Table + indexes + RLS policies (matches 1b-1 pattern) |
| `src/app/api/player-achievements/route.ts` | POST (create), GET (list for a player) |
| `src/app/api/player-achievements/[id]/route.ts` | PATCH (edit), DELETE? (no — v1 archive-only) |
| `src/components/player-achievements/PlayerAchievementList.tsx` | Read-only list of achievements per child |
| `src/components/player-achievements/PlayerAchievementAdd.tsx` | Form to add a new achievement |
| `src/components/player-achievements/PlayerTimelineSection.tsx` | Composes list + add button + computed timeline events |
| `src/lib/timeline-builder.ts` | Pure function: takes a player_id + their linked data, returns sorted timeline event array |

### 3.2 Modified files

| File | Change | Risk |
|---|---|---|
| `src/app/dashboard/family/page.tsx` | Add Career Timeline section (per child) below the Documents section. Reads from `lib/timeline-builder`. | **Low.** Additive section. |
| `src/app/dashboard/profile/page.tsx` | Replace Section 2 (Achievements, line 431) and Section 3 (Career Timeline, line 444) placeholders with real sections. | **Low.** |
| `src/components/dashboard/ConsumerCards.tsx` | Update `loadConsumerCardData` to include `recentAchievements: PlayerAchievement[]` for the user's children. Already has a "RECENT ACHIEVEMENTS" card (line 451); just need to wire it. | **Low.** |

### 3.3 No-touch list (must-keep-working audit)

- [ ] `player_documents` table + 1b-1 surfaces (audit-passed; do not regress)
- [ ] `document_signatures` table (org-side document sign, separate piece)
- [ ] `team_documents` table (org-side document request, separate piece)
- [ ] `/dashboard/team/[slug]/documents` (org-side documents page)
- [ ] All Phase 1a consumer cards (audit passed; PENDING DOCUMENTS, VERIFICATION, etc.)
- [ ] All Family Hub sections (FamilySearch, FamilySetupResume, player_documents section)
- [ ] All Wizard steps (Steps 1-4 are functional; 5-6 are "coming next" — out of scope for 1b-2)
- [ ] Tier gates, account-type gates, parental-link gates (all match 1b-1 patterns)
- [ ] Authentication, pricing tiers, billing, verification, permissions, workspace architecture

---

## 4. The timeline computation (the heart of this piece)

The pure function `lib/timeline-builder.ts`:

```typescript
// pseudocode
async function buildTimeline(playerId: string): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // 1. team_members.joined_at
  const memberships = await supabaseAdmin
    .from('team_members')
    .select('id, joined_at, left_at, team_id, teams!inner(name)')
    .eq('player_id', playerId)
    .not('joined_at', 'is', null);
  for (const m of memberships.data || []) {
    events.push({
      type: 'joined_team',
      date: m.joined_at,
      title: `Joined Team ${m.teams.name}`,
      metadata: { team_id: m.team_id, membership_id: m.id },
    });
    if (m.left_at) {
      events.push({
        type: 'left_team',
        date: m.left_at,
        title: `Left Team ${m.teams.name}`,
        metadata: { team_id: m.team_id, membership_id: m.id },
      });
    }
  }

  // 2. profiles.identity_verified_at
  const profile = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at')
    .eq('user_id', <managed_profile's manager_user_id>)  // via managed_profiles
    .maybeSingle();
  if (profile?.identity_verified_at) {
    events.push({
      type: 'identity_verified',
      date: profile.identity_verified_at,
      title: 'Identity Verified',
      metadata: {},
    });
  }

  // 3. player_documents.created_at (per document)
  const docs = await supabaseAdmin
    .from('player_documents')
    .select('id, category, title, created_at, status')
    .eq('player_id', playerId)
    .eq('status', 'active');
  for (const d of docs.data || []) {
    const catLabel = CATEGORY_LABEL[d.category] || d.category;
    events.push({
      type: 'document_uploaded',
      date: d.created_at,
      title: `Uploaded ${catLabel}: ${d.title}`,
      metadata: { document_id: d.id, category: d.category },
    });
  }

  // 4. player_achievements.achieved_at
  const achievements = await supabaseAdmin
    .from('player_achievements')
    .select('id, title, category, achieved_at, description')
    .eq('player_id', playerId)
    .order('achieved_at', { ascending: false });
  for (const a of achievements.data || []) {
    events.push({
      type: 'achievement_granted',
      date: a.achieved_at,
      title: a.title,
      metadata: { achievement_id: a.id, category: a.category, description: a.description },
    });
  }

  // Sort by date desc.
  return events.sort((a, b) => b.date.localeCompare(a.date));
}
```

This is **4 queries**, all O(player-scoped) and small. For 1000+ events on a single player this would slow down, but realistic player timelines are 5-50 events.

**Open question:** For users with multiple children, do we render a combined "Family Timeline" or per-child? Per 1a prep doc, family surfaces are per-child. Recommend: per-child timeline, with a "Family Overview" card showing the most recent event across all children (5-7 events).

---

## 5. The upload flow (the user-facing path for achievements)

### Step-by-step what the user does

1. Parent on `identity_plus+` tier with at least one linked child navigates to `/dashboard/family`.
2. Below the Documents section, a "Career Timeline" section shows:
   - Reverse-chronological list of events: "Joined Team Chicago Hawks — Sep 2025", "Uploaded Birth Certificate — Aug 2025", etc.
   - Per-row icon by event type (trophy for achievements, document icon for uploads, etc.)
   - "+ Add achievement" button at the bottom (or top — open question)
3. Clicking "+ Add achievement" opens a small inline form (not a modal — matches 1b-1 pattern):
   - Title (required, 1-100 chars)
   - Category dropdown (Milestone, Tournament, Award, Team, Personal, Stat, Other)
   - Achieved on (date picker, required, default to today)
   - Description (optional, ≤500 chars)
4. Clicking Save sends a POST to `/api/player-achievements` with the achievement data. The server validates (tier, account type, parental link), inserts the row, returns the new id.
5. The list refreshes. The new achievement appears in the timeline.
6. On the profile page, the same achievement shows in the Achievements section.

### Edge cases the prep covers

- **No linked children** → the section shows "Add your first child before adding achievements." with a link to FamilySearch.
- **Edit an achievement** → per-row edit button opens a form pre-filled with existing data. PATCH to `/api/player-achievements/[id]`. No DELETE in v1 (matches 1b-1).
- **Achievement with future `achieved_at`** → allowed (parents sometimes enter tournament results that haven't happened yet as a reminder). But the timeline renders future-dated events with a "scheduled" badge.
- **Many achievements** → list is paginated (10 per page) with "Load more" button.

---

## 6. Rollback plan

### Schema rollback
```sql
DROP TABLE IF EXISTS public.player_achievements;
DROP TABLE IF EXISTS public.player_timeline_events;  -- if we create it
-- RLS policies drop with the tables
```

### Code rollback
- Revert the 3 modified files (1 SQL migration, 2 component files, 2 route files, 2 page files, 1 lib file).
- Re-deploy to Vercel. The 3 placeholder sections on `/dashboard/family` and `/dashboard/profile` reappear.

### Data preservation
- **The migration is additive (CREATE TABLE, no ALTER on existing tables).** Existing data is untouched.
- **The modified files only ADD new sections or REPLACE placeholders that had no data dependency.**
- **The ConsumerCards data shape gets one new field** (recentAchievements), which is forward-compatible.

### Worst case
- `git revert <merge-commit> + git push origin main` per the 2026-06-24 protocol.

---

## 7. Ship gate (per 2026-06-24 protocol)

### Step 1 — Preparation (this doc, currently in progress)
- [x] Scope statement written (this doc)
- [x] Affected file list (section 3)
- [x] Dependency check (sections 1, 2)
- [x] Rollback plan (section 6)
- [x] Must-keep-working audit list (section 3.3)
- [ ] **Arnel gives explicit "go" on implementation** (per 06:08 rule)

### Step 2 — Implementation (only after Step 1 is approved)
- One commit per file (per one-piece-at-a-time rule)
- `pnpm run build` clean
- Local smoke: upload a manual achievement, see it in the timeline

### Step 3 — Pre-deploy audit
- Smoke test: parent adds achievement → appears in family + profile timelines + consumer card
- Smoke test: edit achievement → reflects in both timelines
- Smoke test: derived events (joined_team, document_uploaded, identity_verified) appear correctly
- Smoke test: must-keep-working features still work (1b-1, 1a, Phase 2)
- DB / RLS check: `SELECT * FROM player_achievements` as a non-parent returns 0 rows
- SEO check: no new public routes

### Step 4 — Ship
- One merge commit to `main`, Vercel auto-deploys
- Confirm live site works
- Confirm `player_achievements` table exists in production

### Step 5 — Post-ship audit
- Smoke test on production
- Watch Vercel logs for errors 10-15 min
- If anything breaks: `git revert` + `git push origin main`

---

## 8. Open questions for Arnel (must be answered before Step 2)

1. **Timeline persistence:** persistent table (allows future "what did the timeline look like 30 days ago" features) or pure on-read computation (simpler, no storage cost, no sync issue)? **My recommendation: on-read computation for v1.** Add a table in v2 if features need it.

2. **Achievement categories:** 7 values (milestone, tournament, award, team, personal, stat, other) — too many, too few, or right?

3. **Future-dated achievements:** allowed or rejected? **My recommendation: allowed** (parents often use this as a reminder). Render with a "scheduled" badge.

4. **No DELETE in v1:** same as 1b-1 destructive-action protocol. Confirm?

5. **Edit an achievement:** PATCH route allows parent to update title/description/category/achieved_at. Confirm?

6. **Org-side grants in v2:** confirmed out of v1 scope?

7. **Pagination:** 10 per page, "Load more" — or scroll-infinite? **My recommendation: 10 + Load more** (matches 1b-1 patterns).

8. **Add button position:** at the top of the timeline (newest first, easier to add) or the bottom (after the list)? **My recommendation: top** (matches the 1b-1 upload form position).

9. **Identity-verified event source:** depends on `profiles.identity_verified_at` column. If that column doesn't exist, drop the event source. **Will verify in Step 0 read-only check.**

10. **Avatar-added event source:** depends on `profiles.avatar_url` set timestamp. May not exist. **Same as Q9.**

---

## 9. Estimated effort (after Arnel approval)

| Step | Effort | Notes |
|---|---|---|
| Step 1 prep | DONE | this doc |
| Step 2 implementation | 1 piece, 3-5 hours | smaller than 1b-1 because no storage; pure DB + UI |
| Step 3 pre-deploy audit | 1-2 hours | similar shape to 1b-1's audit |
| Step 4 ship | ~30 min | merge + Vercel |
| Step 5 post-ship audit | 15 min + 15 min log watch | routine |
| **Total** | **5-8 hours, one session, one piece** | fits the 2026-06-24 one-piece-at-a-time rule |

---

## 10. After this piece (the rest of 1b, briefly)

- **1b-4 (consumer_notifications)** — depends on 1b-1 + 1b-2 (notifications are derived from document expiry + achievement milestones). Build a notifications table + a "you have 2 unread notifications" badge in the consumer card.
- **1b-3 (player_media)** — photos/videos at the player level. Same shape as 1b-1 (table + storage bucket + upload UI) but heavier (transcoding for video, image variants for photo).
- **Phase 3** — org adoption surface. Needs its own prep doc.

Each gets its own prep doc and its own session per the 2026-06-24 protocol.

---

## 11. Status + outstanding (2026-07-07 13:30 CDT)

### Built (on disk)
- **Nothing.** Prep doc only.

### Pre-deploy audit (Step 3) — N/A (no code yet)

### Outstanding (gate-step)
- [ ] **Arnel approves this prep doc** (Step 1 gate)
- [ ] **Verify Q9/Q10 source columns exist** — Step 0 read-only check after approval
- [ ] All 10 open questions answered

### v2 backlog (not part of 1b-2, parked)
- Stat-derived achievements (e.g., "100 career goals")
- Tournament results integration
- Org-side achievement grants
- Persistent `player_timeline_events` table
- Public sharing (currently parent-only)
- Player-self view of own achievements (adult players)