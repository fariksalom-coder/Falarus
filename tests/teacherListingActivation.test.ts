/**
 * teacherListingActivation.test.ts — o'qituvchi listing obunasini faollashtirish.
 *
 * Nega kerak: onlayn to'lov (Rahmat) callback'i shu funksiyani chaqiradi va
 * aynan shu yerda o'qituvchi pulining evaziga ko'rinish muddatini oladi.
 * Ikki xatoning oldini oladi:
 *   1) muddat qayta boshlanib, oldindan to'lagan o'qituvchining qolgan kunlari kuyishi;
 *   2) to'lovning o'zi profilni 'active' qilib, admin tasdig'ini chetlab o'tishi.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { activateTeacherListingPayment } from '../server/services/teacherMarketplace.service';
import type { DbClient } from '../server/types/dbClient';

type Patch = { table: string; values: Record<string, unknown> };

/** `select ... eq ... maybeSingle()` uchun jadval bo'yicha tayyor javob beruvchi soxta klient. */
function fakeDb(rows: Record<string, unknown>): { db: DbClient; patches: Patch[] } {
  const patches: Patch[] = [];

  const from = (table: string): any => {
    let mode: 'select' | 'update' = 'select';
    let payload: Record<string, unknown> = {};
    const result = { data: null, error: null };

    const builder: any = {
      select: () => builder,
      update: (values: Record<string, unknown>) => {
        mode = 'update';
        payload = values;
        return builder;
      },
      eq: () => {
        if (mode === 'update') patches.push({ table, values: payload });
        return builder;
      },
      maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
      single: async () => ({ data: rows[table] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    return builder;
  };

  return { db: { from, rpc: async () => ({ data: null, error: null }), storage: {} } as DbClient, patches };
}

const SUBSCRIPTION = { id: 7, teacher_user_id: 42, plan_code: 'teacher_listing_month_uzs' };
const PLAN = { duration_days: 30 };

const dayMs = 24 * 60 * 60 * 1000;
const patchFor = (patches: Patch[], table: string) =>
  patches.find((p) => p.table === table)?.values ?? {};

describe('activateTeacherListingPayment', () => {
  it('obunasi yo‘q o‘qituvchiga bugundan 30 kun beradi', async () => {
    const { db, patches } = fakeDb({
      teacher_listing_subscriptions: SUBSCRIPTION,
      teacher_listing_plans: PLAN,
      teacher_profiles: { listing_paid_until: null },
    });

    const before = Date.now();
    await activateTeacherListingPayment(db, 100, 42);

    const paidUntil = String(patchFor(patches, 'teacher_profiles').listing_paid_until);
    const days = (Date.parse(paidUntil) - before) / dayMs;
    assert.ok(days > 29.9 && days < 30.1, `30 kun kutilgandi, ${days} chiqdi`);
  });

  it('faol obunani UZAYTIRADI — qolgan kunlar kuymaydi', async () => {
    const remaining = 20;
    const currentEnd = new Date(Date.now() + remaining * dayMs);
    const { db, patches } = fakeDb({
      teacher_listing_subscriptions: SUBSCRIPTION,
      teacher_listing_plans: PLAN,
      teacher_profiles: { listing_paid_until: currentEnd.toISOString() },
    });

    await activateTeacherListingPayment(db, 100, 42);

    const paidUntil = String(patchFor(patches, 'teacher_profiles').listing_paid_until);
    const days = (Date.parse(paidUntil) - Date.now()) / dayMs;
    assert.ok(
      days > 49.9 && days < 50.1,
      `20 qolgan + 30 yangi = 50 kun kutilgandi, ${days} chiqdi (muddat qayta boshlanmasin)`
    );
  });

  it('muddati o‘tgan obunani bugundan boshlaydi, o‘tmishga qo‘shmaydi', async () => {
    const expired = new Date(Date.now() - 40 * dayMs);
    const { db, patches } = fakeDb({
      teacher_listing_subscriptions: SUBSCRIPTION,
      teacher_listing_plans: PLAN,
      teacher_profiles: { listing_paid_until: expired.toISOString() },
    });

    await activateTeacherListingPayment(db, 100, 42);

    const paidUntil = String(patchFor(patches, 'teacher_profiles').listing_paid_until);
    const days = (Date.parse(paidUntil) - Date.now()) / dayMs;
    assert.ok(days > 29.9 && days < 30.1, `30 kun kutilgandi, ${days} chiqdi`);
  });

  it("obunani faollashtiradi, lekin profilni admin o'rniga TASDIQLAMAYDI", async () => {
    const { db, patches } = fakeDb({
      teacher_listing_subscriptions: SUBSCRIPTION,
      teacher_listing_plans: PLAN,
      teacher_profiles: { listing_paid_until: null },
    });

    await activateTeacherListingPayment(db, 100, 42);

    assert.strictEqual(patchFor(patches, 'teacher_listing_subscriptions').status, 'active');
    assert.ok(
      patchFor(patches, 'teacher_profiles').listing_paid_until,
      "to'lov `listing_paid_until` ni yozishi shart"
    );
    assert.strictEqual(
      patchFor(patches, 'teacher_profiles').profile_status,
      undefined,
      "to'lov shlyuzi `profile_status` ga tegmasligi shart — aks holda admin RAD ETGAN " +
        "o'qituvchi qayta to'lab o'zini ro'yxatga tiklab oladi"
    );
  });

  it('to‘lovga bog‘langan obuna topilmasa hech narsa o‘zgartirmaydi', async () => {
    const { db, patches } = fakeDb({ teacher_listing_plans: PLAN });

    await activateTeacherListingPayment(db, 999, 42);

    assert.deepStrictEqual(patches, []);
  });
});
