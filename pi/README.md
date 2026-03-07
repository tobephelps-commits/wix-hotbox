# HotBox Pi Appliance

Production deployment of HotBox as a Raspberry Pi 5 kiosk appliance with a 15.6" touchscreen.

## Hardware Requirements

| Component | Specification |
|-----------|--------------|
| Board | Raspberry Pi 5 |
| RAM | 4 GB minimum (8 GB recommended) |
| Storage | 32 GB+ microSD card (Class 10 / A2) |
| Display | 15.6" touchscreen (USB touch + HDMI) |
| Power | Official Pi 5 USB-C power supply (27W) |
| Network | Ethernet or WiFi |

## Architecture

```
Power On
  -> systemd boot
    -> hotbox-server.service (Node.js on :3456)
      -> hotbox-kiosk.service (waits 3s, needs framebuffer)
        -> startx / xinitrc
          -> kiosk.sh
            -> Chromium --kiosk http://localhost:3456
```

Services restart on failure. Hardware watchdog resets the Pi if the system hangs for 15 seconds.

## Quick Setup

### 1. Flash the SD Card

1. Download and install [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Select **Raspberry Pi OS Lite (64-bit, Bookworm)** as the operating system
   - No desktop environment needed; we install only what the kiosk requires
   - ARM64 required for Node.js 20+ compatibility
3. Select your microSD card as the target
4. Click the gear icon (Advanced options) before writing:
   - **Set hostname:** `hotbox`
   - **Enable SSH:** Use password authentication (for initial access)
   - **Set username and password:** `hotbox` / your-chosen-password
   - **Configure wireless LAN:** Enter your WiFi SSID and password (if using WiFi)
   - **Set locale settings:** Timezone and keyboard layout
5. Write the image to the SD card

### 2. First Boot

1. Insert the SD card into the Pi and power on
2. Wait 1-2 minutes for first boot to complete
3. Find the Pi on your network:
   ```bash
   ping hotbox.local
   # or check your router's DHCP client list
   ```
4. SSH into the Pi:
   ```bash
   ssh hotbox@hotbox.local
   ```

### 3. Clone and Run Setup

```bash
# Clone the repository
sudo apt-get install -y git
git clone https://github.com/your-org/wix-hotbox.git /home/hotbox/app
cd /home/hotbox/app

# Run the full setup (does everything)
sudo bash pi/setup.sh
```

The master setup script runs all phases in order:

| Step | Script | What it does |
|------|--------|-------------|
| 1/5 | `pi/bootstrap.sh` | System updates, Node.js 20, user setup, hostname, locale, SSH hardening |
| 2/5 | `pi/kiosk/install-kiosk.sh` | Minimal X11, Chromium, screen utilities, xinitrc symlink |
| 3/5 | `pi/kiosk/touch-calibrate.sh` | Touchscreen detection, input-to-display mapping, rotation |
| 4/5 | `pi/systemd/install-services.sh` | systemd services for server + kiosk, auto-start on boot |
| 5/5 | `pi/resilience/setup-readonly.sh` + `setup-watchdog.sh` | SD card protection, watchdog, journald rotation |

### 4. Deploy the App

```bash
# Copy your environment file
cp /path/to/.env /home/hotbox/app/.env

# Build the application
cd /home/hotbox/app
npm install
npm run build

# Reboot to start everything
sudo reboot
```

## Manual Setup

If you prefer to run each phase individually:

```bash
cd /home/hotbox/app

# Phase 1: Base system
sudo bash pi/bootstrap.sh

# Phase 2: Kiosk display
sudo bash pi/kiosk/install-kiosk.sh

# Phase 3: Touchscreen
sudo bash pi/kiosk/touch-calibrate.sh

# Phase 4: Auto-start services
sudo bash pi/systemd/install-services.sh

# Phase 5: Boot resilience
sudo bash pi/resilience/setup-readonly.sh
sudo bash pi/resilience/setup-watchdog.sh
```

## Configuration

All Pi scripts share a central configuration file:

```
pi/config/hotbox.conf
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOTBOX_HOSTNAME` | `hotbox` | System hostname |
| `HOTBOX_USER` | `hotbox` | Application user |
| `HOTBOX_APP_DIR` | `/home/hotbox/app` | Application directory |
| `HOTBOX_PORT` | `3456` | Server port |
| `HOTBOX_TIMEZONE` | `America/New_York` | System timezone |
| `HOTBOX_WIFI_COUNTRY` | `US` | WiFi regulatory domain |

Edit this file before running setup to customize your deployment.

## Useful Commands

```bash
# View server logs (live)
journalctl -u hotbox-server -f

# View kiosk logs (live)
journalctl -u hotbox-kiosk -f

# Check service status
systemctl status hotbox-server
systemctl status hotbox-kiosk

# Restart server
sudo systemctl restart hotbox-server

# Restart kiosk (display)
sudo systemctl restart hotbox-kiosk

# Restart both
sudo systemctl restart hotbox-server hotbox-kiosk

# Check watchdog status
sudo systemctl status watchdog
```

## Maintenance

### Updating the App

```bash
ssh hotbox@hotbox.local
cd /home/hotbox/app
git pull
npm install
npm run build
sudo systemctl restart hotbox-server
# Kiosk will reconnect automatically
```

### Viewing Logs

Application logs persist in `/home/hotbox/app/logs/`. System logs (`/var/log`) are on tmpfs and cleared on reboot. Use `journalctl` for system-level logs.

```bash
# Last 100 lines of server logs
journalctl -u hotbox-server -n 100

# Logs since last boot
journalctl -u hotbox-server -b

# All HotBox logs
journalctl -u 'hotbox-*'
```

### SD Card Health

The resilience setup protects the SD card by:
- Mounting `/tmp`, `/var/tmp`, `/var/log` as tmpfs (RAM)
- Setting `noatime,commit=120` on the root partition
- Disabling swap entirely
- Limiting journald to 50M with 7-day retention

Only `/home/hotbox/app/data/` and `/home/hotbox/app/logs/` write to the SD card.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't find Pi on network | Connect a monitor to check boot output. Try `nmap -sn 192.168.1.0/24` |
| Bootstrap fails | Check `/var/log/hotbox-bootstrap.log` |
| SSH connection refused | Ensure SSH was enabled in Imager advanced options |
| No display output | Check HDMI cable, verify `/dev/fb0` exists: `ls /dev/fb0` |
| Touch not responding | Run `pi/kiosk/touch-calibrate.sh --list` to check detected devices |
| Touch coordinates wrong | Run `sudo bash pi/kiosk/touch-calibrate.sh --rotate normal` to recalibrate |
| Server not starting | Check `journalctl -u hotbox-server -n 50` for errors |
| Kiosk blank screen | Check `journalctl -u hotbox-kiosk -n 50` and verify server is running |
| Services not auto-starting | Run `systemctl is-enabled hotbox-server hotbox-kiosk` |
| Pi freezes/hangs | Watchdog should auto-reboot after 15s. Check `journalctl -u watchdog` |
| SD card full | Check `df -h`. Journald limited to 50M. App logs in `/home/hotbox/app/logs/` |
| Node.js version wrong | Bootstrap installs from NodeSource, not default apt. Run `node --version` |

## Network

- **Ethernet:** Plug in and go (DHCP)
- **WiFi:** Configure via Raspberry Pi Imager advanced options, or use the `wpa_supplicant.conf.template` in `pi/config/`
