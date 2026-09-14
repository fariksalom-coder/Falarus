#!/usr/bin/env bash
# Run as postgres. systemd records failures instead of discarding stderr.
set -euo pipefail
umask 077
ROOT="${PG_BACKUP_DIR:-/var/backups/falarus}"
DB_NAME="${DB_NAME:-falarus_db}"
KEEP_DAYS="${KEEP_DAYS:-14}"
[[ "$KEEP_DAYS" =~ ^[0-9]+$ && "$KEEP_DAYS" -ge 1 ]] || exit 2
mkdir -p "$ROOT"
exec 9>"$ROOT/.backup.lock"
flock -n 9 || { echo 'Another database backup is running' >&2; exit 1; }
STAMP="$(date -u +%Y%m%d-%H%M%S)"
PARTIAL="$ROOT/$DB_NAME-$STAMP.dump.partial"
trap 'rm -f -- "$PARTIAL"' EXIT
pg_dump --format=custom --file="$PARTIAL" "$DB_NAME"
pg_restore --list "$PARTIAL" >/dev/null
mv "$PARTIAL" "$ROOT/$DB_NAME-$STAMP.dump"
find "$ROOT" -maxdepth 1 -type f -name "$DB_NAME-*.dump" -mtime "+$KEEP_DAYS" -delete
echo "Verified backup: $DB_NAME-$STAMP.dump"
