import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { usePaymentStatusContext } from '../context/PaymentStatusContext';
import { getMe } from '../api/user';
import { invalidateCacheByPrefix } from '../utils/requestCache';
import { isNativeApp } from './platform';

/** Refresh verified server access after returning from external checkout. */
export function PaymentReturnSync() {
  const { token, updateUser } = useAuth();
  const { refreshAccess } = useAccess();
  const { refreshPayments } = usePaymentStatusContext();
  const callbacks = useRef({ updateUser, refreshAccess, refreshPayments });
  useEffect(() => {
    callbacks.current = { updateUser, refreshAccess, refreshPayments };
  }, [updateUser, refreshAccess, refreshPayments]);
  useEffect(() => {
    if (!isNativeApp() || !token) return;
    let active = true;
    let busy = false;
    const refresh = async () => {
      if (!active || busy) return;
      busy = true;
      invalidateCacheByPrefix('');
      try {
        const user = await getMe(token);
        if (active) callbacks.current.updateUser(user);
        if (active) await Promise.all([
          callbacks.current.refreshAccess(), callbacks.current.refreshPayments(),
        ]);
      } catch { /* Keep the last known profile when temporarily offline. */ }
      finally { busy = false; }
    };
    const listeners = [
      App.addListener('appStateChange', state => { if (state.isActive) void refresh(); }),
      Browser.addListener('browserFinished', () => { void refresh(); }),
    ];
    return () => {
      active = false;
      for (const listener of listeners) {
        void listener.then(handle => handle.remove()).catch(() => {});
      }
    };
  }, [token]);
  return null;
}
