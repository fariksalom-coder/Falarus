/**
 * Keeps the invite code from /register?ref=… while the visitor moves between
 * sign-up steps (login page, Google sign-in, back and forth). Only read when a
 * NEW account is created; the server ignores it for existing accounts.
 */
const KEY = 'falarus_ref';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function rememberReferralCode(code: string | null | undefined): void {
  const value = (code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,32}$/.test(value)) return;
  try { localStorage.setItem(KEY, JSON.stringify({ value, at: Date.now() })); } catch { /* storage unavailable */ }
}

export function referralCode(fromUrl?: string | null): string | undefined {
  if (fromUrl?.trim()) {
    rememberReferralCode(fromUrl);
    return fromUrl.trim();
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { value?: string; at?: number } | null;
    if (saved?.value && Date.now() - Number(saved.at) < TTL_MS) return saved.value;
  } catch { /* storage unavailable */ }
  return undefined;
}

export function forgetReferralCode(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
