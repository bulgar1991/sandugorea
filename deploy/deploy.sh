#!/usr/bin/env bash
# Build locally and push to the VPS.  Usage: ./deploy/deploy.sh   (or SERVER=user@host ./deploy/deploy.sh)
set -euo pipefail

SERVER="${SERVER:-root@sandugorea.ch}"
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

# Smoke test through nginx (HTTPS once the certificate exists).
sleep 3
curl -fsS "https://sandugorea.ch/api/health" || curl -fsS "http://sandugorea.ch/api/health" || echo "Health check failed - see: ssh $SERVER journalctl -u sandugorea -n 50"
echo
