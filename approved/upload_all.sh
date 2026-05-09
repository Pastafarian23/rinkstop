#!/bin/sh
cd /root/.openclaw/workspace/approved

MATON_API_KEY="rg-pGjppBethn9aAD-Cz8p4Nwllrqnllsu9EZPAuJjNHZ2v8XQeyxmHvXSUWyqJlNjSYiTAmHx6rY1et8_vxKoNLBUXpobnPmKc"
BASE_URL="https://gateway.maton.ai/dropbox/2/files/upload"
DROPBOX_CONNECTION_ID="0047d26c-609f-444d-ac51-074b49de5a21"

upload_file() {
  src="$1"
  project="$2"
  category="$3"
  filename=$(basename "$src")
  dropbox_path="/${project}/${category}/${filename}"
  echo "=== Uploading: ${src} -> ${dropbox_path} ==="
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

# Upload files from subdirectories (original pipeline)
upload_file "rinkstop/social-posts/RinkStop-Social-2026-04-22.md" "RinkStop" "Social Media"
upload_file "rinkstop/blog-posts/RinkStop-Blog-2026-04-22-Youth-Hockey-Growth.md" "RinkStop" "Blog Posts"
upload_file "topshelftoker/social-posts/TopShelfToker-Social-2026-04-22.md" "TopShelfToker" "Social Media"
upload_file "topshelftoker/blog-posts/TopShelfToker-Blog-2026-04-22-Cannabis-Trends.md" "TopShelfToker" "Blog Posts"
upload_file "kevlar/social-posts/Kevlar-Social-2026-04-22.md" "KevlarData" "Social Media"
upload_file "kevlar/blog-posts/Kevlar-Blog-2026-04-22-Cook-County-Property-Data.md" "KevlarData" "Blog Posts"
upload_file "sativaexchange/social-posts/SativaExchange-Social-2026-04-22.md" "SativaExchange" "Social Media"
upload_file "sativaexchange/blog-posts/SativaExchange-Blog-2026-04-22-Emerging-Markets.md" "SativaExchange" "Blog Posts"

# Upload flat dated files (current pipeline output)
for project in rinkstop sativaexchange topshelftoker; do
  for f in $(ls ${project}/*2026-05-08* 2>/dev/null); do
    case "$f" in
      *social*) upload_file "$f" "$(echo $project | sed 's/.*/\u&/')" "Social Media" ;;
      *blog*) upload_file "$f" "$(echo $project | sed 's/.*/\u&/')" "Blog Posts" ;;
    esac
  done
done