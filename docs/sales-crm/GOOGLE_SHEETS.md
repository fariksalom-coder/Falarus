# Google Sheets → Sales CRM

Private sheet integration. **No** “Publish to web → CSV”.

## Flow

```
Google Sheets (private)
  → Apps Script webhook  OR  Service Account API sync
  → POST /api/integrations/google-sheets/*
  → users + sales_crm_leads
  → operator queue
```

## Server env (VPS `.env`)

```bash
GOOGLE_SHEETS_SPREADSHEET_ID="1cmVk6MYHzzH7uJRaLfdrHSt__TRdtW1zY9MOyBTy8FE"
GOOGLE_SHEETS_RANGE="Sheet1!A:Z"   # sheet tab name + range
GOOGLE_SHEETS_WEBHOOK_SECRET="long-random-secret-min-16-chars"

# Service account JSON (one line) — share the sheet with the SA email as Viewer
GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON='{"type":"service_account","client_email":"...@....iam.gserviceaccount.com",...}'
```

Create a Google Cloud service account → enable Sheets API → download JSON key →
**Share the spreadsheet** with `client_email` (Viewer). Sheet stays non-public.

## Webhook (preferred for realtime)

1. Copy `docs/sales-crm/google-sheets-apps-script.js` into the sheet’s Apps Script.
2. Set script properties `FALARUS_WEBHOOK_URL` + `FALARUS_WEBHOOK_SECRET`.
3. **Import all existing rows once:** run `backfillAllRows()` in the Apps Script editor.
4. Run `installTrigger()` for new rows going forward.
5. Header: `X-Falarus-Sheets-Secret: <secret>`

Endpoints:
- `POST /api/integrations/google-sheets/lead` — one row
- `POST /api/integrations/google-sheets/leads` — bulk `{ "leads": [ ... ] }` (backfill)

## Admin fallback sync

CRM → Statistika → **Синхронизировать сейчас** / **Проверить подключение**

- `GET  /api/integrations/google-sheets/status` (admin JWT)
- `POST /api/integrations/google-sheets/sync`
- `POST /api/integrations/google-sheets/check`

## Dedup

`sales_crm_leads.external_key`:

1. `gsheet:{spreadsheetId}:id:{externalId}` if ID column present
2. else `gsheet:{spreadsheetId}:row:{rowNumber}`
3. else phone + submittedAt

Phone matches also merge into an existing CRM lead (no second card).
