import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { pool } from '../lib/db.js';
import { createIpRateLimitMiddleware } from '../lib/rateLimit.js';
import { audit, enabled, transaction } from './service.js';
import { createOperatorCustomer, customerEmail, customerName, customerPhone, matchingCustomer } from './customer.js';
import { issueOperatorReset } from './passwordReset.js';
import { dueDate, money, paymentFits } from './domain.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

const TARIFFS = [
  { code: 'month', label: '1 oy', price: '3 000 ₽' },
  { code: 'three_month', label: '3 oy', price: '4 000 ₽' },
  { code: 'six_month', label: '6 oy', price: '6 000 ₽' },
] as const;

const SOURCES = ['Instagram', 'Telegram', 'WhatsApp', 'IMO', 'MAX', 'Boshqa'] as const;
const CURRENCIES = ['UZS', 'RUB', 'USD'] as const;
const RECEIPT_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

type MiniOperator = {
  id: number;
  name: string;
  telegram_id: string;
};

function phoneSearchPatterns(value: string): string[] {
  const digits = value.replace(/\D/g, '');
  if (!digits) return [];
  const variants = new Set<string>([digits]);
  if (digits.startsWith('998') && digits.length > 9) variants.add(digits.slice(3));
  if (digits.startsWith('992') && digits.length > 9) variants.add(digits.slice(3));
  if (digits.startsWith('995') && digits.length > 9) variants.add(digits.slice(3));
  if (digits.startsWith('7') && digits.length > 10) variants.add(digits.slice(1));
  if (digits.length > 9) variants.add(digits.slice(-9));
  if (digits.length > 10) variants.add(digits.slice(-10));
  return [...variants].filter((item) => item.length >= 2).map((item) => `%${item}%`);
}

function receiptDir(): string {
  return path.resolve(process.env.OPERATOR_RECEIPT_DIR || 'uploads/operator-receipts');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function parseInitData(raw: string): { telegramId: string; authDate: number } {
  const token = process.env.OPERATOR_BOT_TOKEN;
  if (!token) throw new Error('Mini app sozlanmagan.');
  if (!raw || raw.length > 4096) throw new Error('Telegram sessiyasi topilmadi.');

  const params = new URLSearchParams(raw);
  const hash = params.get('hash') || '';
  params.delete('hash');
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = createHmac('sha256', secret).update(check).digest('hex');
  if (!hash || !safeEqual(hash, expected)) throw new Error('Telegram imzosi noto‘g‘ri.');

  const authDate = Number(params.get('auth_date') || 0);
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > 7 * 24 * 3600) {
    throw new Error('Telegram sessiyasi eskirgan.');
  }

  const user = JSON.parse(params.get('user') || '{}');
  if (!Number.isSafeInteger(user.id)) throw new Error('Telegram foydalanuvchisi topilmadi.');
  return { telegramId: String(user.id), authDate };
}

async function operatorFromRequest(req: any): Promise<MiniOperator> {
  const auth = String(req.headers.authorization || '');
  const headerInit = String(req.headers['x-telegram-init-data'] || '');
  const raw = auth.toLowerCase().startsWith('tma ') ? auth.slice(4) : headerInit;
  const parsed = parseInitData(raw);
  const row = (await pool!.query(
    'SELECT id,name,telegram_id FROM operator_accounts WHERE telegram_id=$1 AND active LIMIT 1',
    [parsed.telegramId],
  )).rows[0];
  if (!row) throw new Error('Bu Telegram operator hisobiga bog‘lanmagan.');
  return { id: Number(row.id), name: String(row.name), telegram_id: String(row.telegram_id) };
}

async function miniAuth(req: any, res: any, next: any) {
  try {
    if (!enabled()) return res.status(404).json({ error: 'Operator mini app o‘chiq.' });
    req.operator = await operatorFromRequest(req);
    next();
  } catch (e: any) {
    const message = e?.message || 'Telegram sessiyasi topilmadi.';
    res.status(401).json({ error: message });
  }
}

function miniWrap(fn: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      const message = e?.code ? 'Amal saqlanmadi. Qiymatlarni tekshiring.' : e?.message || 'Amal bajarilmadi.';
      res.status(400).json({ error: message });
    }
  };
}

function asPositiveId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Foydalanuvchi noto‘g‘ri.');
  return id;
}

function normalizeOptionalSource(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value || value.length > 100 || /[\r\n\x00-\x1f]/.test(value)) throw new Error('Manba noto‘g‘ri.');
  return value;
}

function appDate(value = Date.now()): string {
  return new Date(value + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function isoFromAppDate(date: string, end = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Sana noto‘g‘ri.');
  const local = new Date(`${date}T00:00:00.000Z`).getTime() - TZ_OFFSET_MS;
  return new Date(local + (end ? 24 * 60 * 60 * 1000 : 0)).toISOString();
}

function statsRange(query: any): { from: string; to: string; label: string } {
  const period = String(query.period ?? 'today');
  const today = appDate();
  if (period === 'today') return { from: isoFromAppDate(today), to: isoFromAppDate(today, true), label: 'Bugun' };
  if (period === 'week') {
    const from = appDate(Date.now() - 6 * 24 * 60 * 60 * 1000);
    return { from: isoFromAppDate(from), to: isoFromAppDate(today, true), label: '7 kun' };
  }
  if (period === 'month') {
    const from = `${today.slice(0, 8)}01`;
    return { from: isoFromAppDate(from), to: isoFromAppDate(today, true), label: 'Shu oy' };
  }
  if (period === 'custom') {
    const fromDate = String(query.from ?? '');
    const toDate = String(query.to ?? '');
    return { from: isoFromAppDate(fromDate), to: isoFromAppDate(toDate || fromDate, true), label: 'Tanlangan davr' };
  }
  throw new Error('Davr noto‘g‘ri.');
}

async function storeMiniReceipt(file: Express.Multer.File) {
  if (!file || !RECEIPT_MIMES.has(file.mimetype)) {
    throw new Error('Chekni JPG, PNG, WEBP yoki PDF qilib yuklang (8 MB gacha).');
  }
  const hash = createHash('sha256').update(file.buffer).digest('hex');
  const ext = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const token = `${randomUUID()}-${hash.slice(0, 12)}.${ext}`;
  const dir = receiptDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(dir, token), file.buffer, { mode: 0o600 });
  return { fileId: `miniapp:${token}`, uniqueId: `miniapp:${hash}`, mime: file.mimetype };
}

export async function readMiniReceipt(fileId: string): Promise<{ bytes: Buffer; mime: string }> {
  if (!fileId.startsWith('miniapp:')) throw new Error('not_miniapp');
  const name = fileId.slice('miniapp:'.length);
  if (!/^[a-f0-9-]{36}-[a-f0-9]{12}\.(jpg|png|webp|pdf)$/.test(name)) throw new Error('invalid_receipt');
  const filePath = path.join(receiptDir(), name);
  const info = await stat(filePath);
  if (info.size > 8 * 1024 * 1024) throw new Error('too_large');
  const ext = path.extname(name).slice(1);
  const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { bytes: await readFile(filePath), mime };
}

export function operatorMiniAppRoutes() {
  const router = Router();
  router.use(createIpRateLimitMiddleware('operator-mini-app', 60, 90));
  router.use(miniAuth);

  router.get('/me', miniWrap(async (req, res) => {
    res.json({ operator: req.operator, tariffs: TARIFFS, sources: SOURCES, currencies: CURRENCIES });
  }));

  router.get('/stats', miniWrap(async (req, res) => {
    const op = req.operator as MiniOperator;
    const range = statsRange(req.query);
    const payments = (await pool!.query(
      `SELECT c.currency,r.status,count(*)::int receipts,count(distinct c.user_id)::int clients,
              COALESCE(sum(r.amount),0)::text amount
       FROM operator_receipts r
       JOIN operator_contracts c ON c.id=r.contract_id
       WHERE r.operator_id=$1 AND r.created_at>=$2 AND r.created_at<$3
       GROUP BY c.currency,r.status
       ORDER BY c.currency,r.status`,
      [op.id, range.from, range.to],
    )).rows;
    const debts = (await pool!.query(
      `SELECT currency,count(*)::int contracts,count(distinct user_id)::int clients,
              COALESCE(sum(debt),0)::text debt,
              COALESCE(sum(debt) FILTER (WHERE due_at<now()),0)::text overdue
       FROM operator_balances
       WHERE operator_id=$1 AND debt>0
       GROUP BY currency
       ORDER BY currency`,
      [op.id],
    )).rows;
    const history = (await pool!.query(
      `SELECT r.id,r.amount,r.status,r.created_at,r.decided_at,r.reason,
              c.id contract_id,c.user_id,c.currency,c.tariff,c.total,c.source,c.due_at,c.paid,c.debt,c.pending,
              u.first_name,u.last_name,u.phone
       FROM operator_receipts r
       JOIN operator_balances c ON c.id=r.contract_id
       JOIN users u ON u.id=c.user_id
       WHERE r.operator_id=$1 AND r.created_at>=$2 AND r.created_at<$3
       ORDER BY r.id DESC
       LIMIT 30`,
      [op.id, range.from, range.to],
    )).rows;
    const actions = (await pool!.query(
      `SELECT count(*)::int actions,count(distinct user_id)::int clients
       FROM operator_audit
       WHERE operator_id=$1 AND created_at>=$2 AND created_at<$3`,
      [op.id, range.from, range.to],
    )).rows[0] ?? { actions: 0, clients: 0 };
    res.json({ range, payments, debts, history, actions });
  }));

  router.get('/customers', miniWrap(async (req, res) => {
    const q = String(req.query.q ?? '').trim().slice(0, 80);
    if (q.length < 2) return res.json({ items: [] });
    const digitPatterns = phoneSearchPatterns(q);
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const rows = (await pool!.query(
      `SELECT id,first_name,last_name,phone,email,plan_name,plan_expires_at,created_at
       FROM users
       WHERE concat_ws(' ',first_name,last_name,email,phone) ILIKE $1
          OR id::text=$2
          OR (cardinality($3::text[]) > 0 AND regexp_replace(COALESCE(phone,''),'[^0-9]','','g') LIKE ANY($3::text[]))
       ORDER BY id DESC LIMIT 12`,
      [pattern, q, digitPatterns],
    )).rows;
    res.json({ items: rows });
  }));

  router.post('/customers', miniWrap(async (req, res) => {
    const op = req.operator as MiniOperator;
    const uid = await transaction(async (c) => {
      const firstName = customerName(String(req.body.firstName ?? ''));
      const lastName = customerName(String(req.body.lastName ?? ''));
      const phone = customerPhone(String(req.body.phone ?? ''));
      const email = customerEmail(String(req.body.email ?? '-'));
      const matches = await matchingCustomer(c, phone.phone, email);
      if (matches.length) throw new Error(`Bu kontakt bilan foydalanuvchi mavjud: #${matches[0].id}`);
      return createOperatorCustomer(c, op.id, { firstName, lastName, phone: phone.phone, phoneRaw: phone.phoneRaw, email });
    });
    const resetLink = await transaction((c) => issueOperatorReset(c, uid, op.id));
    res.json({ user: { id: uid }, resetLink });
  }));

  router.post('/payments', upload.single('receipt'), miniWrap(async (req, res) => {
    const op = req.operator as MiniOperator;
    const userId = asPositiveId(req.body.userId);
    const tariff = String(req.body.tariff ?? '');
    if (!TARIFFS.some((x) => x.code === tariff)) throw new Error('Tarif noto‘g‘ri.');
    const sourceChoice = String(req.body.source ?? '');
    if (!SOURCES.includes(sourceChoice as any)) throw new Error('Manba noto‘g‘ri.');
    const source = sourceChoice === 'Boshqa' ? normalizeOptionalSource(req.body.otherSource) : sourceChoice;
    const currency = String(req.body.currency ?? '');
    if (!CURRENCIES.includes(currency as any)) throw new Error('Valyuta noto‘g‘ri.');
    const total = money(req.body.total);
    const amount = money(req.body.amount);
    if (!paymentFits(amount, total)) throw new Error('To‘lov jami summadan oshmasligi kerak.');
    const due = Number(amount) < Number(total) ? dueDate(String(req.body.dueAt ?? '')) : null;
    const receipt = await storeMiniReceipt(req.file);

    const result = await transaction(async (c) => {
      if (!(await c.query('SELECT 1 FROM users WHERE id=$1', [userId])).rowCount) throw new Error('Foydalanuvchi topilmadi.');
      if ((await c.query('SELECT 1 FROM operator_receipts WHERE file_unique_id=$1', [receipt.uniqueId])).rowCount) {
        throw new Error('Bu chek oldin yuklangan.');
      }
      const contractId = (await c.query(
        'INSERT INTO operator_contracts(user_id,operator_id,tariff,currency,total,source,due_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [userId, op.id, tariff, currency, total, source, due],
      )).rows[0].id;
      const receiptId = (await c.query(
        'INSERT INTO operator_receipts(contract_id,operator_id,amount,file_id,file_unique_id,mime) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [contractId, op.id, amount, receipt.fileId, receipt.uniqueId, receipt.mime],
      )).rows[0].id;
      await audit(c, op.id, null, userId, 'mini_receipt_submitted', { receipt: receiptId, contract: contractId, amount, currency });
      return { contractId, receiptId };
    });
    res.json({ ok: true, ...result, status: 'pending' });
  }));

  return router;
}
