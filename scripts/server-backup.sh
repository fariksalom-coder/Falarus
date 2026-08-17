#!/usr/bin/env bash
#
# FalaRus serverini zaxiralash: BAZA + KOD + MEDIA.
#
# NEGA MEDIA ALOHIDA: o'qituvchi video-taqdimoti, avatar va hujjatlar
# `uploads/storage` da yotadi — ular bazada ham, kod arxivida ham yo'q.
# Video 100 MB gacha bo'lgani uchun ularni har safar tar qilish disk va
# vaqtni yeydi, shuning uchun media `rsync --link-dest` bilan olinadi:
# o'zgarmagan fayl yangi nusxa emas, QATTIQ HAVOLA bo'ladi (joy egallamaydi),
# lekin har bir sana o'z papkasida to'liq ko'rinadi.
#
# tts-cache OLINMAYDI — u talaffuz fayllari keshi, kerak bo'lsa qayta yaratiladi.
#
# ESKI ZAXIRALAR: har zaxiradan keyin tozalanadi. Qoida —
#   • oxirgi KEEP_BACKUPS (20) ta zaxira to'liq saqlanadi;
#   • undan eskilari oyiga BITTADAN qoladi (o'sha oyning eng yangisi);
#   • media suratlari: oxirgi KEEP_MEDIA (14) tasi.
# Shunday qilib disk to'lib ketmaydi, lekin oylik tarix yo'qolmaydi.
#
# Ishlatish:
#   ./server-backup.sh            — zaxira olish + eskisini tozalash
#   ./server-backup.sh --list     — mavjud zaxiralar
#   ./server-backup.sh --prune-dry — nima o'chishini KO'RSATADI, o'chirmaydi
#
# Tiklash:
#   baza:  gunzip -c falarus_db.sql.gz | psql "$DATABASE_URL"
#   kod:   tar xzf app-files.tar.gz -C ~/Falarus && cd ~/Falarus && npm run build && pm2 restart app
#   media: rsync -a ~/backups/media/<sana>/ ~/Falarus/uploads/

set -euo pipefail

APP="${APP_DIR:-/home/ubuntu/Falarus}"
ROOT="${BACKUP_DIR:-/home/ubuntu/backups}"
MEDIA_ROOT="$ROOT/media"
KEEP_MEDIA="${KEEP_MEDIA:-14}"
KEEP_BACKUPS="${KEEP_BACKUPS:-20}"
DB_NAME="${DB_NAME:-falarus_db}"

# Eski zaxiralarni tozalash. $1 = "dry" bo'lsa faqat ro'yxat chiqadi.
prune_backups() {
  local mode="${1:-run}" i=0 base month seen=" "
  for dir in $(ls -1d "$ROOT"/*/ 2>/dev/null | grep -E '/[0-9]{8}-[0-9]{6}/$' | sort -r); do
    base="$(basename "$dir")"
    month="${base:0:6}"
    i=$((i + 1))
    if [ "$i" -le "$KEEP_BACKUPS" ]; then
      case "$seen" in *" $month "*) : ;; *) seen="$seen$month " ;; esac
      continue
    fi
    case "$seen" in
      *" $month "*)
        # Shu oydan yangiroq nusxa allaqachon saqlanmoqda.
        if [ "$mode" = "dry" ]; then
          echo "  o'chadi:  $base"
        else
          rm -rf "$dir"
        fi
        ;;
      *)
        # Oyning eng yangisi — tarix uchun qoladi.
        seen="$seen$month "
        [ "$mode" = "dry" ] && echo "  qoladi (oylik): $base"
        ;;
    esac
  done
}

if [ "${1:-}" = "--prune-dry" ]; then
  echo "Tozalash rejasi (KEEP_BACKUPS=$KEEP_BACKUPS, oxirgi $KEEP_BACKUPS ta + har oydan bittasi qoladi):"
  prune_backups dry
  echo
  echo "Hozir: $(ls -1d "$ROOT"/*/ 2>/dev/null | grep -cE '/[0-9]{8}-[0-9]{6}/$') ta zaxira, $(du -sh "$ROOT" | cut -f1)"
  exit 0
fi

if [ "${1:-}" = "--list" ]; then
  echo "Zaxiralar ($ROOT):"
  ls -1t "$ROOT" | grep -E '^[0-9]{8}-[0-9]{6}$' | head -20
  echo
  echo "Media suratlari ($MEDIA_ROOT):"
  du -sh "$MEDIA_ROOT"/*/ 2>/dev/null | tail -20 || echo "  hali yo'q"
  exit 0
fi

TS="$(date +%Y%m%d-%H%M%S)"
DIR="$ROOT/$TS"
mkdir -p "$DIR" "$MEDIA_ROOT"

echo "[1/3] Baza…"
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$DIR/falarus_db.sql.gz"

echo "[2/3] Kod…"
tar czf "$DIR/app-files.tar.gz" -C "$APP" \
  --exclude=node_modules --exclude=.git --exclude=dist --exclude=uploads .
cp "$APP/.env" "$DIR/.env.bak"

echo "[3/3] Media (video, avatar, hujjat)…"
PREV="$(ls -1dt "$MEDIA_ROOT"/*/ 2>/dev/null | head -1 || true)"
mkdir -p "$MEDIA_ROOT/$TS"
rsync -a --delete --exclude=tts-cache \
  ${PREV:+--link-dest="$PREV"} \
  "$APP/uploads/" "$MEDIA_ROOT/$TS/"

# Eski media suratlari — faqat oxirgi KEEP_MEDIA tasi qoladi.
ls -1dt "$MEDIA_ROOT"/*/ 2>/dev/null | tail -n +$((KEEP_MEDIA + 1)) | xargs -r rm -rf

# Eski zaxiralar: oxirgi KEEP_BACKUPS ta + har oydan bittasi.
prune_backups run

{
  echo "sana:  $TS"
  echo "baza:  $DIR/falarus_db.sql.gz"
  echo "kod:   $DIR/app-files.tar.gz"
  echo "media: $MEDIA_ROOT/$TS  (video/avatar/hujjat, tts-cache'siz)"
} > "$DIR/manifest.txt"

echo
echo "Tayyor: $DIR"
du -sh "$DIR" "$MEDIA_ROOT/$TS"
echo "Media jami (qattiq havolalar bilan): $(du -sh "$MEDIA_ROOT" | cut -f1)"
