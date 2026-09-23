# FalaRus: тест и скидки — 2026-09-19

final result: passed

Scope: responsive production implementation based on the supplied HTML example, plus an admin statistics page. This is an adaptation, not a pixel-identical kiosk-only clone.

## Evidence

- Source: `/home/user/Downloads/Telegram Desktop/FalaRus Kiosk — 5 экранов (2).html`.
- Reference: `reference-home.png`, rendered from the original bundled HTML and cropped to its first 1920×1080 iframe.
- Implementation: `home-1920.png`, 1920×1080 CSS pixels, deviceScaleFactor 1. Source and implementation opened together for comparison.
- Additional verified viewports: 1440×1000 and 390×844, deviceScaleFactor 1.
- Public states: welcome RU/UZ with three required audience choices and official logo, contact form (+7 / +998), invalid phone, question, timeout, result, coupon.
- Admin states: desktop/mobile dashboard, settings, empty search, coupon redemption dialog.
- `browser-results.json` records the full successful journey, score 10/10, generated test coupon and unauthenticated admin response 401. The latest local run recorded Vite development websocket errors from the preview port collision; the quiz, coupon, persistence, redemption and authentication checks passed. Production browser checks are recorded separately in `production-results.json`.

## Findings and fixes

- [P2, fixed] Hiding the title's line break on mobile joined «русский» and «за». Added explicit whitespace; final mobile screenshot shows proper separation.
- [P2, fixed] Screen changes could preserve a previous mobile scroll offset. A new screen/question now scrolls to the top.
- No remaining P0/P1/P2 findings in the exercised states. Table scrolling is contained within the participant table; the document does not overflow horizontally at 390px.

## Required visual surfaces

- **Typography:** Inter font files reused from the supplied HTML. Bold display hierarchy, 88px desktop heading, responsive mobile heading, readable field labels and supporting text. The final desktop line length differs because the duration wording is deliberately more accurate.
- **Spacing/layout:** dark full-page composition, top brand/language controls, centred title and blue CTA, gold discount badge. The web version uses responsive flow instead of a fixed 1920px canvas. Contact, result and coupon cards remain usable at 390px. Required controls are reachable by normal vertical scrolling.
- **Colors/tokens:** source navy `#0a1120`, raised surface `#111c30`, text `#f1f5f9`, blue `#5b93ff`, green `#4ade80`, gold `#fbbf24`. Dark text on blue buttons intentionally improves contrast compared with the source's white text. Admin reuses the existing authenticated admin shell.
- **Assets:** the reference uses typography, CSS surfaces and simple icons; no photo or illustration was invented. Fonts are extracted from the source. Lucide supplies the interface icons. No fake QR codes.
- **Copy/content:** RU/UZ controls work. «За несколько минут» accommodates ten timed questions. A result is described as a short knowledge check rather than an official CEFR assessment. Coupon terms are real server data. SMS and automated payment are not claimed. The fifth screen is a usable saved coupon for manager redemption, rather than the mock's nonfunctional payment screen.

## Functional verification

- Submit contact data, answer all ten questions, receive a coupon and find the same participant/code in the authenticated admin panel.
- Refresh restores the result and coupon.
- Invalid international phone is rejected.
- Expired question advances without a correct point.
- Ending the session clears its browser token and visible participant data.
- Admin search, settings UI, mobile layout and redemption confirmation work.
- Admin statistics reject requests without admin authentication.
- Service tests cover immutable offer snapshots, answer replay/concurrency, scoring, deadlines, threshold, campaign disable, coupon reuse, expiration, single redemption and SQL-backed statistics.
- TypeScript and production build pass.

## Remaining scope

Functional journey tests used an isolated local PostgreSQL-compatible database. Deployed to https://falarus.uz/test-russkogo on 2026-09-19 after server TypeScript checks, service tests and production build. Migrations 185 and 186 applied transactionally. Backup: `/home/ubuntu/backups/kiosk-20260919-132044`. Public browser checks verify official logo, three audience choices, +7 default and +998 switch, mobile layout and unauthenticated admin rejection. Campaign conditions are editable in the admin panel; current defaults are 20% for completion, valid for 15 hours. All three audience groups currently share the same question bank and course offer. Payment gateway and SMS are outside this implementation. The responsive mobile layout and admin screen have no corresponding source mock, so their QA is usability-based rather than a pixel comparison.
