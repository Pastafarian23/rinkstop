# Conversation Log - Key Discussions

**Purpose:** Preserve important conversation context that isn't captured in other files.
**Updated:** 2026-05-08

---

## 2026-05-08 - Hardware Decision & Recovery Planning

### Topic: Self-Hosting Decision

**Context:** Arnel considering moving from Heyron to self-hosted solution to save costs.

**Discussion Points:**
- Heyron monthly cost vs one-time hardware purchase
- Raspberry Pi 5 vs used desktop computer
- Concern about reliability of desktop vs Pi

**Decision Made:**
- Buy AMD A8-8650 desktop (₱3,900) from Facebook marketplace
- Add UPS (~₱2,500) for power protection
- Install Ubuntu Server + OpenClaw
- Self-host instead of Heyron

**Why:**
- One-time cost ~₱6,400 vs ongoing Heyron fees
- More powerful than Pi, can run local LLMs later if needed
- Can access directly via SSH once set up

**Files Created:**
- `OPENCLAW-SELF-HOSTED-SETUP.md` - Full setup guide
- `RECOVERY-DOCUMENT.md` - Context restoration guide

---

## 2026-05-08 - GitHub & Memory Issues

### Topic: GitHub Access Lost

**Context:** I couldn't find GitHub credentials in memory. User reconnected GitHub through Maton.

**Issue:** This should have been flagged immediately when I couldn't find it.

**Decision Made:**
- Added GitHub via Maton to TOOLS.md
- Added to MEMORY.md
- Commit to flagging gaps immediately in the future

---

## 2026-05-08 - Telegram Bug

### Topic: Group Replies Going to Wrong Chat

**Issue:** 
- Group messages received correctly (log shows chat_id -5167418353)
- But replies sent to user's DM (6543104235) instead of group

**Status:** 
- GitHub issue #79308 filed
- Heyron upgraded to 2026.5.7 but bug persists

**Evidence:**
```
Log: telegram sendMessage ok chat=6543104235
Should be: chat=-5167418353
```

---

## 2026-05-08 - Conversation History Backup

### Topic: Preserving Chat History

**Question:** Can conversation history be backed up?

**Answer:** Not automatically - sessions are in proprietary format.

**Solution Created:**
- `RECOVERY-DOCUMENT.md` captures all facts, preferences, credentials
- `CONVERSATION-LOG.md` captures key discussion points
- User considering "super memory" integration (details TBD)

---

## 2026-05-08 - KiloClaw Migration Planning

### Topic: Heyron Renewal + Alternatives

**Context:** Heyron renewal due tomorrow, user wants alternatives.

**Discussion Points:**
- Found alternatives: KiloClaw, OneClaw, OpenHosst, xCloud
- Cheapest: OpenHosst ($2.99/mo), KiloClaw ($4 first mo)
- User concerned about support/troubleshooting without Heyron

**Findings:**
- KiloClaw has "OpenClaw Doctor" auto-fix tool
- KiloClaw has Discord community + email support
- Core bugs (Telegram group bug) still need OpenClaw developers regardless

### Topic: Running Both KiloClaw + Local

**Use Cases:**
- Development (KiloClaw) vs Production (Local)
- Heavy tasks (local) vs Light tasks (KiloClaw)
- Redundancy if one goes down
- Different AI models (cloud vs local)

**Recommendation:**
- Use KiloClaw trial to bridge gap during computer transition
- Cancel when local is ready

### Topic: Supermemory with KiloClaw

**Answer:** No - requires self-hosting (same as Heyron)

**Solution:**
- Manual summaries saved to files
- Push to GitHub
- When local ready → install Supermemory plugin → automatic

### Topic: Maton API Key Multi-Instance

**Answer:** Yes - same key works across KiloClaw + local + Heyron

**Note:** Shared rate limits across all instances

---

## Older Discussions (Summary)

### Projects Summary
- **SativaExchange.com** - Bloomberg-style data hub for emerging markets
- **RinkStop.com** - Global Hockey Directory
- **TopShelfToker.com** - Cannabis brand
- **Kevlar-Data.com** - ON HOLD (domain for sale)
- **Confidential Marketplace** - A2A job board
- **Casa Azul de Cebu** - Event venue
- **Home & Garden Center PH** - Facebook-first marketplace
- **Arnel's Farm** - Agricultural products
- **Poi Restaurant** - Hawaiian Filipino fusion

### Key Preferences
- **Arnel's Voice:** First-person, conversational, reflective, story → insight
- **Workflow:** Agents → Social Media channel → Arnel approves → Ron posts → Dropbox

### Key Integrations
- Telegram: Multiple groups for each project
- Maton API: Email via Zoho
- GitHub: Via Maton gateway
- Dropbox: Casa Azul connected, others pending

---

*This log is updated whenever significant conversations occur. Check dates above for recent context.*