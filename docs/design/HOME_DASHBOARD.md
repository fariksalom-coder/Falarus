# Faqat asosiy panelning yangi joylashuvi

Asosiy o‘quv paneli uchun maxsus `home-dashboard.css` qo‘shildi. Barcha selektorlar `.home-dashboard` yoki shu sahifani o‘z ichiga olgan `.panel-scroll` bilan chegaralangan. Boshqa panellarning umumiy mavzusi o‘zgartirilmagan.

Yangi tartib:

1. Ixcham salomlashuv va joriy dars kartasi. Davom ettirish tugmasi birinchi ekranda ko‘rinadi.
2. Desktopda yonma-yon, telefonda ixcham kurs progressi.
3. Besh mashg‘ulot kartasi; faol, tugallangan va qulflangan holatlar ajratilgan.
4. Olti bosqichli kurs dasturi; faqat tanlangan bosqich kunlari chiziladi.
5. Imtihon kurslariga ixcham havola.

Asosiy fon yangi sokin gradientlar bilan ishlaydi. Video, cheksiz fon animatsiyasi va fixed fon qo‘shilmagan. Sahifaga tegishli dekorativ kun kartasi CSS va mavjud ikonka bilan yaratilgan.

## Tekshiruv

375, 390 va 1440 px: gorizontal chiqish yo‘q, CTA birinchi ekranda, beshta dars kartasi va tegishli qulflar mavjud. Oxirgi bosqichdagi kelajak kunlari qulflangan. To‘lov oynasi, premiumning to‘g‘ri kunga o‘tishi, golden kun tanlashi va profil dizaynining ta’sirlanmasligi tekshirildi. 11 tekshiruv o‘tdi; Runtime xatosi yo‘q. Himoyalangan sahifalar namuna API bilan sinalgan.

[Desktop](home-dashboard-1440.png) · [Mobil](home-dashboard-375.png) · [Qorong‘i mavzu](home-dashboard-dark.png) · [Tekshiruv natijalari](home-dashboard-check.json)

## Deploy

Faqat `DailyCourseMapPage.tsx`, yangi `home-dashboard.css` va PWA kesh versiyasi (`v31`) joylandi. Serverda TypeScript va atomik production build o‘tdi. Faol saytdagi yangi sahifa CSS’i HTTP 200 qaytardi, asosiy panel selektorlari va bir tekis fon sozlamalari tasdiqlandi. API health sog‘lom; joylangan manba nusxasi mahalliy fayllarga checksum bo‘yicha mos.

Zaxira: `/home/ubuntu/backups/ui-home-dashboard-before-20260907.tar.gz`; oldingi yig‘ma: `dist.rollback`. Mavjud katta JavaScript bo‘lagi haqidagi build ogohlantirishi saqlangan.

## Rang va fonlarni boyitish

Asosiy panel uchun besh xil mashg‘ulot rangi, mos kurs bosqichlari, to‘q moviy progress kartasi va ko‘k-binafsha-moviy dars foni qo‘shildi. Halqa va geometrik bezaklar statik CSS bilan ishlaydi. Qorong‘i mavzu moslashtirilgan. 375, 390, 1440 px tekshiruvlarda beshta alohida rang, ko‘rinadigan CTA va gorizontal chiqish yo‘qligi tasdiqlandi.

[Yangi ranglar — desktop](home-colors-1440.png) · [Telefon](home-colors-375.png) · [Qorong‘i mavzu](home-colors-dark.png) · [Tekshiruv](home-colors-check.json)

Rang yangilanishi saytga joylandi: server build o‘tdi, yangi CSS HTTP 200 qaytardi, rang o‘zgaruvchilari va PWA v32 tasdiqlandi. Server manba fayllari mahalliy nusxaga mos. Ranglar deployidan keyingi tekshiruv HTTP orqali bajarildi; vizual tekshiruv deploydan oldin mahalliy brauzerda bajarilgan.
