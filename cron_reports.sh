#!/bin/bash
# End-of-day report generator for projects
# Generates a summary and emails it and posts to Discord

REPORT_FILE="/tmp/eod_report_$(date +%Y-%m-%d).txt"

# Gather project status (placeholder - replace with real commands)
cat <<EOF > "$REPORT_FILE"
End-of-Day Report - $(date '+%Y-%m-%d')

SativaExchange:
- Achievements: (add details)
- Pending: (add details)
- Site health: (add details)
- Suggestions for tomorrow: (add details)

RinkStop:
- Achievements: (add details)
- Pending: (add details)
- Site health: (add details)
- Suggestions for tomorrow: (add details)

TopShelfToker:
- Achievements: (add details)
- Pending: (add details)
- Site health: (add details)
- Suggestions for tomorrow: (add details)
EOF

# Send email (requires mailutils or similar configured)
mail -s "End-of-Day Report $(date '+%Y-%m-%d')" arnellarracas@gmail.com < "$REPORT_FILE"

# Post to Discord via webhook (replace WEBHOOK_URL with actual)
WEBHOOK_URL="https://discord.com/api/webhooks/REPLACE_WITH_YOUR_WEBHOOK"
curl -H "Content-Type: text/plain" -X POST -d "$(cat $REPORT_FILE)" "$WEBHOOK_URL"

# Cleanup
rm "$REPORT_FILE"
