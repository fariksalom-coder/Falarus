/**
 * contentAdmin.service.ts — admin panelidan kunlik kurs kontentini tahrirlash.
 *
 * XAVFSIZLIK ASOSI: jadval va ustun nomlari HECH QACHON so'rovdan olinmaydi.
 * Ular faqat quyidagi RO'YXATDAN (registry) keladi; foydalanuvchi yuborgan
 * qiymatlar esa doim parametr sifatida uzatiladi. Shu sababli bu yerda
 * SQL injection uchun joy yo'q, garchi so'rovlar dinamik qurilsa ham.
 *
 * Har bir "resurs" — bitta jadval va uning tahrirlanadigan maydonlari.
 */
import { pool } from '../lib/db.js';

export type FieldType = 'text' | 'textarea' | 'int' | 'select' | 'stringArray';

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  /** `select` uchun variantlar. */
  options?: { value: string | number; label: string }[];
  /** Jadvalda ustun sifatida ko'rsatilsinmi (ko'rsatilmasa faqat tahrirda). */
  inTable?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
};

export type ResourceDef = {
  key: string;
  label: string;
  table: string;
  /** Birlamchi kalit ustuni. */
  pk: string;
  /** Kun bo'yicha filtrlash ustuni (bo'lmasa — kunga bog'liq emas). */
  dayColumn: string | null;
  /** Tartib ustuni (bo'lsa, yuqori/quyi ko'chirish ishlaydi). */
  orderColumn: string | null;
  /** Kunga BITTA qator (nazariya, o'qish matni) — qo'shish/o'chirish yo'q. */
  singleton?: boolean;
  /**
   * Jadvalda kun ustuni yo'q, lekin BOSHQA jadval orqali kunga bog'lanadi.
   * Masalan `daily_reading_lexemes` — `text_id` orqali `daily_reading_passages`
   * ga, u esa `day_number` ga.
   */
  dayLookup?: {
    /** Shu jadvaldagi bog'lovchi ustun (masalan `text_id`). */
    column: string;
    /** Manba jadval (masalan `daily_reading_passages`). */
    fromTable: string;
    /** Manba jadvaldagi bir xil ustun. */
    fromColumn: string;
    /** Manba jadvaldagi kun ustuni. */
    fromDayColumn: string;
  };
  /**
   * Boshqa maydondan AVTOMAT hisoblanadigan ustunlar (admin qo'lda kiritmaydi).
   * Masalan `word_ru_normalized` — `word_ru` ning kichik harfli shakli;
   * u NOT NULL va unikal indeksda qatnashadi.
   */
  derive?: { column: string; from: string; fn: (value: string) => string }[];
  fields: FieldDef[];
};

const QUIZ_KINDS = [
  { value: 'rule', label: 'Qoida testi' },
  { value: 'sentence', label: 'Gap testi' },
];

export const RESOURCES: ResourceDef[] = [
  {
    key: 'grammar-topic',
    label: 'Grammatika nazariyasi',
    table: 'daily_grammar_topics',
    pk: 'day_number',
    dayColumn: 'day_number',
    orderColumn: null,
    singleton: true,
    fields: [
      { name: 'title', label: 'Mavzu nomi', type: 'text', inTable: true, required: true },
      { name: 'theory_text', label: 'Nazariya matni', type: 'textarea', inTable: true, required: true },
    ],
  },
  {
    key: 'grammar-mcq',
    label: 'Grammatika testlari',
    table: 'daily_grammar_mcqs',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'sort_order',
    fields: [
      { name: 'question_text', label: 'Savol', type: 'textarea', inTable: true, required: true },
      { name: 'option_a', label: 'A varianti', type: 'text', inTable: true, required: true },
      { name: 'option_b', label: 'B varianti', type: 'text', inTable: true, required: true },
      { name: 'option_c', label: 'C varianti', type: 'text', inTable: true },
      { name: 'option_d', label: 'D varianti', type: 'text', inTable: true },
      {
        name: 'correct_index',
        label: "To'g'ri javob",
        type: 'select',
        inTable: true,
        required: true,
        options: [
          { value: 0, label: 'A' },
          { value: 1, label: 'B' },
          { value: 2, label: 'C' },
          { value: 3, label: 'D' },
        ],
      },
      { name: 'quiz_kind', label: 'Turi', type: 'select', options: QUIZ_KINDS, required: true },
      { name: 'sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'grammar-match',
    label: 'Juftlik topshiriqlari',
    table: 'daily_grammar_matches',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'pair_sort_order',
    fields: [
      { name: 'left_text', label: 'Chap tomon', type: 'text', inTable: true, required: true },
      { name: 'right_text', label: "O'ng tomon", type: 'text', inTable: true, required: true },
      { name: 'block_sort_order', label: 'Blok', type: 'int', inTable: true, min: 0 },
      { name: 'pair_sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'grammar-sentence',
    label: 'Gap tuzish',
    table: 'daily_grammar_sentence_arrange',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'sort_order',
    fields: [
      { name: 'prompt_text', label: 'Topshiriq matni', type: 'text', inTable: true, required: true },
      {
        name: 'prompt_lang',
        label: 'Topshiriq tili',
        type: 'select',
        options: [
          { value: 'uz', label: "O'zbekcha" },
          { value: 'ru', label: 'Ruscha' },
        ],
        required: true,
      },
      { name: 'answer_ru', label: "To'g'ri javob (rus)", type: 'text', inTable: true, required: true },
      { name: 'word_bank', label: "So'zlar banki", type: 'stringArray', inTable: true, required: true },
      { name: 'sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'practice',
    label: 'Gapirish mashqlari',
    table: 'daily_practice_prompts',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'sort_order',
    fields: [
      { name: 'uz_text', label: "O'zbekcha topshiriq", type: 'text', inTable: true, required: true },
      { name: 'sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'speaking-task',
    label: 'Gapirish topshiriqlari',
    table: 'daily_speaking_tasks',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'sort_order',
    fields: [
      { name: 'prompt_ru', label: 'Topshiriq (rus tilida)', type: 'textarea', inTable: true, required: true },
      { name: 'prompt_uz', label: "Izoh (o'zbekcha, ixtiyoriy)", type: 'textarea', inTable: true },
      { name: 'sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'phrase-mcq',
    label: 'Ibora testlari',
    table: 'daily_phrase_mcqs',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'sort_order',
    fields: [
      { name: 'phrase_ru', label: 'Ibora (rus tilida)', type: 'textarea', inTable: true, required: true },
      { name: 'option_a', label: 'A varianti', type: 'text', inTable: true, required: true },
      { name: 'option_b', label: 'B varianti', type: 'text', inTable: true, required: true },
      // Barcha to'rt variant NOT NULL — grammatika testlaridan farqli, bu yerda
      // C va D ham majburiy.
      { name: 'option_c', label: 'C varianti', type: 'text', inTable: true, required: true },
      { name: 'option_d', label: 'D varianti', type: 'text', inTable: true, required: true },
      {
        name: 'correct_index',
        label: "To'g'ri javob",
        type: 'select',
        inTable: true,
        required: true,
        options: [
          { value: 0, label: 'A' },
          { value: 1, label: 'B' },
          { value: 2, label: 'C' },
          { value: 3, label: 'D' },
        ],
      },
      { name: 'sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'vocab',
    label: "Lug'at so'zlari",
    table: 'daily_vocab_words',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'sort_order',
    fields: [
      { name: 'word_uz', label: "O'zbekcha", type: 'text', inTable: true, required: true },
      { name: 'word_ru', label: 'Ruscha', type: 'text', inTable: true, required: true },
      { name: 'sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'reading',
    label: "O'qish matni",
    table: 'daily_reading_passages',
    pk: 'day_number',
    dayColumn: 'day_number',
    orderColumn: null,
    singleton: true,
    fields: [
      { name: 'title', label: 'Sarlavha', type: 'text', inTable: true, required: true },
      { name: 'body_ru', label: 'Matn (rus tilida)', type: 'textarea', inTable: true, required: true },
      { name: 'text_id', label: 'Matn kodi (text_id)', type: 'text' },
    ],
  },
  {
    key: 'text-question',
    label: 'Matn savollari',
    table: 'daily_text_questions',
    pk: 'id',
    dayColumn: 'day_number',
    orderColumn: 'sort_order',
    fields: [
      { name: 'question_ru', label: 'Savol (rus tilida)', type: 'textarea', inTable: true, required: true },
      { name: 'option_a', label: 'A varianti', type: 'text', inTable: true, required: true },
      { name: 'option_b', label: 'B varianti', type: 'text', inTable: true, required: true },
      { name: 'option_c', label: 'C varianti', type: 'text', inTable: true, required: true },
      { name: 'option_d', label: 'D varianti', type: 'text', inTable: true, required: true },
      {
        name: 'correct_index',
        label: "To'g'ri javob",
        type: 'select',
        inTable: true,
        required: true,
        options: [
          { value: 0, label: 'A' },
          { value: 1, label: 'B' },
          { value: 2, label: 'C' },
          { value: 3, label: 'D' },
        ],
      },
      { name: 'sort_order', label: 'Tartib', type: 'int', min: 0 },
    ],
  },
  {
    key: 'reading-lexeme',
    label: "O'qish so'zlari",
    table: 'daily_reading_lexemes',
    pk: 'id',
    // Kun ustuni yo'q — `text_id` orqali o'sha kunning matniga bog'lanadi.
    dayColumn: null,
    dayLookup: {
      column: 'text_id',
      fromTable: 'daily_reading_passages',
      fromColumn: 'text_id',
      fromDayColumn: 'day_number',
    },
    orderColumn: null,
    derive: [
      // `uq_daily_reading_lexemes_text_word_norm` unikal indeksi shu ustunga
      // tayanadi, shuning uchun u har doim so'zdan hisoblanadi.
      { column: 'word_ru_normalized', from: 'word_ru', fn: (v) => v.trim().toLowerCase() },
    ],
    fields: [
      { name: 'word_ru', label: "So'z (rus)", type: 'text', inTable: true, required: true },
      { name: 'translation_uz', label: "Tarjimasi (o'zbek)", type: 'text', inTable: true, required: true },
      { name: 'audio_ru', label: 'Audio (ixtiyoriy)', type: 'text' },
    ],
  },
];

export function getResource(key: string): ResourceDef | null {
  return RESOURCES.find((r) => r.key === key) ?? null;
}

/** Klientga yuboriladigan sxema — UI shu asosda quriladi. */
export function resourceSchemas() {
  return RESOURCES.map((r) => ({
    key: r.key,
    label: r.label,
    dayScoped: r.dayColumn !== null || Boolean(r.dayLookup),
    orderable: r.orderColumn !== null,
    singleton: Boolean(r.singleton),
    pk: r.pk,
    fields: r.fields,
  }));
}

function requirePool() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  return pool;
}

/** Qiymatni maydon turiga ko'ra tekshiradi va normallashtiradi. */
function coerce(field: FieldDef, raw: unknown): unknown {
  if (field.type === 'int') {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`${field.label}: raqam bo'lishi kerak`);
    const i = Math.trunc(n);
    if (field.min != null && i < field.min) throw new Error(`${field.label}: ${field.min} dan kichik bo'lmasin`);
    if (field.max != null && i > field.max) throw new Error(`${field.label}: ${field.max} dan katta bo'lmasin`);
    return i;
  }
  if (field.type === 'select') {
    const allowed = (field.options ?? []).map((o) => String(o.value));
    const v = String(raw);
    if (!allowed.includes(v)) throw new Error(`${field.label}: noto'g'ri qiymat`);
    // Raqamli variantlar (correct_index) raqam bo'lib qolsin.
    return (field.options ?? []).find((o) => String(o.value) === v)!.value;
  }
  if (field.type === 'stringArray') {
    const arr = Array.isArray(raw)
      ? raw
      : String(raw ?? '')
          .split('|')
          .map((s) => s.trim());
    const clean = arr.map((s) => String(s).trim()).filter(Boolean);
    if (field.required && clean.length === 0) throw new Error(`${field.label}: bo'sh bo'lmasin`);
    return clean;
  }
  const s = String(raw ?? '').trim();
  if (field.required && !s) throw new Error(`${field.label}: bo'sh bo'lmasin`);
  return s;
}

/** Faqat ro'yxatdagi maydonlarni oladi — ortiqchasi jim tashlab yuboriladi. */
function pickFields(res: ResourceDef, body: Record<string, unknown>, partial: boolean) {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const f of res.fields) {
    if (!(f.name in body)) {
      if (partial) continue;
      if (f.required) throw new Error(`${f.label}: majburiy`);
      continue;
    }
    cols.push(f.name);
    vals.push(coerce(f, body[f.name]));
  }
  if (cols.length === 0) throw new Error("O'zgartirish uchun maydon yo'q");
  return { cols, vals };
}

/**
 * Avtomat hisoblanadigan ustunlarni qo'shadi (masalan `word_ru_normalized`).
 * Manba maydon o'zgartirilayotgan bo'lsagina hisoblanadi.
 */
function applyDerived(res: ResourceDef, cols: string[], vals: unknown[]): void {
  for (const d of res.derive ?? []) {
    const i = cols.indexOf(d.from);
    if (i === -1) continue;
    const computed = d.fn(String(vals[i] ?? ''));
    const existing = cols.indexOf(d.column);
    if (existing === -1) {
      cols.push(d.column);
      vals.push(computed);
    } else {
      vals[existing] = computed;
    }
  }
}

export type ListParams = { resource: string; day?: number; search?: string; limit?: number };

export async function listRows(p: ListParams) {
  const res = getResource(p.resource);
  if (!res) throw new Error('Resurs topilmadi');
  const db = requirePool();

  const selectCols = [res.pk, ...(res.dayColumn ? [res.dayColumn] : []), ...res.fields.map((f) => f.name)];
  const uniqueCols = [...new Set(selectCols)];

  const where: string[] = [];
  const params: unknown[] = [];
  if (res.dayColumn && p.day != null) {
    params.push(p.day);
    where.push(`${res.dayColumn} = $${params.length}`);
  } else if (res.dayLookup && p.day != null) {
    // Kun ustuni yo'q — bog'lovchi jadval orqali filtrlaymiz.
    params.push(p.day);
    where.push(
      `${res.dayLookup.column} IN (SELECT ${res.dayLookup.fromColumn} FROM ${res.dayLookup.fromTable}` +
        ` WHERE ${res.dayLookup.fromDayColumn} = $${params.length})`,
    );
  }
  if (p.search) {
    const textFields = res.fields.filter((f) => f.type === 'text' || f.type === 'textarea');
    if (textFields.length) {
      params.push(`%${p.search}%`);
      const idx = params.length;
      where.push(`(${textFields.map((f) => `${f.name} ILIKE $${idx}`).join(' OR ')})`);
    }
  }

  const orderBy = res.orderColumn
    ? `${res.dayColumn ? `${res.dayColumn}, ` : ''}${res.orderColumn}, ${res.pk}`
    : `${res.pk}`;

  params.push(Math.min(500, Math.max(1, p.limit ?? 200)));
  const sql = `SELECT ${uniqueCols.join(', ')} FROM ${res.table}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy} LIMIT $${params.length}`;

  const { rows } = await db.query(sql, params);
  return rows;
}

export async function createRow(resource: string, day: number | null, body: Record<string, unknown>) {
  const res = getResource(resource);
  if (!res) throw new Error('Resurs topilmadi');
  if (res.singleton) throw new Error('Bu bo\'limda yangi qator qo\'shib bo\'lmaydi');
  const db = requirePool();

  const { cols, vals } = pickFields(res, body, false);
  if (res.dayColumn) {
    if (day == null) throw new Error('Kun tanlanmagan');
    cols.push(res.dayColumn);
    vals.push(day);
  } else if (res.dayLookup) {
    if (day == null) throw new Error('Kun tanlanmagan');
    const { rows: linkRows } = await db.query(
      `SELECT ${res.dayLookup.fromColumn} AS v FROM ${res.dayLookup.fromTable} WHERE ${res.dayLookup.fromDayColumn} = $1 LIMIT 1`,
      [day],
    );
    const link = linkRows[0]?.v;
    if (!link) throw new Error(`${day}-kun uchun bog'lovchi yozuv topilmadi`);
    cols.push(res.dayLookup.column);
    vals.push(link);
  }
  applyDerived(res, cols, vals);
  // Tartib berilmagan bo'lsa — oxiriga qo'shamiz.
  if (res.orderColumn && !cols.includes(res.orderColumn)) {
    const { rows } = await db.query(
      `SELECT coalesce(max(${res.orderColumn}), -1) + 1 AS next FROM ${res.table}
       ${res.dayColumn ? `WHERE ${res.dayColumn} = $1` : ''}`,
      res.dayColumn ? [day] : [],
    );
    cols.push(res.orderColumn);
    vals.push(Number(rows[0]?.next ?? 0));
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await db.query(
    `INSERT INTO ${res.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    vals,
  );
  return rows[0];
}

export async function updateRow(resource: string, id: string | number, body: Record<string, unknown>) {
  const res = getResource(resource);
  if (!res) throw new Error('Resurs topilmadi');
  const db = requirePool();

  const { cols, vals } = pickFields(res, body, true);
  applyDerived(res, cols, vals);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE ${res.table} SET ${sets.join(', ')} WHERE ${res.pk} = $${vals.length} RETURNING *`,
    vals,
  );
  if (!rows[0]) throw new Error('Qator topilmadi');
  return rows[0];
}

export async function deleteRow(resource: string, id: string | number) {
  const res = getResource(resource);
  if (!res) throw new Error('Resurs topilmadi');
  if (res.singleton) throw new Error("Bu bo'limdan qator o'chirib bo'lmaydi");
  const db = requirePool();
  const { rowCount } = await db.query(`DELETE FROM ${res.table} WHERE ${res.pk} = $1`, [id]);
  if (!rowCount) throw new Error('Qator topilmadi');
  return { deleted: true };
}

/**
 * Qatorni bir pog'ona yuqori/quyi ko'chiradi — qo'shni bilan tartibini
 * ALMASHTIRADI. Ikkalasi bitta tranzaksiyada yangilanadi, aks holda uzilishda
 * ikki qatorda bir xil tartib qolib ketishi mumkin edi.
 */
export async function moveRow(resource: string, id: string | number, dir: 'up' | 'down') {
  const res = getResource(resource);
  if (!res || !res.orderColumn) throw new Error("Bu bo'limda tartibni o'zgartirib bo'lmaydi");
  const db = requirePool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      `SELECT ${res.pk} AS id, ${res.orderColumn} AS ord${res.dayColumn ? `, ${res.dayColumn} AS day` : ''}
       FROM ${res.table} WHERE ${res.pk} = $1 FOR UPDATE`,
      [id],
    );
    const row = cur.rows[0];
    if (!row) throw new Error('Qator topilmadi');

    const cmp = dir === 'up' ? '<' : '>';
    const dirOrder = dir === 'up' ? 'DESC' : 'ASC';
    const params: unknown[] = [row.ord];
    let dayClause = '';
    if (res.dayColumn) {
      params.push(row.day);
      dayClause = `AND ${res.dayColumn} = $2`;
    }
    const neighbour = await client.query(
      `SELECT ${res.pk} AS id, ${res.orderColumn} AS ord FROM ${res.table}
       WHERE ${res.orderColumn} ${cmp} $1 ${dayClause}
       ORDER BY ${res.orderColumn} ${dirOrder} LIMIT 1 FOR UPDATE`,
      params,
    );
    const nb = neighbour.rows[0];
    if (!nb) {
      await client.query('COMMIT');
      return { moved: false };
    }
    await client.query(`UPDATE ${res.table} SET ${res.orderColumn} = $1 WHERE ${res.pk} = $2`, [nb.ord, row.id]);
    await client.query(`UPDATE ${res.table} SET ${res.orderColumn} = $1 WHERE ${res.pk} = $2`, [row.ord, nb.id]);
    await client.query('COMMIT');
    return { moved: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Kun bo'yicha qisqacha hisob — admin qaysi kunda nima borligini ko'rsin. */
export async function dayOverview(day: number) {
  const db = requirePool();
  const out: Record<string, number> = {};
  for (const res of RESOURCES) {
    let sql: string | null = null;
    if (res.dayColumn) {
      sql = `SELECT count(*)::int AS n FROM ${res.table} WHERE ${res.dayColumn} = $1`;
    } else if (res.dayLookup) {
      sql =
        `SELECT count(*)::int AS n FROM ${res.table} WHERE ${res.dayLookup.column} IN ` +
        `(SELECT ${res.dayLookup.fromColumn} FROM ${res.dayLookup.fromTable} WHERE ${res.dayLookup.fromDayColumn} = $1)`;
    }
    if (!sql) continue;
    const { rows } = await db.query(sql, [day]);
    out[res.key] = rows[0]?.n ?? 0;
  }
  return out;
}
