# Lessons Learned

## 2026-04-16

### Path Mismatch - Critical
**Problem:** C-Suite group (-4990884833) returned "Something went wrong" error. Logs showed `EACCES: permission denied, mkdir '/root/.openclaw/agents/main/sessions'`.

**Root Cause:** 
- openclaw.json had all paths pointing to `/root/.openclaw/...`
- Gateway (running as root) wrote to `/root/.openclaw/...`
- User "openclaw" only had access to `/home/openclaw/.openclaw/...`
- Path mismatch caused complete session failure for certain groups

**What should have happened:** Paths should point to `/home/openclaw/.openclaw/...` to match where the data actually is.

**Fix Applied:**
1. Replaced all `/root/.openclaw` with `/home/openclaw/.openclaw` in openclaw.json (78 occurrences)
2. Restarted gateway to apply changes

**Prevention (NON-NEGOTIABLE):**
- All paths in openclaw.json MUST use `/home/openclaw/.openclaw/` not `/root/.openclaw/`
- Before any config change, verify path consistency
- This should be checked in pre-flight or validation
- Document the correct base path: `/home/openclaw/.openclaw/`

---

## 2026-04-16

### Re-Documenting Instead of Referencing
**Problem:** Documented workflow details that were already in workflow-memo.md (morning activation, 24h deadline, Dropbox .docx format). Re-wrote existing information.

**Root Cause:** 
- Not checking existing docs before adding new documentation
- Duplicating instead of referencing
- "New session" syndrome - treating everything as new

**What should have happened:** When documenting workflow, check if it already exists in workflow-memo.md or other docs. Reference it: "As documented in workflow-memo.md..."

**Fixes Applied:**
1. Added this lesson
2. Updated MEMORY.md with "Check Before Document" rule

**Prevention (NON-NEGOTIABLE):**
- Before documenting ANY workflow/process, SEARCH existing docs first
- Use "As documented in [file]" instead of re-writing details
- Check: workflow-memo.md, MEMORY.md, docs/ folder
- Ask "Is this already documented?" before writing
- If already documented, just reference - don't duplicate

---

## 2026-04-16

### Forgetting Integrations - Critical
**Problem:** Asked about Dropbox, couldn't recall the Maton.ai integration even though it was documented in INTEGRATIONS.md.

**Root Cause:** 
- Not checking INTEGRATIONS.md when asked about services
- Not proactively knowing what tools are available
- Memory not functioning well in context

**What should have happened:** When Arnel asked about Dropbox, immediately check INTEGRATIONS.md and use the available tools/script.

**Fixes Applied:**
1. Document this mistake in lessons.md
2. Create checklist for "what tools do I have available"

**Prevention (NON-NEGOTIABLE):**
- When asked about a service integration, ALWAYS check INTEGRATIONS.md first
- Maintain awareness of available tools (Maton API gateway, Dropbox, etc.)
- Say "I need to check" rather than "I don't know" or forgetting
- Before starting work on any new task, ask "what tools do I have available?"

**Checklist Before Creating Files/Services:**
- [ ] Check INTEGRATIONS.md for available tools
- [ ] Check TOOLS.md for configured channels
- [ ] Check MEMORY.md for recent context

---

### GitHub Data Loss - Critical
**Problem:** Workspace backup was lost when Kevlar Data project was pushed to the same repo (Confidential).

**Root Cause:** 
- Workspace remote pointed to `Confidential` repo
- Kevlar Data marketplace files pushed to same repo
- Overwrote main branch, losing workspace history

**What was lost:** 15 commits of workspace backups (agents, docs, memory)

**Fixes Applied:**
1. Created separate repo `openclaw-workspace` for workspace
2. Updated TOOLS.md with repo structure and safety checklist
3. Protocol: Before ANY push, show what's changing and ask confirmation

**Prevention (NON-NEGOTIABLE):**
- One project = One repo
- Before push: always run `git remote -v` and `git status`
- Ask "Ready to push X files to [repo]. Approve?" before executing
- Never force push without explicit permission
- NEVER mix projects in one repo

---

### Announcing Without Delivering
**Problem:** Ron announces tasks ("Let me analyze this") but doesn't deliver results - leaves messages hanging.

**Root Cause:** 
- Not following through on announced intentions
- No explicit commitment to delivery timeframe
- Treating announcement as completion

**What should have happened:** State task, state expected delivery, then deliver. Never announce without completing.

**Prevention (NON-NEGOTIABLE):**
- Use format: "Starting [task], will report back in [X min] with [specific deliverable]"
- If delayed, proactively report: "Still working on [task], need ~X more minutes"
- If a message is left hanging, immediately resume and deliver when asked
- See: `/workspace/docs/discipline-protocol.md`

---

### Write Tool JSON Content Bug
**Problem:** Writing JSON files via the write tool fails with `content: must be string` when passing a JSON object.

**Root Cause:** The write tool requires raw string content, not parsed JSON objects.

**Fix:** Use exec with heredoc for JSON files:
```bash
cat > /path/to/file.json << 'EOF'
{ "key": "value" }
EOF
```

**Prevention:** Always use exec for JSON files, or ensure content is properly stringified as a raw string.