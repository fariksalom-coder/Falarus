-- LUG'AT 4-VAZIFASI (IBORALAR): YO'QOLGAN "BAJARILDI" BELGISINI TIKLASH.
--
-- `phrases_done` ilgari faqat alohida `/phrases/finish` so'rovi bilan yozilardi.
-- U yiqilsa, barcha iboralarga javob bergan o'quvchida vazifa bajarilmagan bo'lib
-- qolardi (hisobdan chiqib kirilganda yoki boshqa qurilmada ko'k ko'rinardi).
-- Endi server oxirgi javobning o'zida belgilaydi; bu migratsiya eski holatlarni
-- tuzatadi: kunning BARCHA iboralariga javob berilgan bo'lsa — vazifa bajarilgan.
-- Takror ishga tushirish xavfsiz: faqat false -> true, ball faqat oshadi.
--
-- CRM faollik triggeri vaqtincha o'chiriladi: aks holda bu tuzatish o'quvchilarning
-- support kalendarida "bugun vazifa bajardi" degan soxta faollik bo'lib chiqardi.

BEGIN;

ALTER TABLE public.user_kunlik_day_progress DISABLE TRIGGER support_crm_record_task_transitions;

WITH per_day AS (
  SELECT day_number, count(*) AS total
  FROM public.daily_phrase_mcqs
  WHERE day_number BETWEEN 1 AND 182
  GROUP BY day_number
),
answered AS (
  SELECT a.user_id,
         m.day_number,
         count(DISTINCT a.phrase_id) AS answered,
         count(*) FILTER (WHERE a.is_correct) AS correct
  FROM public.user_phrase_answers a
  JOIN public.daily_phrase_mcqs m ON m.id = a.phrase_id
  GROUP BY a.user_id, m.day_number
)
INSERT INTO public.user_kunlik_day_progress (user_id, day_number, phrases_done, phrases_correct, updated_at)
SELECT ans.user_id, ans.day_number, true, ans.correct, now()
FROM answered ans
JOIN per_day USING (day_number)
WHERE ans.answered >= per_day.total
ON CONFLICT (user_id, day_number) DO UPDATE
SET phrases_done = true,
    phrases_correct = GREATEST(public.user_kunlik_day_progress.phrases_correct, EXCLUDED.phrases_correct),
    updated_at = now()
WHERE public.user_kunlik_day_progress.phrases_done IS DISTINCT FROM true;

ALTER TABLE public.user_kunlik_day_progress ENABLE TRIGGER support_crm_record_task_transitions;

COMMIT;
