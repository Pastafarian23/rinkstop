# Context Handoff — Session Continuity Protocol

## Purpose
Ensure any new session (after migration, restart, or crash) can immediately pick up where the last one left off.

## Protocol

### At Session End (EVERY session)
1. Write/update `memory/YYYY-MM-DD.md` with:
   - Topics discussed
   - Decisions made
   - Actions taken
   - Actions RECOMMENDED but NOT yet completed
   - Pending items
   - Next steps

2. Update `SESSION-HANDOFF.md` with:
   - Current timestamp
   - Active projects and their status
   - Last recommended actions (bullet points)
   - Any in-progress work
   - Blockers

3. Update `MEMORY.md` if anything structural changed (new projects, new people, new workflows)

### At Session Start (EVERY session)
1. Read `SESSION-HANDOFF.md` first
2. Read `memory/YYYY-MM-DD.md` and `memory/YYYY-MM-DD-1.md` (today + yesterday)
3. Check `post-tracker.md` for pending approvals
4. Check active project status files
5. Only THEN begin responding to the user

## Files
- `/root/.openclaw/workspace/SESSION-HANDOFF.md` — always-current snapshot
- `/root/.openclaw/workspace/memory/YYYY-MM-DD.md` — daily logs
- `/root/.openclaw/workspace/MEMORY.md` — long-term memory