/**
 * Проверка окружения перед реальными платежами Click (без вызова API Click и без списаний).
 *
 * Usage:
 *   npm run click:preflight
 *   npm run click:preflight -- https://www.example.com
 *
 * Базовый URL нужен, чтобы вывести точные URL для кабинета Click (prepare / complete).
 */
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

const baseArg = process.argv[2]?.trim();
const publicBase =
  baseArg ||
  env.CLICK_PUBLIC_BASE_URL?.trim() ||
  env.APP_URL?.trim() ||
  env.VITE_API_URL?.trim() ||
  env.SMOKE_BASE_URL?.trim() ||
  '';

function ok(msg) {
  console.log(`  [OK] ${msg}`);
}
function warn(msg) {
  console.warn(`  [!!] ${msg}`);
}
function fail(msg) {
  console.error(`  [NO] ${msg}`);
}

let errors = 0;

console.log('\n=== Click — подготовка к реальному тесту ===\n');

const sid = env.CLICK_SERVICE_ID?.trim();
const mid = env.CLICK_MERCHANT_ID?.trim();
const muid = (env.CLICK_MERCHANT_USER_ID || env.CLICK_MERCHANT_ID || '').trim();
const secret = env.CLICK_SECRET_KEY?.trim();

if (sid && /^\d+$/.test(sid)) ok(`CLICK_SERVICE_ID=${sid}`);
else {
  fail('CLICK_SERVICE_ID — нужен числовой ID сервиса из кабинета Click');
  errors += 1;
}

if (mid) ok('CLICK_MERCHANT_ID задан');
else {
  fail('CLICK_MERCHANT_ID обязателен');
  errors += 1;
}

if (muid) ok('CLICK_MERCHANT_USER_ID (или fallback MERCHANT_ID) — для Auth Merchant API и формы оплаты');
else {
  fail('CLICK_MERCHANT_USER_ID или CLICK_MERCHANT_ID для заголовка Auth');
  errors += 1;
}

if (secret && secret.length >= 16) ok('CLICK_SECRET_KEY задан (длина достаточная)');
else if (secret) {
  warn('CLICK_SECRET_KEY очень короткий — проверьте, что это полный ключ из кабинета');
} else {
  fail('CLICK_SECRET_KEY обязателен');
  errors += 1;
}

const ret = env.CLICK_RETURN_URL?.trim();
if (ret) {
  if (ret.startsWith('https://')) ok(`CLICK_RETURN_URL (HTTPS): ${ret}`);
  else warn('CLICK_RETURN_URL лучше указать как https:// — пользователь после оплаты вернётся сюда');
} else warn('CLICK_RETURN_URL не задан — после оплаты редирект может быть некуда');

const enc = env.CLICK_CARD_TOKEN_ENCRYPTION_KEY?.trim();
if (enc && enc.length >= 32) ok('CLICK_CARD_TOKEN_ENCRYPTION_KEY задан (рекомендуется для прод)');
else if (enc) warn('CLICK_CARD_TOKEN_ENCRYPTION_KEY лучше ≥ 32 символов');
else warn('CLICK_CARD_TOKEN_ENCRYPTION_KEY не задан — для шифра токена используется JWT_SECRET (для реала лучше отдельный ключ)');

const cronSec = env.CRON_SECRET?.trim() || env.CLICK_CRON_SECRET?.trim();
if (cronSec && cronSec.length >= 16) ok('CRON_SECRET / CLICK_CRON_SECRET — для вызова cron с продакшена');
else warn('Для автопродления подписки на проде нужен CRON_SECRET в Vercel + расписание cron');

console.log('\n--- Миграции PostgreSQL ---');
console.log('  Убедитесь, что применены миграции с card_tokens / click_payment_logs / fiscal (033, 034, 035).');

console.log('\n--- URL для регистрации в кабинете Click (Merchant API / колбеки) ---');
if (!publicBase) {
  warn('Не указан публичный домен. Запустите: npm run click:preflight -- https://ВАШ_ДОМЕН');
  warn('Или задайте CLICK_PUBLIC_BASE_URL / APP_URL в .env');
} else {
  let origin;
  try {
    origin = new URL(publicBase.startsWith('http') ? publicBase : `https://${publicBase}`);
  } catch {
    warn('Некорректный базовый URL');
    origin = null;
  }
  if (origin && origin.protocol !== 'https:') {
    warn('Для реальных платежей Callback обычно должен быть HTTPS (локально — ngrok или тест только на стейдже)');
  }
  if (origin) {
    const root = `${origin.origin}`;
    console.log(`  Prepare (POST): ${root}/api/click/prepare`);
    console.log(`  Complete (POST): ${root}/api/click/complete`);
    console.log('\n--- Cron (ручная проверка или crontab на ВАШЕМ VPS — не из Vercel) ---');
    console.log(`  curl -s -H "Authorization: Bearer $CRON_SECRET" "${root}/api/cron/click-auto-pay"`);
    console.log(`  curl -s -H "Authorization: Bearer $CRON_SECRET" "${root}/api/cron/click-fiscal-retry"`);
  }
}

console.log('\n--- Рекомендации от поддержки Click ---');
console.log('  • Тестируйте на реальных платежах минимальными суммами; уточните у менеджера Click процедуру отмены/возврата.');
console.log('  • После оплаты проверьте в админке платеж и при необходимости запись в click_payment_logs.');
console.log('  • Автопродление: нужен периодический вызов cron (Vercel или crontab на вашем сервере — см. .env.example).\n');

if (errors > 0) {
  console.error(`Исправьте ${errors} ошибок и запустите снова.\n`);
  process.exit(1);
}

console.log('Базовая конфигурация для реального теста выглядит достаточной. Дальше — ручной сценарий в UI и проверка колбеков.\n');
