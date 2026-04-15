# TODO - OpenClaw Backup & Recovery Project

**Created:** 2026-04-14

## Goal
Build a secure, automated backup system for OpenClaw workspace that can be easily restored if the server fails.

## Cloud Sync Solution (Selected)
- **Provider:** Google Drive (via rclone)
- **Encryption:** Password-protected before upload
- **Backup includes:**
  - Core config (`openclaw.json`)
  - All workspaces (`workspace-*` folders)
  - Identity files (`IDENTITY.md`, `USER.md`, `MEMORY.md`, `SOUL.md`, `TOOLS.md`)
  - Daily memory (`memory/` files)
  - Integrations/API keys

## Phases

### Phase 1: Research & Planning
- [x] Research cloud sync options
- [ ] Document what needs to be backed up

### Phase 2: Implementation
- [ ] Install rclone
- [ ] Configure Google Drive OAuth
- [ ] Create encryption backup script
- [ ] Test backup + restore flow

### Phase 3: Automation
- [ ] Schedule automatic backups
- [ ] Document restore instructions for Arnel

## Notes
- Must be secure (encrypt sensitive data)
- Must be easy for non-tech user to restore
- Arnel not tech-savvy - need simple instructions

---

# RinkStop GA4 Setup
**Status:** Pending (Replit agent paused until payment)

- [ ] Add GA4 tracking code (G-533194109) to RinkStop site
  ```html
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-533194109"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-533194109');
  </script>
  ```

---

# 1000 Monthly Views Goal
**Target:** 1,000 views/month for Mediavine onboarding

| Site | Baseline | Current | Target |
|------|----------|---------|--------|
| SativaExchange (G-454149918) | - | - | 1,000 |
| RinkStop (G-533194109) | - | - | 1,000 |

## Related Files
- `INTEGRATIONS.md` - Contains API keys (sensitive)
- `MEMORY.md` - Long-term memory
- `openclaw.json` - Core config