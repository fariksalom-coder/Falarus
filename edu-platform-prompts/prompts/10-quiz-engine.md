# 10 — Test engine va DTM mock imtihon

## Savol turlari
`single` (bitta to'g'ri) · `multi` (bir nechta) · `input` (raqam/matn kiritish) · `match` (moslashtirish) · `order` (tartiblash) · `fill_blank` (bo'sh joyni to'ldirish) · `image_hotspot` (rasmda joy belgilash — biologiya, geografiya)

Har bir savolda: matn, media (rasm/audio/formula), variantlar, to'g'ri javob, **tushuntirish**, qiyinlik (1–5), mavzu tegi.

## Rejimlar

### Amaliy (practice)
- Taymersiz, har savoldan keyin darhol javob + tushuntirish
- Xato qilingan savol navbat oxiriga qaytadi

### Mavzu testi
- 10–20 savol, natija oxirida, 70% o'tish bali

### DTM mock imtihon
- To'liq format: blok tuzilmasi, savol soni va vaqt DTM qoidalariga mos
- Qattiq taymer, savollar orasida erkin navigatsiya, belgilab qo'yish (flag)
- Natija: umumiy ball, blok bo'yicha taqsimot, o'rtachaga taqqoslash
- Batafsil tahlil: qaysi mavzuda xato ko'p

### Darajani aniqlash (placement)
- Adaptiv: to'g'ri javobda qiyinroq, xatoda osonroq savol
- 15 savolda darajani aniqlaydi

## Texnik
- To'g'ri javoblar **hech qachon** client'ga oldindan yuborilmaydi
- Baholash server tomonda
- Anti-cheat: sahifadan chiqish hisoblanadi, savol va variantlar tartibi aralashtiriladi
- Attempt saqlanadi, uzilib qolsa davom ettirish mumkin (mock imtihonda taymer to'xtamaydi)
- Formula ko'rsatish: KaTeX

## UX
- Bitta ekranda bitta savol (mobil), progress bar
- Taymer 5 daqiqa qolganda qizaradi
- Natija ekrani: ball, o'sish grafigi, "Xatolarni ko'rish" tugmasi, zaif mavzuga darhol o'tish
- **Har bir xato tushuntirish bilan** — bu engine'ning eng muhim qismi
