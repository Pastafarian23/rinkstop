#!/bin/bash
# Full System Restore Script
# Usage: ./full-restore.sh [backup-file]
# If no file specified, restores latest backup

BACKUP_DIR="/root/.openclaw/backups"

if [ -z "$1" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/full-backup-*.tar.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "No full backups found!"
        exit 1
    fi
else
    BACKUP_FILE="$1"
fi

echo "Restoring from: $BACKUP_FILE"

# Extract to temp
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_NAME=$(ls "$TEMP_DIR" | head -1)

# Restore config
cp "$TEMP_DIR/$BACKUP_NAME/openclaw.json" /root/.openclaw/openclaw.json
echo "✓ Config restored"

# Restore workspaces
for dir in "$TEMP_DIR/$BACKUP_NAME/workspaces"/*; do
    if [ -d "$dir" ]; then
        name=$(basename "$dir")
        target="/root/.openclaw/$name"
        mkdir -p "$target"
        cp "$dir"/*.md "$target/" 2>/dev/null
        echo "✓ Workspace restored: $name"
    fi
done

# Restore docs
cp -r "$TEMP_DIR/$BACKUP_NAME/docs/"* /root/.openclaw/workspace/docs/ 2>/dev/null
echo "✓ Docs restored"

# Restore scripts
cp "$TEMP_DIR/$BACKUP_NAME/scripts/"*.sh /root/.openclaw/workspace/scripts/ 2>/dev/null
echo "✓ Scripts restored"

rm -rf "$TEMP_DIR"

echo ""
echo "Restore complete! Restarting gateway..."
pkill -f "openclaw-gateway" 2>/dev/null
sleep 2
openclaw gateway &
echo "Done! System restored to: $BACKUP_FILE"