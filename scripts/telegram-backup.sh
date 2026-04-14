#!/bin/bash
# Telegram config backup script
# Auto-runs daily, backs up openclaw.json

BACKUP_DIR="/root/.openclaw/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup main config
cp /root/.openclaw/openclaw.json "$BACKUP_DIR/openclaw.json.backup.$TIMESTAMP"

# Keep only last 10 backups (auto-cleanup)
cd "$BACKUP_DIR"
ls -t openclaw.json.backup.* 2>/dev/null | tail -n +11 | xargs -r rm 2>/dev/null

echo "Telegram backup saved: $BACKUP_DIR/openclaw.json.backup.$TIMESTAMP"