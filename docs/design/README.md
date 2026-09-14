# FalaRus — yagona UI/UX

**So‘nggi yangilanish:** [rasmga mos sayohat xaritasi](JOURNEY_REFERENCE.md).

Oldingi asosiy panel: [yangi joylashuv](HOME_DASHBOARD.md).

Tezlik tuzatishi: [interfeys tezligini tuzatish](PERFORMANCE_FIX.md).

O‘yin dizayni: [to‘rtta o‘yinning alohida fonlari](GAME_BACKGROUNDS.md).

Panel fonlari: [har bir bo‘lim uchun alohida fon](PANEL_BACKGROUNDS.md).

Oldingi rangli mavzu: [rangli va harakatlanuvchi interfeys](LUMINOUS_REVISION.md).

Oldingi ko‘rinish: [akademik interfeys](ACADEMIC_REVISION.md).

**Amaldagi ilovaga integratsiya va deploy yakunlandi:** [deploy hisoboti](DEPLOY_2026-09-07.md). Quyidagi bo‘limlar dastlabki prototip auditini hujjatlashtiradi.

## Ochish

`npm run design` → http://127.0.0.1:5174/design.html

Statik yig‘ma: `npm run design:build` → `dist-design/design.html` (HTTP server orqali ochiladi).

Bu alohida React kirish nuqtasi: auth, API, to‘lov, chat serveri, service worker yoki `.env` yuklanmaydi. Namuna foydalanuvchilari va ko‘rsatkichlari haqiqiy hisob ma’lumotlari emas. Ustoz tanlash va tarif tugmalari hech qanday tashqi amal bajarmaydi. Suhbat xabarlari faqat sahifa xotirasida qoladi.

## Audit va qarorlar

77 sahifa moduli kod asosida inventar qilindi: [to‘liq ro‘yxat](page-inventory.md). Audit barcha sahifalarda haqiqiy hisob bilan qo‘lda ishlash yoki foydalanuvchi tadqiqoti o‘rnini bosmaydi.

| Sahifa oilasi | Hozirgi koddagi farq | Yagona qoida va namuna |
|---|---|---|
| Landing, kirish, ro‘yxatdan o‘tish, parol tiklash | Auth Nunito, asosiy ilova Manrope; auth tugmalari alohida yorqin ko‘k va chuqur soya | Bitta sans-serif oilasi, aniq label va xato, asosiy amal bir xil; Kirish namunasi |
| Kunlik xarita, kun va mashqlar | Xarita 448px, kunlik sahifa 820px; ko‘p maxsus kartalar va holatlar | Bosh ekranda bitta “davom ettirish”; mashqda ixcham fokus rejimi, tekshirish va izoh |
| Kurslar, patent, ВНЖ | Maxsus kartalar, alohida sarlavha o‘lchamlari | Kurs holati, davom etish, bir xil PageHeader; haqiqiy CoursesPage sarlavhasi ulandi |
| O‘yinlar | Har bir kartada alohida gradient, 10–11px ikkilamchi yozuvlar | Bir xil neytral karta; turini ikonka va matn ajratadi; haqiqiy GamesPage sarlavhasi ulandi |
| Suhbat, yordam, efir | 512px va 896px kontent; efir to‘liq ekran | Suhbatda o‘qish/yozish ustuvor; jonli efir boshqaruvi fokus rejimida saqlanadi |
| Ustozlar va profillar | Kartalar hamda kabinet o‘ziga xos uslubda | Tajriba, til, mavjudlik, asosiy amal bir tartibda |
| Statistika va profil | `pmn` palitrasi, serif sarlavhalar; `app` palitrasidan boshqa ohang | O‘qiladigan sans-serif, bir xil sirt/chegara; natijalar matn bilan ham tushuntiriladi |
| Tarif va to‘lov | Premium bezaklari va alohida sarlavha uslubi | Davr va tarif aniq; to‘lovda summa, provayder va holat; namunada narx ixtiro qilinmagan |
| Ustoz kabineti | O‘z sidebar, header va tab tizimi | Bir xil sirt va komponentlar, ishga mos zichlik; jadval namunasi |
| Admin | Qattiq 216px sidebar, inglizcha/o‘zbekcha aralash navigatsiya | Bir xil dizayn asosi, o‘zbekcha amallar, jadval ichidagi gorizontal scroll; panel namunasi |
| Huquqiy va yordam | Alohida sahifa qobiqlari | Ixcham matn kengligi, aniq qaytish yo‘li, umumiy sarlavha |

## Vizual tizim

- Brendning mavjud to‘q ko‘k va oltin ohangi saqlanadi. Oltin premium va kichik urg‘u uchun; asosiy amal ko‘k. Rang hech qachon holatning yagona belgisi emas.
- `app-*` semantik ranglari yagona manba. `pmn-*` mavjud sahifalar uchun moslik qatlami bo‘lib qoladi; ularni birdan almashtirish chuqur ko‘k fonlardagi kontrastni buzishi mumkin.
- Asosiy shrift: mavjud Manrope, tizim sans-serif zaxirasi. Namuna tashqi shrift yuklamaydi. Sarlavha 26–34px, tana 14–16px, yordamchi matn 12–14px. Sidebar kabi ikkilamchi ixcham joylar alohida.
- Bo‘shliq: 4 / 8 / 16 / 24 / 32 / 48px. Karta radiusi 24px, amal 16px. Kam soya, aniq chegara.
- Tugma va forma kamida 48px; ikonka amali 44px. Fokus halqasi, disabled va loading holatlari mavjud. `prefers-reduced-motion` tugma va spinnerda hisobga olingan.
- Telefon: pastki tezkor menyu va barcha bo‘limlar uchun select. Desktop: chap navigatsiya, asosiy kontent va qo‘shimcha natijalar ustuni. Mobil select — namuna ekranlarini tez solishtirish vositasi; ishlab chiqarishdagi yakuniy navigatsiya yechimi emas.
- O‘quvchi, ustoz, admin bir komponent tizimidan foydalanadi; vazifalari va ruxsatlari alohida qoladi.

## Interaktiv oqimlar

Bugungi reja → mashq → javob tanlash → tekshirish va izoh → yakunlash → reja holati yangilanishi. Qidiruv va bo‘sh natija, profil ismini mahalliy saqlash, qorong‘i/yorug‘ mavzu, tarif davri, suhbatga mahalliy xabar, namuna kirish formasi. UI kit orqali tugmalar, xato, loading, disabled, badge, progress va bo‘sh holatlarni solishtirish mumkin.

## Kodga kiritilgan asos

`src/components/ui/Foundation.tsx`: Button, Card, Badge, PageHeader, Field, Progress, EmptyState. Tiplashtirilgan va biznes mantiqisiz; Field label va xato izohini bog‘laydi, Progress chegaralarni tekshiradi.

`src/styles/foundation.css`: mavjud semantik palitraga tayangan, `ui-*` bilan chegaralangan stillar. `index.css` orqali ulanadi. CoursesPage va GamesPage yangi PageHeader ishlatadi. Boshqa haqiqiy sahifalar avtomatik qayta yozilmadi.

`src/design/`: shu komponentlardan foydalangan 11 ekran va 2 ish kabineti; alohida HTML/Vite konfiguratsiyasi. Ishlab turgan asosiy ilovaga namuna marshruti yoki autentifikatsiya aylanma yo‘li qo‘shilmagan.

## Barcha sahifalarga ko‘chirish tartibi

1. Umumiy header, tugma, forma va kartalarni auth/student/teacher/admin oilalari bo‘yicha ko‘chirish. Har oilada real loading/error/empty/permission holatlarini saqlash.
2. Kunlik xarita va mashqlar: 182 kunlik progress, qulflangan darslar, audio, to‘g‘ri/noto‘g‘ri javob, oflayn/qayta urinish holatlarini amaldagi API bilan tekshirish.
3. Suhbat, ustoz, yordam, efir: klaviatura ochilganda composer, o‘qilmagan xabarlar, qo‘ng‘iroq overlay va video boshqaruvini qurilmada tekshirish.
4. Tarif/to‘lov: haqiqiy summa va provayder holatlarini saqlab, kutilmoqda/muvaffaqiyat/rad/qayta urinishni bir xil tizimga ko‘chirish.
5. Admin va ustoz: uzun jadvallar, filtrlash, hujjatlar, ruxsatlar, mobil navigation. Ko‘chirilgan oilalardan ortiqcha rang/font uslublarini keyin olib tashlash.

Qabul mezonlari: 375/390px da sahifa gorizontal siljimasligi; 200% kattalashtirilgan matn; klaviatura va ekran o‘quvchi; yorug‘/tungi kontrast; ruscha/o‘zbekcha uzun matn; yuklanish, xato, bo‘sh va ruxsatsiz holatlar; haqiqiy oqim testlari. Hozirgi tekshiruv to‘liq accessibility yoki barcha haqiqiy sahifalar regressiya auditi emas.

## Bajarilgan tekshiruv

- TypeScript: `npm run lint` muvaffaqiyatli.
- Asosiy ilova: `npm run build` muvaffaqiyatli; avvalgi 500 kB dan katta o‘yin chunk ogohlantirishi qolgan.
- Alohida namuna: `npm run design:build` muvaffaqiyatli.
- Headless Chrome: 11 ekran × 4 kenglik (375, 390, 768, 1440px) va mobil ustoz/admin — 46 holat; sahifa kengligi bo‘yicha overflow va Runtime exception qayd etilmadi. Tafsilot: [browser-check.json](browser-check.json).
- Mashqda javob tanlash, tekshirish va yakunlash bosqichlari sinovdan o‘tdi.
- Desktop, telefon va tungi telefon skrinshotlari ko‘zdan kechirildi; tungi success badge kontrasti tuzatildi.
- [Desktop](desktop.png), [Telefon](mobile.png), [Tungi rejim](mobile-dark.png), [Admin](admin.png).

Bu natijalar alohida dizayn namunasiga tegishli. Barcha 77 haqiqiy sahifa yangi tizimga ko‘chirildi, degani emas; prototipning o‘zi serverga chiqarilmagan. Keyingi amaldagi UI deployi yuqoridagi alohida hisobotda qayd etilgan.
