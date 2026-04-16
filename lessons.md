# Lessons Learned

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