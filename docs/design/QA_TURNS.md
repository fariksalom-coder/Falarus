# 5-bo‘lim: javobni kutadigan savol-javob (bekor qilingan)

**Holat:** foydalanuvchi talabiga ko‘ra bu o‘zgarish qaytarildi. Avvalgi jonli AI savol-javob komponenti zaxiradan tiklandi. Quyidagi yozuv bekor qilingan o‘zgarish tarixidir.

Foydalanuvchi jonli model javob olmasdan maqtashi, keyingi savolga o‘tishi va boshlanishda shovqin chiqarishini qayta bildirdi. 5-bo‘lim endi jonli WebSocket modelini mount qilmaydi. Mavjud kun savollari va yozib-yuborish baholash endpointi ishlatiladi.

1. Savol matni ochiladi. Boshlanishda mikrofon ham, audio ham avtomatik ochilmaydi.
2. “Savolni tinglash” savolni mavjud TTS orqali o‘qiydi.
3. Foydalanuvchi javobni yozib oladi yoki matn kiritadi. Ovoz faqat tahrirlanadigan matnga aylanadi, baholanmaydi.
4. “Javobni tekshirish” bosilgandagina mavjud `/api/ustoz/suhbat` ga savol va tasdiqlangan javob matni yuboriladi.
5. Bahodan keyin keyingi savol tugmasi ochiladi. O‘tish avtomatik emas. Oxirgi javobdan keyin ham yakunlash alohida bosiladi.

Bo‘sh javob, yozish/baholash jarayoni va eski javob holati keyingi savolni ochmaydi. Tez ikki marta bosish bitta baholash yuboradi. Savol almashganda matn va baho tozalanadi. Savolsiz yuklanish tugamaguncha sahifadan avtomatik chiqilmaydi. Kvota va baholash serverining mavjud qoidalari saqlangan.

## Tekshiruv

TypeScript va production build o‘tdi. [10 brauzer tekshiruvi](qa-turns-check.json): startda jonli komponent/audio yo‘q; javobsiz keyingisi yopiq; tinglash baholamaydi; bo‘sh transkripsiya baholanmaydi; yozuv avval matn bo‘ladi; tasdiq bir marta baholaydi; avtomatik o‘tish yo‘q; keyingi savol o‘z javobini talab qiladi; yakun faqat oxirgi tasdiqlangan javobdan so‘ng tugma bilan.

Brauzer sinovida haqiqiy UstozDoska komponenti, mock auth/recorder/TTS va mock API ishlatilgan. Sinov boshqaruv oqimini tekshiradi; AI baholash aniqligi yoki foydalanuvchi telefonidagi akustik sifatni tasdiqlamaydi. Pulli AI sessiya ochilmagan, real progress o‘zgarmagan.

## Deploy

Server lint va build muvaffaqiyatli tugadi, yangi versiya faollashtirildi. Ochiq saytdagi amaldagi dars modulida tinglash, javob matni va tekshirish boshqaruvlari bor; HTTP 200, PWA v37 va API health tekshiruvlari o‘tdi. Zaxira: `/home/ubuntu/backups/qa-turns-before-20260908.tar.gz`; oldingi build `dist.rollback` da.

## Jonli AI rejimini qaytarish

Foydalanuvchining bevosita talabi bilan `qa-turns-before-20260908.tar.gz` dagi UstozDoska komponenti tiklandi. Lokal TypeScript, brauzerda jonli komponent mount bo‘lishi va qo‘lda tasdiqlash yo‘qligi, server lint/build tekshirildi. Saytdagi amaldagi dars modulida jonli endpoint bor, qo‘lda tasdiqlash/matn oynasi yo‘q; PWA v38 va health tekshiruvlari o‘tdi.
