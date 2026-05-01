import fs from 'node:fs';
import path from 'node:path';
import { parse as parseDotenv } from 'dotenv';

type ClickConfig = {
  serviceId: string;
  merchantId: string;
  /** Merchant API (`api.click.uz`) — same as docs `merchant_user_id` */
  merchantUserId: string;
  secretKey: string;
  returnUrl: string | null;
};

let cachedEnvFile: Record<string, string> | null = null;

function readLocalEnvFallback(): Record<string, string> {
  if (cachedEnvFile) return cachedEnvFile;
  const cwd = process.cwd();
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(cwd, fileName);
    try {
      if (!fs.existsSync(filePath)) continue;
      cachedEnvFile = parseDotenv(fs.readFileSync(filePath, 'utf8'));
      return cachedEnvFile;
    } catch {
      // ignore and continue
    }
  }
  cachedEnvFile = {};
  return cachedEnvFile;
}

function getEnvValue(key: string): string {
  const direct = String(process.env[key] ?? '').trim();
  if (direct) return direct;
  const fallback = String(readLocalEnvFallback()[key] ?? '').trim();
  return fallback;
}

export function getClickConfig(): ClickConfig {
  const merchantUserId =
    getEnvValue('CLICK_MERCHANT_USER_ID') || getEnvValue('CLICK_MERCHANT_ID');
  return {
    serviceId: getEnvValue('CLICK_SERVICE_ID'),
    merchantId: getEnvValue('CLICK_MERCHANT_ID'),
    merchantUserId,
    secretKey: getEnvValue('CLICK_SECRET_KEY'),
    returnUrl: getEnvValue('CLICK_RETURN_URL') || null,
  };
}
