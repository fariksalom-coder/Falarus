# Support CRM (retention)

Outbound call panel for active premium students who have not progressed on the
daily plan for 72+ hours.

## Setup

1. Apply migration: `db/migrations/175_support_crm.sql`
2. Create agent:

```bash
SUPPORT_CRM_BOOTSTRAP_LOGIN=operator \
SUPPORT_CRM_BOOTSTRAP_PASSWORD='SecurePass123' \
SUPPORT_CRM_BOOTSTRAP_NAME='Support' \
npm run seed:support-crm
```

3. Open `/support-crm/login` (or `VITE_SUPPORT_CRM_PATH`).

Optional: set `SUPPORT_CRM_JWT_SECRET` (32+ chars) separately from `JWT_SECRET`.

## API

- `POST /api/support-crm/login`
- `GET /api/support-crm/me`
- `GET /api/support-crm/stats`
- `GET /api/support-crm/queue?filter=needs_contact|contacted_today`
- `GET /api/support-crm/users/:id`
- `POST /api/support-crm/contacts`
