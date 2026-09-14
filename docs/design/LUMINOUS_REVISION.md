# Rangli va harakatlanuvchi interfeys — 2026-09-07

Umumiy mavzu ko‘k, binafsha va moviy ranglarga o‘tkazildi. Oqartirilgan sahifa fonlari o‘rnida rangli yorug‘lik gradientlari, yumshoq kartalar va chuqur rangli navigatsiya ishlatiladi.

Umumiy PageHeader dars jarayoni videosini ko‘rsatadi. Video ovozsiz, takrorlanadi va ekrandan chiqsa yoki brauzer oynasi yashirilsa to‘xtaydi. Pauza tugmasi tanlovni saqlaydi. Kamaytirilgan harakat yoki trafikni tejash rejimida statik poster ishlatiladi. Video yuklanmasa ham sarlavha rasm bilan ochiladi.

Kurs kartalari va o‘quv rejasi ichidagi kurs havolasiga mavjud ta’lim tasvirlari qo‘shildi. Video `/kunlik/dars-fon.mp4` (368 KB), poster va o‘quvchilar rasmi loyiha ichidagi mavjud fayllardan ishlatilgan. Yangi tashqi media yoki kutubxona qo‘shilmagan.

## Tekshiruv

- Mahalliy TypeScript va production build o‘tdi.
- 6 sahifa × 3 o‘lcham (375, 390, 1440 px): gorizontal chiqish yoki render xatosi aniqlanmadi.
- 14 brauzer tekshiruvi o‘tdi: dars qulflari, obuna chegarasi, premium yo‘nalishi, golden kirishi, admin menyusi, video yuklanishi, pauza va reduced-motion.
- Himoyalangan sahifalar namuna API javoblari bilan sinovdan o‘tkazildi; haqiqiy foydalanuvchi ma’lumotlari o‘zgartirilmagan.
- Kurs kartalariga rasmlar qo‘shilgach, 375 va 390 px holatlari alohida tekshirildi.
- Mavjud katta JavaScript bo‘lagi haqidagi build ogohlantirishi saqlangan.

[Desktop](luminous-learning-1440.png) · [Mobil](luminous-learning-375.png) · [Profil](luminous-profile-390.png) · [Kurslar](luminous-courses-390.png) · [Brauzer natijalari](luminous-browser-check.json)

Umumiy komponentlardan foydalanadigan o‘quvchi, o‘qituvchi va administrator panellari shu mavzuni oladi. Maxsus o‘yin yoki mashq ekranlarining har biriga video joylashtirilmagan.

## Deploy

Yangi versiya https://falarus.uz saytiga, 82.115.50.100 serveriga joylandi. Server TypeScript tekshiruvi va atomik build muvaffaqiyatli. Tashqi HTML/CSS, video va ikkala rasm HTTP 200 qaytardi; API health sog‘lom; PWA kesh versiyasi v27. Mobil login sahifasida gorizontal chiqish yoki render xatosi yo‘q.

Manba zaxirasi: `/home/ubuntu/backups/ui-luminous-before-20260907.tar.gz`. Oldingi yig‘ma: `dist.rollback`.
