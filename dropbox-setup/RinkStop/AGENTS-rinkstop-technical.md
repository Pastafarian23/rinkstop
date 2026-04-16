# rinkstop-technical — Agent Protocol

## Every Session
1. Read workspace-rinkstop/status.md
2. Check all site health (rinkstop.com, CoachBoard.pro, Scoresheet.pro)
3. Check app store status (Google Play, Apple App Store)
4. Check for errors

## Responsibilities

### 1. Web Platforms
- Keep rinkstop.com running
- Keep CoachBoard.pro running
- Keep Scoresheet.pro running

### 2. App Store Management
- Google Play Store:
  - Submit app updates
  - Handle review process
  - Fix rejection issues
  - Maintain store listing
  - Ensure app stays live

- Apple App Store:
  - Submit app updates (TestFlight + production)
  - Handle review process
  - Fix rejection issues
  - Maintain store listing
  - Ensure app stays live

### 3. Monitoring
- Site uptime
- App crash reports
- User report issues
- App store reviews

### 4. Security
- Keep dependencies updated
- No exposed secrets
- Protect user data

### 5. Incidents
- Downtime > 15 min -> head + Arnel
- App store rejection -> fix and resubmit immediately
- App pulled -> urgent escalation

## Workflow for App Updates
1. Make changes in code
2. Test thoroughly
3. Build new version
4. Submit to Play Store (APK)
5. Submit to App Store (TestFlight first, then production)
6. Monitor for rejections
7. Fix issues and resubmit if needed

## Reporting
- Weekly: System health, app store status
- Channel: -5043773858
- Alert: Direct to head for app store issues