#!/usr/bin/env bash
# Teacher migrations on VPS PostgreSQL (not Supabase).
# Requires SSH access: ubuntu@82.115.50.76 (password once, or add ~/.ssh/id_ed25519.pub to server).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VPS="${VPS_SSH:-ubuntu@82.115.50.76}"
REMOTE_DIR="${VPS_REMOTE_DIR:-~/Falarus}"

echo "[vps] Copying teacher migrations to ${VPS}:${REMOTE_DIR}/db/migrations/"
ssh "$VPS" "mkdir -p ${REMOTE_DIR}/db/migrations"
scp \
  "${ROOT}/db/migrations/121_teacher_marketplace.sql" \
  "${ROOT}/db/migrations/122_teacher_auth.sql" \
  "${VPS}:${REMOTE_DIR}/db/migrations/"

echo "[vps] Applying migrations on server (uses DATABASE_URL from ~/Falarus/.env)..."
ssh "$VPS" bash -s <<'REMOTE'
set -euo pipefail
cd ~/Falarus
if [[ ! -f .env ]]; then
  echo "ERROR: ~/Falarus/.env not found on server"
  exit 1
fi
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL missing in server .env"
  exit 1
fi
for f in db/migrations/121_teacher_marketplace.sql db/migrations/122_teacher_auth.sql; do
  echo "[vps] applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
psql "$DATABASE_URL" -c "SELECT to_regclass('public.teacher_profiles') AS teacher_profiles, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='account_type') AS account_type_col;"
echo "[vps] Teacher migrations done."
REMOTE
