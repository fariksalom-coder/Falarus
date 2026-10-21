import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithApple } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { nativeAppleCredential } from '../../native/appleAuth';
import { isNativeIOS } from '../../native/platform';
import { pathAfterAuth } from '../../utils/postAuthPath';

export function AppleSignInButton({ disabled = false, onError }: { disabled?: boolean; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  if (!isNativeIOS()) return null;
  async function signIn() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const result = await loginWithApple(await nativeAppleCredential());
      const user = { ...result.user!, progress: result.user!.progress ?? 0 };
      login(result.token!, user);
      navigate(pathAfterAuth({ isRegistration: result.isNewUser, onboardingCompleted: user.onboardingCompleted }), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Apple orqali kirib bo‘lmadi.';
      if (!/cancel|bekor|1001/i.test(message)) onError(message);
    } finally { setBusy(false); }
  }
  return <button type="button" disabled={disabled || busy} aria-busy={busy}
    onClick={() => void signIn()} className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-black px-5 text-[16px] font-semibold text-white disabled:opacity-60">
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M17.1 12.3c0-2 1.6-3 1.7-3.1-1-1.5-2.5-1.7-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.7-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.2 9.1.8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-3-1.2-3-4zM15 6c.6-.8 1.1-1.8 1-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.8 1.1.1 2.1-.6 2.8-1.4z" /></svg>
    {busy ? 'Kirilmoqda…' : 'Apple orqali davom etish'}
  </button>;
}
