#!/usr/bin/env bash
#
# Deploy patent course media (mp3/jpg/png) from local `public/courses/patent/media/`
# to production nginx-served directory on the VPS.
#
# Usage:
#   ./scripts/deploy-patent-media.sh              # sync all new/changed files
#   ./scripts/deploy-patent-media.sh --dry-run    # show what would change, no transfer
#
# Pipeline:
#   1. rsync local media → ubuntu@VPS:/tmp/falarus-media-staging/   (no sudo needed)
#   2. ssh → sudo cp into /var/www/falarus-media/...               (nginx root)
#   3. fix ownership (ubuntu:ubuntu) + perms (644)
#   4. clean up staging dir
#
# Pre-req: SSH key auth to ubuntu@VPS already set up.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_DIR="$REPO_ROOT/public/courses/patent/media/"
SSH_HOST="ubuntu@82.115.50.76"
STAGING_DIR="/tmp/falarus-media-staging"
REMOTE_DIR="/var/www/falarus-media/courses/patent/media"

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "🟡 DRY RUN — no files will actually be transferred"
fi

if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "❌ Local media dir not found: $LOCAL_DIR" >&2
  exit 1
fi

echo "📦 Step 1/3 — rsync local → $SSH_HOST:$STAGING_DIR"
rsync -av --progress $DRY_RUN \
  --include='*.mp3' --include='*.jpg' --include='*.jpeg' \
  --include='*.png' --include='*.gif' --include='*.webp' \
  --exclude='*' \
  "$LOCAL_DIR" "$SSH_HOST:$STAGING_DIR/"

if [[ -n "$DRY_RUN" ]]; then
  echo "✅ Dry run done. Rerun without --dry-run to apply."
  exit 0
fi

echo ""
echo "🔧 Step 2/3 — move staging → $REMOTE_DIR (with sudo)"
ssh "$SSH_HOST" bash <<EOF
set -euo pipefail
COUNT=\$(ls -1 "$STAGING_DIR" 2>/dev/null | wc -l)
echo "  Files in staging: \$COUNT"
if [[ "\$COUNT" -eq 0 ]]; then
  echo "  Nothing to deploy."
  exit 0
fi
sudo mkdir -p "$REMOTE_DIR"
sudo cp -n "$STAGING_DIR"/* "$REMOTE_DIR"/
sudo chown ubuntu:ubuntu "$REMOTE_DIR"/*
sudo chmod 644 "$REMOTE_DIR"/*.{mp3,jpg,jpeg,png,gif,webp} 2>/dev/null || true
EOF

echo ""
echo "🧹 Step 3/3 — clean up staging"
ssh "$SSH_HOST" "rm -rf '$STAGING_DIR'"

echo ""
echo "✅ Done. Verify a sample file:"
echo "   curl -sI https://media.falarus.uz/courses/patent/media/audio121.mp3 | head -3"
