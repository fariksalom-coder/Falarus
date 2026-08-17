-- 157_teacher_listing_price_300k.sql
-- O'qituvchi ro'yxati narxi QAT'IY 300 000 so'm.
--
-- NEGA KERAK:
--   Migratsiya 121 `teacher_listing_first_month_uzs` ni 69 000 so'mlik promo
--   sifatida kiritgan, 123 esa faqat `teacher_listing_month_uzs` ni
--   300 000 ga ko'targan — birinchi oy kodi bazada 69 000 bo'lib qolgan.
--   `shared/paymentProducts.ts` allaqachon ikkalasini ham 300 000 deb biladi,
--   ya'ni baza bilan kod bir-biriga zid edi: interfeys 300 000 ko'rsatib,
--   bazadan narx oladigan yo'l 69 000 lik to'lov yozuvi ocha olardi.
--
--   Promo bekor qilingan. Eski kod o'chirilmaydi (tarixiy to'lov va obuna
--   yozuvlari unga bog'langan), faqat narxi tenglashtiriladi.

UPDATE public.teacher_listing_plans
   SET price_amount   = 300000,
       currency       = 'UZS',
       is_intro_offer = false,
       title          = 'O‘qituvchi ro‘yxati: 1 oy'
 WHERE code IN ('teacher_listing_first_month_uzs', 'teacher_listing_month_uzs');

-- CHECK cheklovi ataylab qo'yilmadi: bazada qo'lda qo'shilgan boshqa tarif
-- bo'lsa migratsiya yiqilib qolardi. Narxning yagona manbasi — koddagi
-- `getTeacherListingPriceUzs()`; server to'lov summasini o'shandan oladi,
-- shuning uchun bu jadval drift qilsa ham noto'g'ri summa yozilmaydi.
