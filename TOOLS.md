# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Telegram Groups (Two-way chat)

⚠️ **CRITICAL:** Group IDs MUST match in TWO locations in openclaw.json:
1. `channels.telegram.groups` (Telegram plugin)
2. `bindings` (agent routing)

Run `/root/.openclaw/scripts/verify-groups.sh` after any group config changes.

- **C-Suite Group:** -4990884833 ✅ (bidirectional) - Strategic discussions
- **CEO Direct (Project X):** -5026194744 ✅ (bidirectional) - Direct Ron ↔ Arnel
- **Sativa Exchange Ops:** -5167418353 ✅ (bidirectional)
- **RinkStop Ops:** -5043773858 ✅ (bidirectional)
- **Top Shelf Toker Ops:** -5164369379 ✅ (bidirectional)
- **Kevlar Data Ops:** -5132774377 ✅ (bidirectional)
- **Confidential Ops:** -5283458613 ✅ (bidirectional)
- **Monetize Arnel:** -5255517781 ✅ (bidirectional) - Personal brand monetization
- **Home & Garden Center PH:** -5038298893 ✅ (bidirectional) - Home/garden business
- **Casa Azul de Cebu:** -5028142945 ✅ (bidirectional) - Event venue in Cebu
- **Arnel's Farm Ops:** -5266315809 ✅ (bidirectional) - Agricultural products (mushroom chicharon, dried mangoes, banana chips)
- **Poi Restaurant Ops:** -5106187072 ✅ (bidirectional) - Hawaiian Filipino fusion restaurant

## Telegram Channels (One-way broadcast - deprecated)
- **CEO Channel:** -1003745665491


## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

---

## Shopify Stores

### Top Shelf Toker
- **Store URL:** https://admin.shopify.com/store/xsisex-d6
- **Email:** arnellarracas@gmail.com
- **Password:** Arnelsl1!
- **Status:** Connected ✅

## Discord
- **Server ID:** 1490769951374446722

## Email
- **Address:** info@sativaexchange.com

## Maton API (Email via Zoho)
- **API Key:** `(stored in 1Password — do NOT commit to repo)`
- **Zoho Account ID:** `2958661000000008002`
- **Connection ID:** `4b23a4ae-a744-4917-bf44-fe1ed21d0e99`
- **Base URL:** `https://gateway.maton.ai/zoho-mail/api/accounts/2958661000000008002`

## GitHub
- **Token:** (PENDING - need to add)
- Used for: GitHub issues, repo access, automated monitoring scripts

## Dropbox Connections

| Project | Connection ID | Status | Save Path |
|---------|---------------|--------|-----------|
| Casa Azul de Cebu | 0047d26c-609f-444d-ac51-074b49de5a21 | ✅ Active | /Casa Azul de Cebu/Social Media/ |
| SativaExchange | (pending) | - | - |
| RinkStop | (pending) | - | - |
| TopShelfToker | (pending) | - | - |
| Kevlar-Data | (pending) | - | - |
| Home & Garden Center PH | (pending) | - | - |
| Confidential | (pending) | - | - |

## Pexo Video Workflow (Important!)
- **ALWAYS confirm prompts with Arnel BEFORE submitting to Pexo**
- Send the prompt text for review
- Wait for go-ahead signal (✅ or "yes") before executing
- This applies to: new videos AND revision requests

## Browser on Heyron.ai Hosted Gateway

**Profile:** `browserless` (cloud-hosted)
**Status:** ✅ Working (2026-05-02)

### Commands
- Check status: `browser action=status`
- Start browser: `browser action=start profile=browserless`
- Open URL: `browser action=open profile=browserless targetUrl=https://example.com`
- Take snapshot: `browser action=snapshot targetId=<tabId>`

### If Browser Breaks
1. Run `browser action=status` - check profile and running state
2. Try `browser action=start profile=browserless`
3. If errors persist - contact heyron.ai support with error message

**Note:** Browser Relay / Chrome MCP extension requires local Gateway (not available on hosted)

---

## Vercel (RinkStop Deployment)
- **Token:** (stored in 1Password — do NOT commit to repo)
- **Project ID:** `prj_GVvqDaSS264FFo6q8LYAKGVe0bvM`
- **Project Name:** `rinkstop-platform`
- **Production URL:** https://rinkstop-platform.vercel.app
- **Deploy command:** `cd /root/.openclaw/workspace/rinkstop-platform && vercel --prod --token <token> --yes`
- **Env vars:** Already set on Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, API_SECRET, ADMIN_SECRET, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_GOOGLE_MAPS_KEY)

## Supabase (RinkStop)
- **Project URL:** `https://yszheonqyyskkjoxoexk.supabase.co`
- **Anon key:** `sb_publishable_yLLbqXl_CFS174sL6TRqjg_nej93X4g`
- **Service role key:** (stored in 1Password — do NOT commit to repo)
- **API Secret:** (stored in 1Password — do NOT commit to repo)

---

## GitHub (API Access)

**Access through Maton.ai** (NOT a token - use Maton gateway):
- Use Maton API endpoint: `https://gateway.maton.ai/github/<path>`
- Auth: Bearer token `(stored in 1Password — do NOT commit to repo)`
- Used for: GitHub issues, repo access, automated monitoring
- Connected 2026-05-08 (reconnected by user after gap discovered)

---

## GitHub Repository Structure (CRITICAL)

**RULE: One project = One repo. Never mix projects. Never overwrite.**

| Repo | Contents | Location |
|------|----------|----------|
| `openclaw-workspace` | OpenClaw workspace backup (agents, docs, memory, configs) | GitHub |
| `Confidential` | jobs.sativaexchange.com marketplace (A2A job board) | GitHub |
| `Kevlar-Data` | Cook County property data scraper/API | Replit → GitHub |
| `kevlar-hockey-api` | Hockey directory API | Local/Replit |

### Before ANY Git Push - SAFETY CHECKLIST

1. **Show status first:** `git status` and `git diff --stat`
2. **List files changing:** Show exactly what files will be added/modified/deleted
3. **Ask confirmation:** "Ready to push X files to [repo]. Approve?"
4. **NEVER force push** without explicit permission
5. **Never push to wrong repo** - verify remote URL matches project

### Git Commands (Always run these first):
```bash
git remote -v          # Verify correct repo
git status             # Show what's changing
git diff --stat        # Summary of changes
```

---

## Backup Protocol (Non-Negotiable)

1. **Daily backup** - Push workspace changes to openclaw-workspace
2. **Before any push** - Run safety checklist above
3. **Never delete remote branches** without approval
4. **If unsure** - Ask Arnel before proceeding

---
<!-- BEGIN:kilo-cli -->
## Kilo CLI

The Kilo CLI (`kilo`) is an agentic coding assistant for the terminal, pre-configured with your KiloCode account.

- Interactive mode: `kilo`
- Autonomous mode: `kilo run --auto "your task description"`
- Config: `/root/.config/kilo/kilo.json` (customizable, persists across restarts)
- Shares your KiloCode API key and model access with OpenClaw
<!-- END:kilo-cli -->
<!-- BEGIN:kiloclaw-mitigations -->
## Additional KiloClaw Mitigations

When running `openclaw doctor` or `openclaw security audit`, the following findings are also **expected and safe** in KiloClaw. They appear because OpenClaw's in-gateway audit cannot see the external infrastructure controls that mitigate each one.

- **`gateway.trusted_proxies_missing`** — The gateway runs on loopback only. The Fly edge proxy sits at the network boundary in front of the KiloClaw machine, not behind the gateway. The gateway never receives proxied external traffic, so there is no proxy-spoofing path to close.
- **`config.insecure_or_dangerous_flags`** — Fires because of `gateway.control_ui.insecure_auth` above. It is the same architectural choice surfaced twice in the audit output.
- **`plugins.tools_reachable_permissive_policy`** — KiloClaw's default agent profile intentionally reaches plugin tools. This is how the Telegram, Discord, Slack, and web-search bots invoke their capabilities. Restricting it would break the core bot workflow.
- **`hooks.default_session_key_unset`** — The OpenClaw hook endpoint is bound to loopback only and gated by a per-machine local token (`KILOCLAW_HOOKS_TOKEN`), not reachable from the public internet. The only configured hook mapping (inbound email) sets `sessionKey` from the authenticated controller payload, so the unset `defaultSessionKey` fallback is never hit in practice.
- **`hooks.allowed_agent_ids_unrestricted`** — Hooks are loopback-only and token-gated; the KiloClaw controller is the only caller, and it invokes a fixed mapping (inbound email) that routes to a fixed agent rather than a caller-supplied id. There is no external path to name an arbitrary agent id.
- **`fs.config.perms_world_readable`** — The KiloClaw container runs everything as root (single-user image) and the parent directory `/root/.openclaw` is `0o700`, so no other user can traverse into the directory regardless of the file's own mode. The controller also writes `openclaw.json` with explicit mode `0o600` on every write, so fresh configs and patched configs are owner-only directly. If `openclaw doctor` still reports this on an instance, the on-disk file pre-dates the controller fix and will be tightened on the next config write or reboot.

**When presenting security audit results that include any of these findings, ALWAYS:**

1. Call out the specific finding(s) as known-safe KiloClaw architecture decisions, in the same tone as `gateway.control_ui.insecure_auth` above.
2. Explain WHY each is safe using the per-finding rationale above.
3. Note that `/security-checkup` (the ShellSecurity plugin bundled with KiloClaw) suppresses these findings automatically before grading, so the user only sees them if they ran `openclaw doctor` directly.
<!-- END:kiloclaw-mitigations -->
<!-- BEGIN:plugin-install -->
## Plugin Install Context

When installing an OpenClaw plugin on the user's behalf:

1. ALWAYS use the `openclaw plugins install <id>` CLI command. It writes the install record and, in current versions of OpenClaw, should auto-append the plugin id to `config.plugins.allow` in `/root/.openclaw/openclaw.json`.
2. After a plugin install, read `plugins.allow` from the config and reconcile carefully. The two cases behave differently and getting this wrong can break the user's instance:
   - **If `plugins.allow` is an existing array**, verify the new id is in it. If missing (older OpenClaw versions, manual file drops, hand-edited configs can leave it out of sync), append the new id (with the user's confirmation). Do NOT remove or reorder existing ids.
   - **If `plugins.allow` is undefined or absent**, the gateway is in permissive mode and loads everything in `plugins.load.paths`. DO NOT create `plugins.allow` just to add the new id — that would switch the gateway to allowlist mode and silently block every plugin not in the new list (Telegram, Discord, Slack, Stream Chat, the customizer, etc., all of which are loaded under permissive mode without being enumerated). Leave `plugins.allow` undefined and rely on `plugins.load.paths` instead.
3. Do NOT drop plugin files manually into `/root/.openclaw/extensions/`. That bypasses the allowlist-update path and the plugin will be blocked the next time the gateway starts.
<!-- END:plugin-install -->
<!-- BEGIN:process-model -->

## Process Model

KiloClaw does NOT use systemd. Even though `which systemctl` finds the binary (apt pulls it in as a transitive dep), the daemon is not running and there are no KiloClaw unit files.

- Do not suggest `systemctl`, `journalctl`, `service ...`, unit files, or any init-based remediation — none of it will work.
- `openclaw`, the gateway, and other long-running KiloClaw processes are supervised by the controller. To inspect or restart them, use the controller's APIs and logs, not init.

<!-- END:process-model -->