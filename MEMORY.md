# MEMORY.md

_This is your long-term memory. You wake up fresh each session, but this file persists._

## Instructions
You have conversation history in your sessions but no memory file yet. On your next interaction:
1. Read through your recent sessions and USER.md
2. Write down everything important about your human: their name, projects, preferences, goals
3. Keep this file updated after every meaningful conversation

---

## Arnel's Full Profile (Updated 2026-04-14)

**Name:** Arnel Larracas | **Age:** 32 | **Goal:** Monetize → reinvest → scale

**This file is how you remember. If it is empty, you do not have long-term memory. Fix that now.**

## Lessons System
See `lessons.md` for a record of mistakes, root causes, and permanent fixes.

---

## Arnel's Projects & Teams

### SativaExchange.com
**Tagline:** "Live Market Intelligence" — Bloomberg-style data hub for emerging markets
**Sectors:** Crypto, Green Tech, Energy, Finance, Agriculture, Cannabis

| Role | Agent ID | Description |
|------|----------|-------------|
| Head | (coordination) | Overall coordination |
| Marketing | sativa-marketing | Content, campaigns |
| Sales | sativa-sales | Outreach, partnerships |
| SocialMedia | sativa-social | Social media presence |
| Research | sativa-research | Market intelligence |
| Content | sativa-content | Content creation |

### RinkStop.com
**Tagline:** Global Hockey Directory — Teams, players, leagues, facilities
**Focus:** Hockey teams, players, leagues, rinks, equipment brands

| Role | Agent ID | Workspace | Persona |
|------|----------|-----------|---------|
| Head | rinkstop-head | workspace-rinkstop-head | Coach 🏒🎯📋 |
| Marketing | rinkstop-marketing | workspace-rinkstop-marketing | Tyla 🏒🎯 |
| Sales | rinkstop-sales | workspace-rinkstop-sales | Marcus 🤝🎯 |
| Research | rinkstop-research | workspace-rinkstop-research | Darcy 🔍📊 |
| SocialMedia | rinkstop-socialmedia | workspace-rinkstop-socialmedia | Nikki 📱🏒 |
| Content | rinkstop-content | workspace-rinkstop-content | Eddie ✍️🏒 |

### Confidential Marketplace
**Tagline:** Agent-to-Agent Task Marketplace
**Focus:** AI agents can post and complete tasks
**GitHub:** https://github.com/Pastafarian23/Confidential
**Platform:** Node.js/Express (port 3000)
**Tunnel:** jobs.sativaexchange.com (Cloudflare)

| Role | Agent ID | Persona |
|------|----------|---------|
| Head | confidential-head | Coordinator 🎯 |
| Marketing | confidential-marketing | Campaign Manager 📣 |
| Sales | confidential-sales | Business Dev 🤝 |
| Research | confidential-research | Market Analyst 🔍 |
| SocialMedia | confidential-socialmedia | Social Manager 📱 |
| Content | confidential-content | Content Writer ✍️ |
| Brainstormer | confidential-brainstormer | Idea Generator 💡 |
| Support | confidential-support | User Helper 🎧 |
| Automation | confidential-automation | Automator ⚙️ |

**Telegram Channel:** -5283458613 (Confidential Ops)

### Kevlar-Data.com (NEW!)
**Tagline:** Data Intelligence — Broad data services for investors and businesses
**Focus:** Cook County, IL property records (assessor data) → expanding to more data sources
**GitHub:** https://github.com/Pastafarian23/Kevlar-Data
**Platform:** Replit
**Pivot Note (2026-04-15):** Expanded from property-only to broader data intelligence — property data is the starting point, but scope includes multiple data verticals (sports data, market data, etc.)

| Role | Agent ID | Workspace | Persona |
|------|----------|-----------|---------|
| Head | kevlar-head | workspace-kevlar-head | (TBD) |
| Marketing | kevlar-marketing | workspace-kevlar-marketing | (TBD) |
| Sales | kevlar-sales | workspace-kevlar-sales | (TBD) |
| SocialMedia | kevlar-socialmedia | workspace-kevlar-socialmedia | (TBD) |
| Research | kevlar-research | workspace-kevlar-research | (TBD) |
| Content | kevlar-content | workspace-kevlar-content | (TBD) |
| Scraping | kevlar-scraping | workspace-kevlar-scraping | (TBD) |
| Data | kevlar-data | workspace-kevlar-data | (TBD) |
| Analytics | kevlar-analytics | workspace-kevlar-analytics | (TBD) |
| Automation | kevlar-automation | workspace-kevlar-automation | (TBD) |

**Status:** Scraper in progress - Replit building Cook County scraper
**Telegram Channel:** -1003971951712 (Kevlar Data Ops)

---

## Key People
- **Arnel Larracas** — Owner, visionary, strong at ideation
- **Step Dad** — Former Chicago Board of Trade corn options pit trader → Risk management services funnel

## Project Status Files (Living Documents)

**All active projects now have a `status.md` file** that gets updated in real-time with:
- Current state (running/stopped)
- Configuration details
- Session notes with timestamps
- Action items

Locations:
- `/root/.openclaw/workspace/confidential/status.md`
- `/root/.openclaw/workspace/workspace-kevlar-data/status.md`
- `/root/.openclaw/workspace/workspace-sativaexchange/status.md`
- `/root/.openclaw/workspace/workspace-rinkstop/status.md`
- `/root/.openclaw/workspace/workspace-topshelftoker/status.md`

**Rule:** When working on ANY project, check/update the status.md file first.

---

## Workflow Rules (Approved 2026-04-16)

### Current Framework (Active)

**Morning Activation Protocol:**
1. CEO (Ron) posts morning activation message in each PROJECT OPS group
2. Activation includes direction, deadline (24h), and expectations
3. Agents generate content within 24 hours
4. Agents submit drafts to PROJECT OPS group for approval
5. Arnel reviews → approves (✅) or requests changes (❌)
6. Upon approval → Save as .docx to Dropbox (organized by project)

**Communication Structure:**
| Chat | Purpose |
|------|---------|
| C-Suite Group | Strategic oversight, high-level direction |
| CEO Direct (Project X) | Direct communication between Ron & Arnel |
| Project Ops Groups | Day-to-day work, approvals, team coordination |

**Storage:**
- Approved content → Dropbox → /[Project]/ folder → .docx format
- Reports → /[Project]/Reports/ folder
- Drafts → Project workspace ~/drafts/

**Approval Flow:**
1. Agent submits draft in project ops channel
2. Ron posts to group with "Approve?" request
3. Arnel replies "yes" or reacts ✅ to approve
4. Ron saves to Dropbox as .docx
5. Ron posts confirmation

## Business Setup Summary (2026-04-16)

**Full details:** `/workspace/business-setup-summary.md`

### Key Points:
- 56 agents across 5 projects
- C-Suite structure: CEO + 4 (Chief of Staff, CFO, CTO, Treasurer)
- Telegram chats: C-Suite + 5 project ops channels
- Active systems: Sales pipeline, Support workflow, Financial tracking
- Email: support@rinkstop.com active via Zoho/Maton
- GitHub: All backed up

## Active Projects

### Dropbox Integration (2026-04-15)
- Connected via Maton.ai
- Folder structure created for all 4 projects
- Script created: `scripts/dropbox-save-post.js`
- Format: .docx (Word) ✅
- Tested and working
- Personal folder: NEVER TOUCH (off-limits)

### LinkedIn Integration (2026-04-15)
- Connected via Maton.ai
- Connection ID: `6e34a6cc-3ecf-48fd-a0b7-665b21774b63`
- API Status: BROKEN - all endpoints returning 404
- Company Pages (awaiting IDs):
  - Top Shelf Toker: linkedin.com/company/topshelftoker/
  - Sativa Exchange: linkedin.com/company/sativaexchange/
  - RinkStop: linkedin.com/company/rinkstop/
  - Kevlar Data: linkedin.com/company/kevlardata/
- Issue: Maton/LinkedIn API integration appears broken
- Options: Check Buffer for LinkedIn, or wait for fix
- Personal profile: Future project (separate team for monetization)

### Backup & Recovery System
- **Goal:** Secure cloud backup of all OpenClaw data
- **Solution:** Google Drive via rclone with encryption
- **Status:** Research complete, todo list created
- **File:** `TODO.md`

---

## Access
- **Email:** info@sativaexchange.com (Google Workspace)
- **Discord:** DISABLED (as per Arnel's request)
- **Telegram:** ENABLED - Bot: @btcpastafarianbot
- **Cloudflare API:** Global API key available (cfk_udFYU0BTvaDpMMAXrqI5P4VWa0Pw3LEaubUYNgTC2b28e27d) - can add/edit DNS records without asking

### What I Can Do (No Need to Ask)
- Cloudflare DNS management (A, CNAME, TXT records)
- All existing integrations in INTEGRATIONS.md
- Git operations (push to openclaw-workspace)
- File read/write/edit in workspace

### Telegram Channels (CORRECTED)
| Channel ID | Name | Purpose |
|------------|------|---------|
| -5043773858 | RinkStop Ops | RinkStop team collaboration & approvals |
| -1003510871879 | Top Shelf Toker Ops (old) | Was incorrectly listed, now -5164369379 |
| -1003873622522 | Sativa Exchange Ops (old) | Was previously Sativa Exchange Ops, now -5167418353 |
| -5132774377 | Kevlar Data Ops | Kevlar Data team collaboration & approvals |
| -1003745665491 | CEO Channel | Direct comms with Arnel, feedback, strategic decisions |

**Important:** Be MORE ACTIVE on CEO channel (-1003745665491). Post thoughts, feedback, and collaborate proactively. Arnel wants more communication.

**Bidirectional Comms:** ALL collaboration groups accept text replies + emoji reactions for approve/deny/alter

## CRITICAL: Context Loss Prevention

**Problem:** Conversation context can reset unexpectedly (context limit exceeded). This is NOT visible from Telegram.

**Solution: ALWAYS save state proactively**
- After EVERY meaningful conversation → write to memory/YYYY-MM-DD.md
- Keep MEMORY.md updated with current critical info
- Never rely on conversation history alone

### BEFORE DOCUMENTING - CHECK FIRST
**Rule:** Never re-document what already exists.

- Search workflow-memo.md, MEMORY.md, docs/ folder first
- Use "As documented in [file]" instead of re-writing details
- If it exists: REFERENCE it, don't duplicate it
- Only create new documentation if it doesn't exist

### CHECKPOINT SYSTEM (Active)

**Protocol:**
- Save checkpoint every ~20-25 messages (~30 min of chat)
- Warn at 80% context before next response
- Save immediately after significant decisions/work

**Current state tracked in:** memory/2026-04-16.md

**Backup protocol:**
1. Start of session: Read memory files
2. During session: Save key info to memory/YYYY-MM-DD.md
3. End of session: Update MEMORY.md with final state

---

## Known Issues

### System Path Configuration
**CRITICAL:** All paths in openclaw.json MUST use `/home/openclaw/.openclaw/` (NOT `/root/.openclaw/`)

This was the cause of C-Suite group failure on 2026-04-16. Fixed by replacing all 78 path occurrences.

### Memory Auto-Indexing Bug
**Status:** OPEN - No automatic memory indexing exists in OpenClaw v2026.3.2

**Problem:** 
- Memory files exist in workspace but are NOT automatically indexed
- `openclaw memory status` shows 0/0 files indexed after fresh start
- Must manually run `openclaw memory index --force` to enable memory search
- This is a system gap, not a configuration issue

**Workarounds Implemented:**
1. Created cron job "Memory Auto-Reindex" to run every 6 hours (manually triggered agent turn that runs memory index)
2. Will run `openclaw memory index --force` at start of each session

**Root Cause:** OpenClaw's memory system requires manual reindexing - no auto-index on startup or file change

## Revenue Goals
- SativaExchange: Data subscriptions + risk management consulting
- RinkStop: Directory listings + brand partnerships + advertising

## Operations
- **Fact-Check Rule:** ALL content (social, blog, email, sales) must verify live data before publishing — no stale stats, always cite sources
- **Bidirectional Comms:** ALL collaboration channels accept text replies + emoji reactions for approve/deny/alter

## Social Media Approval Workflow

**Buffer API:** Token saved in `workspace/INTEGRATIONS.md`
**Post Script:** `workspace/scripts/buffer-post.js`

### Workflow:
1. Social agent (e.g., rinkstop-socialmedia) generates post draft
2. Agent sends draft to Ron (main session) via sessions_send
3. Ron forwards to Telegram (-1003967596187 - RinkStop ops) with "Approve?" request
4. Arnel replies "yes" or reacts with ✅
5. Ron posts via Buffer API script
6. Confirmation sent back to ops channel

### Connected Accounts (Buffer):
- RinkStop Facebook ✅
- RinkStop Twitter/X ✅ (just added)
- More to add as needed

### Daily Social Workflow:
1. Cron runs at 9 AM (Asia/Manila)
2. rinkstop-socialmedia does engagement (comments, likes, follows)
3. Agent creates drafts for Facebook + Twitter
4. Agent sends drafts to Ron (main) via sessions_send
5. Ron posts to RinkStop ops channel (-1003967596187)
6. Arnel approves via "yes" or ✅
7. Ron posts via Buffer API

### RinkStop Engagement Strategy:
- Target: 30-60 post engagements, 15-25 comments, 10-20 follows daily
- Hashtags: #IceHockey #HockeyLife #HockeyTraining #YouthHockey #NHL
- Comment style: Natural, 8-20 words, no spam, subtle RinkStop mentions
- **BACKED UP:** docs/rinkstop-social-AGENT.md + workspace-rinkstop-socialmedia/social-AGENT.md

### Google Gemini Integration
- API Key: Saved in `INTEGRATIONS.md`
- Default Image Model: `gemini-2.0-flash-exp`
- Used for: Social media images, blog visuals, ad creative

## RinkStop SEO Content Campaign

**Keyword tracker file:** `workspace/rinkstop-content/keyword-tracker.md`

| # | Keyword | Status |
|---|---------|--------|
| 1 | "ice rink near me" | ✅ COMPLETED |
| 2 | "hockey teams near me" | ⏳ PENDING |
| 3 | "hockey training facilities near me" | ⏳ PENDING |
| 4 | "public ice skating [city]" | ⏳ PENDING |
| 5 | "youth hockey leagues near me" | ⏳ PENDING |
| 6 | "adult hockey leagues near me" | ⏳ PENDING |
| 7 | "hockey rinks with pro shops" | ⏳ PENDING |
| 8 | "ice rink directory USA" | ⏳ PENDING |
| 9 | "hockey practice facilities [state]" | ⏳ PENDING |
| 10 | "find hockey coach near me" | ⏳ PENDING |

**Progress:** 1/10 completed (10%)