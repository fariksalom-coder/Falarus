#!/usr/bin/env bash
# Run on VPS after git pull: install, build, restart pm2.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/Falarus}"
cd "$APP_DIR"

echo "[deploy] git pull"
git pull --ff-only origin main

echo "[deploy] npm ci"
npm ci

echo "[deploy] build"
npm run build

echo "[deploy] pm2 restart"
pm2 restart app

echo "[deploy] done"
