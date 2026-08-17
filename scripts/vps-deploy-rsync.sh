#!/usr/bin/env bash
# Lokal ishchi papkani VPS'ga rsync bilan chiqaradi.
#
# Nega git emas: ~/Downloads/Falarus-main — bu yuklab olingan zip, git repo EMAS,
# va u GitHub'dan oldinda bo'lishi mumkin. Shuning uchun serverdagi `vps-deploy.sh`
# (git pull) lokal o'zgarishlarni olib bormaydi.
#
# Ishlatish:
#   bash scripts/vps-deploy-rsync.sh --dry-run     # nima ko'chishini ko'rish (hech narsa o'zgarmaydi)
#   bash scripts/vps-deploy-rsync.sh               # haqiqiy deploy
#
# Gemini kalitini o'rnatish/yangilash uchun:
#   GEMINI_API_KEY="AIza..." bash scripts/vps-deploy-rsync.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-ubuntu@82.115.50.76}"
APP_DIR="${APP_DIR:-/home/ubuntu/Falarus}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
PM2_APP="${PM2_APP:-app}"
DRY_RUN=""

[ "${1:-}" = "--dry-run" ] && DRY_RUN="--dry-run"

# Foydalanuvchi ma'lumotlari — deploy ularga TEGMAYDI.
EXCLUDES=(
  --exclude '.env' --exclude '.env.*'
  --exclude '.git' --exclude 'node_modules' --exclude 'dist'
  --exclude 'uploads' --exclude 'public/courses'
  # tmp/ — lokal pglite dev bazasi (90MB), serverda umuman kerak emas.
  --exclude 'tmp' --exclude '.claude'
  --exclude 'python/venv' --exclude 'python/__pycache__' --exclude 'python/vektor_baza'
  --exclude '*.pyc'
)

say() { printf '\n\033[1;34m[deploy]\033[0m %s\n' "$*"; }

# ─── 1. Ulanishni tekshirish ────────────────────────────────────────────────
say "Ulanish tekshirilmoqda: $VPS_HOST"
ssh -o ConnectTimeout=10 "$VPS_HOST" 'echo "  ulandi: $(hostname)"'

# ─── 2. ZAXIRA (backup) — har doim birinchi ─────────────────────────────────
if [ -z "$DRY_RUN" ]; then
  say "Zaxira olinmoqda (DB + ilova fayllari)"
  ssh "$VPS_HOST" bash -s <<EOSSH
set -euo pipefail
STAMP=\$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR/\$STAMP"
# Baza ulanishi .env dan olinadi: serverda "ubuntu" nomli PG roli yo'q,
# shuning uchun \`pg_dump falarus_db\` ishlamaydi.
DBURL=\$(grep -m1 '^DATABASE_URL=' "$APP_DIR/.env" | sed 's/^DATABASE_URL=//; s/^"//; s/"\$//')
[ -n "\$DBURL" ] || { echo "  !!! .env da DATABASE_URL yo'q — zaxira olinmadi"; exit 1; }
pg_dump "\$DBURL" | gzip > "$BACKUP_DIR/\$STAMP/falarus_db.sql.gz"
tar czf "$BACKUP_DIR/\$STAMP/app-files.tar.gz" \
  -C "$APP_DIR" --exclude=node_modules --exclude=dist --exclude=uploads --exclude=.git . 2>/dev/null || true
cp "$APP_DIR/.env" "$BACKUP_DIR/\$STAMP/.env.bak"
echo "  zaxira: $BACKUP_DIR/\$STAMP"
du -sh "$BACKUP_DIR/\$STAMP"
EOSSH
else
  say "[dry-run] zaxira o'tkazib yuborildi"
fi

# ─── 3. Fayllarni ko'chirish ────────────────────────────────────────────────
say "Fayllar ko'chirilmoqda (rsync -rlpc, checksum)"
rsync -rlpc --delete-after $DRY_RUN "${EXCLUDES[@]}" \
  --itemize-changes \
  ./ "$VPS_HOST:$APP_DIR/"

if [ -n "$DRY_RUN" ]; then
  say "dry-run tugadi — server o'zgarmadi."
  exit 0
fi

# ─── 4. .env yangilash: o'lik TTS kalitlarini olib tashlash ─────────────────
#
# DIQQAT: bu yerda ilgari `sed -i '/^OPENAI_/d'` turardi. U XATO edi —
# OPENAI_API_KEY/OPENAI_MODEL 4-blok ("gapirish") javob tekshiruvi va Whisper
# transkripsiyasi uchun HOZIR ISHLATILADI (server.ts -> server/lib/openai.ts).
# O'chirilsa prod'da razgovor tekshiruvi 503 qaytaradi.
# Faqat kodda umuman o'qilmaydigan eski TTS kalitlari tozalanadi.
say "Server .env yangilanmoqda (o'lik TTS kalitlari)"
ssh "$VPS_HOST" GEMINI_API_KEY="${GEMINI_API_KEY:-}" bash -s <<EOSSH
set -euo pipefail
cd "$APP_DIR"
sed -i '/^ELEVENLABS_/d; /^OPENAI_TTS_/d; /^GOOGLE_TTS_/d; /^AZURE_SPEECH_/d' .env
if [ -n "\${GEMINI_API_KEY:-}" ]; then
  sed -i '/^GEMINI_API_KEY=/d' .env
  echo "GEMINI_API_KEY=\"\$GEMINI_API_KEY\"" >> .env
  echo "  GEMINI_API_KEY yangilandi"
fi
if ! grep -q '^GEMINI_API_KEY=' .env; then
  echo "  !!! OGOHLANTIRISH: .env da GEMINI_API_KEY yo'q — BARCHA AI 503 qaytaradi"
fi
EOSSH

# ─── 5. Qurish va qayta ishga tushirish ─────────────────────────────────────
say "npm install + build + pm2 restart"
ssh "$VPS_HOST" bash -s <<EOSSH
set -euo pipefail
cd "$APP_DIR"
npm install --no-audit --no-fund   # openai paketi olib tashlangani uchun ci emas, install
# DIQQAT: bu heredoc qo'shtirnoqsiz (o'zgaruvchilar lokal ochilishi kerak),
# shuning uchun bu yerda teskari tirnoq va dollar-qavs ISHLATMANG — ular lokal
# buyruq sifatida bajariladi.
#
# Oddiy "npm run build" EMAS: u dist/ ni tozalab qaytadan yozadi va o'sha bir
# necha soniyada saytga kirgan odam bo'sh javob oladi, ochiq turgan sahifalar
# esa keyingi bo'lakni yuklay olmay oq ekranga aylanadi (log'dagi sw.js 404
# shundan chiqardi). deploy-build.sh yangi papkaga yig'ib, eski bo'laklarni
# saqlab qo'yadi va papkalarni bir lahzada almashtiradi — uzilish bo'lmaydi.
bash scripts/deploy-build.sh
pm2 restart "$PM2_APP" --update-env
sleep 4
pm2 describe "$PM2_APP" | grep -E 'status|restarts' || true
EOSSH

# ─── 6. Tekshirish ──────────────────────────────────────────────────────────
say "Sog'liq tekshiruvi"
ssh "$VPS_HOST" bash -s <<'EOSSH'
set -euo pipefail
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health)
echo "  /api/health -> HTTP $code"
[ "$code" = "200" ] || { echo "  !!! sog'liq tekshiruvi muvaffaqiyatsiz"; exit 1; }
EOSSH

say "Tugadi. Loglar: ssh $VPS_HOST 'pm2 logs $PM2_APP --lines 50'"
