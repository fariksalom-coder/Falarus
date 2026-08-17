-- CHATDA BLOKLASH (o'qish rejimi).
--
-- Bloklangan odam guruh chatida va sherik chatida YOZOLMAYDI — faqat o'qiydi.
-- Yagona ochiq kanal: Support (yordam chati). Blokni admin va oltin support
-- hisobi qo'yadi, tahrirlaydi (sabab, muddat) va olib tashlaydi.
--
-- Bir foydalanuvchida bir vaqtda faqat bitta faol blok bo'ladi; olib tashlangani
-- `released_at` bilan belgilanadi va tarix sifatida saqlanib qoladi.

CREATE TABLE IF NOT EXISTS public.chat_blocks (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reason              TEXT,
  -- NULL = muddatsiz. Muddat o'tsa blok o'z-o'zidan tugaydi.
  expires_at          TIMESTAMPTZ,
  released_at         TIMESTAMPTZ,
  -- Kim qo'ygani: support hisobi (users.id) yoki admin (admins.id).
  blocked_by_user_id  BIGINT,
  blocked_by_admin_id BIGINT,
  blocked_by_name     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bir odamda bir vaqtda bitta faol blok.
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_blocks_active_user
  ON public.chat_blocks (user_id)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_blocks_created
  ON public.chat_blocks (created_at DESC);

-- Guruh xabarlarini moderatsiya qilish: o'chirish yumshoq (tarix qoladi),
-- tahrirlanganda esa buni foydalanuvchi ko'radi.
ALTER TABLE public.community_group_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_community_messages_not_deleted
  ON public.community_group_messages (group_code, created_at DESC)
  WHERE deleted_at IS NULL;
