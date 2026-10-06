import { randomBytes, randomInt } from 'node:crypto';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Generates a readable random password without ambiguous characters (0/O, 1/l/I). */
export function generateSecurePassword(length = 12): string {
  const size = Math.max(8, Math.min(length, 32));
  const bytes = randomBytes(size);
  let result = '';
  for (let i = 0; i < size; i += 1) {
    result += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  return result;
}

/** Numeric password for manual resets by Support, CRM Support and admins. */
export function generateNumericPassword(length = 10): string {
  const size = Math.max(8, Math.min(Number.isFinite(length) ? Math.trunc(length) : 10, 32));
  return Array.from({ length: size }, () => String(randomInt(0, 10))).join('');
}
