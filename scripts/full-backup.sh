#!/bin/bash
# Full System Backup Script
# Backs up all configs, workspaces, and critical files

BACKUP_DIR="/root/.openclaw/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="full-backup-$TIMESTAMP"

mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

echo "Starting full system backup..."

# 1. Main config
cp /root/.openclaw/openclaw.json "$BACKUP_DIR/$BACKUP_NAME/openclaw.json"

# 2. All agent workspaces (AGENTS.md, SOUL.md, USER.md, IDENTITY.md, TOOLS.md)
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/workspaces"
for dir in /root/.openclaw/workspace*; do
    if [ -d "$dir" ]; then
        name=$(basename "$dir")
        mkdir -p "$BACKUP_DIR/$BACKUP_NAME/workspaces/$name"
        cp -r "$dir"/*.md "$BACKUP_DIR/$BACKUP_NAME/workspaces/$name/" 2>/dev/null
    fi
done

# 3. Docs
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/docs"
cp -r /root/.openclaw/workspace/docs/* "$BACKUP_DIR/$BACKUP_NAME/docs/" 2>/dev/null

# 4. Scripts
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/scripts"
cp /root/.openclaw/workspace/scripts/*.sh "$BACKUP_DIR/$BACKUP_NAME/scripts/" 2>/dev/null

# 5. Create archive
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Keep only last 10 full backups
ls -t full-backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm 2>/dev/null

echo "Full backup saved: $BACKUP_DIR/$BACKUP_NAME.tar.gz"