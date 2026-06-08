#!/bin/bash
# Daily budget check for cron-driven scripts.
# Usage: ./check-cron-budget.sh <budget-name> <max-runs-per-day>
#   e.g., ./check-cron-budget.sh nhl-live 8
#
# Increments counter for today's date; if exceeds max, exits 1.
# Stores state in /tmp/cron-budget-<name>.json

BUDGET_NAME="${1:-default}"
MAX_PER_DAY="${2:-8}"
STATE_FILE="/tmp/cron-budget-${BUDGET_NAME}.json"
TODAY=$(date -u +%Y-%m-%d)

# Initialize or read current count
if [ -f "$STATE_FILE" ]; then
  SAVED_DATE=$(jq -r '.date // "0"' "$STATE_FILE" 2>/dev/null)
  COUNT=$(jq -r '.count // 0' "$STATE_FILE" 2>/dev/null)
else
  SAVED_DATE="0"
  COUNT=0
fi

# Reset if new day
if [ "$SAVED_DATE" != "$TODAY" ]; then
  SAVED_DATE="$TODAY"
  COUNT=0
fi

# Check budget
if [ "$COUNT" -ge "$MAX_PER_DAY" ]; then
  echo "BUDGET_EXHAUSTED: $BUDGET_NAME has used $COUNT/$MAX_PER_DAY runs today ($TODAY)" >&2
  exit 1
fi

# Increment and save
COUNT=$((COUNT + 1))
echo "{\"name\": \"$BUDGET_NAME\", \"date\": \"$TODAY\", \"count\": $COUNT, \"max\": $MAX_PER_DAY}" > "$STATE_FILE"

echo "BUDGET_OK: $BUDGET_NAME $COUNT/$MAX_PER_DAY for $TODAY" >&2
exit 0
