# Telegram Channel Configuration

## Ops Channels (Permanent)

| Channel Name | Group ID | Purpose |
|--------------|----------|---------|
| CEO | `-1003745665491` | CEO agent updates |
| SativaExchange ops | `-1003873622522` | SativaExchange team updates |
| TopShelfToker ops | `-1003510871879` | TopShelfToker team updates |
| RinkStop ops | `-1003967596187` | RinkStop team updates |

## Config Location

`/root/.openclaw/openclaw.json` → `channels.telegram.groups`

**⚠️ CRITICAL: These IDs must not change**

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "7574311811:AAFV7RiYG8SFEE2P7UxFQw_ZxYn9lqFpntI",
      "dmPolicy": "pairing",
      "groupPolicy": "open",
      "groups": {
        "-1003745665491": { "requireMention": false },
        "-1003873622522": { "requireMention": false },
        "-1003510871879": { "requireMention": false },
        "-1003967596187": { "requireMention": false }
      }
    }
  }
}
```

## Protection

These channels are now hardcoded in the config. Running `openclaw doctor` or `openclaw wizard` will NOT overwrite these values.

## Verification

Test with:
```
message -c telegram -t -1003745665491 -m "test"
```