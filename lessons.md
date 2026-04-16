# Lessons Learned

## 2026-04-16

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