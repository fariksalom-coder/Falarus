// Read-only search for retired infrastructure references; never print user data or secrets.
import 'dotenv/config';
import { Pool } from 'pg';

const target = process.argv[2];
if (!target || !/^[a-zA-Z0-9.:-]+$/.test(target)) {
  console.error('Usage: node scripts/audit-server-dependencies.mjs <retired-host>');
  process.exit(2);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const quote = (name) => `"${name.replaceAll('"', '""')}"`;
try {
  await pool.query('BEGIN READ ONLY');
  await pool.query("SET LOCAL statement_timeout = '15s'");
  const { rows: columns } = await pool.query(`
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t USING (table_catalog, table_schema, table_name)
     WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
       AND c.data_type IN ('text', 'character varying', 'json', 'jsonb', 'ARRAY')
     ORDER BY c.table_name, c.column_name
  `);
  let matches = 0;
  for (const { table_name: table, column_name: column } of columns) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS count FROM public.${quote(table)} WHERE ${quote(column)}::text LIKE $1`,
      [`%${target}%`],
    );
    if (rows[0].count) {
      matches += rows[0].count;
      console.log(`${table}.${column}: ${rows[0].count} matches`);
    }
  }
  await pool.query('ROLLBACK');
  console.log(`Checked ${columns.length} columns; matches=${matches}`);
  process.exitCode = matches ? 1 : 0;
} finally {
  await pool.end();
}
