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
