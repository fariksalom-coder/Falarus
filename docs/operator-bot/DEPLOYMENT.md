# Deployed 2026-09-10

- Bot: https://t.me/falarusoperator_bot
- Admin: https://falarus.uz/secure-admin-a9k7x4p2/operators
- PostgreSQL: 5,595 registered users at verification; zero test payments inserted into production.
- New service: `falarus-operator-bot.service`, dedicated user and protected environment.
- Existing customer bot: `falarus-telegram-bot.service`; PID remained 2407468 throughout both deployments.
- Platform health, authenticated operator health, admin account list and reports returned 200.
- Anonymous operator access and using the bot service key as an admin token returned 401.
- SMTP is not configured; operator recovery instead uses the tested 30-minute single-use reset link.
- Operator accounts: none created automatically. Platform admin creates named operators in the new admin section.
- TypeScript and production build passed. Fourteen focused tests passed, including authorization, ledger workflow, expiry/replay-safe password recovery, and existing live-question progress.
- Synthetic browser checks: 390 / 768 / 1440 px, no horizontal overflow or runtime exceptions; exactly one admin decision request and one reset request.
- Source backup: `/home/ubuntu/backups/operator-bot-before-20260910T125753Z/source.tar.gz`.
- Password recovery update backup: `/home/ubuntu/backups/operator-reset-before-20260910T131755Z/source.tar.gz`.
- First backup also contains the original platform environment, protected by 0700/0600 permissions.
- Transport has no npm dependencies and no database credentials. Token and service secret are not in the repository.
