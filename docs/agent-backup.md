# Agent Configuration Backup

## Last Updated: 2026-04-11 22:06 UTC

## Total Agents: 40

### By Project

| Project | Agent Count |
|---------|-------------|
| TopShelfToker | 13 |
| RinkStop | 13 |
| SativaExchange | 13 |
| main | 1 |

---

## All 40 Agents

### TopShelfToker (13)
- topshelf-head (Project Lead)
- topshelf-content
- topshelf-marketing
- topshelf-seo
- topshelf-analytics
- topshelf-social
- topshelf-monetization
- topshelf-youtube
- topshelf-tiktok
- topshelf-ecommerce
- topshelf-brainstormer
- topshelf-sales
- topshelf-automation

### RinkStop (13)
- rinkstop-head (Project Lead)
- rinkstop-content
- rinkstop-marketing
- rinkstop-sales
- rinkstop-research
- rinkstop-socialmedia
- rinkstop-seo
- rinkstop-analytics
- rinkstop-monetization
- rinkstop-youtube
- rinkstop-tiktok
- rinkstop-ecommerce
- rinkstop-automation

### SativaExchange (13)
- sativa-head (Project Lead)
- sativa-content
- sativa-marketing
- sativa-sales
- sativa-research
- sativa-socialmedia
- sativa-seo
- sativa-analytics
- sativa-monetization
- sativa-youtube
- sativa-tiktok
- sativa-ecommerce
- sativa-automation

### System
- main (main agent)

---

## API Integrations

**See:** `/workspace/INTEGRATIONS.md` (contains Buffer API token, Google Gemini key, and future integrations)

---

## Agent Instructions Backup

### RinkStop Social Media Growth Agent

**Full instructions saved in:** `/workspace-rinkstop-socialmedia/social-AGENT.md`

**Key Points:**
- Daily engagement: 30-60 posts, 15-25 comments, 10-20 follows
- Target hashtags: #IceHockey #HockeyLife #HockeyTraining #YouthHockey #NHL
- Comment style: Natural 8-20 words, no spam, subtle RinkStop mention
- Posting: Approval workflow via Telegram (Buffer API)

### Workflows (All Backed Up)
1. **Social Media Approval:** Agent → Ron → Telegram → Arnel approves → Buffer post
2. **Image Generation:** Gemini API (free tier rate limited)
3. **All agent instructions:** Stored in workspace-*/social-AGENT.md files

---

## Backup Locations

1. **Primary Config:** `/root/.openclaw/openclaw.json`
2. **Backup Copies:** 
   - `/root/.openclaw/openclaw.json.backup.*`
   - `/root/.openclaw/workspace/openclaw-config-backup-*.json`

---

## Agent Source Files

- TopShelfToker: `/workspace/docs/topshelf-agents/`
- RinkStop: `/workspace/docs/rinkstop-agents/`
- SativaExchange: `/workspace/docs/sativa-agents/`

---

## Telegram Channels

| Channel | Group ID |
|---------|----------|
| CEO | `-1003745665491` |
| TopShelfToker ops | `-1003510871879` |
| RinkStop ops | `-1003967596187` |
| SativaExchange ops | `-1003873622522` |
| Social Media | `-1003907321273` |

---

## Recovery Instructions

If agents disappear:

1. Restore from backup:
   ```bash
   cp /root/.openclaw/workspace/openclaw-config-backup-*.json /root/.openclaw/openclaw.json
   ```

2. Restart gateway:
   ```bash
   openclaw gateway restart
   ```

3. Verify:
   ```bash
   cat /root/.openclaw/openclaw.json | python3 -c "import json,sys; print(len(json.load(sys.stdin)['agents']['list']))"
   ```

