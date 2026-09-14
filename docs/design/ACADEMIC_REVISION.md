# Akademik interfeys — 2026-09-07

Rangli o‘yin xaritasi o‘rniga kurs bosqichlari, joriy dars, davom ettirish tugmasi va ketma-ket mashg‘ulotlar joylashtirildi. Profil haqiqiy hisob ma’lumotlari bilan ixchamlashtirildi. Kurs kartalari va statistika bezaklari soddalashtirildi.

Umumiy mavzu oq/kulrang yuzalar, to‘q ko‘k navigatsiya, yagona tugma, sarlavha va karta uslublarini qo‘llaydi. O‘qituvchining mobil menyusi ham shu ranglarga moslashtirildi. Qorong‘i mavzu saqlangan.

## Tekshiruv

- TypeScript tekshiruvi va mahalliy testlar muvaffaqiyatli; production build tayyorlandi.
- 375, 390 va 1440 px: 15 sahifa/o‘lcham holatida gorizontal chiqish yoki render xatosi aniqlanmadi.
- Alohida brauzer tekshiruvida bepul kirish chegarasi, premium dars yo‘nalishi, golden kunlari va mashg‘ulot qulflari tekshirildi.
- Brauzerdagi himoyalangan sahifalar namuna API javoblari bilan tekshirildi; haqiqiy hisobda to‘lov yoki ma’lumot o‘zgartirilmagan.
- Build dagi katta VerbConjugationGamePage bo‘lagi haqidagi mavjud ogohlantirish saqlanadi.

## Ko‘rinishlar

[Asosiy sahifa — desktop](live-learning-1440.png) · [Telefon](live-learning-390.png) · [Profil](live-profile-390.png) · [Kurslar](live-courses-390.png) · [Qorong‘i mavzu](academic-learning-dark.png)

[Brauzer matriks natijalari](academic-browser-check.json) · [Kirish va dars oqimi](academic-flow-check.json)

Bu yangilanish umumiy vizual tizim va asosiy o‘quv sahifalariga tegishli; har bir ichki mashq sahifasi alohida qayta loyihalashtirilmagan.

## Deploy

Yangi interfeys 82.115.50.100 serveridagi https://falarus.uz saytiga joylandi. Serverda TypeScript, 185 test (31 to‘plam) va production build muvaffaqiyatli o‘tdi. HTML/CSS HTTP 200, akademik CSS selektorlari, PWA v26 va API health tekshirildi. Mobil login sahifasida gorizontal chiqish yoki render xatosi yo‘q.

Avvalgi manba: `/home/ubuntu/backups/ui-academic-before-20260907.tar.gz`; avvalgi yig‘ma: `dist.rollback`. Deploy ro‘yxati 7 ta interfeys faylidan iborat.
