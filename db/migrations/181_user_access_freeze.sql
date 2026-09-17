-- Admin: foydalanuvchi kirishini vaqtincha muzlatish.
-- Muzlatilganda obuna / to'lov yozuvi saqlanadi, lekin premium kirish
-- yo'qoladi — go'yo hech narsa to'lanmagan. Admin ochganda (agar muddat
-- hali amalda bo'lsa) kirish qaytadi.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS access_frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_frozen_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_access_frozen
  ON public.users (access_frozen_at)
  WHERE access_frozen_at IS NOT NULL;

COMMENT ON COLUMN public.users.access_frozen_at IS
  'Admin muzlatgan payt. NULL = ochiq. To''lov bekor qilinmaydi, faqat kirish yopiladi.';
COMMENT ON COLUMN public.users.access_frozen_reason IS
  'Muzlatish sababi (admin izohi).';
