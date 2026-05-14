# HEARTBEAT.md

# Daily Health Check (Ron checks each heartbeat)
- [x] Check cron job status (`openclaw cron list`) - verify no errors
- [x] Check last delivery status for each project channel
- [x] Verify cron jobs are actually firing (check `openclaw cron runs` for recent activity)
- [x] Verify gateway pairing is stable (`cat /root/.openclaw/devices/paired.json` not empty)

# Growth & Improvement Check (rotate through - 2x per week)
- [x] Gap Detection: Compare behavior vs MEMORY.md rules
  - [x] Check if email format follows condensed rule
  - [x] Verify lessons were saved immediately after feedback
  - [x] Review recent lessons.md entries for pattern issues

# Daily CEO Checklist (to post in CEO channel each morning)

## Channel Reference
- **CEO Channel:** Arnel's CEO (Project X) (-5026194744)
- **RinkStop Ops:** (-5043773858)
- **TopShelfToker Ops:** (-5164369379)
- **SativaExchange Ops:** (-5167418353)
- **Kevlar Data Ops:** (-5132774377)
- **Confidential Ops:** (-5283458613)
- **Home & Garden Center Ops:** (-5038298893)
- **Casa Azul de Cebu Ops:** (-5028142945)
- **Arnel's Farm Ops:** (-5266315809)
- **Poi Restaurant Ops:** (-5106187072)

## Project Content Routing (CRITICAL)
**Route project-specific content to their respective Ops channels, NOT Project X.**

| Project | Channel | For |
|---------|---------|-----|
| RinkStop | RinkStop Ops (-5043773858) | Social posts, blog drafts, engagement reports |
| TopShelfToker | TopShelfToker Ops (-5164369379) | Social posts, product updates |
| SativaExchange | SativaExchange Ops (-5167418353) | Market content, social posts |
| Kevlar Data | Kevlar Data Ops (-5132774377) | Data reports, progress updates |
| Confidential | Confidential Ops (-5283458613) | Marketplace updates |
| Home & Garden Center | Home & Garden Ops (-5038298893) | Social posts, updates |
| Casa Azul de Cebu | Casa Azul Ops (-5028142945) | Event posts, promotions |
| Arnel's Farm | Arnel's Farm Ops (-5266315809) | Product posts, farm updates |
| Poi Restaurant | Poi Restaurant Ops (-5106187072) | Menu updates, event posts |

**Project X (CEO channel) receives only:**
- High-level strategic updates
- Cross-project announcements
- Items requiring CEO approval that affect multiple projects

## Daily Tasks for Arnel
- [x] Review & approve RinkStop social posts (→ RinkStop Ops channel)
- [x] Review & approve TopShelfToker social posts (→ TopShelfToker Ops channel)
- [x] Review & approve SativaExchange content (→ SativaExchange Ops channel)
- [x] Any other pending items?

## Content Workflow (Per Project)
1. Project agent drafts content → posts proposed content in project's Ops channel
2. Arnel reviews & reacts with ✅ (approve) or ❌ (reject with feedback)
3. After approval → Ron posts to social platforms
4. Ron updates any content trackers

## Instructions
- Check your project's Ops channel for proposed content
- React with ✅ to approve, ❌ to reject
- If no response by EOD → Ron sends reminder in project's Ops channel