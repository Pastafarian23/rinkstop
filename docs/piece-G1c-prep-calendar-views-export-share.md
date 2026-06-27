# Piece G1c Prep — Calendar Views + Export/Share/Print

## Scope (locked 2026-06-24 23:03 CDT, msg #23917)

**Global calendar at `/dashboard/schedule`** (replaces existing stub). Aggregates events from every team the user is on. **Clear team distinction** — each team's events must be visually identifiable at a glance.

## Scope (locked 2026-06-24 23:03 CDT, msg #23917)

**Global calendar at `/dashboard/schedule`** (replaces existing stub). Aggregates events from every team the user is on. **Clear team distinction** — each team's events must be visually identifiable at a glance.

## User-confirmed requirements (Q1 from msg #23798)

- All 4 views: month, week, day, agenda
- Filterable by team (single team for now) + event-kind
- **NEW: ICS export** (Apple Calendar / Google Calendar / Outlook)
- **NEW: shareable URL** (read-only public-ish view)
- **NEW: print-friendly layout** (CSS @media print)

## Team distinction strategy

Since multiple teams may have events on the same day, every event on the calendar must show its team. Approach:

- Each team gets a stable color hash (deterministic from team_id, 8-color palette)
- Event pills show: `[team color bar on left] [team abbreviation / short_name] [event_kind badge] [title]`
- Month view: abbreviated pill per day-cell
- Week/day view: full event block with team name visible
- Agenda view: full event row with team name + color
- Hover on month-view pill → tooltip with team name
- Filter chips at top: "All teams" + one chip per team (using team color as dot)

## Files to create/modify

### Page (replace existing stub)

1. **`src/app/dashboard/schedule/page.tsx`** (modify existing stub)
   - Server component, queries events across all teams the user is on
   - Renders calendar with view-mode toggle
   - "Export .ics" button → opens `/api/schedule/ics` (NEW path, see below)
   - "Print" button → triggers `window.print()`
   - Filter chips at top: "All teams" + per-team color dot + "All kinds" + per-kind filter

### Component

2. **`src/components/team/TeamCalendar.tsx`** (new — client component for interactivity)
   - View-mode toggle (month / week / day / agenda)
   - URL-driven state (`?view=month&date=2026-06-24&kind=practice&team=<id>`)
   - Navigation: prev/next period, "Today" button
   - Per-event rendering: team color bar on left + team name + event_kind badge + title
   - **Team color palette** (deterministic from team_id hash):
     - 8 distinct colors: gold, red, teal, purple, blue, green, pink, orange
     - Hash function: `teamId.charCodeAt(0) % 8`
   - Mobile-responsive (month view shows abbreviated grid, agenda view for <768px)

### API routes

3. **`src/app/api/schedule/ics/route.ts`** (new — GLOBAL scope)
   - GET → returns ICS file for ALL events across user's teams
   - Membership check: only events for teams the user is on
   - 90-day default window, customizable via `?days=N`
   - VEVENT format with team name in SUMMARY (`[Long] Practice - Tuesday night`)
   - CATEGORIES field for team name (so Apple/Google can color-code)

4. **`src/app/api/schedule/share/route.ts`** (new — global share for the user)
   - POST → generates a 32-char share token scoped to the user's events
   - GET → returns existing token (or 404)
   - DELETE → revokes

5. **`src/app/api/schedule/share/[token]/route.ts`** (new — public-ish read)
   - GET → returns the user's shared events (token is the credential)
   - Same shape as authed /schedule GET, minus user-specific fields

### Print CSS

6. **`src/app/globals.css`** (modify — append print rules, additive only)
   - `@media print` block hides nav, footer, action buttons
   - Calendar renders in single-column agenda for print
   - Background stays dark (most coaches print dark mode) OR add toggle

### Deferred

- Share landing page — the user can share the API URL directly for v1 (read-only JSON or ICS). A polished landing page can be added in G1c+1 if needed.

## Data model

For share tokens, two options:
- **A) In-memory Map** — simple, fast, lost on server restart
- **B) New table `team_calendar_shares`** — durable, queryable, requires migration

**Pick A** for G1c. Reasoning:
- Tokens are short-lived (30 days)
- Low volume (1-10 per team)
- Can migrate to table later if usage grows
- No migration = lower risk for this piece

Tradeoff acknowledged: if Vercel cold-starts the function, tokens are lost. Acceptable for v1.

## ICS format example

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RinkStop//Team Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:event-uuid@rinkstop.com
DTSTAMP:20260624T220000Z
DTSTART:20260701T180000Z
DTEND:20260701T200000Z
SUMMARY:Practice - Tuesday night
DESCRIPTION:Warmup + main drills + cooldown
LOCATION:Ice Adventure - CC Chacaito
ORGANIZER:mailto:team@rinkstop.com
END:VEVENT
END:VCALENDAR
```

## Files NOT changed in G1c

- `team_events` schema — no migration
- Existing `/events` pages from G1b — list/new/detail/edit untouched
- `team_rsvps` — touched in G2
- `payments` — touched in G3
- Auth/tier gate logic — already wired in G1a

## Tier gate placement

- Calendar page viewing: any team member (no tier gate)
- Event creation from calendar: tier-gated (CTA shows upgrade prompt for free users)
- ICS export: any team member (read-only export is free)
- Share creation: tier-gated (paid tier required)
- Share viewing via token: NO tier gate (token is the credential — public-style access)

## Must-keep-working (audit checklist)

After G1c ships:
1. Existing `/dashboard/plans` pages still load
2. Existing `/dashboard/team/[slug]/events` (from G1b) still works
3. `/dashboard/team/[slug]/payments` still works
4. `/dashboard` still loads (Piece E banner + coach card from Pieces B/E)
5. Practice plan filters (F2) still work
6. Dropdown component still functions
7. Vercel deploys succeed
8. ICS file downloads correctly (test via curl with auth cookie)
9. Mobile responsive (calendar view switches to agenda on narrow screens)
10. Print preview shows clean agenda-only output

## Out of scope (deferred)

- Calendar sync to user's external calendar (Google/Apple) — needs OAuth
- Notifications on new events
- Recurring events (weekly practice, etc.) — schema doesn't support yet
- Drag-to-reschedule events
- ICS export with just one event (only full-team export for now)
- Share tokens via table (using in-memory map for now)
- Multi-team combined calendar view
- Conflict detection across teams

## Ship plan

1. Write this prep doc (DONE)
2. Show Arnel, ask "go"
3. Ship in order:
   - Commit 1: TeamCalendar component + schedule page (replace stub)
   - Commit 2: ICS export route
   - Commit 3: Share token API + landing page
   - Commit 4: Print CSS in globals.css
4. Audit each commit before next
5. Final audit: type-check + curl + visual check
6. Log to `memory/2026-06-24.md`