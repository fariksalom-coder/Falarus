#!/usr/bin/env bash
# SSH tunnel: local :5433 -> VPS PostgreSQL :5432
# Usage: npm run db:tunnel   (keep this terminal open while developing)
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib/vps-config.sh"
LOCAL_PORT="${LOCAL_PORT:-5433}"
REMOTE_PORT="${REMOTE_PORT:-5432}"

if lsof -iTCP:"$LOCAL_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "[db:tunnel] port $LOCAL_PORT already in use (tunnel may be running)"
  exit 0
fi

echo "[db:tunnel] $LOCAL_PORT -> $VPS_SSH:$REMOTE_PORT"
echo "[db:tunnel] Set DATABASE_URL host to 127.0.0.1:$LOCAL_PORT in .env"
exec ssh -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -N -L "127.0.0.1:$LOCAL_PORT:127.0.0.1:$REMOTE_PORT" "$VPS_SSH"
