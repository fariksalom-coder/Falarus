# Teacher Marketplace Plan

## Umumiy model

Platformada `O‘qituvchilar` bo‘limi bo‘ladi. O‘quvchi o‘qituvchi kartasini ko‘radi, pullik sinov darsiga yoziladi, to‘lovdan keyin o‘qituvchining aloqa ma’lumotlari va ichki chat ochiladi. O‘qituvchi dars haqida bildirishnoma oladi, darsdan keyin uni yakunlaydi. Shundan so‘ng o‘quvchi ham, o‘qituvchi ham feedback qoldiradi.

## O‘qituvchi anketa maydonlari

- Ism, familiya.
- Yosh.
- Ish tajribasi: yil va oy.
- Rasm.
- Region/shahar.
- Dars formati: online, offline yoki online/offline.
- Oylik individual kurs narxi.
- Telegram, WhatsApp, Max, telefon, email.
- Fanlar, darajalar, tillar.
- About me.
- Profil statusi: draft, pending review, active, paused, rejected.
- Ro‘yxatda chiqish muddati: `listing_paid_until`.

## To‘lovlar

### O‘qituvchi ro‘yxatda chiqishi

- Haqiqiy narx: `299 000 UZS / oy`.
- Birinchi oy promo: `69 000 UZS`.
- Payment product: `teacher_listing`.
- To‘lov Rahmat yoki karta orqali amalga oshiriladi.
- To‘lov tasdiqlanganda `teacher_listing_subscriptions` active bo‘ladi va `teacher_profiles.listing_paid_until` yangilanadi.

### O‘quvchi sinov darsi

- Narx: `490 RUB`.
- UZS hisoblash: `490 * 150 = 73 500 UZS`.
- Payment product: `teacher_trial`.
- RUB tanlansa karta transfer oqimi, UZS tanlansa Rahmat/karta oqimi ishlatiladi.
- To‘lovdan keyin o‘quvchiga o‘qituvchi kontaktlari va ichki chat ochiladi.

## Sinov darsi lifecycle

1. O‘quvchi o‘qituvchini tanlaydi va sinov darsiga yoziladi.
2. `teacher_trial_lessons.status = pending_payment`.
3. To‘lov tasdiqlansa status `paid`.
4. Kontaktlar `teacher_trial_contacts_shared` ga snapshot qilinadi.
5. O‘qituvchiga `teacher_notifications` orqali xabar boradi.
6. Ichki chat `teacher_conversations` orqali ochiladi.
7. O‘qituvchi darsni yakunlaydi: `completed_by_teacher`.
8. O‘quvchiga review form ochiladi.
9. O‘quvchi review qoldiradi.
10. O‘qituvchi feedback qoldiradi.
11. Ikkala tomondan “oylik kursga yozildimi?” javobi solishtiriladi.

## Review savollari

### O‘quvchi review

- Dars yoqdimi?
- Qaysi platformada o‘tdi? Telegram, WhatsApp, Max, Zoom, Google Meet, telefon yoki boshqa.
- Dars qancha davom etdi?
- Nima yoqdi?
- Nima yetishmadi?
- Kamchiliklar.
- Erkin fikr.
- Oylik kursga yozildingizmi?

### O‘qituvchi feedback

- Dars yaxshi o‘tdimi?
- Plus tomonlar.
- Minus tomonlar.
- Qiyinchiliklar.
- Keyingi qadamlar.
- Erkin izoh.
- O‘quvchi oylik kursga yozildimi?

## Admin panel bo‘limlari

### O‘qituvchilar

- Profil ro‘yxati.
- Status: draft, pending review, active, paused, rejected.
- To‘lov statusi va `listing_paid_until`.
- Profilni ko‘rish/tasdiqlash/to‘xtatish.

### O‘qituvchi to‘lovlari

- Kim to‘ladi, kim to‘lamadi.
- Muddat tugashiga yaqin profillar.
- Birinchi oy promo ishlatilganmi.

### Sinov darslari

- Kim yozildi.
- To‘lov statusi.
- O‘qituvchi darsni yakunladimi.
- O‘quvchi review qoldirdimi.
- O‘qituvchi feedback qoldirdimi.

### Oylik kursga yozilish solishtirish

- O‘quvchi “yozildim” dedi.
- O‘qituvchi “yozildi” dedi.
- Mos holatlar: matched yes / matched no.
- Konflikt holatlar: conflict.
- Admin izohi va resolved statusi.

## API bosqichlari

- `GET /api/teachers`: aktiv, to‘lov muddati bor o‘qituvchilar.
- `GET /api/teachers/:id`: public profil.
- `POST /api/teachers/:id/trial-lessons`: sinov darsi yaratish.
- `POST /api/teacher-trials/:id/pay`: to‘lov boshlash.
- `GET /api/teacher-trials/:id/contact`: to‘lovdan keyingi kontakt snapshot.
- `GET /api/teacher-chat`: o‘quvchi/o‘qituvchi chatlari.
- `POST /api/teacher-chat/:id/messages`: xabar yuborish.
- `POST /api/teacher-trials/:id/student-review`: o‘quvchi review.
- `POST /api/teacher-trials/:id/teacher-feedback`: o‘qituvchi feedback.
- `GET /api/teacher/me`: o‘qituvchi kabineti.
- `PUT /api/teacher/me/profile`: anketa tahrirlash.
- `GET /api/admin/teachers`: admin ro‘yxati.
- `GET /api/admin/teacher-trials`: admin sinov darslari.
