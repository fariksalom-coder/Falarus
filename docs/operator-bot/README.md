# FalaRus operator bot

Bot: https://t.me/falarusoperator_bot
Platform admin: `/secure-admin-a9k7x4p2/operators` (respects VITE_ADMIN_PATH).

## Isolation and access

`falarus-operator-bot.service` is a dependency-free Node 22 long-polling transport with a dedicated Linux user, token, state directory and service secret. It calls only the platform's loopback API, `/api/operator-bot`. It does not have database credentials. It refuses to start when its token has a webhook or another getUpdates receiver. The existing `falarus-telegram-bot.service` and its SQLite store are untouched.

The platform uses its existing PostgreSQL pool, with additive `operator_*` tables. Apply `server/operator/schema.sql` before setting `OPERATOR_BOT_ENABLED=true`. Add `OPERATOR_BOT_TOKEN` and `OPERATOR_SERVICE_SECRET` to the platform's protected environment. Never expose these as VITE variables. Admin routes remain behind the existing admin role, signed JWT and current admin-account checks. There is no bot payment approval endpoint.

## Operator accounts

In the platform admin, open **Operatorlar va cheklar → Operator hisoblari**. Create each operator with a distinct login, name and 12–72 character password containing letters and digits. Deliver the credentials privately. On `/start`, the bot binds the login to the operator's Telegram ID; another Telegram account cannot reuse it. Sessions expire after 12 hours. Five failed attempts lock that Telegram login for 15 minutes. Password messages are queued for deletion, and passwords are stored as bcrypt hashes. Operators can change their password. Admins can deactivate, reset or unbind an account; existing sessions are revoked.

The bot can create platform students using **Yangi foydalanuvchi qo‘shish** (or `/newuser`), as well as search existing students. The creation wizard collects first name, surname, international phone and email (optional with `-`), then asks for explicit confirmation. Existing contacts lead to the existing student card. A confirmed new account is a student with no paid entitlement; its creator is audited, and its password is chosen by the student using the existing single-use link. The wizard immediately continues to tariff, payment, debt date and receipt entry. Cancelling before account confirmation writes no student; cancelling payment afterwards keeps the already confirmed student account, searchable for later payment. Replayed updates do not create duplicates. Search by name, surname, phone, email or numeric ID; browse paginated users and inspect their subscription and operator-ledger history.

## Payments and debts

Choose customer → tariff (3 months / 1 year Russian course) → acquisition source → currency (UZS/RUB/USD) → agreed total → actual payment → debt deadline for partial payment → image/PDF receipt → review → send to admin. Receipts are limited to 8 MB. Telegram file unique IDs and processed-update IDs prevent duplicate submission. Contract and receipt locking prevents concurrent overpayment. All money is stored as numeric(16,2); comparisons use minor units. Installments must use the contract currency; conversion is not silently performed.

Admin reviews/downloads receipts in **Cheklar**, then approves or rejects with a reason. First approval activates one tariff period inside the same transaction as the decision and audit record. Later installments reduce debt without adding another subscription. Pending and rejected receipts never reduce debt. Operator payments live in their dedicated ledger and its admin reports; existing Click/manual payment records are not altered or duplicated. Use **Hisobotlar** for operator revenue; the legacy payment dashboard does not include this separate ledger.

Due reminders are scheduled in the persistent outbox at the Tashkent deadline, then escalated after 72 hours. Delivery normally follows within a minute when Telegram/platform are reachable. Settlement cancels queued debt reminders. Reminder delivery is at-least-once: a process crash between Telegram accepting a message and local acknowledgement may repeat a notification, but never duplicates a payment. Permanent Telegram failures are recorded in outbox `last_error`; transient failures retry. Admin reports expose overdue balances. Notification of overdue debt is sent to the assigned operator; admins review overdue debt in the platform, not a Telegram admin account.

After 72 hours, an operator can manually freeze access for an activated unpaid contract, recording a reason. Freeze does not pause or extend the tariff clock. Payment/account/help HTTP routes remain available; learning routes and new live-AI sessions are blocked. An already open voice session can continue until its existing short session timeout. Unfreeze is available after the admin-approved debt balance reaches zero, and only removes the operator debt freeze. No other account restrictions or learning progress are modified.

Password recovery does not require SMTP. After the operator confirms customer identity, the bot issues a 30-minute, single-use link. The user sets their own password on `/operator-reset`; issuing a link does not change the current password. Only the SHA-256 token hash is stored in the reset table, and the delivery outbox removes the raw link after delivery. URL fragments keep the token out of access logs and HTTP referrers. Reset creation and consumption are audited. Reissue is limited to once per customer per 15 minutes; the public endpoint is rate limited. A revoked operator's unused links stop working. Passwords are never returned to the operator.

## Reports and audit

Bot: own clients/actions, receipts and approved/pending/rejected amounts by currency, current debts, and today/month/all-time periods. Platform: all operators, date/status/source/tariff filters, paginated receipts, current debt/overdue/settled/frozen counts, action journal, and reassignment of a contract's responsible operator. Reassignment does not rewrite receipt authors or audit history. The database rejects updates/deletes of audit records. Debt reports are current balances across all dates; payment and action filters explicitly show their date scope.

## Deployment / recovery

Back up changed source files and protected platform environment before deployment. Run the additive SQL as the platform database owner. Install the transport at `/opt/falarus-operator-bot`, config `/etc/falarus-operator-bot.env` (0600 root), and unit `operator-bot/falarus-operator-bot.service`. The unit owns `/var/lib/falarus-operator-bot` and limits memory/CPU. Build the platform atomically with `bash scripts/deploy-build.sh`, reload its backend, verify health, and enable the new service. Do not restart the customer funnel bot.

To disable the new integration: stop only `falarus-operator-bot.service`, set `OPERATOR_BOT_ENABLED=false` and reload the platform backend. Keep ledger tables and audit history. Disabling also disables operator debt access restrictions; decide on that operational consequence before rollback. Restore only release-manifest files if necessary, never reset the whole project. PostgreSQL backup covers ledger and receipts' Telegram references; transport state is under `/var/lib/falarus-operator-bot`.

Checks: `npm run lint`; `node --import tsx --test --experimental-test-isolation=none tests/operatorBot.test.ts tests/adminAuth.test.ts tests/liveQuestionProgress.test.ts`; `node --check operator-bot/index.mjs`; atomic production build. UI probe uses synthetic customer/admin data at widths 390, 768 and 1440; no real payments are created during testing. Human Telegram login and real receipt approval are intentionally not simulated using real customers.

Telegram transport follows the official API: https://core.telegram.org/bots/api
