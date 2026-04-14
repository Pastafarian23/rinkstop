# Lessons Learned

_A record of mistakes, why they happened, and permanent fixes._

---

## Lesson 1: Buffer API Token Failure

**Date:** 2026-04-14

**What Happened:**
- Buffer API returned error: `"OIDC tokens are not accepted for direct API access"`
- The stored token (`uTFWRu1dsl0UczDWS5NlUPGNZJyzh7wHquMVhSW9Zz_`) was an OIDC session token, not an API access token
- This caused all social media posts to fail

**Why It Happened:**
- The token was generated from Buffer's web interface (likely OAuth session token)
- Buffer's API requires a separate "API Access Token" from their developer/developer settings
- No verification was done when token was originally saved

**Permanent Fix:**
1. Use a dedicated social media scheduling service with working API (Publer recommended)
2. For any new API key: Always test the token immediately after adding it to the workspace
3. Document the test result in INTEGRATIONS.md with the date tested
4. Add a weekly verification check (via cron) that attempts an API call to confirm token validity

**Status:** 🔴 OPEN - Need to migrate to new service

---

## Lesson 2: [Next Lesson]

_(Add new lessons above)_

---

## How to Add Lessons

When a mistake is discovered:
1. Add to this file with the template above
2. Include: What happened → Why → Permanent fix
3. Update any relevant docs (INTEGRATIONS.md, etc.)
4. If fix involves code changes, reference the file and line