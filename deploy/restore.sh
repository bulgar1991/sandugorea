#!/usr/bin/env bash
# Restore sandugorea.ch from the off-site backup (e.g. onto a fresh VPS after setup-server.sh).
#
#   sandugorea-restore                 # newest database snapshot
#   sandugorea-restore list            # show available snapshots
#   sandugorea-restore sandugorea-20261102-033000.db.gz
#
# The current data folder is kept as /var/lib/sandugorea.before-restore-<date>.
set -euo pipefail

CONFIG="${CONFIG:-/etc/sandugorea/backup.env}"
# shellcheck disable=SC1090
[ -f "$CONFIG" ] && . "$CONFIG"
DATA_DIR="${DATA_DIR:-/var/lib/sandugorea}"
ENV_FILE="${ENV_FILE:-/etc/sandugorea/sandugorea.env}"
REMOTE="${REMOTE:?REMOTE not set in $CONFIG}"
SERVICE="${SERVICE-sandugorea}"   # SERVICE= (empty) skips stopping/starting the app
case "$REMOTE" in *:) P="$REMOTE" ;; *) P="${REMOTE%/}/" ;; esac
log() { echo "[restore] $*"; }

if [ "${1:-}" = "list" ]; then
  rclone lsl "${P}db" | sort -k4
  exit 0
fi

SNAPSHOT="${1:-$(rclone lsf --files-only "${P}db" | sort | tail -n 1)}"
[ -n "$SNAPSHOT" ] || { log "no database snapshots found at ${P}db"; exit 1; }
log "restoring snapshot $SNAPSHOT"

if [ -n "$SERVICE" ]; then systemctl stop "$SERVICE"; fi

if [ -d "$DATA_DIR" ] && [ -n "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  ASIDE="$DATA_DIR.before-restore-$(date -u +%Y%m%d-%H%M%S)"
  mv "$DATA_DIR" "$ASIDE"
  log "current data moved to $ASIDE"
fi
mkdir -p "$DATA_DIR"

rclone copy "${P}photos" "$DATA_DIR/projects"
rclone copy "${P}keys" "$DATA_DIR/keys"
TMP="$(mktemp -d)"
rclone copyto "${P}db/$SNAPSHOT" "$TMP/db.gz"
gunzip -c "$TMP/db.gz" > "$DATA_DIR/sandugorea.db"
rm -rf "$TMP"
[ "$(sqlite3 "$DATA_DIR/sandugorea.db" 'PRAGMA integrity_check;')" = "ok" ] || { log "restored database failed integrity check"; exit 1; }

if [ ! -f "$ENV_FILE" ] && rclone lsf "${P}config/sandugorea.env" >/dev/null 2>&1; then
  mkdir -p "$(dirname "$ENV_FILE")"
  rclone copyto "${P}config/sandugorea.env" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "secrets file restored to $ENV_FILE"
fi

if [ -n "$SERVICE" ]; then
  chown -R sandugorea:sandugorea "$DATA_DIR"
  chmod 700 "$DATA_DIR"
  systemctl start "$SERVICE"
fi
log "done - $(sqlite3 "$DATA_DIR/sandugorea.db" 'select count(*) from Projects') projects, $(sqlite3 "$DATA_DIR/sandugorea.db" 'select count(*) from Photos') photos"
