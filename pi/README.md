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

## Initial Setup

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
   # From another machine on the same network
   ping hotbox.local
   # or check your router's DHCP client list
   ```
4. SSH into the Pi:
   ```bash
   ssh hotbox@hotbox.local
   ```

### 3. Clone and Bootstrap

```bash
# Clone the repository
sudo apt-get install -y git
git clone https://github.com/your-org/wix-hotbox.git /home/hotbox/app
cd /home/hotbox/app

# Run the bootstrap script
sudo bash pi/bootstrap.sh
```

The bootstrap script will:
- Update all system packages
- Install Node.js 20 LTS
- Create the `hotbox` system user (if not using Imager-created user)
- Set locale to `en_US.UTF-8` and timezone to `America/New_York`
- Configure SSH hardening (key-only auth)
- Log all output to `/var/log/hotbox-bootstrap.log`

### 4. Subsequent Setup

After bootstrap completes, the following phases add additional layers:

| Phase | Script | Purpose |
|-------|--------|---------|
| 44 | Kiosk display setup | Chromium kiosk mode, X11 minimal |
| 45 | Application service | systemd service, auto-start |
| 46 | Resilience | Watchdog, health checks, auto-recovery |

Each phase builds on the previous one. Run them in order.

## Configuration

All Pi scripts share a central configuration file:

```
pi/config/hotbox.conf
```

Edit this file to customize hostname, port, timezone, and other settings before running bootstrap.

## Network

- **Ethernet:** Plug in and go (DHCP)
- **WiFi:** Configure via Raspberry Pi Imager advanced options, or use the `wpa_supplicant.conf.template` in `pi/config/`

## Troubleshooting

- **Can't find Pi on network:** Connect a monitor to check boot output, or try `nmap -sn 192.168.1.0/24`
- **Bootstrap fails:** Check `/var/log/hotbox-bootstrap.log` for details
- **SSH connection refused:** Ensure SSH was enabled in Imager advanced options
- **Node.js version wrong:** The bootstrap script installs from NodeSource, not the default apt repository
