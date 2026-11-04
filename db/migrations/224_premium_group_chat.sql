-- PREMIUM GURUH CHATI.
--
-- Yangi guruh mavjud jadvallarda `group_code = 'premium'` bilan yashaydi:
-- xabarlar, media, reaksiyalar, o'qilganlik, onlayn va "yozmoqda" holati
-- savol-javob guruhi bilan bir xil ishlaydi. A'zolik alohida jadvalda
-- saqlanmaydi — kirish huquqi har so'rovda amaldagi obuna bo'yicha
-- serverda tekshiriladi, shuning uchun obuna tugashi bilan odam avtomatik
-- guruhdan chiqadi, yangi obunachi esa darhol qo'shiladi.
--
-- Bu migratsiya faqat ruxsat etilgan guruh kodlarini cheklaydi, toki
-- xato kod bilan "yetim" guruh paydo bo'lmasin. NOT VALID — eski qatorlar
-- tekshirilmaydi (jadvalni qulflamaydi), cheklov faqat yangi yozuvlarga.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'community_group_messages',
    'community_group_reads',
    'community_group_presence',
    'community_group_typing'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = t || '_group_code_check'
        AND conrelid = ('public.' || t)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (group_code IN (''savol_javob'', ''premium'')) NOT VALID',
        t,
        t || '_group_code_check'
      );
    END IF;
  END LOOP;
END $$;

-- Premium a'zolarni sanash va "@" qidiruvi uchun: oltin hisoblar kam,
-- qisman indeks ularni to'liq skanerlashsiz topadi.
CREATE INDEX IF NOT EXISTS idx_users_is_golden_true
  ON public.users (id)
  WHERE is_golden = true;
