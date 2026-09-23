/**
 * Import leads from CSV (Google Sheets export) into Sales CRM.
 *
 * CSV columns (flexible headers): first_name / ism / имя, last_name / familiya / фамилия,
 * phone / telefon / телефон. Extra columns ignored.
 *
 * Usage on VPS:
 *   npx tsx server/scripts/importSalesCrmLeadsCsv.ts /path/to/leads.csv
 *
 * Or from Google Sheet (must be "Anyone with the link can view"):
 *   SALES_CRM_SHEET_CSV_URL='https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=GID' \
 *   npx tsx server/scripts/importSalesCrmLeadsCsv.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { pool } from '../lib/db.js';
import { ingestUserAsSalesLead } from '../services/salesCrm.service.js';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n' || (ch === '\r' && next === '\n')) {
      if (ch === '\r') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim()));
}

function normHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[ё]/g, 'е');
}

function mapColumns(headers: string[]): {
  first?: number;
  last?: number;
  phone?: number;
} {
  const out: { first?: number; last?: number; phone?: number } = {};
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (
      ['first_name', 'firstname', 'ism', 'имя', 'name', 'имя', 'first'].includes(n) ||
      n.includes('ism') ||
      n.includes('имя') ||
      n === 'first_name'
    ) {
      if (out.first == null) out.first = i;
    }
    if (
      ['last_name', 'lastname', 'familiya', 'фамилия', 'surname', 'family'].includes(n) ||
      n.includes('famili') ||
      n.includes('фамилия')
    ) {
      if (out.last == null) out.last = i;
    }
    if (
      ['phone', 'telefon', 'телефон', 'number', 'номер', 'tel', 'mobile'].includes(n) ||
      n.includes('phone') ||
      n.includes('telefon') ||
      n.includes('телефон') ||
      n.includes('номер')
    ) {
      if (out.phone == null) out.phone = i;
    }
  });
  return out;
}

function normalizePhone(raw: string): string | null {
  let d = String(raw || '').replace(/\D+/g, '');
  if (!d) return null;
  if (d.startsWith('8') && d.length === 11) d = `7${d.slice(1)}`;
  if (d.length === 9 && d.startsWith('9')) d = `998${d}`;
  if (d.length === 10 && d.startsWith('9')) d = `998${d}`;
  if (d.length < 10 || d.length > 15) return null;
  return `+${d}`;
}

function randomPassword(): string {
  return `Lead${Math.random().toString(36).slice(2, 10)}A1!`;
}

async function loadCsvText(): Promise<string> {
  const fileArg = process.argv[2];
  if (fileArg && fs.existsSync(fileArg)) {
    return fs.readFileSync(fileArg, 'utf8');
  }
  const url = String(process.env.SALES_CRM_SHEET_CSV_URL || '').trim();
  if (!url) {
    throw new Error(
      'CSV fayl yo‘li yoki SALES_CRM_SHEET_CSV_URL kerak. Sheet: "Anyone with the link can view".',
    );
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sheet yuklanmadi HTTP ${res.status} — ochiq ulashishni yoqing`);
  }
  return await res.text();
}

async function main() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  const text = await loadCsvText();
  if (text.trimStart().startsWith('<!DOCTYPE') || text.includes('Accounts sign-in')) {
    throw new Error('Sheet yopiq (login sahifa). "Anyone with the link → Viewer" qiling.');
  }

  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('CSV bo‘sh');

  const headers = rows[0];
  const cols = mapColumns(headers);
  if (cols.phone == null) {
    throw new Error(`Telefon ustuni topilmadi. Headers: ${headers.join(' | ')}`);
  }

  let createdUsers = 0;
  let createdLeads = 0;
  let refreshed = 0;
  let skipped = 0;

  for (const r of rows.slice(1)) {
    const phoneRaw = r[cols.phone!] ?? '';
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      skipped += 1;
      continue;
    }
    const first = String(cols.first != null ? r[cols.first] ?? '' : '').trim() || 'Lead';
    const last = String(cols.last != null ? r[cols.last] ?? '' : '').trim() || 'Sheet';

    const existing = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE phone_normalized = $1 OR phone = $1 LIMIT 1`,
      [phone],
    );

    let userId: number;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      await pool.query(
        `UPDATE users
         SET first_name = CASE WHEN COALESCE(first_name,'') = '' THEN $2 ELSE first_name END,
             last_name  = CASE WHEN COALESCE(last_name,'') = '' THEN $3 ELSE last_name END
         WHERE id = $1`,
        [userId, first.slice(0, 80), last.slice(0, 80)],
      );
    } else {
      const hash = await bcrypt.hash(randomPassword(), 10);
      const ins = await pool.query<{ id: number }>(
        `INSERT INTO users (
           first_name, last_name, email, phone, password, onboarded, account_type,
           phone_raw, phone_normalized, phone_verified, phone_invalid
         ) VALUES ($1,$2,null,$3,$4,1,'student',$5,$3,false,false)
         RETURNING id`,
        [first.slice(0, 80), last.slice(0, 80), phone, hash, String(phoneRaw).slice(0, 40)],
      );
      userId = ins.rows[0].id;
      createdUsers += 1;
    }

    const lead = await ingestUserAsSalesLead({
      userId,
      phone,
      source: 'google_sheets',
      medium: 'import',
      campaign: 'sheet_1cmVk6MY',
    });
    if (lead.created) createdLeads += 1;
    else refreshed += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        rows: rows.length - 1,
        createdUsers,
        createdLeads,
        refreshed,
        skipped,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
