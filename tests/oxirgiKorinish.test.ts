import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { belgilaKorinish, unutHammasini } from '../server/services/oxirgiKorinish.service';
import type { DbClient } from '../server/types/dbClient';

/*
 * Bu belgi HAR SO'ROVDA chaqiriladi — ya'ni platformadagi eng issiq yo'lda
 * turadi. Shuning uchun sinaladigan asosiy narsa: u bazaga bekorga
 * yozmasligi va so'rovni sekinlashtirmasligi.
 */

function soxtaBaza() {
  const yozuvlar: Array<{ id: unknown; qiymat: unknown }> = [];
  const baza = {
    from: () => ({
      update: (qiymat: unknown) => ({
        eq: (_ustun: string, id: unknown) => {
          yozuvlar.push({ id, qiymat });
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  } as unknown as DbClient;
  return { baza, yozuvlar };
}

describe("platformada oxirgi ko'rinish", () => {
  beforeEach(() => unutHammasini());

  it('birinchi so‘rovda bazaga yozadi', () => {
    const { baza, yozuvlar } = soxtaBaza();
    belgilaKorinish(baza, 42);
    assert.equal(yozuvlar.length, 1);
    assert.equal(yozuvlar[0].id, 42);
    assert.ok((yozuvlar[0].qiymat as { last_seen_at?: string }).last_seen_at);
  });

  it('ketma-ket so‘rovlarda QAYTA yozmaydi', () => {
    // Eng muhim tekshiruv: faol foydalanuvchi daqiqasiga o'nlab so'rov
    // yuboradi; har biriga UPDATE ketsa `users` jadvali tinmay yangilanardi.
    const { baza, yozuvlar } = soxtaBaza();
    for (let i = 0; i < 50; i += 1) belgilaKorinish(baza, 42);
    assert.equal(yozuvlar.length, 1, '50 so‘rovga bitta yozuv bo‘lishi kerak');
  });

  it('har foydalanuvchi mustaqil hisoblanadi', () => {
    const { baza, yozuvlar } = soxtaBaza();
    belgilaKorinish(baza, 1);
    belgilaKorinish(baza, 2);
    belgilaKorinish(baza, 1);
    assert.equal(yozuvlar.length, 2);
    assert.deepEqual(yozuvlar.map((y) => y.id), [1, 2]);
  });

  it('yaroqsiz id da hech narsa qilmaydi', () => {
    const { baza, yozuvlar } = soxtaBaza();
    for (const yomon of [0, -1, NaN, Infinity]) belgilaKorinish(baza, yomon);
    assert.equal(yozuvlar.length, 0);
  });

  it('baza yiqilsa so‘rov yiqilmaydi va keyin qayta urinadi', async () => {
    let birinchi = true;
    const yozuvlar: unknown[] = [];
    const baza = {
      from: () => ({
        update: () => ({
          eq: (_u: string, id: unknown) => {
            yozuvlar.push(id);
            if (birinchi) {
              birinchi = false;
              return Promise.reject(new Error('baza yiqildi'));
            }
            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
    } as unknown as DbClient;

    // Yiqilish chaqiruvchiga chiqmasligi kerak.
    assert.doesNotThrow(() => belgilaKorinish(baza, 7));
    await new Promise((r) => setImmediate(r));

    // Yiqilgan yozuv xotirada "bo'ldi" deb qolmasin — qayta urinilsin.
    belgilaKorinish(baza, 7);
    assert.equal(yozuvlar.length, 2, 'xato bo‘lgan yozuv qayta urinilishi kerak');
  });
});
