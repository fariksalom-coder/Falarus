import { Router, type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';
import { createIpRateLimitMiddleware } from '../lib/rateLimit.js';
import { isMonth } from '../../shared/salesHead.js';
import { loadSalesHeadSettings, saveSalesHeadSettings, salesHeadDashboard } from './service.js';

const jwtSecretEnv = process.env.SALES_HEAD_JWT_SECRET || process.env.JWT_SECRET;
if (!jwtSecretEnv || jwtSecretEnv.length < 32) {
  throw new Error('SALES_HEAD_JWT_SECRET (or JWT_SECRET) must be set to a strong value (>=32 chars)');
}
const JWT_SECRET = jwtSecretEnv;
const TOKEN_ROLE = 'sales_head';
const TOKEN_TTL = '12h';
// Compared when the login is unknown so response time does not reveal which logins exist.
const DUMMY_HASH = '$2b$12$ygJ40AlNvBFg22aQp7R6a.m9R.Ka7AdgS4VT5OnzrFJKvKBS/jsmy';

type SalesHeadRequest = Request & { salesHeadId?: number; salesHeadName?: string; adminId?: number };

const currentMonth = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 7);

function wrap(tag: string, fn: (req: SalesHeadRequest, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req as SalesHeadRequest, res).catch((e: unknown) => {
      const pgError = typeof e === 'object' && e !== null && 'code' in e;
      console.error(`[${tag}]`, pgError ? (e as { code: string }).code : e);
      res.status(pgError ? 500 : 400).json({ error: pgError ? 'Ma’lumotni olib bo‘lmadi. Keyinroq urinib ko‘ring.' : e instanceof Error ? e.message : 'Xatolik' });
    });
  };
}

function validPassword(password: string) {
  return password.length >= 12 && password.length <= 72 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

async function salesHeadAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  let decoded: { headId?: unknown; role?: unknown } = {};
  try {
    if (token) decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as typeof decoded;
  } catch {
    decoded = {};
  }
  const headId = decoded.headId;
  if (decoded.role !== TOKEN_ROLE || typeof headId !== 'number' || !Number.isInteger(headId)) {
    res.status(401).json({ error: 'Qaytadan kiring' });
    return;
  }
  try {
    const account = (await pool!.query('SELECT name FROM sales_head_accounts WHERE id=$1 AND active', [headId])).rows[0];
    if (!account) {
      res.status(401).json({ error: 'Hisob o‘chirilgan. Administratorga murojaat qiling.' });
      return;
    }
    const r = req as SalesHeadRequest;
    r.salesHeadId = headId;
    r.salesHeadName = account.name;
    next();
  } catch (e) {
    console.error('[sales-head/auth]', e);
    res.status(503).json({ error: 'Xizmat vaqtincha ishlamayapti' });
  }
}

const monthFrom = (value: unknown) => {
  const month = value == null || value === '' ? currentMonth() : value;
  if (!isMonth(month)) throw new Error('Oy noto‘g‘ri.');
  return month;
};

/** /api/sales-head — sotuv bo'limi rahbarining o'z paneli. */
export function createSalesHeadRoutes(): Router {
  const router = Router();

  router.post('/login', createIpRateLimitMiddleware('sales-head-login', 900, 10, 'Juda ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.'),
    wrap('sales-head/login', async (req, res) => {
      const login = String(req.body?.login ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!login || !password) throw new Error('Login va parolni kiriting.');
      const account = (await pool!.query('SELECT id,login,name,password_hash,active FROM sales_head_accounts WHERE login=$1', [login])).rows[0];
      const ok = await bcrypt.compare(password, account?.password_hash ?? DUMMY_HASH);
      if (!account || !account.active || !ok) {
        res.status(401).json({ error: 'Login yoki parol noto‘g‘ri' });
        return;
      }
      const token = jwt.sign({ headId: Number(account.id), login: account.login, role: TOKEN_ROLE }, JWT_SECRET, { expiresIn: TOKEN_TTL });
      res.json({ token, name: account.name });
    }));

  router.use(salesHeadAuth);
  router.get('/me', (req, res) => {
    res.json({ name: (req as SalesHeadRequest).salesHeadName ?? '' });
  });
  router.get('/dashboard', wrap('sales-head/dashboard', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await salesHeadDashboard(pool!, monthFrom(req.query.month)));
  }));
  return router;
}

/** /api/admin/sales-head — bosh admin: maosh qoidalari, hisoblar va panelni ko'rish. */
export function salesHeadAdminRoutes(): Router {
  const router = Router();
  router.get('/settings', wrap('admin/sales-head', async (_req, res) => {
    res.json(await loadSalesHeadSettings(pool!));
  }));
  router.put('/settings', wrap('admin/sales-head', async (req, res) => {
    res.json(await saveSalesHeadSettings(pool!, req.body, req.adminId ?? null));
  }));
  router.get('/dashboard', wrap('admin/sales-head', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await salesHeadDashboard(pool!, monthFrom(req.query.month)));
  }));
  router.get('/accounts', wrap('admin/sales-head', async (_req, res) => {
    res.json((await pool!.query('SELECT id,login,name,active,created_at FROM sales_head_accounts ORDER BY id')).rows);
  }));
  router.post('/accounts', wrap('admin/sales-head', async (req, res) => {
    const login = String(req.body?.login ?? '').trim().toLowerCase();
    const name = String(req.body?.name ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!/^[a-z0-9_.-]{3,40}$/.test(login) || !name || name.length > 100 || !validPassword(password))
      throw new Error('Login 3–40 belgi (lotin harf, raqam), ism va kamida 12 belgili harf-raqamli parol kerak.');
    if ((await pool!.query('SELECT 1 FROM sales_head_accounts WHERE login=$1', [login])).rowCount)
      throw new Error('Bu login band.');
    const hash = await bcrypt.hash(password, 12);
    const row = (await pool!.query('INSERT INTO sales_head_accounts(login,name,password_hash) VALUES($1,$2,$3) RETURNING id', [login, name, hash])).rows[0];
    res.json({ id: Number(row.id) });
  }));
  router.post('/accounts/:id', wrap('admin/sales-head', async (req, res) => {
    const id = Number(req.params.id);
    const action = String(req.body?.action ?? '');
    if (action === 'enable' || action === 'disable') {
      const r = await pool!.query('UPDATE sales_head_accounts SET active=$2 WHERE id=$1', [id, action === 'enable']);
      if (!r.rowCount) throw new Error('Hisob topilmadi.');
    } else if (action === 'password') {
      const password = String(req.body?.password ?? '');
      if (!validPassword(password)) throw new Error('Parol 12–72 belgi, harf va raqamdan iborat bo‘lsin.');
      const r = await pool!.query('UPDATE sales_head_accounts SET password_hash=$2 WHERE id=$1', [id, await bcrypt.hash(password, 12)]);
      if (!r.rowCount) throw new Error('Hisob topilmadi.');
    } else {
      throw new Error('Amal noto‘g‘ri.');
    }
    res.json({ ok: true });
  }));
  return router;
}
