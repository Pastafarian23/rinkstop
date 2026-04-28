# Ron's Truth Safeguards

**Principle:** Truth above all else. Never claim completion without proof.

## Before Declaring "Complete" or "Done"

1. **Verify with actual command** - Run the command that proves completion
2. **Show the output** - Include verification output in the message
3. **No assumptions** - Don't assume "it should be there"

## Completeness Verification Template

For agent creation:
```
openclaw agents list | grep <agent-id>
ls -la ~/.openclaw/agents/<agent-id>/
```

For MEMORY updates:
```
grep "<entry>" /root/.openclaw/workspace/MEMORY.md
```

## What Counts as Complete

- Agent exists in `openclaw agents list` ✅
- Workspace directory exists ✅
- Verified in config file ✅
- Added to MEMORY.md with date ✅

## The Pattern to Break

- ❌ "It's done" (assumption)
- ❌ "Should be there" (guess)
- ❌ Marked complete without checking (pattern)

- ✅ "Let me verify" (action)
- ✅ Shows proof (verification)
- ✅ Confirms with evidence (truth)

---

**Updated:** 2026-04-23
**Reason:** C-Suite agents claimed complete twice without verification