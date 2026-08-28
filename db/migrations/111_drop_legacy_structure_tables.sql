DROP TABLE IF EXISTS public.lesson_task_results CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.question_content CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.speaking_results CASCADE;
DROP TABLE IF EXISTS public.speaking_tasks CASCADE;
DROP TABLE IF EXISTS public.subscription_payment_requests CASCADE;
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.user_answers CASCADE;
-- user_course_daily_activity O'CHIRILMAYDI.
--
-- U eski tuzilmaning qoldig'i emas: `kunlikCompletionSideEffects` va
-- `/api/stats/record-course-day` unga HOZIR ham yozadi. Ilgari bu yerda
-- o'chirilar, keyin `_107_stats_tables.sql` uni qayta yaratardi — ya'ni
-- jadval faqat migratsiyalar tartibi tufayli omon qolardi. Endi u
-- 106a da yaratiladi va bu yerda tegilmaydi.
DROP TABLE IF EXISTS public.user_vocabulary_step2_attempts CASCADE;
DROP TABLE IF EXISTS public.user_word_group_progress CASCADE;
DROP TABLE IF EXISTS public.vocabulary_subtopics CASCADE;
DROP TABLE IF EXISTS public.vocabulary_text_dictionary CASCADE;
DROP TABLE IF EXISTS public.vocabulary_topics CASCADE;
DROP TABLE IF EXISTS public.vocabulary_word_groups CASCADE;
DROP TABLE IF EXISTS public.vocabulary_words CASCADE;
