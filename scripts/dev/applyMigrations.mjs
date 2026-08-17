/**
 * applyMigrations.mjs — migratsiyalarni `psql` siz qo'llaydi.
 *
 * NEGA: `npm run db:push` `psql` binarini talab qiladi, u lokal mashinada yo'q.
 * Bu skript o'sha SQL fayllarni `pg` klienti orqali bajaradi.
 *
 * FAQAT LOKAL ISHLAB CHIQISH UCHUN. Prodakshanda `npm run db:push` ishlatiladi.
 *
 * Ishlatish:
 *   node scripts/dev/applyMigrations.mjs
 *   node scripts/dev/applyMigrations.mjs --only 134   # bitta migratsiya
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m?.[1] === name) return m[2].replace(/^["']|["']$/g, '').trim();
  }
  return '';
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const dir = resolve(process.cwd(), 'db', 'migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => !only || f.startsWith(only))
  .sort();

const client = new pg.Client({ connectionString: readEnv('DATABASE_URL') });
await client.connect();

/**
 * Supabase rollari. Migratsiyalar RLS siyosatlarida ularga murojaat qiladi
 * (GRANT ... TO authenticated), lekin sof PostgreSQL da bunday rollar yo'q —
 * ularsiz migratsiyalar zanjiri birinchi RLS faylida uzilib qoladi.
 */
for (const role of ['anon', 'authenticated', 'service_role']) {
  await client.query(
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
         CREATE ROLE ${role} NOLOGIN;
       END IF;
     END $$;`,
  );
}
console.log('Supabase rollari tayyor (anon, authenticated, service_role)');
console.log(`${files.length} ta migratsiya qo'llanadi\n`);

let ok = 0;
const failed = [];

for (const file of files) {
  const sql = readFileSync(resolve(dir, file), 'utf8');
  try {
    await client.query(sql);
    ok++;
  } catch (err) {
    failed.push({ file, message: String(err.message).split('\n')[0] });
    // Tranzaksiya buzilgan bo'lsa tiklaymiz, aks holda keyingilari ham yiqiladi.
    try {
      await client.query('ROLLBACK');
    } catch {
      /* tranzaksiya ochiq emas edi */
    }
  }
}

console.log(`O'tdi: ${ok}/${files.length}`);
if (failed.length) {
  console.log(`\nO'tmagan (${failed.length}):`);
  for (const f of failed) console.log(`  ${f.file}: ${f.message}`);
}
await client.end();
process.exit(0);
