/**
 * sqlConsole.service.ts — admin panelidagi SQL konsoli.
 *
 * ═══ XAVFSIZLIK MODELI ═══
 * Bu yerda SQL matni TAHLIL QILINMAYDI va regexp bilan "xavfli buyruq"
 * qidirilmaydi — bunday himoya har doim chetlab o'tiladi (izohlar, qo'shtirnoq,
 * `EXECUTE`, kodlash hiylalari). O'rniga chegara BAZANING O'ZIDA:
 *
 *   `SQL_CONSOLE_DATABASE_URL` — alohida PostgreSQL roli (`falarus_content_sql`).
 *   Unga FAQAT kunlik kurs kontenti jadvallariga SELECT/INSERT/UPDATE/DELETE
 *   berilgan. `users`, `payments`, `admin_*` — "permission denied".
 *   DDL (DROP/CREATE/ALTER) — "must be owner" / "permission denied for schema".
 *
 * Ya'ni konsolda nima yozilishidan qat'i nazar, zarar doirasi kontent bilan
 * chegaralangan. Bu URL bo'lmasa konsol umuman ishlamaydi (503).
 *
 * Qo'shimcha himoyalar:
 *   - HAR DOIM tranzaksiya ichida; `dryRun` da oxirida ROLLBACK.
 *   - Skriptning O'ZIDAGI `BEGIN;`/`COMMIT;` neytrallanadi: aks holda skriptdagi
 *     `COMMIT` konsolning tranzaksiyasini yopib qo'yadi va "Tekshirish" ham
 *     o'zgarishlarni SAQLAB yuboradi (ROLLBACK bo'sh joyga tushadi).
 *   - `statement_timeout` — cheksiz so'rov serverni band qilmasin.
 *   - Natija qatorlari cheklangan (klientni ham, xotirani ham himoya qiladi).
 *   - Har bajarilgan skript audit jurnaliga yoziladi (kim, qachon, nima).
 */
import pg from 'pg';

const { Pool } = pg;

const STATEMENT_TIMEOUT_MS = 15_000;
const MAX_RESULT_ROWS = 400;
/** Sahifadagi ".sql fayl yuklash" chegarasi (200 KB) bilan bir xil bo'lishi shart. */
const MAX_SQL_LENGTH = 200_000;

let consolePool: pg.Pool | null = null;

/** Konsol sozlanganmi (alohida cheklangan rol berilganmi). */
export function isSqlConsoleEnabled(): boolean {
  return Boolean(process.env.SQL_CONSOLE_DATABASE_URL?.trim());
}

function getPool(): pg.Pool {
  const url = process.env.SQL_CONSOLE_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "SQL konsoli sozlanmagan: .env da SQL_CONSOLE_DATABASE_URL yo'q (cheklangan rol talab qilinadi)",
    );
  }
  if (!consolePool) {
    consolePool = new Pool({
      connectionString: url,
      max: 2,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 5_000,
    });
    consolePool.on('error', (err) => console.error('[sqlConsole] pool xatosi:', err.message));
  }
  return consolePool;
}

/**
 * Skriptni buyruqlarga ajratadi.
 *
 * Oddiy `split(';')` yaramaydi: nuqtali vergul matn ichida ham uchraydi
 * (masalan `'oila uchun; oilasiz'`). Shu sababli izohlar (`--`, `/* *\/`),
 * qo'shtirnoqlar va `$$...$$` bloklari hisobga olinadi.
 *
 * Har buyruq uchun `code` — izohlar bo'sh joyga almashtirilgan nusxa; buyruq
 * turini aniqlash uchun ishlatiladi.
 */
function splitStatements(sql: string): { start: number; end: number; code: string }[] {
  const kod = sql.split('');
  const bosh = (from: number, to: number) => {
    for (let k = from; k < to && k < kod.length; k++) if (kod[k] !== '\n') kod[k] = ' ';
  };

  const out: { start: number; end: number; code: string }[] = [];
  let i = 0;
  let start = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const to = nl === -1 ? sql.length : nl;
      bosh(i, to);
      i = to;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < sql.length && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') { depth++; j += 2; }
        else if (sql[j] === '*' && sql[j + 1] === '/') { depth--; j += 2; }
        else j++;
      }
      bosh(i, j);
      i = j;
      continue;
    }
    if (ch === "'" || ch === '"') {
      // standard_conforming_strings yoqilgan: `\` maxsus emas, `''` — qochirish.
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) j += 2;
          else { j++; break; }
        } else j++;
      }
      i = j;
      continue;
    }
    if (ch === '$') {
      const tag = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i, i + 64));
      if (tag) {
        const yopilish = sql.indexOf(tag[0], i + tag[0].length);
        i = yopilish === -1 ? sql.length : yopilish + tag[0].length;
        continue;
      }
    }
    if (ch === ';') {
      out.push({ start, end: i + 1, code: kod.slice(start, i + 1).join('') });
      i++;
      start = i;
      continue;
    }
    i++;
  }

  const qoldiq = kod.slice(start).join('');
  if (qoldiq.trim()) out.push({ start, end: sql.length, code: qoldiq });
  return out;
}

/** `BEGIN;`, `COMMIT;`, `ROLLBACK;`, `END;`, `START TRANSACTION;` — yolg'iz turgan holda. */
const TRANZAKSIYA_BUYRUGI =
  /^\s*(BEGIN|COMMIT|END|ROLLBACK|START\s+TRANSACTION)(\s+(WORK|TRANSACTION))?\s*;?\s*$/i;

/**
 * Skriptdagi tranzaksiya buyruqlarini bo'sh joyga almashtiradi.
 *
 * Kun kontenti skriptlari odatda `BEGIN; ... COMMIT;` ichida yoziladi. Konsol esa
 * skriptni O'ZI tranzaksiyaga o'raydi, shu sababli skriptdagi `COMMIT` konsolnikini
 * yopib qo'yardi: "Tekshirish" bosilganda ham ma'lumot bazaga yozilib qolardi va
 * keyingi xato butun skriptni bekor qila olmasdi.
 *
 * Buyruqlar O'CHIRILMAYDI, bo'sh joyga almashtiriladi — shunda Postgres xatodagi
 * belgi raqami (qator/ustun) asl skriptga to'g'ri keladi.
 */
export function neutralizeTransactionControl(sql: string): { text: string; ignored: string[] } {
  const belgilar = sql.split('');
  const ignored: string[] = [];

  for (const st of splitStatements(sql)) {
    if (!TRANZAKSIYA_BUYRUGI.test(st.code)) continue;
    ignored.push(st.code.trim().replace(/\s+/g, ' '));
    for (let k = st.start; k < st.end; k++) {
      if (belgilar[k] !== '\n') belgilar[k] = ' ';
    }
  }

  return { text: belgilar.join(''), ignored };
}

/** SQLSTATE bo'yicha o'zbekcha maslahat — xatoni o'qigan odam nima qilishni bilsin. */
const XATO_MASLAHATI: Record<string, string> = {
  '23505':
    "Takror qiymat. Skriptning O'ZIDA bir xil qator ikki marta yozilgan (yoki bazada allaqachon bor). " +
    "Takrorlangan qatorni o'chiring yoki INSERT oxiriga ON CONFLICT (...) DO NOTHING qo'shing " +
    '(DO UPDATE emas: bitta INSERT ichidagi takrorda u ham xato beradi).',
  '21000':
    "ON CONFLICT ... DO UPDATE bitta INSERT ichida bir qatorga ikki marta tega olmaydi. " +
    'DO NOTHING ishlating yoki takrorlangan qatorni olib tashlang.',
  '23503':
    "Bog'liq qator topilmadi. Masalan matn so'zlarini (lexemes) qo'shishdan oldin matnning o'zi " +
    '(daily_reading_passages) qo\'shilgan bo\'lishi kerak — skriptda tartibni tekshiring.',
  '23502': "Ustun bo'sh qoldirilgan, lekin u NOT NULL. Qiymat bering yoki ustunni ro'yxatdan chiqaring.",
  '23514': 'CHECK sharti bajarilmadi — qiymat ruxsat etilgan oraliqdan tashqarida.',
  '22P02': "Qiymat turi mos emas (masalan matn o'rniga son kutilgan).",
  '42601': "Sintaksis xatosi — quyidagi qatorga qarang.",
  '42703': "Bunday ustun yo'q. Jadval ustunlari nomini tekshiring.",
  '42P01': "Bunday jadval yo'q. Nomini tekshiring.",
  '42501':
    "Bu jadval konsol uchun ochilmagan. Konsol faqat kurs kontenti jadvallariga tegadi " +
    '(foydalanuvchilar, to\'lovlar va jadval tuzilmasi yopiq).',
  '57014': `So'rov ${STATEMENT_TIMEOUT_MS / 1000} soniyadan oshdi va to'xtatildi. Skriptni bo'laklarga bo'ling.`,
};

/**
 * Postgres xatosini odam o'qiy oladigan matnga aylantiradi.
 *
 * Ilgari faqat `message` ko'rsatilardi, ya'ni admin cheklov nomini ko'rardi-yu,
 * skriptning qayeri aybdorligini bilmasdi.
 *
 * Eslatma: kontent jadvallarida RLS yoqilgani uchun Postgres `detail` maydonini
 * (aynan qaysi qiymat takrorlangani) konsol roliga YUBORMAYDI — shu sababli
 * cheklovning ustunlari `constraintColumns` orqali alohida so'raladi.
 */
function describePgError(
  err: unknown,
  sql: string,
  transactionOpen = true,
  constraintColumns: string[] = [],
): string {
  const e = err as {
    message?: string;
    code?: string;
    detail?: string;
    hint?: string;
    position?: string;
    table?: string;
    column?: string;
    constraint?: string;
  };
  const qatorlar: string[] = [e.message ?? 'SQL xatosi'];

  if (e.detail) qatorlar.push(`Tafsilot: ${e.detail}`);
  if (e.table) qatorlar.push(`Jadval: ${e.table}${e.column ? ` · ustun: ${e.column}` : ''}`);
  if (constraintColumns.length) {
    qatorlar.push(
      `Takrorlanmasligi kerak: (${constraintColumns.join(', ')}) — shu ustunlar juftligi ` +
        'skriptda ikki marta uchragan.',
    );
  }

  // `position` — butun skript bo'yicha belgi raqami; uni qator/ustunga aylantiramiz.
  const pos = Number(e.position);
  if (Number.isFinite(pos) && pos > 0 && pos <= sql.length) {
    const oldingi = sql.slice(0, pos - 1);
    const qatorRaqami = oldingi.split('\n').length;
    const ustun = pos - (oldingi.lastIndexOf('\n') + 1);
    const matn = sql.split('\n')[qatorRaqami - 1] ?? '';
    qatorlar.push(`Joyi: ${qatorRaqami}-qator, ${ustun}-belgi`);
    qatorlar.push(`  ${matn.trim().slice(0, 160)}`);
  }

  const maslahat = e.code ? XATO_MASLAHATI[e.code] : undefined;
  if (maslahat) qatorlar.push(`Maslahat: ${maslahat}`);
  if (e.hint) qatorlar.push(`Postgres maslahati: ${e.hint}`);
  qatorlar.push(
    transactionOpen
      ? "Hech narsa saqlanmadi — butun skript bekor qilindi (tranzaksiya)."
      : "DIQQAT: skript tranzaksiyani o'zi yopib yuborgan, shu sababli xatodan OLDINGI " +
        "o'zgarishlar bazada qolgan bo'lishi mumkin. Bazani tekshiring.",
  );

  return qatorlar.join('\n');
}

export type SqlResult = {
  /** `select` bo'lsa ustun nomlari. */
  columns: string[];
  rows: Record<string, unknown>[];
  /** O'zgargan qatorlar soni (INSERT/UPDATE/DELETE uchun). */
  rowCount: number;
  command: string;
};

export type RunResult = {
  dryRun: boolean;
  /** Skript bir nechta buyruqdan iborat bo'lishi mumkin. */
  results: SqlResult[];
  totalChanged: number;
  durationMs: number;
  truncated: boolean;
  /** Skriptdan olib tashlangan `BEGIN;`/`COMMIT;` kabi buyruqlar. */
  ignoredCommands: string[];
  /** Skript baribir tranzaksiyani yopib yuborgan bo'lsa — ogohlantirish uchun. */
  transactionEscaped: boolean;
};

/**
 * Buzilgan cheklovning ustunlari (masalan `text_id, word_ru_normalized`).
 *
 * RLS tufayli Postgres qaysi QIYMAT takrorlanganini aytmaydi, lekin qaysi
 * USTUNLAR ekanini katalogdan o'qish mumkin — admin skriptdan topa oladi.
 */
async function constraintColumns(client: pg.PoolClient, err: unknown): Promise<string[]> {
  const e = err as { constraint?: string; table?: string };
  if (!e.constraint || !e.table) return [];
  try {
    // Cheklov nomi bo'yicha INDEKS qidiriladi: kontent jadvallaridagi ba'zi
    // cheklovlar `CREATE UNIQUE INDEX` bilan qo'yilgan va `pg_constraint` da yo'q,
    // `ADD CONSTRAINT ... UNIQUE` esa baribir shu nomli indeks yaratadi.
    const { rows } = await client.query<{ attname: string }>(
      `SELECT a.attname
         FROM pg_index ix
         JOIN pg_class i ON i.oid = ix.indexrelid
         JOIN pg_class t ON t.oid = ix.indrelid
         JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey::smallint[])
        WHERE i.relname = $1 AND t.relname = $2
        ORDER BY array_position(ix.indkey::smallint[], a.attnum)`,
      [e.constraint, e.table],
    );
    return rows.map((r) => r.attname);
  } catch {
    return [];
  }
}

/**
 * Skriptni bajaradi.
 *
 * `dryRun: true` — hamma narsa bajariladi, natija/qator sonlari qaytariladi,
 * so'ng ROLLBACK. Ya'ni admin nima o'zgarishini BAJARMASDAN OLDIN ko'radi.
 */
export async function runSql(sql: string, opts: { dryRun: boolean }): Promise<RunResult> {
  const text = String(sql ?? '').trim();
  if (!text) throw new Error("SQL bo'sh");
  if (text.length > MAX_SQL_LENGTH) {
    throw new Error(`SQL juda uzun (maksimum ${MAX_SQL_LENGTH} belgi)`);
  }

  // Skriptdagi `BEGIN;`/`COMMIT;` konsolning tranzaksiyasini buzadi — neytrallaymiz.
  const { text: bajariladigan, ignored } = neutralizeTransactionControl(text);

  const started = Date.now();
  const client = await getPool().connect();
  try {
    await client.query(`SET statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    await client.query('BEGIN');
    // Nazorat belgisi: `SET LOCAL` faqat shu tranzaksiya davomida yashaydi. Skript
    // baribir COMMIT qila olsa, belgi yo'qoladi va buni aniqlab ayta olamiz.
    await client.query("SET LOCAL falarus.console_tx = 'ochiq'");

    // `pg` bir nechta buyruqni bitta so'rovda bajara oladi va har biri uchun
    // alohida natija qaytaradi (parametrlarsiz bo'lgani uchun mumkin).
    const raw = (await client.query(bajariladigan)) as unknown as pg.QueryResult | pg.QueryResult[];
    const list = Array.isArray(raw) ? raw : [raw];

    const nazorat = await client.query<{ v: string | null }>(
      "SELECT current_setting('falarus.console_tx', true) AS v",
    );
    const transactionEscaped = nazorat.rows[0]?.v !== 'ochiq';

    let truncated = false;
    const results: SqlResult[] = list.map((r) => {
      const rows = (r.rows ?? []) as Record<string, unknown>[];
      if (rows.length > MAX_RESULT_ROWS) truncated = true;
      return {
        columns: (r.fields ?? []).map((f) => f.name),
        rows: rows.slice(0, MAX_RESULT_ROWS),
        rowCount: Number(r.rowCount ?? 0),
        command: String(r.command ?? ''),
      };
    });

    const totalChanged = results
      .filter((r) => ['INSERT', 'UPDATE', 'DELETE'].includes(r.command))
      .reduce((a, r) => a + r.rowCount, 0);

    await client.query(opts.dryRun ? 'ROLLBACK' : 'COMMIT');

    return {
      dryRun: opts.dryRun,
      results,
      totalChanged,
      durationMs: Date.now() - started,
      truncated,
      ignoredCommands: ignored,
      transactionEscaped,
    };
  } catch (err) {
    // Tranzaksiya hali ochiqmi? Ochiq bo'lsa ROLLBACK hamma narsani qaytaradi va
    // "hech narsa saqlanmadi" deyish rost bo'ladi.
    let ochiq = false;
    try {
      const nazorat = await client.query<{ v: string | null }>(
        "SELECT current_setting('falarus.console_tx', true) AS v",
      );
      ochiq = nazorat.rows[0]?.v === 'ochiq';
    } catch {
      /* xato tufayli tranzaksiya buzilgan bo'lsa — ROLLBACK baribir qaytaradi */
      ochiq = true;
    }
    try {
      await client.query('ROLLBACK');
    } catch {
      /* tranzaksiya allaqachon yopilgan bo'lishi mumkin */
    }
    throw new Error(describePgError(err, text, ochiq, await constraintColumns(client, err)));
  } finally {
    client.release();
  }
}

/**
 * Audit jurnali — kim, qachon, qanday skriptni bajardi.
 * Asosiy (ega) ulanish orqali yoziladi: konsol rolining bu jadvalga huquqi yo'q,
 * ya'ni admin o'z izini o'chira olmaydi.
 */
export async function logSqlRun(params: {
  adminId: number | null;
  adminEmail: string | null;
  sql: string;
  dryRun: boolean;
  ok: boolean;
  changed: number;
  error?: string | null;
}): Promise<void> {
  const { pool } = await import('../lib/db.js');
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO admin_sql_audit (admin_id, admin_email, sql_text, dry_run, ok, rows_changed, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        params.adminId,
        params.adminEmail,
        params.sql.slice(0, MAX_SQL_LENGTH),
        params.dryRun,
        params.ok,
        params.changed,
        params.error ?? null,
      ],
    );
  } catch (err) {
    // Jurnal yozilmagani bajarilgan amalni bekor qilmaydi, lekin ko'rinib tursin.
    console.error('[sqlConsole] auditga yozib bo\'lmadi:', (err as Error).message);
  }
}

/** Oxirgi bajarilgan skriptlar. */
export async function sqlHistory(limit = 30) {
  const { pool } = await import('../lib/db.js');
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT id, admin_email, sql_text, dry_run, ok, rows_changed, error, created_at
     FROM admin_sql_audit ORDER BY id DESC LIMIT $1`,
    [Math.min(100, Math.max(1, limit))],
  );
  return rows;
}
