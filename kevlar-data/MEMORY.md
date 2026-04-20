# MEMORY.md - Kevlar Data Ops

## Cron Job Alerts - Truth-Based Fix

**Problem:** Cron failure alerts were firing even when messages delivered successfully. The OpenClaw platform sometimes marks jobs as "error" with "Message failed" even when `delivered: true`.

**Solution Applied:**
- Set `--failure-alert-after 3` (requires 3 consecutive true errors)
- Set `--best-effort-deliver` (delivery failures don't mark job as error)

**Cron Jobs Fixed:**
| Job ID | Name | Command |
|--------|------|---------|
| b894ea9e-... | Kevlar Daily Brainstorm | `openclaw cron edit b894ea9e-ba43-4fbf-9ffb-c23278edd44d --failure-alert-after 3 --best-effort-deliver` |

**Platform Issue:** OpenClaw bug — status="error" should only fire when delivery actually fails, not on internal tool errors during execution.