# Asosiy panel — taqdim etilgan yo‘l xaritasi namunasi

Foydalanuvchi yuborgan rasm asosida asosiy panel ko‘k-oltin sayohat xaritasiga qayta ishlangan. Screenshot ilovaga fon sifatida yopishtirilmagan: progress, kun, bosqichlar, darslar holati va tugmalar real komponentlar bilan ishlaydi.

- 182 kunlik progress, jumladan joriy kundagi tugallangan qadamlar ulushi.
- Bosqich lavhasi, egri yo‘l, oltin tanga, bayroq, sandiq va sertifikat motivlari.
- Joriy kun doirasi va “Bugun shu yerda” belgisi.
- Bajarilgan darslarda yashil tasdiq, faol darsda “HOZIR”, keyingi darslarda qulf.
- Telefonda namunaga mos vertikal kompozitsiya; desktopda xarita va darslar kartasi yonma-yon.
- Pastda kun va bosqich tanlash saqlanadi. Mobil navigatsiyaning ko‘k foni faqat ushbu sahifada qo‘llanadi.

Yo‘l inline SVG, boshqa bezaklar CSS va kichik rasmlar bilan ishlaydi. Video yoki cheksiz animatsiya qo‘shilmagan. Qorong‘i mavzu mavjud.

## Tekshiruv

375, 390 va 1440 px: horizontal chiqish yo‘q, davom ettirish tugmasi pastki navigatsiyadan yuqorida ko‘rinadi. Reference bilan solishtirish uchun 3/5 bajarilgan darsli namuna API ishlatilgan; bu foydalanuvchining real hisobidagi holatni o‘zgartirmaydi.

12 ta tekshiruv o‘tdi: uch ekran o‘lchami, kelajak kunlari qulfi, gapirish darsiga o‘tish, bepul chegara, premiumning to‘g‘ri kunga o‘tishi, golden kunlari va dars ketma-ketligi, profilga o‘tganda alohida dizaynning saqlanishi. Mahalliy TypeScript va production build o‘tdi. Yangi sertifikatning yuklanishi va haqiqiy 3/5 holatida 0,3% progress ko‘rsatilishi alohida tekshirildi.

[Telefon](journey-reference-390.png) · [Desktop](journey-reference-1440.png) · [Qorong‘i mavzu](journey-reference-dark.png) · [Tekshiruv natijalari](journey-reference-check.json)

## Serverga joylash

2026-09-08: serverda lint va production build muvaffaqiyatli tugadi, yangi versiya faollashtirildi. Ochiq saytda asosiy panel CSS va sertifikat SVG fayllari HTTP 200 qaytardi, service worker v33 va API health tekshiruvi o‘tdi. Joylangan to‘rtta fayl mahalliy nusxalar bilan checksum orqali solishtirildi — farq yo‘q.

Oldingi manbalar `/home/ubuntu/backups/ui-journey-before-20260908.tar.gz`, oldingi build esa `dist.rollback` da saqlandi.

## Kunlar va bosqichlar xaritasi

Bosqichlar jadvali oltin lavhalar ketma-ketligiga almashtirildi. Tanlangan bosqichning kunlari egri oltin yo‘l ustida doira belgilar bilan ko‘rinadi. Kunlar klaviatura tartibida 1 dan oxirigacha ketadi; vizual yo‘l har qatorda yo‘nalishini almashtiradi. Bajarilgan kunlar yashil, joriy kun ko‘k, kelajak kunlar kulrang va qulflangan. Bir vaqtda bitta bosqich kunlari chiziladi; yangi animatsiya yoki video qo‘shilmagan.

12 ta brauzer regressiya tekshiruvi va barcha 6 bosqichning chegaralari tekshirildi: 1–30, 31–60, 61–90, 91–120, 121–150, 151–182. Jami 182 kun, takror yoki bo‘shliq yo‘q. TypeScript va build o‘tdi. API sinov ma’lumotlari ishlatildi, real foydalanuvchi progressi o‘zgartirilmadi.

[Yangi mobil xarita](journey-stages-map-390.png) · [Desktop xarita](journey-stages-map-1440.png) · [Regressiya](journey-stages-check.json) · [182 kun tekshiruvi](journey-stages-all-days-check.json)

Serverda lint va build muvaffaqiyatli tugadi, yangilanish faollashtirildi. Ochiq saytdagi yangi xarita CSS fayli HTTP 200, service worker v34 va API health tekshiruvlari o‘tdi. Ushbu yangilanishdan oldingi uchta fayl `/home/ubuntu/backups/ui-journey-stages-before-20260908.tar.gz` da saqlandi.
