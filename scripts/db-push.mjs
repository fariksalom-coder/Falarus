/**
 * Apply SQL migrations to the PostgreSQL database from DATABASE_URL.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { execFileSync } from 'child_process';

function readEnvValue(name) {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return '';
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match?.[1] === name) {
      return match[2].replace(/^["']|["']$/g, '').trim();
    }
  }
  return '';
}

const dbUrl = readEnvValue('DATABASE_URL');
if (!dbUrl || !dbUrl.startsWith('postgres')) {
  console.error('DATABASE_URL kerak: postgresql://USER:PASSWORD@HOST:PORT/DB');
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), 'db', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

for (const file of files) {
  const fullPath = resolve(migrationsDir, file);
  console.log(`[db:push] applying ${file}`);
  execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', fullPath], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
}

console.log('[db:push] done');
