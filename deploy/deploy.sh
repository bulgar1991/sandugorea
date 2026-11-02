#!/usr/bin/env bash
# Build locally and push to the VPS.  Usage: ./deploy/deploy.sh   (or SERVER=user@host ./deploy/deploy.sh)
set -euo pipefail

SERVER="${SERVER:-root@66.29.142.5}"
REMOTE_DIR="/var/www/sandugorea"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/publish"

# The .NET SDK may live in ~/.dotnet without being on PATH.
command -v dotnet >/dev/null || export PATH="$HOME/.dotnet:$PATH"

# Self-contained linux-x64 build: the VPS doesn't need the .NET runtime installed.
rm -rf "$OUT"
dotnet publish "$ROOT/backend/Sandugorea.Api/Sandugorea.Api.csproj" \
  -c Release -r linux-x64 --self-contained true -o "$OUT"

rsync -az --delete "$OUT/" "$SERVER:$REMOTE_DIR/"
ssh "$SERVER" "sudo chown -R root:root $REMOTE_DIR && sudo chmod -R a+rX $REMOTE_DIR && sudo systemctl restart sandugorea && systemctl --no-pager status sandugorea | head -5"

# Smoke test on the server itself (works before DNS/HTTPS are set up).
for i in 1 2 3 4 5 6 7 8 9 10; do
  if ssh "$SERVER" "curl -fsS http://127.0.0.1:5000/api/health"; then echo; echo "Deployed."; exit 0; fi
  sleep 2
done
echo "Health check failed - logs: ssh $SERVER journalctl -u sandugorea -n 50"
exit 1
