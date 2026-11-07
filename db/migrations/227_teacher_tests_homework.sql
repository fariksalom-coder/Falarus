-- O'QITUVCHI TESTLARI VA UY VAZIFALARI.
--
-- teacher_tests   — o'qituvchi tuzgan testlar (savollar JSON: matn, variantlar, to'g'ri javob, izoh).
--                   Darsda doskaga chiqariladi yoki uy vazifasi qilib beriladi.
-- teacher_homework — o'qituvchi o'quvchiga bergan vazifa: test, lug'at ro'yxati yoki fayl (material).
--                   Test vazifasida savollar nusxasi saqlanadi — o'qituvchi testni keyin o'zgartirsa ham
--                   berilgan vazifa o'zgarmaydi.

BEGIN;

CREATE TABLE IF NOT EXISTS public.teacher_tests (
  id               bigserial PRIMARY KEY,
  teacher_user_id  integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title            text NOT NULL,
  questions        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_tests_teacher ON public.teacher_tests (teacher_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_homework (
  id               bigserial PRIMARY KEY,
  teacher_user_id  integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_user_id  integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('test', 'words', 'file')),
  title            text NOT NULL,
  note             text NOT NULL DEFAULT '',
  test_id          bigint REFERENCES public.teacher_tests(id) ON DELETE SET NULL,
  questions        jsonb,
  material_id      bigint REFERENCES public.teacher_materials(id) ON DELETE SET NULL,
  words            jsonb,
  due_at           timestamptz,
  status           text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'done')),
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  score            integer,
  total            integer,
  seen_at          timestamptz,
  done_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_homework_student ON public.teacher_homework (student_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_homework_teacher ON public.teacher_homework (teacher_user_id, created_at DESC);

COMMIT;
