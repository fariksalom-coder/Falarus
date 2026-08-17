# EduUz — Prompt to'plami

Onlayn repetitor + ta'lim platformasi qurish uchun to'liq prompt paketi.

## Qanday ishlatiladi

1. **Yangi loyiha papkasi yarating** va `CLAUDE.md` ni uning ildiziga ko'chiring.
   Claude har sessiyada uni avtomatik o'qiydi — rol, stack, design system, DB sxema shu yerda.

2. **`prompts/` papkasini loyihaga ko'chiring** (yoki alohida saqlang).

3. **Bitta modulni oling va Claude'ga bering**:
   ```
   prompts/03-student-panel.md ni o'qi va bajar
   ```
   Yoki fayl matnini to'g'ridan-to'g'ri nusxalab yuboring.

4. **Tartibni `prompts/BUILD-PLAN.md` belgilaydi.** Hammasini birdan bermang —
   bitta modul, tekshiruv, keyin keyingisi.

## Tarkib

```
CLAUDE.md                  Loyihaning doimiy konteksti (eng muhim fayl)
prompts/
  00-setup.md              Skelet, tooling, DB
  01-design-system.md      UI primitivlar
  02-auth.md               Auth va onboarding
  03..06                   4 ta panel (o'quvchi, repetitor, ota-ona, admin)
  07..12                   Booking, jonli dars, kurs, test, vazifa, to'lov
  13..17                   AI tutor, gamifikatsiya, bildirishnoma, analitika, qidiruv
  18..20                   Landing, i18n/a11y, test/deploy
  subjects/
    _UMUMIY.md             9 ta fanga umumiy qoidalar — avval shuni o'qing
    01..09                 Har bir fan: mavzular, maxsus vositalar, baholash
  BUILD-PLAN.md            Faza bo'yicha ketma-ketlik
```

## Sozlash

- `EduUz` nomini o'z platformangiz nomiga almashtiring (barcha fayllarda)
- `CLAUDE.md` §3 dagi tech stack'ni o'zingizga moslang
- `CLAUDE.md` §7 dagi ranglarni brendingizga moslang
- Fanlar ro'yxatini o'zgartirsangiz — `subjects/` va `CLAUDE.md` §2 ni yangilang

## Maslahat

Eng katta xato — hamma narsani birdan qurishga urinish.
`BUILD-PLAN.md` Faza 1 dan boshlang: **bitta fan, bitta sinf, 5 ta mavzu**.
Real o'quvchilarda sinang, keyin kengaytiring.
