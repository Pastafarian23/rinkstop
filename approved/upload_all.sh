#!/bin/sh
# Upload content to Dropbox via Maton API
# Usage: ./upload_all.sh [--dry-run]

cd /root/.openclaw/workspace/approved

MATON_API_KEY="v2.6IhUnYkmPVroYk8_B2KzsiDQDs2UMTry5AVoBdgLdltHG3jcKCH4WtLlXlVComlfoNQbUsHuJbMkvNY003a7QxX6eI4Sk5xbwq4GyuPV28-V9xnc_GqH3LzX"
BASE_URL="https://gateway.maton.ai/dropbox/2/files/upload"
DROPBOX_CONNECTION_ID="0047d26c-609f-444d-ac51-074b49de5a21"

DRY_RUN=false
[ "$1" = "--dry-run" ] && DRY_RUN=true

upload_file() {
  src="$1"
  project="$2"
  category="$3"
  filename=$(basename "$src")
  dropbox_path="/${project}/${category}/${filename}"
  echo "=== Uploading: ${src} -> ${dropbox_path} ==="
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] Skipped"
    return 0
  fi
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}" \
    -H "Authorization: Bearer ${MATON_API_KEY}" \
    -H "Maton-Connection: ${DROPBOX_CONNECTION_ID}" \
    -H "Dropbox-API-Arg: {\"path\": \"${dropbox_path}\", \"mode\": \"add\", \"autorename\": true, \"mute\": false, \"strict_conflict\": false}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @"${src}" 2>&1)
  echo "  HTTP Status: ${HTTP_CODE}"
  if [ "${HTTP_CODE}" = "200" ]; then
    echo "  SUCCESS"
  else
    echo "  FAILED (HTTP ${HTTP_CODE})"
  fi
  echo ""
  sleep 0.5
}

capitalize() {
  echo "$1" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}'
}

# Upload ALL blog posts and social media posts
for project in kevlar rinkstop sativaexchange topshelftoker; do
  project_cap=$(capitalize "$project")

  # Blog Posts
  blog_dir="${project}/Blog Posts"
  if [ -d "$blog_dir" ]; then
    for f in "${blog_dir}"/*"${project}"*.md; do
      [ -f "$f" ] && upload_file "$f" "$project_cap" "Blog Posts"
    done
  fi

  # Social Media
  social_dir="${project}/Social Media"
  if [ -d "$social_dir" ]; then
    for f in "${social_dir}"/*"${project}"*.md; do
      [ -f "$f" ] && upload_file "$f" "$project_cap" "Social Media"
    done
  fi
done

echo "=== Upload complete ==="