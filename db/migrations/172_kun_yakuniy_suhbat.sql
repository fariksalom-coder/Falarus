-- KUN YAKUNIY SUHBATI — kun vazifalari tugagach o'tiladigan og'zaki imtihon.
--
-- MAQSAD: vazifalarni bosib o'tish bilan MAVZUNI BILISH bir xil emas.
-- O'quvchi testda tanlab to'g'ri javob berishi, ammo o'sha mavzuda gapira
-- olmasligi mumkin. Yakuniy suhbat aynan shuni tekshiradi.
--
-- ENG MUHIM TUSHUNCHA — `manba_kun`:
-- Har bir savol QAYSI KUN materialidan olinganini o'zida saqlaydi. Savollar
-- faqat joriy kundan emas, o'quvchi allaqachon o'tgan kunlardan ham tuziladi.
-- Shuning uchun javob berilmagan savol topilganda "bu 5-kun mavzusi, o'sha
-- kunni qayta o'rgan" deb aniq ko'rsatish mumkin bo'ladi. Bu ustun bo'lmasa,
-- o'quvchiga faqat "bilmadingiz" deyish mumkin edi, "qayerdan o'rganish
-- kerakligi" esa noma'lum qolardi.

CREATE TABLE IF NOT EXISTS public.kun_suhbat_urinish (
  id           BIGSERIAL   PRIMARY KEY,
  user_id      BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  /** Qaysi kunning yakuniy suhbati. */
  day_number   INTEGER     NOT NULL CHECK (day_number BETWEEN 1 AND 182),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  /** Suhbat yakunlanganda to'ladi. Bo'sh bo'lsa — urinish tashlab ketilgan. */
  finished_at  TIMESTAMPTZ,
  savol_soni   SMALLINT    NOT NULL DEFAULT 0,
  togri_soni   SMALLINT    NOT NULL DEFAULT 0,
  /** Yakunda hisoblanadi: togri_soni / savol_soni >= o'tish chegarasi. */
  otdi         BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_kun_suhbat_user_day
  ON public.kun_suhbat_urinish (user_id, day_number, created_at DESC);

-- "Bu kunni o'tganmi" degan savol eng ko'p beriladi — shu uchun alohida.
CREATE INDEX IF NOT EXISTS idx_kun_suhbat_otgan
  ON public.kun_suhbat_urinish (user_id, day_number)
  WHERE otdi = true;

CREATE TABLE IF NOT EXISTS public.kun_suhbat_savol (
  id          BIGSERIAL PRIMARY KEY,
  urinish_id  BIGINT    NOT NULL REFERENCES public.kun_suhbat_urinish(id) ON DELETE CASCADE,
  tartib      SMALLINT  NOT NULL,
  savol       TEXT      NOT NULL,
  /** Namunali javob — o'quvchi xato qilsa shu ko'rsatiladi. */
  namuna      TEXT      NOT NULL DEFAULT '',
  /**
   * SAVOL QAYSI KUN MATERIALIDAN. Joriy kun yoki undan oldingi istalgan kun.
   * Xato qilinganda o'quvchi aynan shu kunga qaytariladi.
   */
  manba_kun   INTEGER   NOT NULL CHECK (manba_kun BETWEEN 1 AND 182),
  /** Manba kunning mavzusi — o'quvchiga "nimani qayta o'rganish" ni aytish uchun. */
  manba_mavzu TEXT      NOT NULL DEFAULT '',
  javob       TEXT,
  /** NULL = hali javob berilmagan. */
  togri       BOOLEAN,
  izoh        TEXT,
  javob_vaqti TIMESTAMPTZ,
  UNIQUE (urinish_id, tartib)
);

CREATE INDEX IF NOT EXISTS idx_kun_suhbat_savol_urinish
  ON public.kun_suhbat_savol (urinish_id, tartib);

COMMENT ON TABLE public.kun_suhbat_urinish IS
  'Kun yakuniy og''zaki suhbati — bitta urinish.';
COMMENT ON COLUMN public.kun_suhbat_savol.manba_kun IS
  'Savol qaysi kun materialidan olingani. Xatoda o''quvchi shu kunga qaytariladi.';
