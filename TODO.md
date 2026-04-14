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

## Related Files
- `INTEGRATIONS.md` - Contains API keys (sensitive)
- `MEMORY.md` - Long-term memory
- `openclaw.json` - Core config