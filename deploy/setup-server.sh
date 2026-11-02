#!/usr/bin/env bash
# One-time setup of the Ubuntu 24.04 VPS for sandugorea.ch. Safe to run again.
#
#   From your Mac:   scp -r deploy root@66.29.142.5:/root/
#   On the server:   bash /root/deploy/setup-server.sh you@example.com
#
# The e-mail address is for Let's Encrypt certificate expiry notices.
set -euo pipefail

DOMAIN="sandugorea.ch"
LE_EMAIL="${1:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
[ "$(id -u)" -eq 0 ] || { echo "Run as root."; exit 1; }

step() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

step "System updates and packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq nginx certbot python3-certbot-nginx ufw fail2ban unattended-upgrades rsync sqlite3 rclone

step "Automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

step "2 GB swap file (the VPS has 1 GB RAM)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-sandugorea.conf
sysctl -q --system

step "Firewall: only SSH, HTTP and HTTPS"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

step "fail2ban (blocks SSH brute force)"
systemctl enable --now fail2ban

step "Service user and folders"
id sandugorea >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin sandugorea
mkdir -p /var/www/sandugorea /etc/sandugorea
if [ ! -f /etc/sandugorea/sandugorea.env ]; then
  cp "$HERE/sandugorea.env.example" /etc/sandugorea/sandugorea.env
  NEED_ENV=1
fi
chmod 600 /etc/sandugorea/sandugorea.env

step "systemd service"
cp "$HERE/sandugorea.service" /etc/systemd/system/sandugorea.service
systemctl daemon-reload
systemctl enable sandugorea

step "Nightly backup (systemd timer, 03:30)"
install -m 750 "$HERE/backup.sh" /usr/local/bin/sandugorea-backup
install -m 750 "$HERE/restore.sh" /usr/local/bin/sandugorea-restore
if [ ! -f /etc/sandugorea/backup.env ]; then
  install -m 600 "$HERE/backup.env.example" /etc/sandugorea/backup.env
  NEED_BACKUP=1
fi
cp "$HERE/sandugorea-backup.service" "$HERE/sandugorea-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now sandugorea-backup.timer

step "nginx"
cp "$HERE/nginx.conf" /etc/nginx/sites-available/sandugorea
ln -sf /etc/nginx/sites-available/sandugorea /etc/nginx/sites-enabled/sandugorea
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

step "HTTPS certificate (Let's Encrypt)"
SERVER_IP="$(curl -4 -s https://ifconfig.me || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
WWW_IP="$(getent ahostsv4 "www.$DOMAIN" | awk 'NR==1{print $1}' || true)"
if [ -z "$LE_EMAIL" ]; then
  echo "Skipped: pass your e-mail address as the first argument to get a certificate."
elif [ "$DNS_IP" != "$SERVER_IP" ] || [ "$WWW_IP" != "$SERVER_IP" ]; then
  echo "Skipped: DNS not ready. $DOMAIN -> '${DNS_IP}', www.$DOMAIN -> '${WWW_IP}', this server -> '${SERVER_IP}'."
  echo "Point both A records at $SERVER_IP, wait for DNS, then run this script again."
else
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect --agree-tos -m "$LE_EMAIL" --non-interactive
fi

step "Done"
if [ "${NEED_ENV:-0}" = 1 ]; then
  echo "NEXT: edit /etc/sandugorea/sandugorea.env (admin password, SMTP):  nano /etc/sandugorea/sandugorea.env"
fi
if [ "${NEED_BACKUP:-0}" = 1 ] || ! rclone listremotes 2>/dev/null | grep -q '^sgbackup:'; then
  echo "BACKUP: set up the encrypted off-site storage - see deploy/BACKUP.md (until then the nightly backup fails on purpose)."
fi
echo "Then deploy from your Mac:  ./deploy/deploy.sh"
