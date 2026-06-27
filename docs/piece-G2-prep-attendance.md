# Piece G2 Prep: Attendance Tracking

**Scope:** Add attendance status per player on events (coach check-off)
**Target:** /dashboard/team/[slug]/events/[id]
**Dependencies:** G1b (events CRUD) already shipped

## What Exists
- `team_rsvps` table with `response` (yes/no/maybe) - already queried in event detail page
- Event detail page has RSVP summary UI but no player attendance check-off
- `ADMIN_ROLES` already defined in event detail page

## What G2 Adds
1. **Schema:** Add `attendance_status` column to `team_rsvps`
   - Values: `present | absent | late | excused` (null = not marked)
   - Optional fields: `late` and `excused` are optional per Arnel's spec

2. **API:** PATCH /api/team/[slug]/events/[id]/attendance
   - Auth: requires team membership + admin role
   - Body: { playerId, attendanceStatus, notes? }

3. **UI:** Attendance table on event detail
   - Shows players with their RSVP response
   - Coach can mark attendance via dropdown/buttons
   - Status colors: green (present), red (absent), amber (late), blue (excused)

## Affected Files
- `supabase/migrations/2026-06-26_team_rsvps_attendance_status.sql` (new)
- `src/app/api/team/[slug]/events/[id]/route.ts` (extend PATCH)
- `src/components/team/AttendanceCheck.tsx` (new)
- `src/app/dashboard/team/[slug]/events/[id]/AttendanceSection.tsx` (new)

## Rollback Plan
- DROP COLUMN attendance_status
- API revert to pre-extend state

## Must-Keep-Working Checklist
- [ ] Events list page
- [ ] Event create/edit
- [ ] RSVP summary (yes/maybe/no counts)
- [ ] Calendar views (month/week/day/agenda)

**Status:** Ready for implementation. Awaiting "go".