#!/usr/bin/env bash
# Build locally and push to the VPS.  Usage: SERVER=user@your-vps ./deploy/deploy.sh
set -euo pipefail

SERVER="${SERVER:?Set SERVER=user@host}"
REMOTE_DIR="/var/www/sandugorea"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/publish"

# Self-contained linux-x64 build: the VPS doesn't need the .NET runtime installed.
rm -rf "$OUT"
dotnet publish "$ROOT/backend/Sandugorea.Api/Sandugorea.Api.csproj" \
  -c Release -r linux-x64 --self-contained true -o "$OUT"

rsync -az --delete "$OUT/" "$SERVER:$REMOTE_DIR/"
ssh "$SERVER" "sudo chown -R www-data:www-data $REMOTE_DIR && sudo systemctl restart sandugorea && systemctl --no-pager status sandugorea | head -5"
