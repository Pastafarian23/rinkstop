# Piece G2 Prep: Attendance Tracking

**Scope:** Add attendance status per player on events (coach check-off)
**Target:** /dashboard/team/[slug]/events/[id]
**Dependencies:** G1b (events CRUD) already shipped ✅

## What Exists
- `team_rsvps` table with `response` (yes/no/maybe) - already queried in event detail page
- Event detail page has RSVP summary UI but no player attendance check-off
- `ADMIN_ROLES` already defined in event detail page
- API handler in `/api/team/[slug]/events/[id]/route.ts` (lines 356-467) but will fail - column missing

## What G2 Adds

### 1. Schema Migration
Add to `team_rsvps` table:
- `attendance_status` TEXT CHECK (IN ('present','absent','late','excused')) -- null = not marked
- `attendance_at` TIMESTAMPTZ -- when marked
- `attendance_note` TEXT -- optional notes
- `marked_by` TEXT REFERENCES profiles(user_id) -- who marked it

### 2. UI Components

**AttendanceCheck.tsx** - reusable dropdown/select component:
- Props: playerId, currentStatus, onChange callback
- Shows: present (green), absent (red), late (amber), excused (blue)
- Disabled for free-tier users (tier gate shows upgrade prompt)

**AttendanceSection.tsx** - main section on event detail:
- Fetches roster of event respondents (those who RSVP'd "yes" or "maybe")
- Shows each player with their RSVP response
- Per-row dropdown to mark attendance
- Bulk "Mark all present" button
- Only visible to coaches/managers (ADMIN_ROLES)

### 3. Integration Points
- Event detail page: Add AttendanceSection after RSVP summary (when `event.rsvp_required`)
- API already exists but needs column to work

## Must-Keep-Working Checklist
- [ ] Events list page
- [ ] Event create/edit
- [ ] RSVP summary (yes/maybe/no counts)
- [ ] Calendar views (month/week/day/agenda)

**Status:** Ready for implementation.