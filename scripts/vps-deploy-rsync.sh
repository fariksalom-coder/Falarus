#!/usr/bin/env bash
# Lokal kodni yuborish; muhit, media va serverga xos qo'shimcha fayllar saqlanadi.
# bash scripts/vps-deploy-rsync.sh [--dry-run]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/lib/vps-config.sh"
cd "$ROOT"
PM2_APP="${PM2_APP:-app}"
DRY_RUN=()
case "${1:-}" in
  --dry-run) DRY_RUN=(--dry-run) ;;
  '') ;;
  *) echo 'Usage: vps-deploy-rsync.sh [--dry-run]' >&2; exit 2 ;;
esac
[[ "$APP_DIR" =~ ^/[a-zA-Z0-9_./-]+$ && "$PM2_APP" =~ ^[a-zA-Z0-9_-]+$ ]] || exit 2
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15)
"${SSH[@]}" "$VPS_SSH" 'true'
if [[ ${#DRY_RUN[@]} -eq 0 ]]; then
  npm run lint
  npm test
  "${SSH[@]}" "$VPS_SSH" "cd '$APP_DIR' && bash scripts/server-backup.sh"
fi
rsync -rlpc --itemize-changes "${DRY_RUN[@]}" \
  --exclude='.env' --exclude='.env.*' --exclude='.git' \
  --exclude=node_modules --exclude=dist --exclude='dist.*' --exclude='.dist-build.*' \
  --exclude='.deploy-build.lock' --exclude='.server-backups' --exclude=uploads --exclude='public/courses' \
  --exclude=/src --exclude=/server --exclude=/shared --exclude=/scripts --exclude=/tests \
  --exclude=tmp --exclude='.claude' --exclude='.agents' --exclude='.codex' \
  --exclude='python/venv' --exclude='python/vektor_baza' --exclude='__pycache__' \
  --exclude='*.pyc' ./ "$VPS_SSH:$APP_DIR/"
# Faqat kod kataloglaridan chiqarilgan fayllarni arxivlaymiz; serverdagi
# ma'lumotlar, muhit va boshqa kataloglar bu sinxronlashga kirmaydi.
rsync -rlpc --delete-delay --backup \
  --backup-dir="${APP_DIR%/*}/backups/retired-code-$(date -u +%Y%m%d-%H%M%S)" \
  --itemize-changes "${DRY_RUN[@]}" --exclude='__pycache__' --exclude='*.pyc' \
  src server shared scripts tests "$VPS_SSH:$APP_DIR/"
[[ ${#DRY_RUN[@]} -eq 0 ]] || exit 0
"${SSH[@]}" "$VPS_SSH" "bash -s -- '$APP_DIR' '$PM2_APP'" <<'REMOTE'
set -euo pipefail
cd "$1"
npm ci --no-audit --no-fund
npm run lint
bash scripts/deploy-build.sh
pm2 restart "$2" --update-env
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 2 --max-time 10 http://127.0.0.1:3001/api/health
REMOTE
