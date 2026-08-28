-- O'CHIRILGAN NARSALAR BAZADA QOLIB KETMASIN.
--
-- Ilgari o'chirish faqat YUMSHOQ edi: `deleted_at` qo'yilardi va yozuv
-- bazada abadiy yotaverardi. Endi yumshoq o'chirish faqat qisqa muhlat —
-- undan keyin yozuv ham, fayli ham butunlay yo'q qilinadi.
--
-- NEGA DARHOL EMAS, BIR OZ MUHLAT BILAN:
--   * tasodifan o'chirilgan narsani qaytarish imkoni qoladi;
--   * o'chirish paytida lentani ochib turgan foydalanuvchi qattiq
--     xatoga emas, oddiy "topilmadi" holatiga tushadi.
-- Muhlat `OCHIRILGAN_SAQLASH_SOAT` bilan sozlanadi (sukut — 24 soat).

-- Kim nimani o'chirganining IZI. Bu jadvalda MATN HAM, FAYL HAM YO'Q —
-- faqat "qachon, nima turdagi yozuv, kimniki, kim o'chirdi". Bir qator
-- ~50 bayt, ya'ni joy yemaydi, ammo moderator o'z vakolatini suiiste'mol
-- qilsa bu bilinib qoladi. Mazmun esa haqiqatan uchib ketadi.
CREATE TABLE IF NOT EXISTS public.community_deletion_log (
  id             BIGSERIAL   PRIMARY KEY,
  /** 'reel' yoki 'message' */
  entity_type    TEXT        NOT NULL,
  /** O'chirilgan yozuvning eski id si — endi u jadvalda yo'q. */
  entity_id      BIGINT      NOT NULL,
  /** Muallif. Hisob o'chsa NULL bo'ladi, iz esa qoladi. */
  author_user_id INTEGER     REFERENCES public.users(id) ON DELETE SET NULL,
  /** Kim o'chirgan: muallifning o'zi, support yoki admin. */
  deleted_by     INTEGER     REFERENCES public.users(id) ON DELETE SET NULL,
  /** Foydalanuvchi o'chirishni bosgan payt. */
  deleted_at     TIMESTAMPTZ NOT NULL,
  /** Baza va diskdan butunlay ketgan payt. */
  purged_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  /** Fayl diskdan haqiqatan o'chirildimi. */
  file_removed   BOOLEAN     NOT NULL DEFAULT false,
  CONSTRAINT community_deletion_log_type_check
    CHECK (entity_type IN ('reel', 'message'))
);

CREATE INDEX IF NOT EXISTS idx_community_deletion_log_purged
  ON public.community_deletion_log (purged_at DESC);

COMMENT ON TABLE public.community_deletion_log IS
  'O''chirilgan rels/xabarlarning izi: mazmunsiz, faqat kim-qachon-nimani.';
