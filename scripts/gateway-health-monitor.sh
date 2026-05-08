#!/bin/bash
#
# Gateway Health Monitor & Auto-Repair Script
# Runs every 5 minutes to check gateway health and repair pairing if needed
#
# MULTI-LAYER SAFEGUARD SYSTEM:
# Layer 1: Auto-repair pairing (if gateway is UP but pairing broken)
# Layer 2: Restart gateway (if gateway is DOWN)
# Layer 3: Out-of-band alert (if restart fails) - via direct API call
#

GATEWAY_JSON="/root/.openclaw/devices/paired.json"
PENDING_JSON="/root/.openclaw/devices/pending.json"
LOG_FILE="/root/.openclaw/logs/gateway-health.log"
CRON_LOG="/root/.openclaw/logs/gateway-cron.log"

# Telegram config
TELEGRAM_CHAT="-4990884833"
TELEGRAM_BOT_TOKEN="7574311811:AAFV7RiYG8SFEE2P7UxFQw_ZxYn9lqFpntI"  # From openclaw.json

# Email config (out-of-band fallback)
EMAIL_FROM="info@sativaexchange.com"
EMAIL_TO="arnel.larracas@gmail.com"
EMAIL_SUBJECT="🚨 URGENT: OpenClaw Gateway DOWN"

log() {
    local msg="$(date -u '+%Y-%m-%d %H:%M:%S UTC') - $1"
    echo "$msg" | tee -a "$LOG_FILE"
    echo "$msg" >> "$CRON_LOG"
}

# Layer 3: Out-of-band email alert (uses direct SMTP or API)
send_email_alert() {
    local message="$1"
    log "ATTEMPTING OUT-OF-BAND ALERT: Sending email"
    
    # Try using sendmail or msmtp if available
    if command -v sendmail &> /dev/null; then
        echo -e "From: $EMAIL_FROM\nTo: $EMAIL_TO\nSubject: $EMAIL_SUBJECT\n\n$message" | sendmail -t
        log "Email alert sent via sendmail"
        return 0
    fi
    
    # Try Python SMTP as fallback
    python3 << EOF
import smtplib
from email.mime.text import MIMEText
import os

msg = MIMEText("""$message""")
msg['Subject'] = '$EMAIL_SUBJECT'
msg['From'] = '$EMAIL_FROM'
msg['To'] = '$EMAIL_TO'

# Try using environment variables or default credentials
# This is a placeholder - in production you'd use proper SMTP credentials
try:
    # Using Gmail SMTP (would need app password in production)
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    # Note: In production, use app-specific password
    # server.login(os.environ.get('SMTP_USER'), os.environ.get('SMTP_PASS'))
    server.send_message(msg)
    server.quit()
    print("Email sent successfully")
except Exception as e:
    print(f"Email failed: {e}")
EOF
    return $?
}

# Layer 3b: Try Telegram via direct API (bypass gateway)
send_telegram_alert() {
    local message="$1"
    log "ATTEMPTING: Sending Telegram alert via direct API"
    
    # Direct Telegram Bot API call (bypasses OpenClaw gateway)
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": \"$TELEGRAM_CHAT\", \"text\": \"$message\", \"parse_mode\": \"Markdown\"}" \
        >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log "Telegram alert sent successfully via direct API"
        return 0
    else
        log "Telegram alert failed via direct API"
        return 1
    fi
}

# Send alert via all available methods
send_alert() {
    local message="$1"
    
    # Layer 1: Try Telegram via direct API
    send_telegram_alert "$message"
    
    # Layer 2: Try email as backup
    send_email_alert "$message"
}

# Check if gateway is responsive (HTTP check)
check_gateway_http() {
    local status=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/ 2>/dev/null)
    if [ "$status" = "200" ] || [ "$status" = "301" ] || [ "$status" = "302" ] || [ "$status" = "401" ] || [ "$status" = "403" ]; then
        return 0
    else
        return 1
    fi
}

# Check if gateway process is running
check_gateway_process() {
    if pgrep -f "openclaw-gateway" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if pairing is broken
check_pairing() {
    # If paired.json is empty {}, we need to repair
    if [ ! -s "$GATEWAY_JSON" ] || [ "$(cat "$GATEWAY_JSON")" = "{}" ]; then
        log "PAIRING CHECK: paired.json is empty"
        return 1
    fi
    
    # Check if there's a pending device we need to approve
    if [ -s "$PENDING_JSON" ] && [ "$(cat "$PENDING_JSON")" != "{}" ]; then
        log "PAIRING CHECK: pending.json has devices"
        return 1
    fi
    
    return 0
}

# Layer 2: Restart gateway process
restart_gateway() {
    log "ATTEMPTING: Gateway restart"
    
    # Kill any existing gateway process
    pkill -f "openclaw-gateway" 2>/dev/null
    sleep 2
    
    # Start gateway in background
    nohup openclaw gateway run >> "$LOG_FILE" 2>&1 &
    sleep 5
    
    # Check if it's now running
    if check_gateway_process && check_gateway_http; then
        log "GATEWAY RESTART SUCCESSFUL"
        send_alert "🔄 *Gateway Auto-Restart Complete*\n\nThe gateway was down but has been restarted successfully. Services should be operational."
        return 0
    else
        log "GATEWAY RESTART FAILED"
        return 1
    fi
}

# Layer 1: Repair pairing (when gateway is UP but pairing broken)
repair_pairing() {
    log "ATTEMPTING PAIRING REPAIR"
    
    # Get the first pending device ID
    local device_id=$(python3 -c "
import json
with open('$PENDING_JSON') as f:
    data = json.load(f)
    if data:
        print(list(data.keys())[0])
    else:
        print('')
")
    
    if [ -n "$device_id" ]; then
        log "Found pending device: $device_id"
        
        # Get the device data and add to paired.json
        python3 -c "
import json
from datetime import datetime
with open('$PENDING_JSON') as f:
    pending = json.load(f)
with open('$GATEWAY_JSON') as f:
    paired = json.load(f)

device = pending.get('$device_id')
if device:
    paired['$device_id'] = {
        'deviceId': device.get('deviceId'),
        'publicKey': device.get('publicKey'),
        'platform': device.get('platform'),
        'clientId': device.get('clientId'),
        'clientMode': device.get('clientMode'),
        'role': device.get('role'),
        'roles': device.get('roles', []),
        'scopes': device.get('scopes', []),
        'pairedAt': int(datetime.now().timestamp() * 1000),
        'lastSeenAt': int(datetime.now().timestamp() * 1000)
    }
    
with open('$GATEWAY_JSON', 'w') as f:
    json.dump(paired, f, indent=2)

print('Device added to paired.json')
"
        
        log "PAIRING REPAIR SUCCESSFUL"
        send_alert "🔧 *Gateway Auto-Repair Complete*\n\nPairing has been restored. Gateway should now be operational."
        return 0
    else
        log "PAIRING REPAIR FAILED: No pending device found"
        return 1
    fi
}

# Main logic
main() {
    log "=== Gateway Health Check Started ==="
    
    # LAYER 0: Check if gateway process is running
    if check_gateway_process; then
        log "Gateway process: RUNNING"
        
        # Check HTTP response
        if check_gateway_http; then
            log "Gateway HTTP: UP"
            
            # Check pairing
            if check_pairing; then
                log "Status: Everything OK - Gateway up and paired"
            else
                log "Status: Gateway UP but pairing BROKEN"
                repair_pairing
            fi
        else
            log "Status: Gateway process running but HTTP not responding"
            # Process running but not responding - try restart
            restart_gateway
        fi
    else
        log "Status: Gateway process NOT RUNNING"
        
        # Try to restart
        if restart_gateway; then
            log "Restart successful"
        else
            log "CRITICAL: Gateway restart failed - sending out-of-band alert"
            send_alert "🚨 *CRITICAL: Gateway DOWN & Unrecoverable*\n\nThe gateway process is not running and restart failed. Manual intervention required immediately.\n\nLocation: OpenClaw container\nTimestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        fi
    fi
    
    # Run safeguard checks
    run_safeguards
    
    log "=== Gateway Health Check Complete ==="
}

# Layer 4: Config Health Check
check_config_health() {
    local config_file="/home/openclaw/.openclaw/openclaw.json"
    local backup_dir="/home/openclaw/.openclaw/backups"
    
    # Validate JSON
    if node -e "try { JSON.parse(require('fs').readFileSync('$config_file')); } catch(e) { throw e; }" 2>/dev/null; then
        log "CONFIG: Valid JSON"
        return 0
    else
        log "CONFIG: INVALID JSON - attempting backup restore"
        
        # Try latest backup
        local latest_backup=$(ls -t "$backup_dir"/openclaw.json.*.backup 2>/dev/null | head -1)
        if [ -n "$latest_backup" ]; then
            if node -e "try { JSON.parse(require('fs').readFileSync('$latest_backup')); } catch(e) { throw e; }" 2>/dev/null; then
                cp "$latest_backup" "$config_file"
                log "CONFIG: Restored from $latest_backup"
                send_alert "⚠️ *Config Auto-Restored*

Config was corrupted but restored from backup. Please verify settings."
                return 0
            fi
        fi
        
        log "CONFIG: CRITICAL - No valid backup found"
        send_alert "🚨 *CRITICAL: Config Corrupted*


Config JSON is invalid and no valid backup exists. Manual intervention required."
        return 1
    fi
}

# Layer 5: Session Backup
backup_sessions() {
    local session_dir="/home/openclaw/.openclaw/agents/main/sessions"
    local backup_root="/home/openclaw/.openclaw/backups/sessions"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$backup_root/$timestamp"
    
    mkdir -p "$backup_dir"
    
    # Copy non-empty session files
    local count=$(find "$session_dir" -type f \( -name "*.jsonl" -o -name "*.trajectory.jsonl" \) -size +0 -exec cp {} "$backup_dir" \; -print | wc -l)
    
    if [ "$count" -gt 0 ]; then
        log "SESSION BACKUP: $count files backed up to $backup_dir"
    else
        log "SESSION BACKUP: No session files to backup"
    fi
}

# Layer 6: Memory Integrity Check
check_memory_integrity() {
    local memory_dir="/home/openclaw/.openclaw/workspace/memory"
    local today=$(date +%Y-%m-%d)
    
    # Check/create today's memory
    if [ ! -f "$memory_dir/${today}.md" ]; then
        echo "# $today — Daily Notes\n\n## Notes\n- (to be filled in)\n" > "$memory_dir/${today}.md"
        log "MEMORY: Created missing ${today}.md"
    fi
}

# Run safeguard checks (called at end of main health check)
run_safeguards() {
    check_config_health
    backup_sessions
    check_memory_integrity
}

# Run main function
main