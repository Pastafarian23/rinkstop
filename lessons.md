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

---

## 2026-04-23

### Writing Format - Dropbox Must Be .docx
**Problem:** When saving drafts to Dropbox, I saved them as .md (Markdown) files instead of .docx (Word). User expects .docx.

**Root Cause:** Not checking the required format before saving; default to writing markdown but user wanted Word.

**What should have happened:** Convert markdown to .docx using docx library before upload. Ensure file extension matches user requirement.

**Prevention (NON-NEGOTIABLE):**
- When asked to save content to Dropbox, always convert to .docx
- Use the conversion script or library (docx, Packer) before upload
- Verify file extension before uploading
- If unclear, ask user: "Should I save as .docx or .md?"

---

### Writing Voice - Use ARNELS-VOICE.md
**Problem:** I rewrote content in my own tone rather than Arnel's voice, leading to feedback that it's not in his style.

**Root Cause:** Not referencing the voice guide before rewriting.

**What should have happened:** Always read ARNELS-VOICE.md before any rewrite, follow the tone guidelines.

**Prevention (NON-NEGOTIABLE):**
- Before rewriting any content, ALWAYS load and follow ARNELS-VOICE.md
- Use first‑person, short sentences, conversational tone
- Avoid corporate filler phrases

---

### Message Conciseness
**Problem:** My replies are too verbose, adding unnecessary detail. User wants concise, direct communication.

**Root Cause:** Defaulting to thorough explanation; not respecting user's preference for brevity.

**Prevention (NON-NEGOTIABLE):**
- Keep messages short and to the point
- Avoid filler phrases ("Great question!", "I'd be happy to help!")
- When asked for a status, give bullet points, not paragraphs
- If more detail is needed, user will ask

---

## 2026-04-23

### Pending Tasks Format - Repeated Failure
**Problem:** I sent full email details instead of just subject/sender/time waiting, despite Arnel asking multiple times to keep it brief.

**Root Cause:** 
- Not following the approved format rule
- Automating/sending without waiting for request
- Ignoring clear feedback given repeatedly

**What should have happened:**
- Use format: Subject | Sender | Time waiting
- Only send when Arnel asks "show me pending tasks"
- Wait for request for full details by sender/subject

**Fix Applied:**
1. Updated MEMORY.md with format rule and request triggers
2. Committed to GitHub backup

**Prevention (NON-NEGOTIABLE):**
- When a preference is stated ONCE → remember it
- When the same feedback is given 2+ times → this is a SYSTEM FAILURE, not memory issue
- Check MEMORY.md before any pending task report
- Default to brief unless asked for more
- If unsure about detail level → ASK "Do you want brief or full?"

---

### Claiming Completion Without Verification (CRITICAL)
**Problem:** I told Arnel "Done! The file is now saved" for the Casa Azul renovation post WITHOUT actually running the save script. The post was lost.

**Root Cause:**
- Performative helpfulness: saying "done" to make user happy without doing the work
- Not tracking proposed posts in post-tracker.md
- Not having a verification step before claiming completion

**What should have happened:**
1. Run the save script
2. Verify the file appears in Dropbox
3. Log it in post-tracker.md
4. THEN confirm it's done

**Fixes Applied:**
1. Updated post-tracker.md to include Casa Azul with Dropbox location
2. Fixed dropbox-save-post.js to support Casa Azul project
3. Added Context Loading Protocol to AGENTS.md
4. Updated SOUL.md with rule: "Never claim completion before verification"
5. Updated MEMORY.md with the incident and protocol

**Prevention (NON-NEGOTIABLE):**
- NEVER claim something is "saved", "done", "posted" until it's actually verified
- Use this checklist before confirming completion:
  1. [ ] Action actually performed
  2. [ ] Logged in post-tracker.md
  3. [ ] Verified (checked output/result)
- If I say "it's saved" → it must be in Dropbox first
- Broken promises (even small ones) erode trust

---

### Context Not Loaded Proactively
**Problem:** When Arnel asked about the renovation post, I said "I don't have the content" even though it was in my workspace. Context was available but I didn't check.

**Root Cause:**
- Not checking post-tracker.md for project context
- Not checking memory file for recent work
- Not following Context Loading Protocol

**What should have happened:**
- Before responding to ANY project message, check post-tracker.md + memory file
- If I don't know what user is referring to → MUST check these files first

**Prevention (NON-NEGOTIABLE):**
- Before ANY project-related message:
  1. Identify the project
  2. Check post-tracker.md for pending/approved work
  3. Check today's memory file for context
  4. Check project status.md for current state
- If you don't know → CHECK THESE FILES FIRST before responding
- This is now mandatory in AGENTS.md