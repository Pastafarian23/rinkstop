# OpenClaw Self-Hosted Setup Guide

This document outlines how to run OpenClaw on your own hardware — either a Raspberry Pi or an older desktop computer — with reliability measures to ensure 24/7 operation.

---

## Why Self-Host?

| Factor | Heyron (Current) | Self-Hosted (Your Hardware) |
|--------|-------------------|----------------------------|
| Cost | Monthly fee | One-time hardware cost |
| Control | Limited | Full root access |
| Data | On Heyron's servers | On your machine |
| Customization | Restricted | Full |
| Uptime | Dependent on Heyron | Your responsibility |

---

## Option 1: Raspberry Pi 5

### Hardware Needed

| Item | Cost (Philippines) | Notes |
|------|---------------------|-------|
| Raspberry Pi 5 (8GB) | ₱6,000-8,000 | Core component |
| Official power supply | ₱1,500-2,000 | Must be 5A/27W |
| Case + active cooling | ₱1,000-1,500 | Keeps it cool |
| 256GB NVMe SSD | ₱2,000-3,000 | Better than SD card |
| Total | **₱10,500-14,500** | ~$170-230 |

> **Note:** In the Philippines, Pi 5 prices are higher due to import taxes. An i3 desktop may work out cheaper.

### Setup Process

1. **Flash Raspberry Pi OS**
   - Download Raspberry Pi Imager
   - Write Raspberry Pi OS Lite (64-bit) to SSD
   - Boot from SSD (faster and more reliable than microSD)

2. **Initial Setup**
   - Connect to internet via Ethernet
   - Enable SSH (`sudo raspi-config` → Interface Options → SSH)
   - Change default password

3. **Install OpenClaw**
   ```bash
   curl -sLs https://get.openclaw.ai | bash
   ```

4. **Configure OpenClaw**
   - Copy over your `openclaw.json` from current setup
   - Set up your Telegram bot token
   - Restore your workspace from GitHub

5. **Set Up Auto-Start**
   - Enable systemd service (OpenClaw installer handles this)

### Keeping Uptime (Pi)

| Risk | Mitigation |
|------|-------------|
| Power outage | Configure "Restore on AC Power Loss" in BIOS/boot config |
| Overheating | Use case with active cooling, keep in ventilated area |
| SD card corruption | Use NVMe SSD instead of microSD |
| Internet loss | Auto-reconnect on network restore |
| Crash | Systemd auto-restarts on failure |

### Pros & Cons

| Pros | Cons |
|------|------|
| Very low power (5-15W) | Limited local LLM capability |
| Silent operation | Pi 5 expensive in PH (~₱8,000) |
| Small footprint | Slower than desktop |
| Designed for 24/7 | |

---

## Option 2: Desktop Computer (i3 / AMD A8)

This is the recommended option based on your budget and goals.

### Hardware Needed

| Scenario | Cost (Philippines) | What You Get |
|----------|---------------------|--------------|
| **Minimum** | ~₱3,900 | AMD A8-8650, 8GB RAM, 500GB HDD |
| **Better** | ~₱5,400 | + 120GB SSD (replaces HDD) |
| **Best Value** | ~₱6,500 | i3-6100 to i3-8100, 8GB RAM, 120GB SSD |

> **Recommendation:** Get the A8-8650 for ₱3,900 (as you found). Add an SSD later for ~₱1,500 if needed.

### Setup Process

1. **Prepare the Machine**
   - Wipe/format (if needed)
   - Install Ubuntu Server 22.04 LTS (free, stable)
   - Connect to internet via Ethernet

2. **Initial Configuration**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git vim
   ```

3. **Install OpenClaw**
   ```bash
   curl -sLs https://get.openclaw.ai | bash
   ```

4. **Copy Your Configuration**
   - Clone your workspace from GitHub
   - Copy your `openclaw.json`
   - Restore all agent configs

5. **Set Up Service**
   ```bash
   # Enable and start OpenClaw
   sudo systemctl enable openclaw
   sudo systemctl start openclaw
   ```

### Keeping Uptime (Desktop)

#### A. Auto-Start on Power Loss

**BIOS Setting:**
1. Enter BIOS on boot (press Del or F2)
2. Find "Power On" or "Restore AC Power Loss"
3. Set to "Power On" or "Always On"

This ensures the desktop powers on automatically when electricity returns.

#### B. Systemd Auto-Restart

OpenClaw runs as a systemd service by default. If it crashes, systemd automatically restarts it.

```bash
# Check status
sudo systemctl status openclaw

# View logs
sudo journalctl -u openclaw -f
```

#### C. Monitoring Script

Create a health check script:

```bash
#!/bin/bash
# /home/openclaw/scripts/health-check.sh

LOG_FILE="/home/openclaw/logs/health-check.log"

# Check if OpenClaw is running
if ! systemctl is-active --quiet openclaw; then
    echo "$(date) - OpenClaw not running, restarting..." >> $LOG_FILE
    sudo systemctl restart openclaw
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$(date) - Disk space low: $DISK_USAGE%" >> $LOG_FILE
fi

# Check memory
MEMORY_USAGE=$(free | awk 'NR==2 {print $3/$2 * 100}')
if [ $(echo "$MEMORY_USAGE > 90" | bc) -eq 1 ]; then
    echo "$(date) - Memory usage high: $MEMORY_USAGE%" >> $LOG_FILE
fi
```

Add to crontab:
```bash
crontab -e
# Add line:
*/5 * * * * /home/openclaw/scripts/health-check.sh
```

#### D. UPS (Optional but Recommended)

A cheap UPS (₱2,000-4,000) provides:
- Battery backup during outages
- Safe shutdown during extended power loss
- Surge protection

**Recommended:** For ~₱2,500, a basic APC or CyberPower UPS will keep your machine running through brief outages.

#### E. Automatic Updates (Optional)

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Configure to auto-install security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Pros & Cons

| Pros | Cons |
|------|------|
| Much faster than Pi | Uses more power (30-80W) |
| Can run local LLMs | Requires more space |
| Cheaper in PH (i3) | Noisy (if with fan) |
| More storage/RAM options | Requires monitor for initial setup |
| x86 optimized for Ollama | |

---

## Comparison Table

| Factor | Pi 5 | Desktop (i3/A8) |
|--------|------|-----------------|
| **Cost** | ₱10,500+ | ₱3,900-6,000 |
| **Speed** | Moderate | Fast |
| **Local LLM** | 3-8 tps | 10-20+ tps |
| **Power** | 5-15W | 30-80W |
| **Setup ease** | Very easy | Easy |
| **Reliability** | Excellent | Good (with UPS) |
| **Future-proof** | Limited | Better |

---

## Recommendation for Arnel

Based on your situation:

1. **Get the AMD A8-8650** (₱3,900) — it's a great starting point
2. **Add a UPS** (~₱2,500) for power protection
3. **Later upgrade** to i3 if you want local LLMs

This gives you:
- Own hardware for ~₱6,400 (one-time)
- Runs OpenClaw perfectly
- Can add local AI later
- Much cheaper than Heyron ongoing

---

## Migration Steps (When You Have New Machine)

1. **Backup current config** (done to GitHub)
2. **Get new machine** and install Ubuntu
3. **Install OpenClaw** and restore from GitHub
4. **Test functionality** — verify Telegram, all agents work
5. **Switch DNS** — point domains to new IP (if needed)
6. **Decommission Heyron**

I'll guide you through each step when you're ready.

---

## Quick Reference Commands

```bash
# Check OpenClaw status
sudo systemctl status openclaw

# View logs
sudo journalctl -u openclaw -f --since "1 hour ago"

# Restart OpenClaw
sudo systemctl restart openclaw

# Update OpenClaw
sudo openclaw update

# Check disk/memory
df -h && free -h

# Connect via SSH (from another computer)
ssh openclaw@<IP-ADDRESS>
```