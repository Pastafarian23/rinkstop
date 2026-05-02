# Lessons Learned

## 2026-04-30: Telegram Group ID Mismatch

**Problem:** Top Shelf Toker Ops group (-5164369379) was not receiving replies despite working before.

**Root Cause:** 
- OpenClaw config had OLD supergroup IDs (-1003510871879, -1003907321273, -1003847388689)
- These appear to be remnants from an old setup (April 11-25)
- When Telegram converts groups to supergroups, IDs can change
- The correct current ID was documented in TOOLS.md but NOT in openclaw.json

**What was lost:**
- topshelf-head was bound to wrong ID
- topshelf-social was bound to wrong ID  
- topshelf-brainstormer was bound to wrong ID

**Fix Applied:**
- Updated all topshelf agent bindings to use -5164369379
- Gateway already running, no restart needed

**Prevention (IMPLEMENTED 2026-05-01):**
1. ✅ Created `/root/.openclaw/scripts/verify-groups.sh` - validates both config locations match
2. ✅ Updated TOOLS.md with CRITICAL warning about two config locations
3. ✅ Saved working backup: `openclaw.json.working-backup-20260501`
4. ✅ After any config change, run: `bash /root/.openclaw/scripts/verify-groups.sh`

**Files involved:**
- /root/.openclaw/openclaw.json (binding config)
- /root/.openclaw/workspace/TOOLS.md (reference ID storage)
- /root/.openclaw/scripts/verify-groups.sh (verification script)