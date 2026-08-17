-- OLTIN A'ZO (support hisobi).
--
-- Platformada uchta maqom bor edi: o'quvchi, o'qituvchi, admin. Bu — to'rtinchi
-- va eng yuqorisi: ichki xizmat hisobi.
--
-- Qoidalari:
--   • barcha darslar, o'yinlar va kurslar to'liq ochiq (to'lovsiz);
--   • admin uni bloklay olmaydi va o'chira olmaydi;
--   • admin ro'yxatlarida, statistikada va reytingda KO'RINMAYDI —
--     ya'ni kuzatib bo'lmaydi.
--
-- Belgi ustun sifatida saqlanadi: kod uni bir joyda tekshiradi va hamma
-- joyda bir xil ishlaydi.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_golden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_golden
  ON public.users (is_golden)
  WHERE is_golden;

-- Support hisobi — telefon bo'yicha (id bo'yicha emas: id almashishi mumkin).
UPDATE public.users
SET is_golden = true
WHERE phone = '+998955997703';
