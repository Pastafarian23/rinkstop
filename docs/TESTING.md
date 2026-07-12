# RinkStop Testing Todo

**Items that need a human (Arnel) eyeball verify, because they involve a logged-in browser session that the agent can't simulate from CLI.**

Each entry: what to do, what to look for, why it matters.

---

## Open

### 3-A0 — Self-claim full flow
- **What:** Log in as yourself on rinkstop.com → /claim-your-listing?type=player → search for a player → click Claim → submit on /dashboard/claims. Then /admin/claims → Approve.
- **Look for:** Approval sets `players.user_id = your_clerk_id`. Next time you visit /claim-your-listing and search for the same player, the row shows "SELF-MANAGED" badge and "Your analytics →" link instead of Claim button.
- **Why:** I shipped the full path but couldn't simulate the admin approve click from CLI. The route code is straightforward but the end-to-end behavior needs a human confirmation.
- **Added:** 2026-07-08 (commit `29ee8a1`)

---

## Resolved

_(none yet — first item above is the inaugural entry)_