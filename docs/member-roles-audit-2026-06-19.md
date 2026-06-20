# Member Roles Audit — 2026-06-19

## Source

- `team_members` role enum: `supabase/migrations/2026-06-18_team_workspace.sql` (lines 8-23)
- RLS policies: 5 migrations from 2026-06-18 through 2026-06-19
- `is_team_admin()` helper: `supabase/migrations/2026-06-19_team_public_posts.sql`
- UI surface (TeamSwitcher role badge): `src/components/TeamSwitcher.tsx`

## Canonical role set (16 total)

### Admin / coaching (6)
`head_coach`, `assistant_coach`, `goalie_coach`, `skills_coach`, `manager`, `team_staff`

### Board (6)
`president`, `vice_president`, `secretary`, `treasurer`, `board_member`, `safety_officer`

### Non-admin (4)
`player`, `goalie`, `alternate_player`, `parent_rep`

**Combined admin surface: 12 roles** (6 coaching + 6 board).

---

## Role check matrix — who can do what (live DB, verified)

Legend: ✅ = allowed · ❌ = denied · “any member” = any active team_members row, not just admin

For team-scoped operations, the columns are team_members.role. For platform-level (notifications, webhooks), the column refers to profiles.role='admin' (platform admin, not team admin).

### Workspace management (admin-gated)

| Operation | head_coach | asst_coach | goalie_coach | skills_coach | manager | team_staff | president | vp | secretary | treasurer | board_member | safety_officer | player | goalie | alt_player | parent_rep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **team_workspaces** UPDATE (settings) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_workspaces** DELETE (close) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Roster (admin-gated for write, any-member for read)

| Operation | head_coach | asst_coach | goalie_coach | skills_coach | manager | team_staff | president | vp | secretary | treasurer | board_member | safety_officer | player | goalie | alt_player | parent_rep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **team_members** SELECT (roster) | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member |
| **team_members** INSERT (add member) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_members** UPDATE | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Events / schedule (any-member for read, admin-gated for write)

| Operation | head_coach | asst_coach | goalie_coach | skills_coach | manager | team_staff | president | vp | secretary | treasurer | board_member | safety_officer | player | goalie | alt_player | parent_rep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **team_events** SELECT (ice times) | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member |
| **team_events** INSERT (new ice time) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_events** UPDATE | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_events** DELETE | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### RSVPs (any-member for own RSVP, admin-gated for others')

| Operation | head_coach | asst_coach | goalie_coach | skills_coach | manager | team_staff | president | vp | secretary | treasurer | board_member | safety_officer | player | goalie | alt_player | parent_rep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **team_rsvps** SELECT (roster) | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member |
| **team_rsvps** INSERT (RSVP for self) | own or admin | own or admin | own | own | own or admin | own | own or admin | own or admin | own or admin | own | own | own | own | own | own | own |
| **team_rsvps** UPDATE | own or admin | own or admin | own | own | own or admin | own | own or admin | own or admin | own or admin | own | own | own | own | own | own | own |

### Team chat (any-member for read, all 12 admin roles for write)

| Operation | head_coach | asst_coach | goalie_coach | skills_coach | manager | team_staff | president | vp | secretary | treasurer | board_member | safety_officer | player | goalie | alt_player | parent_rep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **team_messages** SELECT (roster) | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member | any-member |
| **team_messages** INSERT (send) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **team_messages** UPDATE own | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Invites (8-role admin for SELECT, 5-role for INSERT/UPDATE)

| Operation | head_coach | asst_coach | goalie_coach | skills_coach | manager | team_staff | president | vp | secretary | treasurer | board_member | safety_officer | player | goalie | alt_player | parent_rep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **team_invites** SELECT (see codes) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_invites** INSERT (create code) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_invites** UPDATE (revoke) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Public posts (Finding 1: only 6 coaching roles can post)

| Operation | head_coach | asst_coach | goalie_coach | skills_coach | manager | team_staff | president | vp | secretary | treasurer | board_member | safety_officer | player | goalie | alt_player | parent_rep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **team_news** INSERT (post news) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_news** UPDATE/DELETE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_news** SELECT draft (admin) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_results** INSERT (post result) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_results** SELECT draft (admin) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_schedule** INSERT (post event) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_schedule** UPDATE/DELETE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **team_schedule** SELECT draft (admin) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Platform surfaces (not team-scoped)

| Operation | Any logged-in user | Platform admin (profiles.role='admin') |
|---|---|---|
| **team_notifications** SELECT (own) | ✅ (own row) | ✅ |
| **team_notifications** UPDATE (mark read) | ✅ (own row) | ✅ |
| **stripe_webhook_events** SELECT | ❌ | ✅ |
| **team_slug_redirects** SELECT | ✅ (public) | ✅ |

---

## Findings

### Finding 1: `is_team_admin()` excludes the 6 board roles ❌ [CONFIRMED via live DB]

**Affected surface:** Public posts (team_news, team_results, team_schedule) — INSERT/UPDATE/DELETE for admin-only posting.

**Bug:** The new `is_team_admin()` SECURITY DEFINER function uses a 6-role set (coaching + manager + team_staff):

```sql
-- Live definition (verified via pg_get_functiondef)
AND m.role IN (
  'head_coach','assistant_coach','goalie_coach','skills_coach',
  'manager','team_staff'
)
```

But `team_messages.team_messages_insert_author` and other admin checks use a wider 12-role set. A team president or treasurer cannot:
- Post a news article (president wants to announce AGM dates)
- Post a game result (treasurer wants to record a forfeit fee decision)
- Post a schedule event (president wants to add AGM/board meeting dates)

**Why this matters:** Board members do real administrative work. In a parent-run minor-hockey org, the president is often more active than the head_coach. The role enum was designed to support this, but `is_team_admin()` was implemented in isolation and missed the board set.

**Fix:** Update `is_team_admin()` to match the team_messages INSERT check — 12 roles.

```sql
CREATE OR REPLACE FUNCTION is_team_admin(p_team_id UUID, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members m
    WHERE m.team_id = p_team_id
      AND m.user_id = p_user_id
      AND m.left_at IS NULL
      AND m.role IN (
        'head_coach','assistant_coach','goalie_coach','skills_coach',
        'manager','team_staff',
        'president','vice_president','secretary','treasurer','board_member','safety_officer'
      )
  );
$$;
```

Cost: zero. One function redefinition. Backwards-compatible (adds 6 roles, doesn't remove any).

### Finding 2: Inconsistent admin role sets across policies ⚠️ [CONFIRMED via live DB]

The live DB has **three different admin role sets** used in different places:

| Set | Roles | Used by |
|-----|-------|---------|
| Coaching-only (6) | hc, ac, gc, sc, mgr, ts | `is_team_admin()` (post-write surfaces: team_news/results/schedule) |
| Coaching + core board (8) | + president, vp, secretary | team_workspaces UPDATE/DELETE, team_members, team_events, team_invites |
| Coaching + all board (12) | + treasurer, board_member, safety_officer | team_messages INSERT, team_messages SELECT/team_events SELECT/team_rsvps SELECT (any active member) |

**Why this matters:** The "core board" set (8 roles) gates workspace settings, member management, events, and invites. The 4 board-extension roles (treasurer, board_member, safety_officer) can post team_messages (chat) but cannot manage members or post public news/results/schedule. This is probably intentional — you don't want a treasurer deleting ice times — but it's also probably UNDER-scoped on team_news/results/schedule. A treasurer absolutely should be able to post a schedule event for "dues payment deadline" or "AGM". So Finding 1's fix is the right move.

**Suggested clean-up (separate decision):** Consolidate on **two** role sets:
- **Admin** (8 roles): coaching (6) + president + vp + secretary. Used for write operations on the workspace itself (settings, members, events, invites, public posts).
- **Admin-light** (4 roles added): + treasurer + board_member + safety_officer. Used for read-only + team_messages only.

This split keeps the dangerous operations (delete workspace, delete members) gated to the 8 most-trusted roles, while still letting the 4 "other" admin roles participate in chat and (after Finding 1 fix) public posts.

**This is a bigger refactor.** Recommend deferring until we have real data showing which roles are being assigned in production. The current sets work; Finding 1 is the only critical fix.

### Finding 3: TeamSwitcher role badge misses 5 board roles ⚠️

**Affected surface:** `src/components/TeamSwitcher.tsx` ROLE_COLOR map.

**Bug:** The map has 11 roles. Missing: `president`, `vice_president`, `secretary`, `board_member`, `safety_officer`. If a user has any of these, the role badge falls back to no badge at all.

**Fix:** Add the 5 missing roles to the map. (Treasurer is already in the map.)

### ~~Finding 4: `team_events` SELECT is admin-only~~ — FALSE ALARM ❌

I initially read the migration file and saw the policy name `team_events_select_roster` had no obvious USING clause, so I assumed admin-only. **The live DB confirms** the USING clause is `EXISTS ( SELECT 1 FROM team_members m WHERE m.team_id = team_events.team_id AND m.user_id = auth.uid()::text AND m.left_at IS NULL )` — any active team member can SELECT. This is correct.

Players can see the team schedule. No fix needed.

### ~~Finding 5: `team_rsvps` is admin-only~~ — FALSE ALARM ❌

Same false alarm pattern as Finding 4. **The live DB confirms**:
- `team_rsvps_select_roster`: any active team member can SELECT.
- `team_rsvps_self_write` (CHECK): user_id = auth.uid() AND active team membership. So any roster member can RSVP for themselves.
- `team_rsvps_self_update` (USING): own row OR admin can update.

Players can RSVP to events. No fix needed.

### Finding 6: `team_messages` SELECT is correctly gated ✅ — NOT A BUG

Same false alarm pattern. **The live DB confirms** `team_messages_select_roster` is `EXISTS ( SELECT 1 FROM team_members m WHERE m.team_id = team_messages.team_id AND m.user_id = auth.uid()::text AND m.left_at IS NULL )` — any active team member can SELECT. INSERT allows all 12 admin roles to send. UPDATE only allows the author to update their own message. All correct.

### Finding 7: DMs/team_messages should be Pro+ — different tables, different rules ✅

The DMs gate in the codebase is `tierAtLeast(tier, 'pro')` (per MEMORY.md, 2026-06-17 tier rename). That's correct for the 1:1 message surface (the actual "DMs" — between two non-roster users or a user and a claimed team).

`team_messages` is a different table — it's a team-wide chat, scoped to a workspace. The Pro gate shouldn't apply to team_members of the team; they can chat with their own team for free. No fix needed.

---

## Summary

| # | Finding | Status | Severity | Effort |
|---|---------|--------|----------|--------|
| 1 | `is_team_admin()` excludes board roles from public posts | Confirmed | High | Trivial (1 SQL function) |
| 2 | Inconsistent role sets across policies | Confirmed | Low (defer) | Medium (multi-policy refactor) |
| 3 | TeamSwitcher role badge missing 5 roles | Confirmed | Low | Trivial (1 component) |
| 4 | ~~`team_events` SELECT admin-only~~ | False alarm | n/a | n/a |
| 5 | ~~`team_rsvps` admin-only~~ | False alarm | n/a | n/a |
| 6 | ~~`team_messages` SELECT admin-only~~ | False alarm | n/a | n/a |
| 7 | DMs gate vs team chat | Not a bug | n/a | n/a |

**Recommended fix order:**
1. Finding 1 (board roles can't post news/results/schedule)
2. Finding 3 (UI polish — no badge for 5 roles)
3. Finding 2 (defer until we have real production data)

## Methodology note

I read the migration source files first, which made the role sets look tighter than they actually are. The `CREATE POLICY` source often spans multiple `m.role IN` clauses across migration files; reading the migration text in isolation is misleading. Always verify against the live `pg_policies` view. Three of my initial findings (4, 5, 6) were false alarms because the live SELECT policies for roster tables are gated on `team_members.user_id = auth.uid() AND left_at IS NULL` (any active member), not on the admin role set.

I should have started with the live `pg_policies` view. Lesson saved: when auditing RLS, always query `pg_policies` directly, not the migration source.
