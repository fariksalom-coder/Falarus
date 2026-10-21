#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
: "${APPLE_TEAM_ID:?Set APPLE_TEAM_ID to your Apple Developer Team ID}"
[[ "$APPLE_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]] || { echo 'Invalid Apple Team ID' >&2; exit 2; }
npm run lint
node --import tsx --test tests/appleAppStore.test.ts tests/applePurchases.test.ts
npm run build
npx cap sync ios
xcodebuild -workspace ios/App/App.xcworkspace -scheme FalaRus \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "${APPLE_ARCHIVE_PATH:-$PWD/build/FalaRus.xcarchive}" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" archive
echo 'Archive created. Open Xcode Organizer to validate and upload to TestFlight.'
