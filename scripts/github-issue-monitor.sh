#!/bin/bash
#
# GitHub Issue Monitor for OpenClaw Gateway Issues
# Runs once per day to check for progress on issue #69066 and related issues
#
# Checks:
# - #69066: RFC for internal service identity (main fix)
# - #69397: Internal tool misidentified as remote (workaround)
# - #69214: Scope-upgrade repair loop
#
# Sends Telegram alert if there's new activity
#

GITHUB_API="https://api.github.com"
REPO="openclaw/openclaw"
ISSUES=("69066" "69397" "69214")
LOG_FILE="/root/.openclaw/logs/github-issue-monitor.log"
STATE_FILE="/root/.openclaw/logs/github-issue-state.json"

# Telegram config
TELEGRAM_CHAT="-4990884833"
TELEGRAM_BOT_TOKEN="7574311811:AAFV7RiYG8SFEE2P7UxFQw_ZxYn9lqFpntI"

log() {
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local message="$1"
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": \"$TELEGRAM_CHAT\", \"text\": \"$message\", \"parse_mode\": \"Markdown\"}" \
        >> "$LOG_FILE" 2>&1
}

# Initialize state file if it doesn't exist
init_state() {
    if [ ! -f "$STATE_FILE" ]; then
        echo '{}' > "$STATE_FILE"
    fi
}

# Get issue data from GitHub API (read-only)
get_issue() {
    local issue_num="$1"
    curl -s -H "Accept: application/vnd.github.v3+json" \
        "$GITHUB_API/repos/$REPO/issues/$issue_num" 2>/dev/null
}

# Check for changes and send alert if needed
check_issues() {
    local changes=0
    local alert_message="📢 *GitHub Issue Update*\n\n"
    
    for issue_num in "${ISSUES[@]}"; do
        log "Checking issue #$issue_num..."
        
        local issue_data
        issue_data=$(get_issue "$issue_num")
        
        if [ $? -ne 0 ] || [ -z "$issue_data" ]; then
            log "Failed to fetch issue #$issue_num"
            continue
        fi
        
        # Extract relevant fields
        local state
        local title
        local comments
        local updated_at
        
        state=$(echo "$issue_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('state','unknown'))" 2>/dev/null)
        title=$(echo "$issue_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('title','')[:60])" 2>/dev/null)
        comments=$(echo "$issue_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('comments',0))" 2>/dev/null)
        updated_at=$(echo "$issue_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('updated_at',''))" 2>/dev/null)
        
        # Get previous state
        local prev_state
        local prev_comments
        prev_state=$(python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d.get('$issue_num',{}).get('state',''))" 2>/dev/null)
        prev_comments=$(python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d.get('$issue_num',{}).get('comments',0))" 2>/dev/null)
        
        # Check for changes
        local issue_changes=0
        
        # Check if state changed (open -> closed, etc.)
        if [ "$state" != "$prev_state" ] && [ -n "$prev_state" ]; then
            log "Issue #$issue_num state changed: $prev_state -> $state"
            alert_message+="• [#$issue_num](https://github.com/$REPO/issues/$issue_num) *State changed:* $prev_state → $state\n"
            issue_changes=1
        fi
        
        # Check for new comments
        if [ "$comments" -gt "$prev_comments" ] 2>/dev/null; then
            local new_comments=$((comments - prev_comments))
            log "Issue #$issue_num has $new_comments new comment(s)"
            alert_message+="• [#$issue_num](https://github.com/$REPO/issues/$issue_num) *$new_comments new comment(s)*\n"
            issue_changes=1
        fi
        
        # Update state file
        python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    data = json.load(f)

data['$issue_num'] = {
    'state': '$state',
    'comments': $comments,
    'updated_at': '$updated_at'
}

with open('$STATE_FILE', 'w') as f:
    json.dump(data, f, indent=2)
" 2>>"$LOG_FILE"
        
        if [ $issue_changes -eq 1 ]; then
            changes=1
        fi
    done
    
    # Send alert if there were changes
    if [ $changes -eq 1 ]; then
        log "Sending alert for GitHub issue updates"
        send_alert "$alert_message"
    else
        log "No changes detected in GitHub issues"
    fi
}

# Main execution
main() {
    log "=== GitHub Issue Monitor Started ==="
    
    init_state
    check_issues
    
    log "=== GitHub Issue Monitor Complete ==="
}

main