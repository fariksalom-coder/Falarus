import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const GOOGLE_CLIENT_ID_RE = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;

function parseGoogleClientIds(...values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    if (!value) continue;
    for (const raw of String(value).split(/[\s,;]+/)) {
      const clientId = raw.trim();
      if (!clientId || seen.has(clientId)) continue;
      seen.add(clientId);
      out.push(clientId);
    }
  }
  return out;
}

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
  'DATABASE_URL',
  'JWT_SECRET',
  'APP_TIMEZONE',
];

const recommended = [
  'REDIS_URL',
  'REFERRAL_BASE_URL',
  'GOOGLE_OAUTH_WEB_CLIENT_ID',
  'GOOGLE_OAUTH_SERVER_CLIENT_ID',
];

/**
 * Admin paneli sekretini tekshiradi.
 *
 * ADMIN_JWT_SECRET majburiy EMAS: bo'lmasa admin tokeni JWT_SECRET bilan
 * imzolanadi va bu o'z-o'zidan teshik emas — `adminAuth.ts` tokenda `role`
 * da'vosini va `admins` jadvalidagi yozuvni ham talab qiladi, ya'ni oddiy
 * foydalanuvchi tokeni o'tmaydi. Ammo alohida sekret bir qavat qo'shadi:
 * foydalanuvchi sekreti sizib chiqsa ham admin paneli ochilib qolmaydi.
 */
function checkAdminSecret(env) {
  const admin = (env.ADMIN_JWT_SECRET || '').trim();
  const user = (env.JWT_SECRET || '').trim();
  const warnings = [];

  if (!admin) {
    warnings.push(
      'ADMIN_JWT_SECRET yo\'q — admin tokeni JWT_SECRET bilan imzolanadi. ' +
        'Teshik emas (role + admins tekshiruvi bor), lekin alohida sekret qo\'yish tavsiya etiladi: ' +
        'openssl rand -base64 48'
    );
  } else if (admin === user) {
    warnings.push(
      'ADMIN_JWT_SECRET va JWT_SECRET bir xil — alohida sekretdan foyda yo\'q. Boshqasini qo\'ying.'
    );
  } else if (admin.length < 32) {
    warnings.push(
      'ADMIN_JWT_SECRET 32 belgidan qisqa — ilova ishga tushmaydi. Uzunroq qiymat qo\'ying.'
    );
  }
  return warnings;
}

/**
 * Gemini sozlamasini tekshiradi. Unga 4-blok "gapirish" javoblarini tekshirish va
 * ovozli javob transkripsiyasi bog'liq (OPENAI_API_KEY bo'lsa o'sha ustun turadi).
 */
function checkGemini(env) {
  const apiKey = (env.GEMINI_API_KEY || env.GEMINI_ACCESS_TOKEN || '').trim();
  const adc = (env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  const warnings = [];

  if (apiKey) {
    if (!apiKey.startsWith('AIza')) {
      warnings.push(
        'GEMINI_API_KEY doimiy AI Studio kaliti emas (doimiy kalit "AIza" bilan boshlanadi). ' +
          'Vaqtinchalik tokenlar eskiradi va eskirganda BUTUN AI to\'xtaydi — ' +
          'log\'da AI_CREDENTIAL_EXPIRED chiqadi. Doimiy kalit: https://aistudio.google.com/apikey'
      );
    }
    return { mode: 'ai-studio', warnings };
  }

  if (adc) {
    const projectId = (env.GEMINI_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT || '').trim();
    if (!projectId) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS berilgan, lekin GEMINI_PROJECT_ID yo\'q');
    }
    return { mode: 'vertex-adc', warnings };
  }

  warnings.push(
    'GEMINI_API_KEY o\'rnatilmagan — OPENAI_API_KEY ham bo\'lmasa 4-blok javob tekshiruvi 503 qaytaradi.'
  );
  return { mode: 'none', warnings };
}

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
    /^postgres(ql)?:\/\//.test(env.DATABASE_URL),
    'DATABASE_URL must start with postgres:// or postgresql://'
  );

  if (env.VITE_API_URL) {
    new URL(env.VITE_API_URL);
  }

  const googleClientIds = parseGoogleClientIds(
    env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID,
    env.GOOGLE_OAUTH_WEB_CLIENT_ID,
    env.GOOGLE_OAUTH_SERVER_CLIENT_ID,
    env.GOOGLE_OAUTH_IOS_CLIENT_ID,
    env.GOOGLE_OAUTH_ANDROID_CLIENT_ID
  );
  const invalidGoogleClientIds = googleClientIds.filter((id) => !GOOGLE_CLIENT_ID_RE.test(id));
  assert(
    invalidGoogleClientIds.length === 0,
    `Invalid Google OAuth client ID(s): ${invalidGoogleClientIds.join(', ')}`
  );

  new Intl.DateTimeFormat('en-US', { timeZone: env.APP_TIMEZONE }).format(new Date());

  const gemini = checkGemini(env);

  console.log('Environment check passed.');
  console.log(`Required variables: ${required.join(', ')}`);
  console.log(`Gemini (4-blok zaxirasi: javob tekshiruvi + transkripsiya) rejimi: ${gemini.mode}`);
  for (const warning of gemini.warnings) {
    console.log(`  ! ${warning}`);
  }
  for (const warning of checkAdminSecret(env)) {
    console.log(`  ! ${warning}`);
  }
  if (missingRecommended.length) {
    console.log(`Recommended but missing: ${missingRecommended.join(', ')}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Environment check failed: ${message}`);
  process.exit(1);
}
