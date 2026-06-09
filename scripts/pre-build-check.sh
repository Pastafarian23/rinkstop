#!/usr/bin/env bash
# pre-build-check.sh
#
# Run this BEFORE starting any non-trivial build (Group-sized feature, multi-file
# refactor, schema migration, anything that creates new files).
#
# Catches the "parallel session clobbered my work" risk that almost bit us on
# Group 3b (2026-06-09). A parallel session of Jarvis shipped commit 08d7bc2
# while I was working on the same feature. I only noticed because I ran
# `git status` before committing. This script automates that check.
#
# Usage:  bash scripts/pre-build-check.sh
# Exit 0 = clean, proceed
# Exit 1 = something to look at before proceeding

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo ""
echo "================================================"
echo " Pre-build check — parallel session safety"
echo "================================================"
echo ""

# 1. Working tree clean (other than auto-generated noise)?
echo "1. Working tree state:"
UNEXPECTED=$(git status --short -- ':!tsconfig.tsbuildinfo' ':!.next' 2>/dev/null)
if [ -n "$UNEXPECTED" ]; then
  echo -e "${YELLOW}⚠ Uncommitted local changes (other than tsconfig.tsbuildinfo):${NC}"
  echo "$UNEXPECTED"
  echo ""
  echo "  If you started work, paused, and someone else committed while you"
  echo "  were away, your uncommitted files may now conflict. Review them."
else
  echo -e "${GREEN}✓ Working tree clean (only auto-generated noise)${NC}"
fi
echo ""

# 2. Recent commits — anything in the last 4 hours you didn't expect?
echo "2. Recent commits (last 24h):"
SINCE=$(date -d '24 hours ago' --iso-8601=seconds 2>/dev/null || date -v-24H +%Y-%m-%dT%H:%M:%S)
RECENT=$(git log --since="$SINCE" --oneline 2>/dev/null)
if [ -z "$RECENT" ]; then
  echo "  (no commits in the last 24h)"
else
  echo "$RECENT" | sed 's/^/  /'
fi
echo ""

# 3. Are we behind origin/main?
echo "3. Sync with origin:"
git fetch origin main --quiet 2>/dev/null || echo "  (fetch failed, skipping)"
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "?")
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "?")
echo "  Local is $AHEAD commit(s) ahead, $BEHIND commit(s) behind origin/main"
if [ "$BEHIND" != "0" ] && [ "$BEHIND" != "?" ]; then
  echo -e "${YELLOW}⚠ Local branch is behind origin/main — pull before starting a new build${NC}"
fi
echo ""

# 4. Look for "session handoff" or "auto" markers in recent commits
echo "4. Recent commits authored by other Jarvis sessions / auto-agents:"
SUSPECT=$(git log --since="$SINCE" --pretty=format:'%h %an <%ae> %s' 2>/dev/null \
  | grep -Ei "jarvis|kiloclaw|openclaw|claude|gpt|auto" || true)
if [ -n "$SUSPECT" ]; then
  echo -e "${YELLOW}⚠ Found commits by other agents in the last 24h:${NC}"
  echo "$SUSPECT" | sed 's/^/  /'
  echo ""
  echo "  If these touch files you're about to edit, STOP and review them"
  echo "  before writing. Use 'git show <hash> -- <file>' to inspect."
else
  echo -e "${GREEN}✓ No other-agent commits in the last 24h${NC}"
fi
echo ""

# 5. If you're about to create a new file, check that it doesn't already exist on origin
echo "5. Files about to be created: (run after you 'git add' new files)"
echo "  If 'git status' shows new files that ALSO exist on origin/main,"
echo "  STOP. Someone already shipped the feature. Run:"
echo "    git log --oneline -- <new-file>"
echo "  to see when it was added and whether you should integrate vs. clobber."
echo ""

echo "================================================"
echo " Pre-build check complete"
echo "================================================"
echo ""
echo "Recommended next step: review the recent commits above, then if all"
echo "looks good, proceed with your build. If you find a parallel-session"
echo "commit that overlaps with your plan, read its commit message and diff"
echo "before writing any code."
