# Lessons Learned

## 2026-04-16

### Write Tool JSON Content Bug
**Problem:** Writing JSON files via the write tool fails with `content: must be string` when passing a JSON object.

**Root Cause:** The write tool requires raw string content, not parsed JSON objects.

**Fix:** Use exec with heredoc for JSON files:
```bash
cat > /path/to/file.json << 'EOF'
{ "key": "value" }
EOF
```

**Prevention:** Always use exec for JSON files, or ensure content is properly stringified as a raw string.