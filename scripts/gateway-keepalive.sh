#!/bin/bash
# Gateway keep-alive: Check health and restart if needed

GATEWAY_URL="http://127.0.0.1:18789"

# Check if gateway is responding
if curl -sf --max-time 5 "$GATEWAY_URL" > /dev/null 2>&1; then
    echo "$(date): Gateway is healthy"
    exit 0
else
    echo "$(date): Gateway not responding, restarting..."
    pkill -f "openclaw gateway" 2>/dev/null
    sleep 2
    cd /root/.openclaw
    nohup openclaw gateway > /var/log/openclaw-gateway.log 2>&1 &
    echo "$(date): Gateway restart initiated"
    exit 0
fi