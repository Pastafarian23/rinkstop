#!/bin/bash
# Telegram config restore script
# Usage: ./telegram-restore.sh [backup-file]
# If no file specified, restores latest backup

BACKUP_DIR="/root/.openclaw/backups"

if [ -z "$1" ]; then
    # Find latest backup
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/openclaw.json.backup.* 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "No backups found! Cannot restore."
        exit 1
    fi
else
    BACKUP_FILE="$1"
fi

echo "Restoring from: $BACKUP_FILE"
cp "$BACKUP_FILE" /root/.openclaw/openclaw.json
echo "Config restored. Restarting gateway..."
pkill -f "openclaw-gateway" 2>/dev/null
sleep 2
openclaw gateway &
echo "Done! Telegram should be working again."
echo "Try sending a message to any channel."