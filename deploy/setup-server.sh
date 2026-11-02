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

# No admin password set yet and no database yet: generate one. It's only written to a root-only file,
# never printed, so it doesn't end up in terminal logs.
if grep -q '^Admin__Password=$' /etc/sandugorea/sandugorea.env && [ ! -f /var/lib/sandugorea/sandugorea.db ]; then
  ADMIN_PW="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)Aa1!"
  sed -i "s|^Admin__Password=$|Admin__Password=${ADMIN_PW}|" /etc/sandugorea/sandugorea.env
  install -m 600 /dev/null /root/sandugorea-admin-password.txt
  printf 'Admin: https://%s/admin/login\nUsername: %s\nPassword: %s\n' "$DOMAIN" \
    "$(sed -n 's/^Admin__Username=//p' /etc/sandugorea/sandugorea.env)" "$ADMIN_PW" > /root/sandugorea-admin-password.txt
  unset ADMIN_PW
  GENERATED_PW=1
fi

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
if [ "${GENERATED_PW:-0}" = 1 ]; then
  echo "ADMIN: a strong admin password was generated. Read it in your own terminal:"
  echo "       ssh root@$DOMAIN cat /root/sandugorea-admin-password.txt"
fi
if [ "${NEED_ENV:-0}" = 1 ]; then
  echo "SMTP: add your mail settings when ready:  nano /etc/sandugorea/sandugorea.env  (then: systemctl restart sandugorea)"
fi
if [ "${NEED_BACKUP:-0}" = 1 ] || ! rclone listremotes 2>/dev/null | grep -q '^sgbackup:'; then
  echo "BACKUP: set up the encrypted off-site storage - see deploy/BACKUP.md (until then the nightly backup fails on purpose)."
fi
echo "Then deploy from your Mac:  ./deploy/deploy.sh"
