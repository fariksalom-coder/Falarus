#!/usr/bin/env bash
# Linux renameat2 orqali tayyor buildni atomik almashtirish.
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>.deploy-build.lock
flock -n 9 || { echo '[build] boshqa build ishlayapti' >&2; exit 1; }
NEW="$(mktemp -d "$PWD/.dist-build.XXXXXX")"
trap 'if [[ -n "${NEW:-}" && -d "$NEW" ]]; then rm -rf -- "$NEW"; fi' EXIT
./node_modules/.bin/vite build --outDir "$NEW"
test -s "$NEW/index.html"
test -s "$NEW/crm.html"
test -s "$NEW/sw.js"
python3 scripts/activate-build.py "$NEW"
NEW=''
echo '[build] tayyor; oldingi versiya dist.rollback da saqlandi'
