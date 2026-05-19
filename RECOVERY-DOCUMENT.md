# Recovery Document - Arnel's OpenClaw Setup

**Last Updated:** 2026-05-08
**Purpose:** Restore context for a new OpenClaw instance if Heyron is lost

---

## Who Is Arnel?

- **Name:** Arnel Larracas
- **Age:** 32
- **Location:** Cebu, Philippines
- **Background:** Politics, tech/crypto, hockey coach (20 years), entrepreneur

---

## Current Projects

### 1. SativaExchange.com
- **Tagline:** "Live Market Intelligence" — Bloomberg-style data hub for emerging markets
- **Sectors:** Crypto, Green Tech, Energy, Finance, Agriculture, Cannabis
- **Status:** Pre-launch, needs monetization
- **Telegram Group:** -5167418353

### 2. TopShelfToker.com
- **Tagline:** Cannabis brand
- **Status:** Shopify planned, needs cost-effective launch
- **Telegram Group:** -5164369379

### 3. RinkStop.com
- **Tagline:** Global Hockey Directory
- **Status:** Built out, needs refinement and monetization
- **Telegram Group:** -5043773858
- **Apps:** CoachBoard.pro, Scoresheet.pro

### 4. Kevlar-Data.com
- **Status:** ON HOLD — Domain listed for sale
- **Telegram Group:** -5132774377

### 5. Confidential Marketplace
- **Tagline:** Agent-to-Agent Task Marketplace
- **GitHub:** https://github.com/Pastafarian23/Confidential
- **Telegram Group:** -5283458613

### 6. Casa Azul de Cebu
- **Tagline:** Event Venue - Garden events & photo studio in Cebu
- **Telegram Group:** -5028142945

### 7. Home & Garden Center PH
- **Tagline:** Home & Garden Marketplace
- **Facebook:** facebook.com/hgcph (385 followers)
- **Telegram Group:** -5038298893

### 8. Arnel's Farm
- **Tagline:** Premium Philippine Agricultural Products
- **Products:** Mushroom Chicharon, Dried Mangoes, Banana Chips
- **Telegram Group:** -5266315809

### 9. Poi Restaurant
- **Tagline:** Hawaiian Filipino Fusion Restaurant
- **Telegram Group:** -5106187072

### 10. Personal Agents
- **Medical:** -5109640502
- **Fitness:** -5119764523  
- **Legal:** -5013925754

---

## Key People

| Person | Role |
|--------|------|
| Arnel Larracas | Owner, visionary |
| Step Dad | Former Chicago Board of Trade corn options pit trader → Risk management services |

---

## Active Issues (as of 2026-05-08)

### 1. Telegram Group Routing Bug - CRITICAL
- **Status:** UNRESOLVED
- **Issue:** Group messages received correctly, but replies go to user's DM instead of group
- **Chat IDs:** Group -5167418353, DM 6543104235
- **GitHub Issue:** #79308
- **Evidence:** Logs show `chat=6543104235` instead of `-5167418353`

### 2. Gateway Pairing Bug - KNOWN
- **Issue:** Gateway loses pairing after restart
- **GitHub Issue:** #69284

### 3. Image Tool Broken
- **Issue:** Sharp dependency missing
- **Status:** Not fixed

---

## Current Hardware Plan

### Decision Made: Buy AMD A8-8650 Desktop

**Source:** Facebook listing in Philippines
**Price:** ₱3,900
**Specs:** AMD A8-8650, 8GB RAM, 500GB HDD

**Plan:**
1. Buy the A8-8650 (₱3,900)
2. Add UPS (₱2,500) for power protection
3. Install Ubuntu Server
4. Install OpenClaw
5. Restore from GitHub backup
6. Self-host instead of Heyron

**Why:** 
- Much cheaper than Heyron monthly
- You own the hardware
- Can run local LLMs later if needed

**Setup Guide:** See `OPENCLAW-SELF-HOSTED-SETUP.md`

---

## Credentials & Integrations

### To Be Retrieved from TOOLS.md
- Telegram Bot Token: `7574311811:AAFV7RiYG8SFEE2P7UxFQw_ZxYn9lqFpntI`
- Maton API Key: `(stored in 1Password — do NOT commit to repo)`
- Shopify: topshelftoker69@gmail.com

### Dropbox
- Casa Azul de Cebu: Connected (ID: 0047d26c-609f-444d-ac51-074b49de5a21)
- Other projects: Pending connection

---

## Preferences

### Arnel's Voice/Tone
- First-person, conversational, authentic
- Story → Insight structure
- Reflective, grounded, not preachy
- Signature: "Looking back...", "I remember..."

### Workflow
1. Agents generate content → Social Media channel
2. Arnel approves → CEO channel
3. Ron posts → updates tracker

### Key Files
- `ARNELS-VOICE.md` — Writing style reference
- `MEMORY.md` — Long-term memory
- `TOOLS.md` — Credentials and integrations

---

## GitHub Backup

**Repository:** https://github.com/Pastafarian23/openclaw-workspace

Run these commands to restore:
```bash
cd /home/openclaw/.openclaw/workspace
git clone https://github.com/Pastafarian23/openclaw-workspace.git
```

---

## Recent Decisions (2026-05-08)

1. **GitHub connected to Maton** — User reconnected after I lost the memory of this integration
2. **Telegram bug filed** — GitHub issue #79308 created
3. **Hardware decision** — AMD A8-8650 for ₱3,900 instead of Pi 5
4. **Backup pushed** — Workspace committed and pushed to GitHub

---

## How to Restore Context

1. Clone GitHub backup
2. Read RECOVERY-DOCUMENT.md
3. Read MEMORY.md
4. Read TOOLS.md for credentials
5. Read AGENTS.md for agent configurations
6. Restore openclaw.json
7. Test integrations

A new instance of me will know your projects, preferences, and current state from these files.

---

*This document is updated before every session where significant decisions are made.*