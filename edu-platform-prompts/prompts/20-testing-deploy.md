# 20 — Test, CI/CD va monitoring

## Test strategiyasi
- **Unit** (Vitest): utils, hooks, baholash logikasi, narx hisoblash, timezone konvertatsiya
- **Component** (Testing Library): UI primitivlar, form validatsiya
- **Integration**: API route'lar, RLS policy'lar (test DB bilan)
- **E2E** (Playwright): kritik flow'lar —
  - ro'yxatdan o'tish → onboarding → kurs boshlash
  - repetitor qidirish → band qilish → to'lov → darsga kirish
  - test topshirish → natija
  - repetitor: ariza → tasdiq → jadval → dars
- **Visual regression**: asosiy ekranlar 375px va 1440px da

## Sifat darvozalari
- PR: typecheck + lint + unit + e2e (smoke) o'tishi shart
- Coverage: biznes logikada minimum 70%
- Bundle size budjeti CI da tekshiriladi

## CI/CD
- GitHub Actions: lint → typecheck → test → build → deploy
- Preview deploy har bir PR uchun
- Migration'lar avtomatik, rollback rejasi bilan
- Feature flag orqali bosqichma-bosqich chiqarish

## Monitoring
- Sentry: frontend + backend, source map bilan
- Uptime monitoring, `/health` endpoint
- Log: structured JSON, request id bilan
- Alert: xato darajasi, to'lov muvaffaqiyatsizligi, video dars ulanish muammosi
- Haftalik performance hisoboti
