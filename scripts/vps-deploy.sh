#!/usr/bin/env bash
# Run on VPS after git pull: install, build, restart pm2.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/Falarus}"
cd "$APP_DIR"

echo "[deploy] git pull"
git pull --ff-only origin main

echo "[deploy] npm ci"
npm ci

# ---------------------------------------------------------------------------
# BUILD — `dist` BO'SHATILMAYDI.
#
# Ilgari `vite build` `dist` ni butunlay o'chirib qayta yozardi. Shu 15-20
# soniya ichida ikki narsa buzilardi:
#   1. `index.html` yo'q — server har so'rovga "Sayt yangilanmoqda" (503)
#      sahifasini qaytarardi, `sw.js` ham 503 bilan kelib service worker
#      yangilanishi uzilardi;
#   2. deploy tugagach eski bo'lak fayllari (`/assets/Sahifa-ESKI.js`)
#      butunlay yo'qolardi — ochiq turgan ilova keyingi bo'limga o'tolmay
#      "sahifa ochilmadi" holatiga tushardi.
#
# `--no-emptyOutDir` ikkalasini ham hal qiladi: yangi fayllar yoniga
# yoziladi, `index.html` esa oxirida ALMASHADI. Eski bo'laklar bir hafta
# turadi — ochiq ilovalar tinch yakunlanadi.
# ---------------------------------------------------------------------------
echo "[deploy] build (dist bo'shatilmaydi)"
npx vite build --no-emptyOutDir

echo "[deploy] eski bo'laklarni tozalash (7 kundan oshgani)"
find dist/assets -type f -mtime +7 -delete 2>/dev/null || true

echo "[deploy] pm2 restart"
pm2 restart app

echo "[deploy] done"
