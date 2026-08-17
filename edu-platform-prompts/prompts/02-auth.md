# 02 — Autentifikatsiya va onboarding

## Vazifa
Telefon raqam asosidagi auth + rol tanlash + onboarding flow.

## Flow

1. **Kirish ekrani** — telefon raqam (`+998 __ ___ __ __` maskali) yoki email
2. **SMS OTP** — 6 raqam, Eskiz.uz orqali, 60s qayta yuborish taymeri, avto-to'ldirish (`autocomplete="one-time-code"`)
3. **Rol tanlash** — O'quvchiman / Repetitorman / Ota-onaman (katta, rasmli kartalar)
4. **Onboarding — o'quvchi**: sinf (5–11) → qiziqtirgan fanlar (9 tadan tanlash) → maqsad (maktab bahosi / DTM / til sertifikati) → darajani aniqlash testi (ixtiyoriy, fan boshiga 10 savol)
5. **Onboarding — repetitor**: F.I.Sh → fanlar → tajriba → diplom/sertifikat yuklash → narx → video tanishtiruv (60s) → **moderatsiyaga yuboriladi**
6. **Onboarding — ota-ona**: farzand qo'shish (telefon orqali taklif yoki yangi akkaunt yaratish)

## Texnik
- Supabase Auth, JWT access + refresh
- Rate limit: 5 OTP/telefon/soat
- Sessiya qurilmalar ro'yxati, chiqish
- Parol tiklash (email uchun)
- `AuthContext` + `useAuth()`, `<ProtectedRoute roles={[...]}>`
- Onboarding yarim qolsa — kirganda o'sha qadamdan davom etadi

## UX
- Har bir qadamda progress indikator
- Orqaga qaytish har doim mumkin
- Rol tanlashdan keyin ham keyinchalik ikkinchi rol qo'shsa bo'ladi
- Xatolar o'zbekcha, aniq: "Bu raqam ro'yxatdan o'tmagan"
