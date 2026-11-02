#!/usr/bin/env bash
# Nightly backup of sandugorea.ch -> encrypted off-site storage (rclone "crypt" remote).
#
# Backs up:  database (consistent snapshot) · photos (incremental) · encryption keys · secrets file
# Keeps:     database snapshots and deleted photos for KEEP_DAYS days; last LOCAL_KEEP snapshots on the server.
# Settings:  /etc/sandugorea/backup.env (see backup.env.example). Installed as /usr/local/bin/sandugorea-backup.
set -euo pipefail

CONFIG="${CONFIG:-/etc/sandugorea/backup.env}"
# shellcheck disable=SC1090
[ -f "$CONFIG" ] && . "$CONFIG"

DATA_DIR="${DATA_DIR:-/var/lib/sandugorea}"
LOCAL_DIR="${LOCAL_DIR:-/var/backups/sandugorea}"
ENV_FILE="${ENV_FILE:-/etc/sandugorea/sandugorea.env}"
REMOTE="${REMOTE:-}"        # e.g. "sgbackup:" - must be an rclone crypt remote
KEEP_DAYS="${KEEP_DAYS:-30}"
LOCAL_KEEP="${LOCAL_KEEP:-7}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
log() { echo "[backup $(date -u +%H:%M:%S)] $*"; }
fail() { log "ERROR: $*"; exit 1; }

[ -f "$DATA_DIR/sandugorea.db" ] || fail "no database at $DATA_DIR/sandugorea.db"
mkdir -p "$LOCAL_DIR"
chmod 700 "$LOCAL_DIR"

# 1. Database: online snapshot (safe while the app is running), verified, compressed.
#    Converted to a single self-contained file (no -wal/-shm side files).
SNAP="$LOCAL_DIR/sandugorea-$STAMP.db"
rm -f "$SNAP" "$SNAP.gz"
sqlite3 "$DATA_DIR/sandugorea.db" ".backup '$SNAP'"
sqlite3 "$SNAP" 'PRAGMA journal_mode=DELETE;' >/dev/null
[ "$(sqlite3 "$SNAP" 'PRAGMA integrity_check;')" = "ok" ] || fail "snapshot failed integrity check"
rm -f "$SNAP-wal" "$SNAP-shm"
gzip -9 "$SNAP"
SNAP="$SNAP.gz"
log "database snapshot: $(basename "$SNAP") ($(du -h "$SNAP" | cut -f1))"

# Keep only the newest LOCAL_KEEP snapshots on the server (the disk is small).
n=0
for f in $(ls -1t "$LOCAL_DIR"/sandugorea-*.db.gz); do
  n=$((n + 1))
  if [ "$n" -gt "$LOCAL_KEEP" ]; then rm -f "$f"; fi
done

# 2. Off-site copy.
if [ -z "$REMOTE" ]; then
  fail "REMOTE is not set in $CONFIG - photos are NOT backed up off-site (see deploy/BACKUP.md)"
fi
NAME="${REMOTE%%:*}"
TYPE="$(rclone listremotes --long | awk -v n="$NAME:" '$1 == n { print $2 }')"
[ -n "$TYPE" ] || fail "rclone remote '$NAME:' does not exist (run: rclone config)"
[ "$TYPE" = "crypt" ] || [ "${ALLOW_UNENCRYPTED:-0}" = "1" ] \
  || fail "rclone remote '$NAME:' is '$TYPE', not 'crypt' - customer photos must be encrypted off-site"

# "sgbackup:" -> "sgbackup:photos", "sgbackup:dir" -> "sgbackup:dir/photos"
case "$REMOTE" in *:) P="$REMOTE" ;; *) P="${REMOTE%/}/" ;; esac
RC=(rclone --transfers 2 --checkers 4 --retries 3 --low-level-retries 10 --stats-one-line --stats 0)

log "photos -> ${P}photos"
# Photos never change once uploaded, so this only sends new ones. Deleted photos are moved
# to deleted/<date>/ instead of being removed, and purged after KEEP_DAYS.
"${RC[@]}" sync "$DATA_DIR/projects" "${P}photos" \
  --exclude "*/incoming/**" --backup-dir "${P}deleted/$STAMP"

log "database, keys and secrets"
"${RC[@]}" copy "$SNAP" "${P}db"
"${RC[@]}" sync "$DATA_DIR/keys" "${P}keys"
if [ -f "$ENV_FILE" ]; then "${RC[@]}" copyto "$ENV_FILE" "${P}config/sandugorea.env"; fi

# 3. Retention: by backup date (file names), not file age - a photo deleted today is kept KEEP_DAYS.
CUTOFF="$(date -u -d "-$KEEP_DAYS days" +%Y%m%d 2>/dev/null || date -u -v-"$KEEP_DAYS"d +%Y%m%d)"
for f in $(rclone lsf --files-only "${P}db"); do
  d="${f#sandugorea-}"; d="${d%%-*}"
  if [ "$d" \< "$CUTOFF" ]; then rclone deletefile "${P}db/$f"; log "pruned db/$f"; fi
done
for dir in $(rclone lsf --dirs-only "${P}deleted" 2>/dev/null); do
  d="${dir%%-*}"
  if [ "$d" \< "$CUTOFF" ]; then rclone purge "${P}deleted/${dir%/}"; log "pruned deleted/$dir"; fi
done

date -u +%Y-%m-%dT%H:%M:%SZ > "$LOCAL_DIR/last-success"
log "done - off-site photos: $(rclone size "${P}photos" 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g')"
