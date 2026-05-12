import fs from 'node:fs';
import path from 'node:path';
import { parse as parseDotenv } from 'dotenv';

export type MulticardConfig = {
  configured: boolean;
  baseUrl: string;
  applicationId: string;
  secret: string;
  storeId: string;
  /** HTTPS origin of this API (no trailing slash), e.g. https://www.falarus.uz — for callback_url */
  publicApiBaseUrl: string;
  /** User redirect after successful payment on Rahmat checkout */
  returnUrl: string;
  /** User redirect after failed payment (optional; Multicard falls back to return_url) */
  returnErrorUrl: string | null;
  ofdMxik: string;
  ofdPackageCode: string;
  /** If true, reject callbacks not from Multicard IP (production hardening) */
  strictCallbackIp: boolean;
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
      // ignore
    }
  }
  cachedEnvFile = {};
  return cachedEnvFile;
}

function getEnvValue(key: string): string {
  const direct = String(process.env[key] ?? '').trim();
  if (direct) return direct;
  return String(readLocalEnvFallback()[key] ?? '').trim();
}

function trimSlash(u: string): string {
  return u.replace(/\/+$/, '');
}

/**
 * Multicard / Rahmat (hosted checkout). Sandbox: https://dev-mesh.multicard.uz/
 * @see https://docs.multicard.uz/
 */
export function getMulticardConfig(): MulticardConfig {
  const baseUrl = trimSlash(getEnvValue('MULTICARD_BASE_URL') || 'https://dev-mesh.multicard.uz');
  const applicationId = getEnvValue('MULTICARD_APPLICATION_ID');
  const secret = getEnvValue('MULTICARD_SECRET');
  const storeId = getEnvValue('MULTICARD_STORE_ID').replace(/\s+/g, '');
  const publicApiBaseUrl = trimSlash(
    getEnvValue('MULTICARD_PUBLIC_API_BASE_URL') || getEnvValue('CLICK_PUBLIC_BASE_URL') || ''
  );
  const appUrl = trimSlash(getEnvValue('APP_URL'));
  const returnUrlRaw = getEnvValue('MULTICARD_RETURN_URL');
  const returnUrl =
    (returnUrlRaw ? trimSlash(returnUrlRaw) : '') || (appUrl ? `${appUrl}/payment/rahmat/done` : '');
  const returnErrorUrlRaw = getEnvValue('MULTICARD_RETURN_ERROR_URL');
  const returnErrorUrl = returnErrorUrlRaw ? trimSlash(returnErrorUrlRaw) : null;
  const ofdMxik = (getEnvValue('MULTICARD_OFD_MXIK') || getEnvValue('CLICK_IKPU_CODE') || '').replace(/\s+/g, '');
  const ofdPackageCode = String(
    getEnvValue('MULTICARD_OFD_PACKAGE_CODE') || getEnvValue('CLICK_PACKAGE_CODE') || ''
  ).replace(/\s+/g, '');
  const strictCallbackIp =
    String(getEnvValue('MULTICARD_CALLBACK_STRICT_IP') ?? '').trim().toLowerCase() === 'true' ||
    String(getEnvValue('MULTICARD_CALLBACK_STRICT_IP') ?? '').trim() === '1';

  const configured = Boolean(
    applicationId && secret && storeId && publicApiBaseUrl && returnUrl && ofdMxik.length === 17 && ofdPackageCode
  );

  return {
    configured,
    baseUrl,
    applicationId,
    secret,
    storeId,
    publicApiBaseUrl,
    returnUrl,
    returnErrorUrl,
    ofdMxik,
    ofdPackageCode,
    strictCallbackIp,
  };
}
