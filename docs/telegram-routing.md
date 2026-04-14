# Telegram Channel Routing

## Channel Names (Use these in messages - NOT IDs!)

| Friendly Name | Channel ID | Purpose |
|---------------|------------|---------|
| CEO Channel | `-1003745665491` | Strategic updates |
| Social Media | `-1003907321273` | Social team |
| Blog Posts | `-1003779195973` | Content team |
| Brainstorm | `-1003847388689` | Brainstorming |
| RinkStop Ops | `-1003967596187` | RinkStop team |
| SativaExchange Ops | `-1003873622522` | SativaExchange team |
| TopShelfToker Ops | `-1003510871879` | TopShelfToker team |

**⚠️ IMPORTANT:** When referencing channels in messages to users, use the FRIENDLY NAME only — never show the numeric ID.

## Project Channels

| Project | Channel ID | Purpose |
|---------|------------|---------|
| TopShelfToker | `-1003510871879` | Ops updates |
| RinkStop | `-1003967596187` | Ops updates |
| SativaExchange | `-1003873622522` | Ops updates |
| CEO | `-1003745665491` | Strategic updates |
| Social Media Agents | `-1003907321273` | Social team |
| Brainstorm Agents | `-1003847388689` | Brainstorming |
| Blog Posts | `-1003779195973` | Content team |

## Routing Rules (Bindings)

All bindings are configured in openclaw.json:

```json
{
  "bindings": [
    {"match": {"channel": "telegram", "peer": {"kind": "group", "id": "-1003745665491"}}, "agentId": "main"},
    {"match": {"channel": "telegram", "peer": {"kind": "group", "id": "-1003873622522"}}, "agentId": "main"},
    {"match": {"channel": "telegram", "peer": {"kind": "group", "id": "-1003967596187"}}, "agentId": "rinkstop-head"},
    {"match": {"channel": "telegram", "peer": {"kind": "group", "id": "-1003510871879"}}, "agentId": "topshelf-head"},
    {"match": {"channel": "telegram", "peer": {"kind": "group", "id": "-1003907321273"}}, "agentId": "topshelf-social"},
    {"match": {"channel": "telegram", "peer": {"kind": "group", "id": "-1003847388689"}}, "agentId": "topshelf-brainstormer"},
    {"match": {"channel": "telegram", "peer": {"kind": "group", "id": "-1003779195973"}}, "agentId": "topshelf-content"}
  ]
}
```

## Telegram Groups Config

All groups configured with `requireMention: false`:

```json
{
  "channels": {
    "telegram": {
      "groups": {
        "-1003745665491": {"requireMention": false},
        "-1003873622522": {"requireMention": false},
        "-1003510871879": {"requireMention": false},
        "-1003967596187": {"requireMention": false},
        "-1003779195973": {"requireMention": false},
        "-1003907321273": {"requireMention": false},
        "-1003847388689": {"requireMention": false}
      }
    }
  }
}
```

## Bot Setup

- **Bot:** @btcpastafarianbot
- **Privacy Mode:** DISABLED (required for group message handling without @mention)

## Agent Workspaces

| Channel | Agent ID | Workspace |
|---------|----------|-----------|
| CEO | main | workspace |
| SativaExchange | main | workspace |
| RinkStop | rinkstop-head | workspace-rinkstop-head |
| TopShelfToker | topshelf-head | workspace-topshelf-head |
| Social Media | topshelf-social | workspace-topshelf-social |
| Brainstorm | topshelf-brainstormer | workspace-topshelf-brainstormer |
| Blog Posts | topshelf-content | workspace-topshelf-content |

## Recovery Steps

If Telegram needs to be reconfigured:

1. Restore openclaw.json (backup from this doc or git)
2. Ensure BotFather privacy is DISABLED for @btcpastafarianbot
3. Restart gateway: `pkill openclaw-gateway && openclaw gateway &`
4. Verify bindings: `openclaw agents list --bindings`

## Current Stack

- **Store Platform:** WooCommerce (WordPress)
- **Dropshipping:** Crowdship.io (REST API)
- **Integration:** WooCommerce ↔ Crowdship.io API