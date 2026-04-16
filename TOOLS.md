# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Telegram Groups (Two-way chat)
- **Sativa Exchange Ops:** -5167418353
- **Sativa Exchange Ops (old):** -1003873622522
- **RinkStop Ops:** -5043773858
- **Top Shelf Toker Ops:** -5164369379
- **Kevlar Data Ops:** -5132774377 ✅ (bidirectional)
- **Confidential Ops:** -5283458613 ✅ (bidirectional)
- **Planning:** -4990884833 ✅ (bidirectional)

## Telegram Channels (One-way broadcast - deprecated)
- **CEO Channel:** -1003745665491


## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

---

## Shopify Stores

### Top Shelf Toker
- **Store URL:** https://admin.shopify.com/store/top-shelf-toker-2
- **Email:** topshelftoker69@gmail.com
- **Password:** [SECURED]
- **Status:** Connected ✅

## Discord
- **Server ID:** 1490769951374446722

## Email
- **Address:** info@sativaexchange.com

## Pexo Video Workflow (Important!)
- **ALWAYS confirm prompts with Arnel BEFORE submitting to Pexo**
- Send the prompt text for review
- Wait for go-ahead signal (✅ or "yes") before executing
- This applies to: new videos AND revision requests

---

## GitHub Repository Structure (CRITICAL)

**RULE: One project = One repo. Never mix projects. Never overwrite.**

| Repo | Contents | Location |
|------|----------|----------|
| `openclaw-workspace` | OpenClaw workspace backup (agents, docs, memory, configs) | GitHub |
| `Confidential` | jobs.sativaexchange.com marketplace (A2A job board) | GitHub |
| `Kevlar-Data` | Cook County property data scraper/API | Replit → GitHub |
| `kevlar-hockey-api` | Hockey directory API | Local/Replit |

### Before ANY Git Push - SAFETY CHECKLIST

1. **Show status first:** `git status` and `git diff --stat`
2. **List files changing:** Show exactly what files will be added/modified/deleted
3. **Ask confirmation:** "Ready to push X files to [repo]. Approve?"
4. **NEVER force push** without explicit permission
5. **Never push to wrong repo** - verify remote URL matches project

### Git Commands (Always run these first):
```bash
git remote -v          # Verify correct repo
git status             # Show what's changing
git diff --stat        # Summary of changes
```

---

## Backup Protocol (Non-Negotiable)

1. **Daily backup** - Push workspace changes to openclaw-workspace
2. **Before any push** - Run safety checklist above
3. **Never delete remote branches** without approval
4. **If unsure** - Ask Arnel before proceeding

---