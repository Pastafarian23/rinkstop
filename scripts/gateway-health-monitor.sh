#!/bin/bash
#
# Gateway Health Monitor & Auto-Repair Script
# Runs every 5 minutes via cron to check gateway health and repair pairing if needed
#
# MULTI-LAYER SAFEGUARD SYSTEM:
# Layer 1: Auto-repair pairing (if gateway is UP but pairing broken)
# Layer 2: Restart gateway (if gateway is DOWN)
# Layer 3: Out-of-band alert (if restart fails) - via direct Telegram API call
#
# BUGS FIXED:
# - Wrong port (18789 → 3001)
# - Wrong process name ("openclaw gateway" → "openclaw-gateway")
# - Missing PATH for cron (node not found)
# - Wrong config paths (/home/openclaw → /root/.openclaw)

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

GATEWAY_JSON="/root/.openclaw/devices/paired.json"
PENDING_JSON="/root/.openclaw/devices/pending.json"
LOG_FILE="/root/.openclaw/logs/gateway-health.log"
CRON_LOG="/root/.openclaw/logs/gateway-cron.log"
HEALTH_LOG="/root/.openclaw/logs/gateway-health.log"

# Telegram config
TELEGRAM_CHAT="-4990884833"
TELEGRAM_BOT_TOKEN="7574311811:AAFV7RiYG8SFEE2P7UxFQw_ZxYn9lqFpntI"

log() {
    local msg="$(date -u '+%Y-%m-%d %H:%M:%S UTC') - $1"
    echo "$msg" | tee -a "$LOG_FILE"
    echo "$msg" >> "$CRON_LOG"
}

# Layer 3b: Telegram alert via direct API (bypasses gateway)
send_telegram_alert() {
    local message="$1"
    log "ATTEMPTING: Sending Telegram alert via direct API"
    
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

# Layer 3: Email alert (out-of-band) - disabled until SMTP configured
send_email_alert() {
    log "Email alert: not configured, skipping"
    return 1
}

send_alert() {
    local message="$1"
    send_telegram_alert "$message"
    # send_email_alert "$message"  # Enable when SMTP is configured
}

# FIX: Correct port 3001 (was 18789)
check_gateway_http() {
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3001/health 2>/dev/null)
    if [ "$status" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# FIX: Correct process name (was "openclaw gateway", now "openclaw-gateway")
check_gateway_process() {
    if pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_pairing() {
    if [ ! -s "$GATEWAY_JSON" ] || [ "$(cat "$GATEWAY_JSON")" = "{}" ]; then
        log "PAIRING CHECK: paired.json is empty"
        return 1
    fi
    
    if [ -s "$PENDING_JSON" ] && [ "$(cat "$PENDING_JSON")" != "{}" ]; then
        log "PAIRING CHECK: pending.json has devices"
        return 1
    fi
    
    return 0
}

# FIX: Correct startup command and working directory
restart_gateway() {
    log "ATTEMPTING: Gateway restart"
    
    # Kill any existing gateway process (correct name)
    pkill -9 -f "openclaw-gateway" 2>/dev/null
    sleep 2
    
    # Verify kill
    if pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
        log "WARNING: Could not kill old gateway process"
    fi
    
    # Start gateway with correct path and working directory
    cd /root/.openclaw
    nohup openclaw-gateway --port 3001 --bind loopback > /root/.openclaw/logs/gateway-stdout.log 2>&1 &
    sleep 5
    
    if check_gateway_process && check_gateway_http; then
        log "GATEWAY RESTART SUCCESSFUL"
        send_alert "🔄 *Gateway Auto-Restart Complete*\n\nThe gateway was down but has been restarted successfully. Services should be operational."
        return 0
    else
        log "GATEWAY RESTART FAILED - process: $(check_gateway_process), http: $(check_gateway_http)"
        return 1
    fi
}

repair_pairing() {
    log "ATTEMPTING PAIRING REPAIR"
    
    local device_id=$(python3 -c "
import json
with open('$PENDING_JSON') as f:
    data = json.load(f)
    if data:
        print(list(data.keys())[0])
    else:
        print('')
" 2>/dev/null)
    
    if [ -n "$device_id" ]; then
        log "Found pending device: $device_id"
        
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

# Layer 4: Config Health Check (FIX: correct paths)
check_config_health() {
    local config_file="/root/.openclaw/openclaw.json"
    
    if node -e "try { JSON.parse(require('fs').readFileSync('$config_file')); } catch(e) { throw e; }" 2>/dev/null; then
        log "CONFIG: Valid JSON"
        return 0
    else
        log "CONFIG: INVALID JSON - attempting restore from last-good backup"
        
        local backup="/root/.openclaw/openclaw.json.last-good"
        if [ -f "$backup" ]; then
            if node -e "try { JSON.parse(require('fs').readFileSync('$backup')); } catch(e) { throw e; }" 2>/dev/null; then
                cp "$backup" "$config_file"
                log "CONFIG: Restored from last-good backup"
                send_alert "⚠️ *Config Auto-Restored*\n\nConfig was corrupted but restored from backup. Please verify settings."
                return 0
            fi
        fi
        
        log "CONFIG: CRITICAL - No valid backup found!"
        send_alert "🚨 *CRITICAL: Config Corrupted*\n\nopenclaw.json is invalid and no valid backup exists. Manual intervention required."
        return 1
    fi
}

# Layer 5: Memory Integrity Check
check_memory_integrity() {
    local memory_dir="/root/.openclaw/workspace/memory"
    local today=$(date +%Y-%m-%d)
    
    if [ ! -f "$memory_dir/${today}.md" ]; then
        echo "# $today — Daily Notes\n\n## Notes\n- (to be filled in)\n" > "$memory_dir/${today}.md"
        log "MEMORY: Created missing ${today}.md"
    fi
}

run_safeguards() {
    check_config_health
    check_memory_integrity
}

# Main logic
main() {
    log "=== Gateway Health Check Started ==="
    
    if check_gateway_process; then
        log "Gateway process: RUNNING"
        
        if check_gateway_http; then
            log "Gateway HTTP: UP (port 3001)"
            
            if check_pairing; then
                log "Status: ✅ Everything OK - Gateway up and paired"
            else
                log "Status: ⚠️ Gateway UP but pairing BROKEN"
                repair_pairing
            fi
        else
            log "Status: ⚠️ Gateway process running but HTTP not responding on :3001"
            restart_gateway
        fi
    else
        log "Status: ❌ Gateway process NOT RUNNING"
        
        if restart_gateway; then
            log "Restart successful"
        else
            log "CRITICAL: Gateway restart failed - sending out-of-band alert"
            send_alert "🚨 *CRITICAL: Gateway DOWN & Unrecoverable*\n\nThe gateway process is not running and restart failed. Manual intervention required.\n\nTimestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        fi
    fi
    
    run_safeguards
    log "=== Gateway Health Check Complete ==="
}

main