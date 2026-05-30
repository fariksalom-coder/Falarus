/**
 * Минимальная замена @supabase/supabase-js для нашего backend, использующая
 * локальный PostgreSQL через node-postgres Pool. Реализует только тот срез
 * API, который реально используется в server/ и server.ts:
 *
 *   from(table)
 *     .select(cols, { count?, head? })
 *     .insert(row | row[])
 *     .update(row)
 *     .upsert(row | row[], { onConflict?, ignoreDuplicates? })
 *     .delete()
 *     .eq/neq/gt/gte/lt/lte/in/is/like/ilike(col, val)
 *     .not(col, op, val)
 *     .filter(col, op, val)
 *     .or(raw)                — PostgREST-style: 'a.eq.1,b.eq.2' или 'and(...),and(...)'
 *     .order(col, { ascending?, nullsFirst? })
 *     .limit(n) / .range(from, to)
 *     .single() / .maybeSingle()
 *     .then(...)              — query запускается через PromiseLike
 *
 *   rpc(name, args)           — SELECT * FROM name(arg1 := $1, …)
 *   storage.*                 — проксируется на настоящий supabase-js (бакеты пока на Supabase)
 *
 * НЕ ПОДДЕРЖИВАЕТСЯ:
 *   • Embedded relations `select('a, b, related(c)')` — встроенные части срезаются, лог-варнинг.
 *   • Realtime, auth (мы используем свой JWT-flow).
 *   • Сложные операторы вроде contains, contained_by, range_overlap.
 *
 * Возвращаемый формат: { data, error, count?, status?, statusText? } —
 * совместим с тем, что код ожидает от supabase-js.
 */
import type { Pool } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'like' | 'ilike';

type Filter = {
  col: string;
  op: FilterOp;
  val: unknown;
  negate?: boolean;
};

type SelectOpts = { count?: 'exact' | 'planned' | 'estimated'; head?: boolean };

export type QueryResult<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string; details?: string; hint?: string } | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};

type Mode = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

const OP_TO_SQL: Record<FilterOp, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
  in: '= ANY',
  is: 'IS',
};

function quoteIdent(name: string): string {
  // Allow dotted refs like table.column too
  return name
    .split('.')
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join('.');
}

function stripEmbeddedRelations(columns: string): { cols: string; stripped: boolean } {
  // Remove anything inside parens (PostgREST embedded relations); also remove the parens themselves
  // 'id,type,question_content(content,answer)' → 'id,type'
  if (!columns.includes('(')) return { cols: columns, stripped: false };
  let depth = 0;
  let out = '';
  for (const ch of columns) {
    if (ch === '(') {
      depth++;
      // also drop the relation name that immediately precedes — find last identifier
      out = out.replace(/[a-zA-Z_][a-zA-Z0-9_]*\s*$/, '');
      continue;
    }
    if (ch === ')') {
      depth--;
      continue;
    }
    if (depth === 0) out += ch;
  }
  // Clean up double commas / trailing commas left after stripping
  out = out
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(', ');
  return { cols: out || '*', stripped: true };
}

function renderSelectColumns(columns: string): string {
  if (!columns || columns === '*') return '*';
  const { cols, stripped } = stripEmbeddedRelations(columns);
  if (stripped) {
    console.warn('[supabaseShim] embedded relations are not supported; stripped from select');
  }
  // Split, trim, quote each identifier; preserve aliases of the form "col" or simple names
  return cols
    .split(',')
    .map((p) => {
      const t = p.trim();
      if (!t) return null;
      if (t === '*') return '*';
      // alias syntax: "alias:col" — supabase format; rare in our codebase. Pass through if quoted.
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) return quoteIdent(t);
      // already has quotes / function — leave as is (best effort)
      return t;
    })
    .filter((x): x is string => x !== null)
    .join(', ');
}

function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === sep && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function coerceScalar(raw: string): unknown {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function buildFilterSql(filter: Filter, params: unknown[]): string {
  const { col, op, val, negate } = filter;
  const qCol = quoteIdent(col);
  if (op === 'is') {
    let isSql: string;
    if (val === null) isSql = `${qCol} IS NULL`;
    else if (val === true || val === false) isSql = `${qCol} IS ${val ? 'TRUE' : 'FALSE'}`;
    else if (val === 'null') isSql = `${qCol} IS NULL`;
    else isSql = `${qCol} IS ${String(val).toUpperCase()}`;
    return negate ? `NOT (${isSql})` : isSql;
  }
  if (op === 'in') {
    params.push(Array.isArray(val) ? val : [val]);
    const expr = `${qCol} = ANY($${params.length})`;
    return negate ? `NOT (${expr})` : expr;
  }
  params.push(val);
  const expr = `${qCol} ${OP_TO_SQL[op]} $${params.length}`;
  return negate ? `NOT (${expr})` : expr;
}

function parseOrSegment(raw: string, params: unknown[]): string {
  const s = raw.trim();
  if (s.startsWith('and(') && s.endsWith(')')) {
    const inner = s.slice(4, -1);
    const segments = splitTopLevel(inner, ',');
    const parts = segments.map((seg) => parseOrSegment(seg.trim(), params));
    return `(${parts.join(' AND ')})`;
  }
  if (s.startsWith('or(') && s.endsWith(')')) {
    const inner = s.slice(3, -1);
    const segments = splitTopLevel(inner, ',');
    const parts = segments.map((seg) => parseOrSegment(seg.trim(), params));
    return `(${parts.join(' OR ')})`;
  }
  // col.op.val[.optional_value_with_dots]
  const m = s.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-z]+)\.(.+)$/);
  if (!m) throw new Error(`[supabaseShim] cannot parse OR segment: "${s}"`);
  const [, col, op, rawVal] = m;
  if (op === 'is') {
    return buildFilterSql({ col, op: 'is', val: rawVal === 'null' ? null : rawVal }, params);
  }
  if (op === 'in') {
    // 'in.(1,2,3)' — value is in parens
    const arrStr = rawVal.replace(/^\(|\)$/g, '');
    const items = arrStr.split(',').map((v) => coerceScalar(v.trim()));
    return buildFilterSql({ col, op: 'in', val: items }, params);
  }
  if (!(op in OP_TO_SQL)) {
    throw new Error(`[supabaseShim] OR segment op not supported: "${op}"`);
  }
  return buildFilterSql({ col, op: op as FilterOp, val: coerceScalar(rawVal) }, params);
}

function buildOrClause(raw: string, params: unknown[]): string {
  const segments = splitTopLevel(raw, ',');
  const parts = segments.map((seg) => parseOrSegment(seg.trim(), params));
  return `(${parts.join(' OR ')})`;
}

class PgQueryBuilder<T = unknown> implements PromiseLike<QueryResult<T[]>> {
  private filters: Filter[] = [];
  private orClauses: string[] = [];
  private columns = '*';
  private selectOpts: SelectOpts = {};
  private orderBy: Array<{ col: string; asc: boolean; nullsFirst?: boolean }> = [];
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;

  private mode: Mode = 'select';
  private mutateData: unknown = null;
  private mutateReturnRows = false;
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(private pool: Pool, private table: string) {}

  // --- mode setters ---
  select(cols: string = '*', opts: SelectOpts = {}): this {
    if (this.mode === 'select') {
      this.columns = cols;
      this.selectOpts = opts;
    } else {
      // chained after insert/update/upsert/delete → request RETURNING
      this.mutateReturnRows = true;
      if (cols && cols !== '*') this.columns = cols;
    }
    return this;
  }

  insert(data: unknown): this {
    this.mode = 'insert';
    this.mutateData = data;
    return this;
  }

  update(data: unknown): this {
    this.mode = 'update';
    this.mutateData = data;
    return this;
  }

  upsert(
    data: unknown,
    opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}
  ): this {
    this.mode = 'upsert';
    this.mutateData = data;
    this.upsertOpts = opts;
    return this;
  }

  delete(): this {
    this.mode = 'delete';
    return this;
  }

  // --- filters ---
  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ col, op: 'neq', val });
    return this;
  }
  gt(col: string, val: unknown): this {
    this.filters.push({ col, op: 'gt', val });
    return this;
  }
  gte(col: string, val: unknown): this {
    this.filters.push({ col, op: 'gte', val });
    return this;
  }
  lt(col: string, val: unknown): this {
    this.filters.push({ col, op: 'lt', val });
    return this;
  }
  lte(col: string, val: unknown): this {
    this.filters.push({ col, op: 'lte', val });
    return this;
  }
  in(col: string, arr: unknown[]): this {
    this.filters.push({ col, op: 'in', val: arr });
    return this;
  }
  is(col: string, val: null | boolean | string): this {
    this.filters.push({ col, op: 'is', val });
    return this;
  }
  like(col: string, pattern: string): this {
    this.filters.push({ col, op: 'like', val: pattern });
    return this;
  }
  ilike(col: string, pattern: string): this {
    this.filters.push({ col, op: 'ilike', val: pattern });
    return this;
  }

  not(col: string, op: FilterOp, val: unknown): this {
    this.filters.push({ col, op, val, negate: true });
    return this;
  }

  filter(col: string, op: string, val: unknown): this {
    const o = op.toLowerCase();
    if (!(o in OP_TO_SQL)) {
      console.warn(`[supabaseShim] unsupported filter op "${op}" on ${col}; ignored`);
      return this;
    }
    this.filters.push({ col, op: o as FilterOp, val });
    return this;
  }

  or(raw: string): this {
    this.orClauses.push(raw);
    return this;
  }

  // --- modifiers ---
  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}): this {
    this.orderBy.push({ col, asc: opts.ascending !== false, nullsFirst: opts.nullsFirst });
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  // --- terminals ---
  async single(): Promise<QueryResult<T>> {
    const r = await this._execute();
    if (r.error) return r as QueryResult<T>;
    const rows = (r.data as T[]) ?? [];
    if (rows.length === 0) {
      return {
        data: null,
        error: {
          message: 'JSON object requested, multiple (or no) rows returned',
          code: 'PGRST116',
        },
        status: 406,
        statusText: 'Not Acceptable',
      };
    }
    if (rows.length > 1) {
      return {
        data: null,
        error: { message: 'Multiple rows returned', code: 'PGRST116' },
        status: 406,
        statusText: 'Not Acceptable',
      };
    }
    return { data: rows[0], error: null, status: 200, statusText: 'OK' };
  }

  async maybeSingle(): Promise<QueryResult<T>> {
    const r = await this._execute();
    if (r.error) return r as QueryResult<T>;
    const rows = (r.data as T[]) ?? [];
    if (rows.length === 0) return { data: null, error: null, status: 200, statusText: 'OK' };
    if (rows.length > 1) {
      return {
        data: null,
        error: { message: 'Multiple rows', code: 'PGRST116' },
        status: 406,
        statusText: 'Not Acceptable',
      };
    }
    return { data: rows[0], error: null, status: 200, statusText: 'OK' };
  }

  // PromiseLike — позволяет `await supabase.from(x).select(...)`
  then<TR1 = QueryResult<T[]>, TR2 = never>(
    onFulfilled?: ((v: QueryResult<T[]>) => TR1 | PromiseLike<TR1>) | null,
    onRejected?: ((reason: unknown) => TR2 | PromiseLike<TR2>) | null
  ): Promise<TR1 | TR2> {
    return this._execute().then(onFulfilled as never, onRejected as never);
  }

  catch<TR = never>(onRejected?: ((reason: unknown) => TR | PromiseLike<TR>) | null) {
    return this._execute().catch(onRejected as never);
  }

  finally(onFinally?: (() => void) | null) {
    return this._execute().finally(onFinally as never);
  }

  // --- SQL execution ---
  private _execute = async (): Promise<QueryResult<T[]>> => {
    try {
      if (this.mode === 'select') return await this._executeSelect();
      if (this.mode === 'insert') return await this._executeInsert();
      if (this.mode === 'update') return await this._executeUpdate();
      if (this.mode === 'upsert') return await this._executeUpsert();
      if (this.mode === 'delete') return await this._executeDelete();
      return { data: null, error: { message: `Unknown mode: ${this.mode as string}` } };
    } catch (err) {
      const e = err as { message?: string; code?: string; detail?: string; hint?: string };
      return {
        data: null,
        error: {
          message: e.message ?? String(err),
          code: e.code,
          details: e.detail,
          hint: e.hint,
        },
      };
    }
  };

  private _buildWhereClause(params: unknown[]): string {
    const parts: string[] = [];
    for (const f of this.filters) {
      parts.push(buildFilterSql(f, params));
    }
    for (const raw of this.orClauses) {
      parts.push(buildOrClause(raw, params));
    }
    return parts.length ? parts.join(' AND ') : '';
  }

  private _orderClauseSql(): string {
    if (this.orderBy.length === 0) return '';
    const parts = this.orderBy.map((o) => {
      const nulls = o.nullsFirst === undefined ? '' : o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST';
      return `${quoteIdent(o.col)} ${o.asc ? 'ASC' : 'DESC'}${nulls}`;
    });
    return ` ORDER BY ${parts.join(', ')}`;
  }

  private async _executeSelect(): Promise<QueryResult<T[]>> {
    const params: unknown[] = [];
    const where = this._buildWhereClause(params);
    const whereSql = where ? ` WHERE ${where}` : '';

    let count: number | null = null;
    if (this.selectOpts.count) {
      const countSql = `SELECT count(*)::int AS count FROM ${quoteIdent(this.table)}${whereSql}`;
      const r = await this.pool.query(countSql, params);
      count = (r.rows[0]?.count as number) ?? 0;
      if (this.selectOpts.head) {
        return {
          data: [] as unknown as T[],
          error: null,
          count,
          status: 200,
          statusText: 'OK',
        };
      }
    }

    const cols = renderSelectColumns(this.columns);
    let sql = `SELECT ${cols} FROM ${quoteIdent(this.table)}${whereSql}`;
    sql += this._orderClauseSql();
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      sql += ` LIMIT ${this.rangeTo - this.rangeFrom + 1} OFFSET ${this.rangeFrom}`;
    } else if (this.limitN !== null) {
      sql += ` LIMIT ${this.limitN}`;
    }

    const r = await this.pool.query(sql, params);
    return { data: r.rows as T[], error: null, count, status: 200, statusText: 'OK' };
  }

  private async _executeInsert(): Promise<QueryResult<T[]>> {
    const rows = Array.isArray(this.mutateData) ? this.mutateData : [this.mutateData];
    if (rows.length === 0) {
      return { data: [] as unknown as T[], error: null };
    }
    // collect all columns across rows (so partial rows still work)
    const colSet = new Set<string>();
    for (const r of rows as Array<Record<string, unknown>>) {
      Object.keys(r).forEach((k) => colSet.add(k));
    }
    const cols = [...colSet];
    if (cols.length === 0) {
      return { data: null, error: { message: 'No columns to insert' } };
    }
    const params: unknown[] = [];
    const valuesSql = (rows as Array<Record<string, unknown>>)
      .map((row) => {
        const placeholders = cols.map((c) => {
          if (c in row) {
            params.push(row[c]);
            return `$${params.length}`;
          }
          return 'DEFAULT';
        });
        return `(${placeholders.join(', ')})`;
      })
      .join(', ');

    let sql = `INSERT INTO ${quoteIdent(this.table)} (${cols.map(quoteIdent).join(', ')}) VALUES ${valuesSql}`;
    if (this.mutateReturnRows) {
      sql += ` RETURNING ${renderSelectColumns(this.columns)}`;
    }
    const r = await this.pool.query(sql, params);
    return {
      data: this.mutateReturnRows ? (r.rows as T[]) : ([] as unknown as T[]),
      error: null,
      status: 201,
      statusText: 'Created',
    };
  }

  private async _executeUpdate(): Promise<QueryResult<T[]>> {
    const data = this.mutateData as Record<string, unknown>;
    const dataKeys = Object.keys(data);
    if (dataKeys.length === 0) {
      return { data: null, error: { message: 'No columns to update' } };
    }
    const params: unknown[] = [];
    const setSql = dataKeys
      .map((k) => {
        params.push(data[k]);
        return `${quoteIdent(k)} = $${params.length}`;
      })
      .join(', ');
    const where = this._buildWhereClause(params);
    let sql = `UPDATE ${quoteIdent(this.table)} SET ${setSql}`;
    if (where) sql += ` WHERE ${where}`;
    if (this.mutateReturnRows) {
      sql += ` RETURNING ${renderSelectColumns(this.columns)}`;
    }
    const r = await this.pool.query(sql, params);
    return {
      data: this.mutateReturnRows ? (r.rows as T[]) : ([] as unknown as T[]),
      error: null,
      status: 200,
      statusText: 'OK',
    };
  }

  private async _executeUpsert(): Promise<QueryResult<T[]>> {
    const rows = Array.isArray(this.mutateData) ? this.mutateData : [this.mutateData];
    if (rows.length === 0) return { data: [] as unknown as T[], error: null };
    const colSet = new Set<string>();
    for (const r of rows as Array<Record<string, unknown>>) {
      Object.keys(r).forEach((k) => colSet.add(k));
    }
    const cols = [...colSet];
    const params: unknown[] = [];
    const valuesSql = (rows as Array<Record<string, unknown>>)
      .map((row) => {
        const placeholders = cols.map((c) => {
          if (c in row) {
            params.push(row[c]);
            return `$${params.length}`;
          }
          return 'DEFAULT';
        });
        return `(${placeholders.join(', ')})`;
      })
      .join(', ');

    const conflictCols = (this.upsertOpts.onConflict ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let conflictSql: string;
    if (conflictCols.length === 0) {
      // default to primary key, but we don't know it — let DB raise an error to surface mis-config
      conflictSql = '';
    } else {
      conflictSql = ` ON CONFLICT (${conflictCols.map(quoteIdent).join(', ')})`;
      if (this.upsertOpts.ignoreDuplicates) {
        conflictSql += ' DO NOTHING';
      } else {
        const updateSet = cols
          .filter((c) => !conflictCols.includes(c))
          .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`);
        conflictSql += updateSet.length ? ` DO UPDATE SET ${updateSet.join(', ')}` : ' DO NOTHING';
      }
    }

    let sql = `INSERT INTO ${quoteIdent(this.table)} (${cols.map(quoteIdent).join(', ')}) VALUES ${valuesSql}${conflictSql}`;
    if (this.mutateReturnRows) {
      sql += ` RETURNING ${renderSelectColumns(this.columns)}`;
    }
    const r = await this.pool.query(sql, params);
    return {
      data: this.mutateReturnRows ? (r.rows as T[]) : ([] as unknown as T[]),
      error: null,
      status: 200,
      statusText: 'OK',
    };
  }

  private async _executeDelete(): Promise<QueryResult<T[]>> {
    const params: unknown[] = [];
    const where = this._buildWhereClause(params);
    let sql = `DELETE FROM ${quoteIdent(this.table)}`;
    if (where) sql += ` WHERE ${where}`;
    if (this.mutateReturnRows) {
      sql += ` RETURNING ${renderSelectColumns(this.columns)}`;
    }
    const r = await this.pool.query(sql, params);
    return {
      data: this.mutateReturnRows ? (r.rows as T[]) : ([] as unknown as T[]),
      error: null,
      status: 200,
      statusText: 'OK',
    };
  }
}

class SupabaseShim {
  private realClient: SupabaseClient | null = null;

  constructor(private pool: Pool) {}

  from<T = unknown>(table: string): PgQueryBuilder<T> {
    return new PgQueryBuilder<T>(this.pool, table);
  }

  async rpc<T = unknown>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<QueryResult<T>> {
    try {
      const argNames = Object.keys(args);
      const params = argNames.map((n) => args[n]);
      const argList = argNames.map((n, i) => `${n} := $${i + 1}`).join(', ');
      const sql = `SELECT * FROM ${quoteIdent(name)}(${argList}) AS result`;
      const r = await this.pool.query(sql, params);
      if (r.rows.length === 0) return { data: null, error: null, status: 200, statusText: 'OK' };
      if (r.rows.length === 1 && Object.keys(r.rows[0]).length === 1) {
        // scalar-returning function — unwrap
        const single = Object.values(r.rows[0])[0];
        return { data: single as T, error: null, status: 200, statusText: 'OK' };
      }
      return { data: r.rows as unknown as T, error: null, status: 200, statusText: 'OK' };
    } catch (err) {
      const e = err as { message?: string; code?: string; detail?: string; hint?: string };
      return {
        data: null,
        error: {
          message: e.message ?? String(err),
          code: e.code,
          details: e.detail,
          hint: e.hint,
        },
      };
    }
  }

  get storage() {
    if (!this.realClient) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        throw new Error(
          '[supabaseShim] Storage operations require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment'
        );
      }
      this.realClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    }
    return this.realClient.storage;
  }

  // Stubs for unused but commonly-referenced parts so callers don't crash on property access
  get auth() {
    throw new Error('[supabaseShim] auth is not supported — use the app JWT layer');
  }

  get realtime() {
    throw new Error('[supabaseShim] realtime is not supported');
  }
}

export function createSupabaseShim(pool: Pool): SupabaseShim {
  return new SupabaseShim(pool);
}

export type { SupabaseShim };
