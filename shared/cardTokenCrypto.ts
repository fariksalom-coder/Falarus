import { createDecipheriv, createHash } from 'node:crypto';

const PREFIX = 'v1';

function deriveKey(): Buffer {
  const secret =
    process.env.CLICK_CARD_TOKEN_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET?.trim() || '';
  if (!secret || secret.length < 16) {
    throw new Error('CLICK_CARD_TOKEN_ENCRYPTION_KEY yoki JWT_SECRET sozlash kerak (token shifrlash)');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function decryptCardTokenPlaintext(stored: string): string {
  if (!stored.startsWith(`${PREFIX}:`)) {
    throw new Error('Noto‘g‘ri token shifr formati');
  }
  const blob = Buffer.from(stored.slice(PREFIX.length + 1), 'base64');
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const data = blob.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
