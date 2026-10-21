import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { importPKCS8, SignJWT } from 'jose';
import type { DbClient } from '../types/dbClient';
import { SocialAuthError, verifyAppleIdentityToken } from './socialAuth.service';

function encryptionKey(): Buffer {
  const value = process.env.APPLE_TOKEN_ENCRYPTION_KEY ?? '';
  if (!/^[a-f\d]{64}$/i.test(value)) throw new SocialAuthError(503, 'Apple orqali kirish serverda sozlanmagan.');
  return Buffer.from(value, 'hex');
}

export function encryptAppleToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}

export function decryptAppleToken(value: string): string {
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < 29) throw new Error('Invalid encrypted Apple token');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}

export async function appleClientSecret(clientId: string): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID;
  const keyPath = process.env.APPLE_SIGN_IN_PRIVATE_KEY_PATH;
  if (!teamId || !keyId || !keyPath) throw new SocialAuthError(503, 'Apple orqali kirish serverda sozlanmagan.');
  const key = await importPKCS8(await readFile(keyPath, 'utf8'), 'ES256');
  return new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId).setSubject(clientId).setAudience('https://appleid.apple.com')
    .setIssuedAt().setExpirationTime('5m').sign(key);
}

export async function createAppleChallenge(db: DbClient): Promise<string> {
  // Fail before opening the Apple sheet if server secrets are missing.
  encryptionKey();
  await appleClientSecret(process.env.APPLE_BUNDLE_ID || 'com.flarus.app');
  const nonce = randomBytes(32).toString('hex');
  await db.from('apple_auth_challenges').delete().lt('expires_at', new Date().toISOString());
  const { error } = await db.from('apple_auth_challenges').insert({
    nonce_hash: createHash('sha256').update(nonce).digest('hex'),
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
  if (error) throw new SocialAuthError(503, 'Apple orqali kirishni boshlab bo‘lmadi.');
  return nonce;
}

export async function consumeAppleChallenge(db: DbClient, nonce: string): Promise<void> {
  if (!/^[a-f\d]{64}$/.test(nonce)) throw new SocialAuthError(401, 'Apple kirish so‘rovi eskirgan. Qayta urinib ko‘ring.');
  // DELETE ... RETURNING makes the challenge single-use under concurrent requests.
  const { data, error } = await db.from('apple_auth_challenges').delete()
    .eq('nonce_hash', createHash('sha256').update(nonce).digest('hex'))
    .gt('expires_at', new Date().toISOString()).select('nonce_hash').maybeSingle();
  if (error || !data) throw new SocialAuthError(401, 'Apple kirish so‘rovi eskirgan. Qayta urinib ko‘ring.');
}

export async function exchangeAppleCode(code: string, subject: string, clientId: string): Promise<string> {
  if (!code || code.length > 4096) throw new SocialAuthError(400, 'Apple kirish kodi kerak.');
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST', signal: AbortSignal.timeout(15_000),
    body: new URLSearchParams({ client_id: clientId, client_secret: await appleClientSecret(clientId),
      code, grant_type: 'authorization_code' }),
  });
  const tokens = await response.json() as { id_token?: string; refresh_token?: string };
  if (!response.ok || !tokens.id_token || !tokens.refresh_token) {
    throw new SocialAuthError(401, 'Apple kirish kodi tasdiqlanmadi. Qayta urinib ko‘ring.');
  }
  const identity = await verifyAppleIdentityToken(tokens.id_token);
  if (identity.providerUserId !== subject || identity.appleClientId !== clientId) {
    throw new SocialAuthError(401, 'Apple kirish kodi boshqa hisobga tegishli.');
  }
  return encryptAppleToken(tokens.refresh_token);
}

export async function saveAppleGrant(db: DbClient, userId: number, subject: string, clientId: string, encryptedToken: string) {
  const { error } = await db.from('user_oauth_identities').update({
    apple_refresh_token_encrypted: encryptedToken, apple_client_id: clientId,
  }).eq('user_id', userId).eq('provider', 'apple').eq('provider_user_id', subject);
  if (error) throw new SocialAuthError(503, 'Apple kirish ruxsatini saqlab bo‘lmadi. Qayta urinib ko‘ring.');
}

export async function revokeAppleGrants(db: DbClient, userId: number): Promise<void> {
  const { data, error } = await db.from('user_oauth_identities')
    .select('provider_user_id, apple_refresh_token_encrypted, apple_client_id').eq('user_id', userId).eq('provider', 'apple');
  if (error) throw new Error('Apple identity lookup failed');
  for (const grant of data ?? []) {
    if (!grant.apple_refresh_token_encrypted || !grant.apple_client_id) {
      throw new SocialAuthError(409, 'Hisobni o‘chirishdan oldin Apple orqali qayta kiring.');
    }
    const response = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST', signal: AbortSignal.timeout(15_000),
      body: new URLSearchParams({ client_id: grant.apple_client_id,
        client_secret: await appleClientSecret(grant.apple_client_id),
        token: decryptAppleToken(grant.apple_refresh_token_encrypted), token_type_hint: 'refresh_token' }),
    });
    if (!response.ok) throw new SocialAuthError(503, 'Apple ruxsatini bekor qilib bo‘lmadi. Qayta urinib ko‘ring.');
  }
}
