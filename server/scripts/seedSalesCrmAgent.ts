/**
 * Create or update Sales CRM agent (admin or operator).
 *
 *   SALES_CRM_BOOTSTRAP_LOGIN=admin \
 *   SALES_CRM_BOOTSTRAP_PASSWORD='SecurePass123' \
 *   SALES_CRM_BOOTSTRAP_NAME='CRM Admin' \
 *   SALES_CRM_BOOTSTRAP_ROLE=admin \
 *   npm run seed:sales-crm
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../lib/db';

const login = String(process.env.SALES_CRM_BOOTSTRAP_LOGIN || '')
  .trim()
  .toLowerCase();
const password = String(process.env.SALES_CRM_BOOTSTRAP_PASSWORD || '');
const name = String(process.env.SALES_CRM_BOOTSTRAP_NAME || 'CRM').trim() || 'CRM';
const role = String(process.env.SALES_CRM_BOOTSTRAP_ROLE || 'admin').trim() === 'operator'
  ? 'operator'
  : 'admin';

async function main() {
  if (!pool) throw new Error('DATABASE_URL kerak');
  if (!/^[a-z0-9_.-]{3,40}$/.test(login)) {
    throw new Error('SALES_CRM_BOOTSTRAP_LOGIN: 3–40 belgi, a-z 0-9 _ . -');
  }
  if (password.length < 12 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('SALES_CRM_BOOTSTRAP_PASSWORD: 12–72 belgi, harf va raqam');
  }

  const hash = await bcrypt.hash(password, 12);
  const existing = await pool.query(`SELECT id FROM sales_crm_agents WHERE lower(login) = $1`, [login]);
  if (existing.rowCount) {
    await pool.query(
      `UPDATE sales_crm_agents
       SET password_hash = $2, name = $3, role = $4, active = true, updated_at = now()
       WHERE lower(login) = $1`,
      [login, hash, name, role],
    );
    console.log('Sales CRM agent updated:', login, role);
  } else {
    await pool.query(
      `INSERT INTO sales_crm_agents (login, password_hash, name, role, active)
       VALUES ($1, $2, $3, $4, true)`,
      [login, hash, name, role],
    );
    console.log('Sales CRM agent created:', login, role);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
