import { randomBytes } from 'node:crypto';

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
