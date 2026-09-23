# CRM search release — 2026-09-21

GitHub baseline CRM: b0d1464820dada18561c18f15ca58c4fe22c2520.
Search: 14d69aecf28ef923b241d0d4627d3af2adce8a01 (main).
Published first, then server fetched origin/main and imported the eight reviewed files from that exact commit. Other existing server modifications preserved. Server file hashes match GitHub.
Backup: /home/ubuntu/backups/crm-search-20260921-125249.

Local/release/server TypeScript lint, search PostgreSQL integration test and frontend builds passed. Local temporary operator in isolated PGlite database tested via actual login/auth/routes; mobile/desktop, list/board, clear, reload, delayed response, 401 and operator isolation passed. Preview stopped; ephemeral accounts and leads discarded.

PM2 app restarted; health 200. Read-only live API checks with an existing operator verified full name, reverse name, formatted phone, phone suffix and no-match; no lead data modified. crm.falarus.uz failed DNS resolution during final external check; use the existing /crm path on falarus.uz. DNS/Nginx not changed.
