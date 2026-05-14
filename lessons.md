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
## 2026-05-14: Philippines Hockey - Davao Correction

**Problem:** Content drafts incorrectly stated hockey programs in Davao, Philippines. There is no ice rink or organized hockey program in Davao.

**Source of Error:** AI-generated content assumed Philippines had 3 hockey programs (Manila, Cebu, Davao). Only Manila and Cebu actually have ice rinks.

**Correct Facts:**
- Philippines has ice rinks ONLY in Manila and Cebu
- No ice rink exists in Davao
- Cebu has the only indoor ice rink outside Manila (IRon City)
- RinkStop operates in both markets (Arnel coaches in Cebu)

**Files Corrected:**
- `/root/.openclaw/workspace/drafts/rinkstop/post-2-youth-hockey-asia.md`
- `/root/.openclaw/workspace/drafts/2026-05-14-rinkstop-content.md`

**Prevention:**
- Verify hockey rink locations before generating content about non-traditional markets
- Cross-check against RinkStop's own directory data for accuracy
- When in doubt, ask Arnel or check local sources

**Verified Info:** Philippines hockey exists in Manila (multiple rinks) and Cebu (IRon City rink). No other location in PH has ice hockey infrastructure.
