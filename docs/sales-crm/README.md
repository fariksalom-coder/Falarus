# Sales CRM (inbound leads)

Isolated lead pipeline for phone registrations. Does **not** replace Support CRM
(retention) or the main student app.

## Isolation

| Surface | URL | Auth |
|---------|-----|------|
| Platform | `falarus.uz` | user JWT |
| Support CRM | `/support-crm` | `support_crm` agents |
| **Sales CRM** | `crm.falarus.uz` (fallback `/crm`) | `sales_crm` agents |

Lead identity stays in `users`. Pipeline state lives in `sales_crm_*` tables only.

## Setup

1. Apply `db/migrations/182_sales_crm.sql`
2. Create admin (and operators):

```bash
SALES_CRM_BOOTSTRAP_LOGIN=admin \
SALES_CRM_BOOTSTRAP_PASSWORD='SecurePass123' \
SALES_CRM_BOOTSTRAP_NAME='CRM Admin' \
SALES_CRM_BOOTSTRAP_ROLE=admin \
npm run seed:sales-crm

SALES_CRM_BOOTSTRAP_LOGIN=op1 \
SALES_CRM_BOOTSTRAP_PASSWORD='SecurePass123' \
SALES_CRM_BOOTSTRAP_NAME='Operator 1' \
SALES_CRM_BOOTSTRAP_ROLE=operator \
npm run seed:sales-crm
```

3. DNS + nginx: `deploy/nginx/crm.falarus.uz.conf` → `crm.falarus.uz`
4. Optional env: `SALES_CRM_HOST=crm.falarus.uz`, `SALES_CRM_JWT_SECRET=...`

## Auto ingest

- New student register (`POST /api/auth/register`) → lead + round-robin assign
- Russian payment approved → status `PAID`
- Admin sync button backfills recent registrations without a lead row

## API

Base: `/api/sales-crm`

- `POST /login`
- `GET /me`, `/dashboard`, `/leads`, `/leads/:id`, `/tasks`, `/operators`, `/operators/stats`
- `POST /leads/:id/status|assign|comment|task|call`
- `POST /tasks/:id/complete`, `/settings/assignment`, `/sync`
