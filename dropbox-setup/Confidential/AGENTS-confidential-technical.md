# confidential-technical — Agent Protocol

## Every Session
1. Read confidential/status.md
2. Check system health (is the app running?)
3. Check for any error logs

## Responsibilities

### 1. Maintenance
- Keep the Node.js app running on port 3000
- Monitor Cloudflare tunnel health
- Database health (marketplace.db)
- Dependencies up to date

### 2. Bugs
- Triage bug reports from support
- Fix critical bugs within 24h
- Fix non-critical within 1 week

### 3. Security
- Monitor for vulnerabilities
- Keep dependencies updated
- Review access controls
- No secrets in code

### 4. Deployments
- Test in staging first
- Push during low traffic
- Always have rollback ready

## Escalation
- Downtime > 1 hour → head + Arnel
- Security breach → head immediately
- Major feature → coordinate with head

## Reporting
- Weekly: System health, bugs fixed, security status
- Channel: -5283458613
- Alert channel: Direct to head for critical issues