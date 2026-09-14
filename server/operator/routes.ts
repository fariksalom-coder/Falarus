import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { DbClient } from '../types/dbClient.js';
import { pool } from '../lib/db.js';
import { enabled, handleUpdate, transaction, enqueue } from './service.js';
export function serviceAuthorized(value: unknown, secret = process.env.OPERATOR_SERVICE_SECRET): boolean {
    if (!secret || secret.length < 32 || typeof value !== 'string')
        return false;
    const a = Buffer.from(value), b = Buffer.from(`Bearer ${secret}`);
    return a.length === b.length && timingSafeEqual(a, b);
}
export async function reminders() {
    await transaction(async (c) => {
        const rows = (await c.query(`SELECT b.*,o.telegram_id FROM operator_balances b JOIN operator_accounts o ON o.id=b.operator_id WHERE b.activated_at IS NOT NULL AND b.debt>0 AND b.due_at<=now() AND o.active AND o.telegram_id IS NOT NULL`)).rows;
        for (const b of rows) {
            const overdue = +new Date(b.due_at) + 72 * 3600000 <= Date.now();
            const stage = overdue ? 'overdue' : 'due';
            await enqueue(c, 'sendMessage', { chat_id: b.telegram_id, text: `${overdue ? '72 SOATDAN OSHGAN QARZ' : 'TO‘LOV MUDDATI KELDI'}\nMijoz #${b.user_id}, shartnoma #${b.id}\nQarz ${b.debt} ${b.currency}\nTekshiruvdagi to‘lov ${b.pending} ${b.currency}\nMuddat: ${new Date(b.due_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n${overdue ? 'To‘lov hali tasdiqlanmagan. Mijoz kartasidan qarzni tekshiring.' : 'Mijoz bilan bog‘laning.'}`, reply_markup: { inline_keyboard: [[{ text: 'Mijozni ko‘rish', callback_data: `user:${b.user_id}` }]] } }, `${stage}:${b.id}:${b.operator_id}`, b.id);
        }
    });
}
export function operatorBotRoutes(supabase: DbClient) {
    const router = Router();
    let nextReminder = 0;
    router.use((req, res, next) => {
        if (!enabled())
            return res.status(404).end();
        if (!serviceAuthorized(req.headers.authorization))
            return res.status(401).json({ error: 'unauthorized' });
        next();
    });
    const wrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch((e: any) => { console.error('[operator-bot]', e.code ?? e.name); res.status(503).json({ error: 'operator_service_unavailable' }); });
    router.get('/health', wrap(async (_req: any, res: any) => { await pool!.query('SELECT id FROM operator_accounts LIMIT 1'); res.json({ ok: true }); }));
    router.post('/update', wrap(async (req: any, res: any) => { await handleUpdate(req.body); res.json({ ok: true }); }));
    router.post('/outbox', wrap(async (_req: any, res: any) => {
        if (Date.now() > nextReminder) {
            await reminders();
            nextReminder = Date.now() + 60000;
        }
        const rows = await transaction(async (c) => {
            await c.query(`UPDATE operator_outbox q SET delivered_at=now(),last_error='operator_revoked' WHERE q.delivered_at IS NULL AND q.operator_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operator_accounts o WHERE o.id=q.operator_id AND o.active AND o.telegram_id::text=q.payload->>'chat_id')`);
            // Cancel queued debt reminders after approved settlement or operator reassignment/revocation.
            await c.query(`UPDATE operator_outbox q SET delivered_at=now() WHERE q.delivered_at IS NULL AND q.contract_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operator_balances b JOIN operator_accounts o ON o.id=b.operator_id WHERE b.id=q.contract_id AND b.debt>0 AND o.active AND o.telegram_id::text=q.payload->>'chat_id')`);
            return (await c.query(`WITH batch AS (SELECT id FROM operator_outbox WHERE delivered_at IS NULL AND next_at<=now() ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 10) UPDATE operator_outbox q SET attempts=attempts+1,next_at=now()+interval '2 minutes' FROM batch WHERE q.id=batch.id RETURNING q.id,q.method,q.payload,q.attempts`)).rows;
        });
        res.json(rows);
    }));
    router.post('/outbox/:id/ack', wrap(async (req: any, res: any) => {
        if (req.body.ok || req.body.permanent)
            await pool!.query("UPDATE operator_outbox SET delivered_at=now(),last_error=$2,payload=CASE WHEN dedupe LIKE 'reset-link:%' THEN jsonb_build_object('chat_id',payload->'chat_id','text','Reset link delivery finished') ELSE payload END WHERE id=$1", [Number(req.params.id), req.body.permanent ? 'telegram_permanent_failure' : null]);
        else
            await pool!.query("UPDATE operator_outbox SET next_at=now()+make_interval(secs=>LEAST(3600,GREATEST(10,$2::int))) WHERE id=$1", [Number(req.params.id), Number(req.body.retry_after) || 60]);
        res.json({ ok: true });
    }));
    return router;
}
export async function operatorReceipt(req: any, res: any) {
    try {
        const row = (await pool!.query('SELECT file_id,mime FROM operator_receipts WHERE id=$1', [Number(req.params.id)])).rows[0];
        if (!row)
            return res.status(404).end();
        const token = process.env.OPERATOR_BOT_TOKEN;
        if (!token)
            return res.status(503).end();
        const api = await fetch(`https://api.telegram.org/bot${token}/getFile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: row.file_id }), signal: AbortSignal.timeout(15000) });
        const data: any = await api.json();
        if (!data.ok || !data.result?.file_path || data.result.file_size > 8 * 1024 * 1024)
            throw new Error('file_unavailable');
        const path = String(data.result.file_path);
        if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.includes('..'))
            throw new Error('invalid_path');
        const response = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, { signal: AbortSignal.timeout(20000) });
        if (!response.ok)
            throw new Error('download_failed');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 8 * 1024 * 1024)
            throw new Error('too_large');
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Type', row.mime);
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${Number(req.params.id)}.${row.mime === 'application/pdf' ? 'pdf' : row.mime === 'image/png' ? 'png' : row.mime === 'image/webp' ? 'webp' : 'jpg'}"`);
        res.send(bytes);
    }
    catch {
        res.status(502).json({ error: 'Chekni yuklab bo‘lmadi. Qayta urinib ko‘ring.' });
    }
}
