/**
 * Apply Supabase migrations using DB URL from .env
 * Option A: SUPABASE_URL + SUPABASE_DB_PASSWORD (+ optional SUPABASE_POOLER_REGION)
 * Option B: SUPABASE_DB_URL = full postgresql://... string from Dashboard → Settings → Database → Connection string
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const envPath = resolve(process.cwd(), '.env');
let SUPABASE_URL = process.env.SUPABASE_URL;
let SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
let SUPABASE_POOLER_REGION = process.env.SUPABASE_POOLER_REGION;
let SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^\s*SUPABASE_URL\s*=\s*(.+)$/);
    if (m) SUPABASE_URL = m[1].replace(/^["']|["']$/g, '').trim();
    const m2 = trimmed.match(/^\s*SUPABASE_DB_PASSWORD\s*=\s*(.+)$/);
    if (m2) SUPABASE_DB_PASSWORD = m2[1].replace(/^["']|["']$/g, '').trim();
    const m3 = trimmed.match(/^\s*SUPABASE_POOLER_REGION\s*=\s*(.+)$/);
    if (m3) SUPABASE_POOLER_REGION = m3[1].replace(/^["']|["']$/g, '').trim();
    const m4 = trimmed.match(/^\s*SUPABASE_DB_URL\s*=\s*(.+)$/);
    if (m4) SUPABASE_DB_URL = m4[1].replace(/^["']|["']$/g, '').trim();
  }
} catch (e) {
  // ignore
}

if (!SUPABASE_DB_URL) {
  // was not set from file, already had process.env above
}

if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
  if (!SUPABASE_DB_URL) {
    console.error('Need SUPABASE_URL and SUPABASE_DB_PASSWORD in .env (or set SUPABASE_DB_URL = full connection string from Dashboard → Database)');
    process.exit(1);
  }
}

let dbUrl;
if (SUPABASE_DB_URL && SUPABASE_DB_URL.startsWith('postgres')) {
  dbUrl = SUPABASE_DB_URL;
} else {
  if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
    console.error('Need SUPABASE_URL and SUPABASE_DB_PASSWORD in .env');
    process.exit(1);
  }
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = match ? match[1] : null;
  if (!projectRef) {
    console.error('Invalid SUPABASE_URL');
    process.exit(1);
  }
  const passwordEnc = encodeURIComponent(SUPABASE_DB_PASSWORD);
  const region = SUPABASE_POOLER_REGION || 'ap-southeast-1';
  console.error(`Using pooler region: ${region}. If you see "Tenant not found", add SUPABASE_DB_URL to .env (full URI from Dashboard → Database → Connection string).`);
  const poolerHost = `aws-0-${region}.pooler.supabase.com`;
  dbUrl = `postgresql://postgres.${projectRef}:${passwordEnc}@${poolerHost}:6543/postgres`;
}

try {
  execSync(`npx supabase db push --db-url "${dbUrl}"`, { stdio: 'inherit', cwd: process.cwd() });
} catch (e) {
  process.exit(e.status || 1);
}
