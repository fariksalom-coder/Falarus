import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function parseEnvFile(filePath) {
  const out = {};
  if (!existsSync(filePath)) return out;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return out;
}

const envFromFile = parseEnvFile(resolve(process.cwd(), '.env'));
const env = { ...envFromFile, ...process.env };

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'APP_TIMEZONE',
];

const recommended = [
  'SUPABASE_DB_URL',
  'SUPABASE_DB_PASSWORD',
  'REDIS_URL',
  'REFERRAL_BASE_URL',
];

const missingRequired = required.filter((key) => !env[key]);
const missingRecommended = recommended.filter((key) => !env[key]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  assert(!missingRequired.length, `Missing required variables: ${missingRequired.join(', ')}`);
  assert(
    /^https:\/\/.+/.test(env.SUPABASE_URL),
    'SUPABASE_URL must start with https://'
  );

  if (env.VITE_API_URL) {
    new URL(env.VITE_API_URL);
  }

  new Intl.DateTimeFormat('en-US', { timeZone: env.APP_TIMEZONE }).format(new Date());

  console.log('Environment check passed.');
  console.log(`Required variables: ${required.join(', ')}`);
  if (missingRecommended.length) {
    console.log(`Recommended but missing: ${missingRecommended.join(', ')}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Environment check failed: ${message}`);
  process.exit(1);
}
