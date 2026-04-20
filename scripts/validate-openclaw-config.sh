#!/bin/bash
# Validate openclaw.json before starting OpenClaw
# Prevents startup failures due to JSON corruption

CONFIG_FILE="/root/.openclaw/openclaw.json"
BACKUP_FILE="/root/.openclaw/openclaw.json.validated"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: $CONFIG_FILE not found"
    exit 1
fi

# Validate JSON syntax
if ! python3 -c "import json; json.load(open('$CONFIG_FILE'))" 2>/dev/null; then
    echo "ERROR: Invalid JSON in $CONFIG_FILE"
    echo "Attempting to restore from last valid backup..."
    
    # Try to find a backup
    BACKUP_DIR="/root/.openclaw/backups"
    if [ -d "$BACKUP_DIR" ]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/openclaw.json.*.backup 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            echo "Found backup: $LATEST_BACKUP"
            cp "$LATEST_BACKUP" "$CONFIG_FILE"
            echo "Restored from backup"
            
            # Re-validate after restore
            if python3 -c "import json; json.load(open('$CONFIG_FILE'))" 2>/dev/null; then
                echo "SUCCESS: JSON restored and valid"
                exit 0
            else
                echo "FATAL: Even backup is invalid"
                exit 1
            fi
        fi
    fi
    
    echo "FATAL: Could not restore valid JSON"
    exit 1
fi

# If we get here, JSON is valid - save a known-good copy
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "SUCCESS: JSON is valid"
exit 0