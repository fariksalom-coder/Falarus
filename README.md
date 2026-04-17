<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/949bd97b-2cb7-4a22-88ac-fe7c9b2451bd

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env` and set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `GEMINI_API_KEY`.
3. Run the app:
   - `npm run dev` — local backend and DB (your test data).
   - `npm run dev:prod` — local UI, but API = **falarus.uz** (same data as online for the same account).

## Verification

- `npm run check:env` — validate required env vars for production-like runs.
- `npm run db:verify` — verify that critical Supabase tables and columns exist.
- `npm run test:smoke` — smoke-check deployed API using login or bearer token.
- `npm run test` — unit tests for access/progress rules.
- `npm run verify` — lint + tests + production build.

## Fossils Landing (video + payment)

- Open page: `/fossils` (example: `https://fossils.us/fossils`).
- Public API endpoint: `POST /api/payment` (multipart form-data).
  - Fields: `phone`, `tariff`, `receipt` (image file).
  - Stored locally at:
    - JSON DB: `data/fossils-payments.json`
    - Uploaded checks: `uploads/fossils-checks/*`
- Admin notification is currently `console.log` in `server/routes/fossilsPaymentRoutes.ts`.

### Local run

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000/fossils`

### Deploy notes for fossils.us

- Point subdomain `fossils.us` to this Node.js app.
- Ensure server runs with persistent writable storage for:
  - `data/`
  - `uploads/`
- Build/start:
  - `npm run build`
  - `npm run start`
- If deploying behind reverse proxy (Nginx/Caddy), route:
  - `/api/*` -> Node app
  - `/uploads/*` -> Node app static files (already served by Express)
