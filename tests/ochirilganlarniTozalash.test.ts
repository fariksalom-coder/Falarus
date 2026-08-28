import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { tozalaOchirilganlarni, tozalaYetimFayllarni } from '../server/services/mediaTozalash.service';
import type { DbClient } from '../server/types/dbClient';

/*
 * Bu yerda sinaladigan narsa — O'CHIRISH. Xato qilsa oqibati qaytmas:
 * tirik yozuv yo'q qilinsa uni hech kim tiklay olmaydi. Shuning uchun
 * testlar asosan "TEGMASLIK kerak bo'lgan narsaga tegmadimi" ni tekshiradi.
 */

const soatOldin = (n: number) => new Date(Date.now() - n * 3600_000).toISOString();

type Qator = Record<string, unknown>;

/**
 * Bazaning eng kichik taqlidi: `select` filtrlarni haqiqatan qo'llaydi,
 * `delete` esa qaysi id o'chganini yozib boradi.
 */
function soxtaBaza(jadvallar: Record<string, Qator[]>) {
  const ochirilgan: Array<{ jadval: string; id: unknown }> = [];
  const qoshilgan: Qator[] = [];

  const qurilma = (jadval: string) => {
    let qatorlar = [...(jadvallar[jadval] ?? [])];
    const q = {
      select() { return q; },
      is(ustun: string, qiymat: null) {
        qatorlar = qatorlar.filter((r) => (qiymat === null ? r[ustun] == null : r[ustun] === qiymat));
        return q;
      },
      not(ustun: string, _op: string, qiymat: null) {
        qatorlar = qatorlar.filter((r) => (qiymat === null ? r[ustun] != null : r[ustun] !== qiymat));
        return q;
      },
      lt(ustun: string, qiymat: string) {
        qatorlar = qatorlar.filter((r) => String(r[ustun]) < qiymat);
        return q;
      },
      eq(ustun: string, qiymat: unknown) {
        qatorlar = qatorlar.filter((r) => r[ustun] === qiymat);
        if (rejim === 'delete') ochirilgan.push({ jadval, id: qiymat });
        return q;
      },
      limit() { return q; },
      insert(qator: Qator) { qoshilgan.push({ ...qator, __jadval: jadval }); return q; },
      update() { return q; },
      delete() { rejim = 'delete'; return q; },
      maybeSingle() { return Promise.resolve({ data: qatorlar[0] ?? null, error: null }); },
      then(ok: (v: { data: Qator[]; error: null }) => unknown) {
        return Promise.resolve({ data: qatorlar, error: null }).then(ok);
      },
    };
    let rejim: 'select' | 'delete' = 'select';
    return q;
  };

  const baza = {
    from: (jadval: string) => qurilma(jadval),
    storage: { from: () => ({ remove: async () => ({ data: null, error: null }) }) },
  } as unknown as DbClient;

  return { baza, ochirilgan, qoshilgan };
}

describe("o'chirilgan narsalar bazada qolib ketmaydi", () => {
  let uploads: string;

  beforeEach(async () => {
    uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'falarus-tozalash-'));
  });

  it('muhlati o‘tgan rels bazadan ham, diskdan ham ketadi', async () => {
    const nisbiy = 'storage/community-reels/7/eski.mp4';
    await fs.mkdir(path.dirname(path.join(uploads, nisbiy)), { recursive: true });
    await fs.writeFile(path.join(uploads, nisbiy), 'video');

    const { baza, ochirilgan, qoshilgan } = soxtaBaza({
      community_reels: [{
        id: 11, author_user_id: 7, video_url: '/uploads/' + nisbiy,
        poster_url: null, deleted_at: soatOldin(48), deleted_by: 7,
      }],
      community_group_messages: [],
    });

    const natija = await tozalaOchirilganlarni(baza, uploads);

    assert.equal(natija.rels, 1);
    assert.equal(natija.fayl, 1, 'fayl diskdan ketishi kerak');
    assert.deepEqual(ochirilgan, [{ jadval: 'community_reels', id: 11 }]);
    await assert.rejects(fs.stat(path.join(uploads, nisbiy)), 'fayl qolmasligi kerak');

    // Iz qoladi, ammo MAZMUNSIZ: manzil ham, matn ham jurnalga tushmaydi.
    const iz = qoshilgan.find((r) => r.__jadval === 'community_deletion_log');
    assert.ok(iz, 'jurnalga yozilishi kerak');
    assert.equal(iz.entity_type, 'reel');
    assert.equal(iz.entity_id, 11);
    assert.equal(iz.file_removed, true);
    for (const kalit of Object.keys(iz)) {
      assert.ok(!/url|content|caption/i.test(kalit), `jurnalda mazmun bo‘lmasin: ${kalit}`);
    }
  });

  it('muhlati YETMAGAN o‘chirilgan yozuvga tegmaydi', async () => {
    const { baza, ochirilgan } = soxtaBaza({
      community_reels: [{
        id: 12, author_user_id: 7, video_url: null, poster_url: null,
        deleted_at: soatOldin(1), deleted_by: 7,
      }],
      community_group_messages: [],
    });

    const natija = await tozalaOchirilganlarni(baza, uploads);
    assert.equal(natija.rels, 0, 'bir soat oldin o‘chirilgan yozuv hali qolishi kerak');
    assert.deepEqual(ochirilgan, []);
  });

  it('TIRIK yozuvga hech qachon tegmaydi', async () => {
    const { baza, ochirilgan } = soxtaBaza({
      community_reels: [
        { id: 13, author_user_id: 7, video_url: null, poster_url: null, deleted_at: null, deleted_by: null },
      ],
      community_group_messages: [
        { id: 20, sender_user_id: 7, media_url: null, deleted_at: null },
      ],
    });

    const natija = await tozalaOchirilganlarni(baza, uploads);
    assert.equal(natija.rels + natija.xabar, 0);
    assert.deepEqual(ochirilgan, [], 'deleted_at bo‘sh yozuv o‘chmasligi SHART');
  });

  it('yetim faylni oladi, tirik faylga tegmaydi', async () => {
    const tirikNisbiy = 'storage/community-media/7/tirik.jpg';
    const yetimNisbiy = 'storage/community-media/7/yetim.jpg';
    for (const n of [tirikNisbiy, yetimNisbiy]) {
      await fs.mkdir(path.dirname(path.join(uploads, n)), { recursive: true });
      await fs.writeFile(path.join(uploads, n), 'rasm');
    }
    // Ikkalasini ham "eski" qilamiz, aks holda yosh fayl himoyasi ishlaydi.
    const eski = new Date(Date.now() - 24 * 3600_000);
    for (const n of [tirikNisbiy, yetimNisbiy]) await fs.utimes(path.join(uploads, n), eski, eski);

    const { baza } = soxtaBaza({
      community_group_messages: [{ media_url: '/uploads/' + tirikNisbiy, media_deleted_at: null }],
      community_reels: [],
    });

    const natija = await tozalaYetimFayllarni(baza, uploads);

    assert.equal(natija.ochirildi, 1);
    await fs.stat(path.join(uploads, tirikNisbiy)); // yiqilmasa — joyida
    await assert.rejects(fs.stat(path.join(uploads, yetimNisbiy)), 'yetim ketishi kerak');
  });

  it('YANGI yetim faylga tegmaydi — hali yuklanayotgan bo‘lishi mumkin', async () => {
    const nisbiy = 'storage/community-media/7/hozir.jpg';
    await fs.mkdir(path.dirname(path.join(uploads, nisbiy)), { recursive: true });
    await fs.writeFile(path.join(uploads, nisbiy), 'rasm');

    const { baza } = soxtaBaza({ community_group_messages: [], community_reels: [] });
    const natija = await tozalaYetimFayllarni(baza, uploads);

    assert.equal(natija.ochirildi, 0, 'yangi fayl saqlanishi kerak');
    await fs.stat(path.join(uploads, nisbiy));
  });
});
