# Bo‘limlarga mos to‘liq sahifa fonlari

Tanlangan ko‘k, binafsha va moviy ranglar saqlandi. Yangi vektor fonlari butun sahifaning skroll yuzasiga qo‘llanadi; ular faqat sarlavha ichida qolmaydi.

| Bo‘lim | Motiv |
| --- | --- |
| O‘quv rejasi | Bosqichlar, yo‘l va marralar |
| O‘yinlar va ichki o‘yin yo‘llari | Geympad, geometrik o‘yin elementlari |
| Statistika va admin kabineti | Grafiklar, ustunlar va o‘sish chiziqlari |
| Suhbat va yordam | Xabar pufakchalari va muloqot chiziqlari |
| Ustozlar va o‘qituvchi kabineti | Akademik qalpoq va dars doskasi |
| Profil va sozlamalar | Shaxsiy hisob, qalqon va halqalar |
| Kurslar | Ochiq kitob va sertifikat |

`PanelSceneProvider` manzilga qarab kontekst va ildiz CSS atributini yangilaydi. `AmbientMedia` endi bo‘limga mos tasvirni ko‘rsatadi; asosiy o‘quv sahifasida mavjud video saqlanadi. Fonlar dekorativ, ulardagi grafiklar haqiqiy statistik ma’lumot sifatida ko‘rsatilmaydi.

Yangi SVG fayllar original kod orqali chizilgan, tashqi media manbasi va yangi kutubxona qo‘shilmagan. O‘yinlarning o‘ziga tegishli mavjud video yoki sahna elementlari olib tashlanmagan.

## Ko‘rinishlar

[O‘yinlar](panel-games-390.png) · [Statistika](panel-statistics-390.png) · [Suhbat](panel-conversation-390.png) · [Ustozlar](panel-teachers-390.png) · [Profil](panel-profile-390.png) · [Kurslar](panel-courses-390.png) · [Sarlavhadan pastdagi fon](panel-profile-scrolled.png)

## Tekshiruv

375, 390 va 1440 px: yettita bo‘lim, ichki o‘yin yo‘li va sarlavhadan pastga skroll holati — barcha tekshiruvlar o‘tdi. Himoyalangan sahifalar namuna API javoblari bilan tekshirildi. Mahalliy TypeScript tekshiruvi o‘tdi.

[375 px natijalar](panel-scenes-check-375.json) · [390 px](panel-scenes-check-390.json) · [1440 px](panel-scenes-check-1440.json)

Menyu orqali o‘yinlar → statistika → profil almashishi ham alohida tekshirildi: sahifani to‘liq qayta yuklamasdan fon yangilanadi.

## Deploy

https://falarus.uz, 82.115.50.100 serveriga joylandi. Serverda TypeScript va atomik build muvaffaqiyatli. Yettita SVG manzili HTTP 200 bilan haqiqiy SVG qaytardi. Yangi CSS, PWA v28 va API health tekshirildi. Joylangan manba fayllari mahalliy nusxa bilan checksum bo‘yicha mos.

Zaxira: `/home/ubuntu/backups/ui-panel-scenes-before-20260907.tar.gz`; oldingi yig‘ma: `dist.rollback`. Build dagi oldindan mavjud katta JavaScript bo‘lagi haqidagi ogohlantirish saqlanadi.
