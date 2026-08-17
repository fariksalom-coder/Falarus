# 12 — To'lov, obuna va payout

## Provayderlar
Payme · Click · Uzum Bank. Har biri uchun alohida adapter, umumiy `PaymentProvider` interfeysi.

## Monetizatsiya modellari
1. **Bitta dars** — repetitorga to'lov (komissiya ushlab qolinadi)
2. **Dars paketi** — 4/8/12 dars, chegirma bilan
3. **Obuna** — Free / Standard / Premium
4. **Alohida kurs** — bir martalik xarid

## Free vs Premium
```
Free      Har fandan 3 ta bepul dars, kuniga 5 ta test savoli, AI 10 savol/oy
Standard  Barcha kurslar va testlar, AI 200 savol/oy, DTM mock 4/oy
Premium   + cheksiz mock, shaxsiy o'quv rejasi, prioritet qo'llab-quvvatlash
```

## Texnik
- Idempotent to'lov yaratish (bir xil so'rov ikki marta to'lov qilmaydi)
- Webhook/callback imzo tekshiruvi majburiy
- Holat mashinasi: `created → pending → paid → (refunded | failed)`
- Escrow: dars puli dars tugagunicha ushlab turiladi, keyin repetitor balansiga
- Refund: bekor qilish siyosatiga muvofiq avtomatik
- Repetitor payout: haftalik, minimal summa, kartaga
- Barcha summalar **tiyinda** (integer) saqlanadi, floatda emas
- Har bir tranzaksiya audit log

## UX
- Paywall yumshoq: bepul kontent qiymatini ko'rsatib, keyin taklif
- To'lov 3 tapdan ko'p bo'lmasin, saqlangan karta
- Chek PDF sifatida yuklanadi
- Xato holati aniq: "To'lov o'tmadi — kartada mablag' yetarli emas"
