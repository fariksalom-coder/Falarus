import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../lib/db.js';
import { audit, enqueue, transaction } from './service.js';
import { paymentFits } from './domain.js';
import { invalidateAccessCache } from '../services/subscription.service.js';
export async function decideReceipt(id: number, admin: number, decision: string, reason: string) {
    if (!['approved', 'rejected'].includes(decision))
        throw new Error('Qaror noto‘g‘ri.');
    if (decision === 'rejected' && reason.trim().length < 3)
        throw new Error('Rad etish sababini kiriting.');
    return transaction(async (c) => {
        // Always lock contract before receipt: same order as installment submission.
        const ref = (await c.query('SELECT contract_id FROM operator_receipts WHERE id=$1', [id])).rows[0];
        if (!ref)
            throw new Error('Chek topilmadi.');
        const b = (await c.query('SELECT * FROM operator_contracts WHERE id=$1 FOR UPDATE', [ref.contract_id])).rows[0];
        const r = (await c.query('SELECT * FROM operator_receipts WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (r.status !== 'pending')
            throw new Error('Bu chek bo‘yicha qaror oldin qabul qilingan.');
        if (decision === 'approved') {
            const balance = (await c.query('SELECT debt FROM operator_balances WHERE id=$1', [b.id])).rows[0];
            if (!paymentFits(r.amount, balance.debt))
                throw new Error('To‘lov qoldiqdan oshib ketadi.');
            if (!b.activated_at) {
                const u = (await c.query('SELECT plan_expires_at FROM users WHERE id=$1 FOR UPDATE', [b.user_id])).rows[0];
                const days =
                  b.tariff === 'six_month' ? 180
                    : b.tariff === 'month' ? 30
                      : b.tariff === 'year' ? 365
                        : 90;
                const planType =
                  b.tariff === 'six_month' ? 'six_month'
                    : b.tariff === 'month' ? 'monthly'
                      : b.tariff === 'year' ? 'yearly'
                        : 'three_month';
                const planName =
                  b.tariff === 'six_month' ? '6 OY'
                    : b.tariff === 'month' ? '1 OY'
                      : b.tariff === 'year' ? '1 YIL'
                        : '3 OY';
                const expiry = new Date(Math.max(Date.now(), u?.plan_expires_at ? +new Date(u.plan_expires_at) : 0) + days * 86400000);
                await c.query('UPDATE users SET plan_name=$2,plan_expires_at=$3 WHERE id=$1', [b.user_id, planName, expiry]);
                await c.query("INSERT INTO subscriptions(user_id,plan_type,expires_at,status) VALUES($1,$2,$3,'active')", [b.user_id, planType, expiry]);
                await c.query('UPDATE operator_contracts SET activated_at=now() WHERE id=$1', [b.id]);
            }
        }
        await c.query('UPDATE operator_receipts SET status=$2,admin_id=$3,reason=$4,decided_at=now() WHERE id=$1', [id, decision, admin, reason.trim().slice(0, 500) || null]);
        await audit(c, r.operator_id, admin, b.user_id, `receipt_${decision}`, { receipt: id, contract: b.id, amount: r.amount, currency: b.currency, reason });
        const op = (await c.query('SELECT telegram_id FROM operator_accounts WHERE id=$1', [r.operator_id])).rows[0];
        if (op?.telegram_id)
            await enqueue(c, 'sendMessage', { chat_id: op.telegram_id, text: `Chek #${id}: ${decision === 'approved' ? 'TASDIQLANDI' : 'RAD ETILDI'}\nMijoz #${b.user_id}, ${r.amount} ${b.currency}${reason ? '\nSabab: ' + reason : ''}` }, `decision:${id}`);
        const debt = (await c.query('SELECT debt FROM operator_balances WHERE id=$1', [b.id])).rows[0].debt;
        if (Number(debt) === 0)
            await c.query('UPDATE operator_outbox SET delivered_at=now() WHERE contract_id=$1 AND delivered_at IS NULL', [b.id]);
        return Number(b.user_id);
    });
}
export function operatorAdminRoutes() {
    const router = Router();
    const wrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch((e: any) => { console.error('[operator-admin]', e.code ?? e.name); res.status(400).json({ error: e.code ? 'Amal saqlanmadi. Qiymatlarni tekshiring.' : e.message }); });
    router.get('/operators', wrap(async (_req: any, res: any) => res.json((await pool!.query('SELECT id,login,name,telegram_id,active,created_at FROM operator_accounts ORDER BY id')).rows)));
    router.post('/operators', wrap(async (req: any, res: any) => {
        const login = String(req.body.login ?? '').trim().toLowerCase(), name = String(req.body.name ?? '').trim(), password = String(req.body.password ?? '');
        if (!/^[a-z0-9_.-]{3,40}$/.test(login) || !name || name.length > 100 || password.length < 12 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
            throw new Error('Login 3–40 belgi, ism va kamida 12 belgili harf-raqamli parol kerak.');
        const hash = await bcrypt.hash(password, 12);
        const id = await transaction(async (c) => { const r = (await c.query('INSERT INTO operator_accounts(login,name,password_hash) VALUES($1,$2,$3) RETURNING id', [login, name, hash])).rows[0]; await audit(c, r.id, req.adminId, null, 'operator_created'); return r.id; });
        res.json({ id });
    }));
    router.post('/operators/:id', wrap(async (req: any, res: any) => {
        const id = Number(req.params.id), action = String(req.body.action);
        if (!['disable', 'enable', 'unbind', 'password'].includes(action))
            throw new Error('Amal noto‘g‘ri.');
        const p = String(req.body.password ?? '');
        if (action === 'password' && (p.length < 12 || p.length > 72 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)))
            throw new Error('Parol 12–72 belgi, harf va raqamdan iborat bo‘lsin.');
        const hash = action === 'password' ? await bcrypt.hash(p, 12) : null;
        await transaction(async (c) => {
            const exists = await c.query('SELECT id FROM operator_accounts WHERE id=$1 FOR UPDATE', [id]);
            if (!exists.rowCount)
                throw new Error('Operator topilmadi.');
            if (action === 'disable' || action === 'enable')
                await c.query('UPDATE operator_accounts SET active=$2 WHERE id=$1', [id, action === 'enable']);
            if (action === 'unbind')
                await c.query('UPDATE operator_accounts SET telegram_id=NULL WHERE id=$1', [id]);
            if (hash)
                await c.query('UPDATE operator_accounts SET password_hash=$2 WHERE id=$1', [id, hash]);
            await c.query("UPDATE operator_sessions SET operator_id=NULL,expires_at=NULL,state='{}' WHERE operator_id=$1", [id]);
            await audit(c, id, req.adminId, null, `operator_${action}`);
        });
        res.json({ ok: true });
    }));
    router.get('/overview', wrap(async (req: any, res: any) => {
        const op = Number(req.query.operator) || null, status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
        const from = String(req.query.from ?? ''), to = String(req.query.to ?? '');
        for (const d of [from, to])
            if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d))
                throw new Error('Sana noto‘g‘ri.');
        const source = String(req.query.source ?? '').trim().slice(0, 100) || null, tariff = ['month', 'three_month', 'six_month', 'year'].includes(req.query.tariff) ? req.query.tariff : null;
        const offset = Math.max(0, Math.min(100000, Number(req.query.offset) || 0));
        const args = [op, status, from || null, to || null, source, tariff];
        const filter = `($1::bigint IS NULL OR r.operator_id=$1) AND ($2::text IS NULL OR r.status=$2) AND ($3::date IS NULL OR r.created_at>=($3::date::timestamp AT TIME ZONE 'Asia/Tashkent')) AND ($4::date IS NULL OR r.created_at<(($4::date+1)::timestamp AT TIME ZONE 'Asia/Tashkent')) AND ($5::text IS NULL OR c.source=$5) AND ($6::text IS NULL OR c.tariff=$6)`;
        const rows = (await pool!.query(`SELECT r.id,r.operator_id,r.amount,r.status,r.reason,r.created_at,r.decided_at,r.admin_id,c.id contract_id,c.user_id,c.currency,c.tariff,c.total,c.source,c.due_at,c.paid,c.debt,c.pending,o.name operator_name,u.first_name,u.last_name,u.phone,u.email,EXISTS(SELECT 1 FROM operator_freezes f WHERE f.user_id=c.user_id) frozen FROM operator_receipts r JOIN operator_balances c ON c.id=r.contract_id JOIN operator_accounts o ON o.id=r.operator_id JOIN users u ON u.id=c.user_id WHERE ${filter} ORDER BY r.id DESC LIMIT 51 OFFSET $7`, [...args, offset])).rows;
        const summary = (await pool!.query(`SELECT r.operator_id,o.name,c.currency,r.status,count(*) receipts,count(distinct c.user_id) clients,sum(r.amount) amount FROM operator_receipts r JOIN operator_contracts c ON c.id=r.contract_id JOIN operator_accounts o ON o.id=r.operator_id WHERE ${filter} GROUP BY r.operator_id,o.name,c.currency,r.status ORDER BY o.name,c.currency`, args)).rows;
        const debts = (await pool!.query(`SELECT c.operator_id,o.name,c.currency,count(*) contracts,count(distinct c.user_id) clients,sum(c.debt) debt,sum(c.debt) FILTER(WHERE c.due_at<now()) overdue,count(*) FILTER(WHERE c.debt=0) settled,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM operator_freezes f WHERE f.contract_id=c.id)) frozen FROM operator_balances c JOIN operator_accounts o ON o.id=c.operator_id WHERE ($1::bigint IS NULL OR c.operator_id=$1) AND ($2::text IS NULL OR c.source=$2) AND ($3::text IS NULL OR c.tariff=$3) GROUP BY c.operator_id,o.name,c.currency`, [op, source, tariff])).rows;
        const activity = (await pool!.query(`SELECT a.operator_id,o.name,count(*) actions,count(distinct a.user_id) clients FROM operator_audit a JOIN operator_accounts o ON o.id=a.operator_id WHERE ($1::bigint IS NULL OR a.operator_id=$1) AND ($2::date IS NULL OR a.created_at>=($2::date::timestamp AT TIME ZONE 'Asia/Tashkent')) AND ($3::date IS NULL OR a.created_at<(($3::date+1)::timestamp AT TIME ZONE 'Asia/Tashkent')) GROUP BY a.operator_id,o.name`, [op, from || null, to || null])).rows;
        res.json({ rows: rows.slice(0, 50), more: rows.length > 50, summary, debts, activity });
    }));
    router.post('/receipts/:id/decision', wrap(async (req: any, res: any) => {
        const uid = await decideReceipt(Number(req.params.id), req.adminId, String(req.body.decision), String(req.body.reason ?? ''));
        invalidateAccessCache(uid);
        res.json({ ok: true });
    }));
    router.post('/contracts/:id/assign', wrap(async (req: any, res: any) => {
        await transaction(async (c) => {
            const op = Number(req.body.operator_id);
            if (!(await c.query('SELECT 1 FROM operator_accounts WHERE id=$1 AND active', [op])).rowCount)
                throw new Error('Faol operatorni tanlang.');
            const row = (await c.query('UPDATE operator_contracts SET operator_id=$2 WHERE id=$1 RETURNING user_id', [Number(req.params.id), op])).rows[0];
            if (!row)
                throw new Error('Shartnoma topilmadi.');
            await audit(c, op, req.adminId, row.user_id, 'assigned', { contract: Number(req.params.id) });
        });
        res.json({ ok: true });
    }));
    router.get('/audit', wrap(async (req: any, res: any) => {
        const offset = Math.max(0, Math.min(100000, Number(req.query.offset) || 0));
        res.json((await pool!.query('SELECT a.*,o.name operator_name FROM operator_audit a LEFT JOIN operator_accounts o ON o.id=a.operator_id ORDER BY a.id DESC LIMIT 100 OFFSET $1', [offset])).rows);
    }));
    return router;
}
