#!/bin/bash
# Gateway keep-alive: Check health and restart if needed
# FIX: Correct port 3001 (was 18789), correct process name, correct paths

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

GATEWAY_URL="http://127.0.0.1:3001/health"
LOG_FILE="/root/.openclaw/logs/gateway-keepalive.log"

log() {
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - $1" >> "$LOG_FILE"
}

# Check if gateway is responding (correct health endpoint)
if curl -sf --max-time 5 "$GATEWAY_URL" > /dev/null 2>&1; then
    log "Gateway is healthy"
    exit 0
else
    log "Gateway not responding, restarting..."
    
    # FIX: Correct process name (was "openclaw gateway", now "openclaw-gateway")
    pkill -9 -f "openclaw-gateway" 2>/dev/null
    sleep 2
    
    # FIX: Correct working directory and startup command
    cd /root/.openclaw
    nohup openclaw-gateway --port 3001 --bind loopback >> "$LOG_FILE" 2>&1 &
    
    sleep 5
    
    if curl -sf --max-time 5 "$GATEWAY_URL" > /dev/null 2>&1; then
        log "Gateway restart successful"
        exit 0
    else
        log "Gateway restart failed!"
        exit 1
    fi
fi