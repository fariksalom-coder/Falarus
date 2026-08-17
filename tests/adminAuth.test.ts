import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { DbClient } from '../server/types/dbClient';

/**
 * Admin qorovuli: oddiy foydalanuvchi tokeni admin panelini OCHMASLIGI kerak.
 *
 * Ilgari `adminAuth.ts` `decoded.adminId ?? decoded.id` qilardi va tokenni
 * foydalanuvchilarniki bilan bir xil sekret bilan tekshirardi — ya'ni istalgan
 * ro'yxatdan o'tgan odam o'z tokeni bilan `/api/admin/*` ga kira olardi.
 * Shu fayl aynan o'sha holatni qaytadan yuzaga kelishidan saqlaydi.
 */

const SEKRET = 'test-jwt-secret-kamida-32-belgi-bolishi-kerak';

// adminAuth.ts sekretni MODUL YUKLANGANDA o'qiydi — import undan keyin bo'lsin.
process.env.ADMIN_JWT_SECRET = SEKRET;
process.env.JWT_SECRET = SEKRET;

type Mod = typeof import('../server/middleware/adminAuth');
let mod: Mod;

before(async () => {
  mod = await import('../server/middleware/adminAuth');
});

/** `admins` jadvalini taqlid qiladi: faqat berilgan id'lar mavjud. */
function fakeDb(mavjudIdlar: number[], xato?: string): DbClient {
  return {
    from() {
      let sorovId: unknown = null;
      const builder: any = {
        select: () => builder,
        eq: (_ustun: string, qiymat: unknown) => {
          sorovId = qiymat;
          return builder;
        },
        maybeSingle: async () => {
          if (xato) return { data: null, error: { message: xato } };
          const bor = mavjudIdlar.includes(Number(sorovId));
          return { data: bor ? { id: Number(sorovId) } : null, error: null };
        },
      };
      return builder;
    },
    rpc: async () => ({ data: null, error: null }),
    storage: {},
  } as unknown as DbClient;
}

/** Middleware'ni ishga tushirib, natijani qaytaradi. */
function yur(
  db: DbClient,
  token: string | null,
): Promise<{ status: number | null; body: any; otdi: boolean; adminId?: number }> {
  const mw = mod.createAdminAuthMiddleware(db);
  return new Promise((resolve) => {
    let status: number | null = null;
    const req: any = { headers: token ? { authorization: `Bearer ${token}` } : {} };
    const res: any = {
      status(k: number) {
        status = k;
        return res;
      },
      json(body: any) {
        resolve({ status, body, otdi: false });
      },
    };
    mw(req, res, () => resolve({ status, body: null, otdi: true, adminId: req.adminId }));
  });
}

describe('adminAuth — huquq oshirishdan himoya', () => {
  it('ODDIY FOYDALANUVCHI tokenini rad etadi (asosiy zaiflik)', async () => {
    // server.ts aynan shunday imzolaydi: jwt.sign({ id: user.id }, JWT_SECRET)
    const userToken = jwt.sign({ id: 7 }, SEKRET, { expiresIn: 3600 });
    const n = await yur(fakeDb([7]), userToken);
    assert.strictEqual(n.otdi, false, 'foydalanuvchi tokeni O\'TIB KETDI — zaiflik qaytgan');
    assert.strictEqual(n.status, 401);
  });

  it('`role` da\'vosisiz admin tokenini rad etadi', async () => {
    const eskiAdmin = jwt.sign({ adminId: 1, email: 'a@b.uz' }, SEKRET, { expiresIn: 3600 });
    const n = await yur(fakeDb([1]), eskiAdmin);
    assert.strictEqual(n.otdi, false);
    assert.strictEqual(n.status, 401);
  });

  it('`admins` jadvalida yo\'q adminni rad etadi (o\'chirilgan hisob)', async () => {
    const token = jwt.sign(
      { adminId: 42, email: 'o@b.uz', role: mod.ADMIN_TOKEN_ROLE },
      SEKRET,
      { expiresIn: 3600 },
    );
    const n = await yur(fakeDb([1, 2]), token);
    assert.strictEqual(n.otdi, false);
    assert.strictEqual(n.status, 401);
  });

  it('haqiqiy admin tokenini o\'tkazadi va req.adminId ni qo\'yadi', async () => {
    const token = jwt.sign(
      { adminId: 5, email: 'admin@falarus.uz', role: mod.ADMIN_TOKEN_ROLE },
      SEKRET,
      { expiresIn: 3600 },
    );
    const n = await yur(fakeDb([5]), token);
    assert.strictEqual(n.otdi, true, 'haqiqiy admin kira olmadi');
    assert.strictEqual(n.adminId, 5);
  });

  it('token yo\'q bo\'lsa 401', async () => {
    const n = await yur(fakeDb([1]), null);
    assert.strictEqual(n.status, 401);
  });

  it('boshqa sekret bilan imzolangan tokenni rad etadi', async () => {
    const soxta = jwt.sign(
      { adminId: 1, email: 'a@b.uz', role: 'admin' },
      'butunlay-boshqa-sekret-kamida-32-belgi-uzun',
      { expiresIn: 3600 },
    );
    const n = await yur(fakeDb([1]), soxta);
    assert.strictEqual(n.otdi, false);
    assert.strictEqual(n.status, 401);
  });

  it('baza javob bermasa KIRITMAYDI (503, ochiq qoldirmaydi)', async () => {
    mod.adminKeshniTozala();
    const token = jwt.sign(
      { adminId: 9, email: 'a@b.uz', role: mod.ADMIN_TOKEN_ROLE },
      SEKRET,
      { expiresIn: 3600 },
    );
    const n = await yur(fakeDb([9], 'connection refused'), token);
    assert.strictEqual(n.otdi, false, 'baza uzilganda kirishga ruxsat berildi');
    assert.strictEqual(n.status, 503);
  });
});
