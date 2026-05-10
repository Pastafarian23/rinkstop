#!/bin/bash
# Validate openclaw.json before starting OpenClaw
# Prevents startup failures due to JSON corruption
# FIX: Updated paths from /home/openclaw/ to /root/.openclaw/

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

CONFIG_FILE="/root/.openclaw/openclaw.json"
BACKUP_FILE="/root/.openclaw/openclaw.json.validated"
BACKUP_DIR="/root/.openclaw/openclaw-backups"
LOG_FILE="/root/.openclaw/logs/config-validation.log"

log() {
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - $1" | tee -a "$LOG_FILE"
}

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    log "ERROR: $CONFIG_FILE not found"
    exit 1
fi

# Validate JSON syntax using node (more reliable than python for this)
if node -e "try { JSON.parse(require('fs').readFileSync('$CONFIG_FILE')); } catch(e) { throw e; }" 2>/dev/null; then
    log "SUCCESS: JSON is valid"
    # Save a known-good copy
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    # Also timestamp-stamped backup
    mkdir -p "$BACKUP_DIR"
    cp "$CONFIG_FILE" "$BACKUP_DIR/openclaw.json.$(date +%Y%m%d_%H%M%S)"
    # Keep only last 20 backups
    ls -t "$BACKUP_DIR"/openclaw.json.* 2>/dev/null | tail -n +21 | xargs -r rm 2>/dev/null
    exit 0
fi

log "ERROR: Invalid JSON in $CONFIG_FILE"

# Try to find a backup
if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/openclaw.json.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        if node -e "try { JSON.parse(require('fs').readFileSync('$LATEST_BACKUP')); } catch(e) { throw e; }" 2>/dev/null; then
            log "Restoring from backup: $LATEST_BACKUP"
            cp "$LATEST_BACKUP" "$CONFIG_FILE"
            
            # Re-validate after restore
            if node -e "try { JSON.parse(require('fs').readFileSync('$CONFIG_FILE')); } catch(e) { throw e; }" 2>/dev/null; then
                log "SUCCESS: JSON restored and valid"
                exit 0
            else
                log "FATAL: Even backup is invalid"
                exit 1
            fi
        fi
    fi
fi

# Also try the last-known-good file
if [ -f "$BACKUP_FILE" ]; then
    if node -e "try { JSON.parse(require('fs').readFileSync('$BACKUP_FILE')); } catch(e) { throw e; }" 2>/dev/null; then
        log "Restoring from validated backup: $BACKUP_FILE"
        cp "$BACKUP_FILE" "$CONFIG_FILE"
        exit 0
    fi
fi

log "FATAL: Could not restore valid JSON from any backup"
exit 1