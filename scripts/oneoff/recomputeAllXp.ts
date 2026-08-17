/**
 * Barcha foydalanuvchilarning XP sini QAYTA HISOBLAYDI.
 *
 * NIMA UCHUN: XP formulasi o'zgardi (2026-08-12 — ball endi kunning har bir
 * mashqidan). `recomputeUserXp` faqat foydalanuvchi biror amal qilganda
 * chaqiriladi, ya'ni bu skriptsiz reyting oylab ARALASH qolardi: faol
 * o'quvchilar yangi formulada, qolganlari eskisida.
 *
 * Ball faqat OSHADI (formula hech qaysi manbani olib tashlamagan), shuning
 * uchun hech kim o'rnini yo'qotmaydi.
 *
 * Ishlatish (serverda):
 *   npx tsx scripts/oneoff/recomputeAllXp.ts
 *   npx tsx scripts/oneoff/recomputeAllXp.ts --limit 20   # sinov
 */
import 'dotenv/config';
import { pool } from '../../server/lib/db.js';
import { createDatabaseClient } from '../../server/lib/createDatabaseClient.js';
import { recomputeUserXp } from '../../server/services/xpService.js';
import * as leaderboardService from '../../server/services/leaderboard.service.js';

const i = process.argv.indexOf('--limit');
const LIMIT = i >= 0 ? Number(process.argv[i + 1] ?? 0) : 0;

async function main() {
  if (!pool) throw new Error('DATABASE_URL yo‘q');
  const db = createDatabaseClient();

  // Faqat kunlik rejada izi bor foydalanuvchilar: qolganlarida hisob o'zgarmaydi.
  const { rows } = await pool.query<{ user_id: number }>(
    `SELECT DISTINCT user_id FROM user_kunlik_day_progress ORDER BY user_id ${LIMIT > 0 ? 'LIMIT ' + LIMIT : ''}`,
  );
  console.log(`Qayta hisoblanadi: ${rows.length} ta foydalanuvchi`);

  let n = 0;
  let xato = 0;
  for (const r of rows) {
    try {
      await recomputeUserXp(db as never, Number(r.user_id));
    } catch (e) {
      xato += 1;
      console.error(`  [xato] user ${r.user_id}:`, (e as Error).message);
    }
    n += 1;
    if (n % 200 === 0) console.log(`${n}/${rows.length}`);
  }

  // O'rinlar bir marta, oxirida — har foydalanuvchida qayta saralash shart emas.
  await leaderboardService.recalculateRanks(db as never);
  console.log(`TAYYOR: ${n} ta hisoblandi, ${xato} ta xato.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
