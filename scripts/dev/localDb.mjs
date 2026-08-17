/**
 * localDb.mjs — lokal ishlab chiqish uchun PostgreSQL (PGlite, WASM).
 *
 * NEGA: lokal mashinada PostgreSQL o'rnatilmagan va `sudo` mavjud emas.
 * PGlite — haqiqiy PostgreSQL, WebAssembly ga kompilyatsiya qilingan; u
 * TCP soketda Postgres wire-protokolida gaplashadi, shuning uchun ilovaning
 * `pg.Pool` i hech qanday o'zgarishsiz ulanadi.
 *
 * FAQAT ISHLAB CHIQISH UCHUN. Prodakshanda haqiqiy PostgreSQL ishlatiladi.
 *
 * Ishlatish:
 *   node scripts/dev/localDb.mjs            # 5432-portda ko'taradi
 *   PGLITE_PORT=5433 node scripts/dev/localDb.mjs
 *
 * Ma'lumot `tmp/pglite-data/` da saqlanadi — o'chirsangiz baza tozalanadi.
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const PORT = Number(process.env.PGLITE_PORT || 5432);
const DATA_DIR = process.env.PGLITE_DATA || './tmp/pglite-data';

const db = await PGlite.create({ dataDir: DATA_DIR });
const server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1' });

await server.start();
console.log(`[pglite] PostgreSQL (WASM) tayyor: 127.0.0.1:${PORT}`);
console.log(`[pglite] ma'lumot: ${DATA_DIR}`);
console.log('[pglite] to\'xtatish: Ctrl+C');

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
