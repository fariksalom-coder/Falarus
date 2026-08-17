/**
 * subscriptionAccess.test.ts — `hasActiveAccess` zaxira yo'li.
 *
 * Nega kerak: 2026-08-17 da prodda yangi ro'yxatdan o'tgan o'quvchi ham
 * "Premium allaqachon faol" ko'rayotgani aniqlandi. Asosiy sabab serverdagi
 * qo'lda qo'yilgan `subscription_active: true` edi, lekin tekshiruvda shu
 * funksiyaning o'zida ham ikki kamchilik chiqdi:
 *
 *   1) tasdiqlangan to'lov MUDDATSIZ kirish berardi — tarifi tugagan 62 ta
 *      hisob abadiy premium bo'lib qolgandi;
 *   2) `normalizePaymentProductCode` noma'lum kodni ham 'russian' qilib
 *      yuborardi, ya'ni kodi buzuq to'lov jimgina premium berardi.
 *
 * Shu ikkalasi qaytib kelmasligi uchun test.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasActiveAccess } from '../server/services/subscription.service';
import type { DbClient } from '../server/types/dbClient';

type Rows = Record<string, unknown[]>;

/**
 * `hasActiveAccess` uchun soxta klient.
 *
 * U uch jadvalga murojaat qiladi: `subscriptions` (ro'yxat), `users`
 * (`.single()`) va `payments` (ro'yxat). Filtrlar ahamiyatsiz — har bir
 * jadval uchun tayyor natija beriladi.
 */
function fakeDb(rows: Rows): DbClient {
  const from = (table: string): any => {
    const data = rows[table] ?? [];
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: data[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: data[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data, error: null }).then(resolve),
    };
    return builder;
  };
  return { from, rpc: async () => ({ data: null, error: null }), storage: {} } as DbClient;
}

const dayMs = 24 * 60 * 60 * 1000;
const kunOldin = (n: number) => new Date(Date.now() - n * dayMs).toISOString();
const kunKeyin = (n: number) => new Date(Date.now() + n * dayMs).toISOString();

/** Hech qanday to'lovi/obunasi yo'q yangi hisob. */
const YANGI_HISOB: Rows = { subscriptions: [], users: [{ plan_expires_at: null }], payments: [] };

describe('hasActiveAccess', () => {
  it("yangi ro'yxatdan o'tgan o'quvchida premium YO'Q", async () => {
    assert.strictEqual(await hasActiveAccess(fakeDb(YANGI_HISOB), 1), false);
  });

  it('faol obuna kirish beradi', async () => {
    const db = fakeDb({
      ...YANGI_HISOB,
      subscriptions: [{ id: 1, user_id: 1, status: 'active', expires_at: kunKeyin(10) }],
    });
    assert.strictEqual(await hasActiveAccess(db, 1), true);
  });

  it('plan_expires_at kelajakda bo‘lsa kirish beradi', async () => {
    const db = fakeDb({ ...YANGI_HISOB, users: [{ plan_expires_at: kunKeyin(5) }] });
    assert.strictEqual(await hasActiveAccess(db, 1), true);
  });

  it('yaqinda tasdiqlangan to‘lov zaxira sifatida kirish beradi', async () => {
    const db = fakeDb({
      ...YANGI_HISOB,
      payments: [{ id: 9, product_code: 'russian', tariff_type: 'three_month', approved_at: kunOldin(10) }],
    });
    assert.strictEqual(await hasActiveAccess(db, 1), true);
  });

  it('tarif muddati tugagan to‘lov ENDI kirish bermaydi', async () => {
    const db = fakeDb({
      ...YANGI_HISOB,
      // 3 oylik tarif 90 kun; 200 kun oldin tasdiqlangan — allaqachon tugagan.
      payments: [{ id: 9, product_code: 'russian', tariff_type: 'three_month', approved_at: kunOldin(200) }],
    });
    assert.strictEqual(await hasActiveAccess(db, 1), false);
  });

  it('1 yillik tarif 365 kun amal qiladi', async () => {
    const yangi = fakeDb({
      ...YANGI_HISOB,
      payments: [{ id: 9, product_code: 'russian', tariff_type: 'year', approved_at: kunOldin(300) }],
    });
    assert.strictEqual(await hasActiveAccess(yangi, 1), true);

    const eski = fakeDb({
      ...YANGI_HISOB,
      payments: [{ id: 9, product_code: 'russian', tariff_type: 'year', approved_at: kunOldin(400) }],
    });
    assert.strictEqual(await hasActiveAccess(eski, 1), false);
  });

  it('boshqa mahsulot to‘lovi rus kursi premiumini BERMAYDI', async () => {
    for (const code of ['patent', 'vnzh', 'teacher_listing', 'teacher_trial']) {
      const db = fakeDb({
        ...YANGI_HISOB,
        payments: [{ id: 9, product_code: code, tariff_type: null, approved_at: kunOldin(1) }],
      });
      assert.strictEqual(await hasActiveAccess(db, 1), false, `${code} premium bermasligi kerak`);
    }
  });

  it('noma‘lum/buzuq mahsulot kodi premium BERMAYDI', async () => {
    const db = fakeDb({
      ...YANGI_HISOB,
      payments: [{ id: 9, product_code: 'allaqachon-yoq-kod', tariff_type: 'year', approved_at: kunOldin(1) }],
    });
    assert.strictEqual(await hasActiveAccess(db, 1), false);
  });

  it('eski (product_code yozilmagan) to‘lov rus kursi deb qabul qilinadi', async () => {
    const db = fakeDb({
      ...YANGI_HISOB,
      payments: [{ id: 9, product_code: null, tariff_type: 'three_month', approved_at: kunOldin(3) }],
    });
    assert.strictEqual(await hasActiveAccess(db, 1), true);
  });

  it('tasdiqlanmagan (approved_at bo‘sh) to‘lov kirish bermaydi', async () => {
    const db = fakeDb({
      ...YANGI_HISOB,
      payments: [{ id: 9, product_code: 'russian', tariff_type: 'year', approved_at: null }],
    });
    assert.strictEqual(await hasActiveAccess(db, 1), false);
  });
});
