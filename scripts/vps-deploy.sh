#!/usr/bin/env bash
# Git orqali deploy faqat toza ishchi nusxada bajariladi.
set -euo pipefail
APP_DIR="${APP_DIR:-$HOME/Falarus}"
cd "$APP_DIR"
if [[ -n "$(git status --porcelain)" ]]; then
  echo '[deploy] Lokal o‘zgarishlar bor. vps-deploy-rsync.sh ishlating.' >&2
  exit 1
fi
bash scripts/server-backup.sh
git pull --ff-only origin main
npm ci --no-audit --no-fund
npm run lint
npm test
bash scripts/deploy-build.sh
pm2 restart "${PM2_APP:-app}" --update-env
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 2 --max-time 10 http://127.0.0.1:3001/api/health
