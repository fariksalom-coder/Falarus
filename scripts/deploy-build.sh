#!/usr/bin/env bash
#
# Serverda XAVFSIZ build.
#
# MUAMMO: oddiy `npm run build` `dist/` ni tozalab, qaytadan yozadi. Shu bir
# necha soniya ichida sayt ochgan odam bo'sh javob oladi. Undan ham yomoni:
# eski bo'lak fayllari (`assets/Sahifa-XXXX.js`) o'chib ketadi va AYNI PAYTDA
# ochiq turgan brauzerlar keyingi bo'limni yuklay olmaydi — ekran oq bo'lib
# qoladi (chunki eski `index.html` eski nomlarni so'raydi).
#
# YECHIM:
#   1) build yangi papkaga (`dist.new`) tushadi — `dist` tegilmaydi;
#   2) eski `assets` fayllari yangisiga KO'CHIRILADI (ustidan yozilmaydi) —
#      ochiq turgan sahifalar ishlayveradi;
#   3) papkalar bir lahzada almashtiriladi (`mv`), ya'ni uzilish bo'lmaydi.
#
# Ishlatish: ./scripts/deploy-build.sh   (loyiha ildizidan yoki istalgan joydan)

set -euo pipefail
cd "$(dirname "$0")/.."

NEW=dist.new
OLD=dist.old

rm -rf "$NEW" "$OLD"

echo "[build] yangi papkaga yig'ilmoqda…"
npx vite build --outDir "$NEW"

if [ -d dist/assets ] && [ -d "$NEW/assets" ]; then
  echo "[build] eski bo'lak fayllari saqlanmoqda (ochiq sahifalar uchun)…"
  # -n: mavjud (yangi) fayllar ustidan yozilmaydi.
  cp -an dist/assets/. "$NEW/assets/" 2>/dev/null || true
fi

if [ -d dist ]; then
  mv dist "$OLD"
fi
mv "$NEW" dist
rm -rf "$OLD"

# Eski bo'lak fayllari abadiy to'planib qolmasin: 7 kundan oshganlari o'chadi
# (bir haftadan beri ochiq turgan sahifa deyarli yo'q).
find dist/assets -type f -mtime +7 -delete 2>/dev/null || true

echo "[build] tayyor: $(ls -1 dist/assets | wc -l) ta fayl"
