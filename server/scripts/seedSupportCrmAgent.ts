/**
 * Create or update Support CRM agent.
 * Run:
 *   SUPPORT_CRM_BOOTSTRAP_LOGIN=operator \
 *   SUPPORT_CRM_BOOTSTRAP_PASSWORD='SecurePass123' \
 *   SUPPORT_CRM_BOOTSTRAP_NAME='Support' \
 *   npx tsx server/scripts/seedSupportCrmAgent.ts
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../lib/db';

const login = String(process.env.SUPPORT_CRM_BOOTSTRAP_LOGIN || '')
  .trim()
  .toLowerCase();
const password = String(process.env.SUPPORT_CRM_BOOTSTRAP_PASSWORD || '');
const name = String(process.env.SUPPORT_CRM_BOOTSTRAP_NAME || 'Support').trim() || 'Support';

async function main() {
  if (!pool) {
    throw new Error('DATABASE_URL kerak');
  }
  if (!/^[a-z0-9_.-]{3,40}$/.test(login)) {
    throw new Error('SUPPORT_CRM_BOOTSTRAP_LOGIN: 3–40 belgi, a-z 0-9 _ . -');
  }
  if (password.length < 12 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('SUPPORT_CRM_BOOTSTRAP_PASSWORD: 12–72 belgi, harf va raqam');
  }

  const hash = await bcrypt.hash(password, 12);
  const existing = await pool.query(`SELECT id FROM support_crm_agents WHERE lower(login) = $1`, [login]);
  if (existing.rowCount) {
    await pool.query(
      `UPDATE support_crm_agents
       SET password_hash = $2, name = $3, active = true, updated_at = now()
       WHERE lower(login) = $1`,
      [login, hash, name]
    );
    console.log('Support CRM agent password updated:', login);
  } else {
    await pool.query(
      `INSERT INTO support_crm_agents (login, password_hash, name, active)
       VALUES ($1, $2, $3, true)`,
      [login, hash, name]
    );
    console.log('Support CRM agent created:', login);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
