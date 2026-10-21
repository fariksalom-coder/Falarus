import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { NativePurchases } from '@capgo/native-purchases';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { isNativeIOS } from '../../native/platform';
import { confirmAppleTransaction, syncApplePurchases } from '../../native/applePurchases';
import { getMe } from '../../api/user';

export function ApplePurchaseSync() {
  const { token, updateUser } = useAuth();
  const { refreshAccess } = useAccess();
  useEffect(() => {
    if (!token || !isNativeIOS()) return;
    let disposed = false;
    let syncing = false;
    async function refresh() {
      const profile = await getMe(token!);
      if (!disposed) { updateUser(profile); await refreshAccess(); }
    }
    async function sync() {
      if (disposed || syncing) return;
      syncing = true;
      try { const count = await syncApplePurchases(token!); if (count) await refresh(); }
      catch { /* Keep StoreKit's purchases for the next retry or explicit restore. */ }
      finally { syncing = false; }
    }
    const handles = [
      NativePurchases.addListener('transactionUpdated', transaction => {
        if (disposed) return;
        void confirmAppleTransaction(token, transaction).then(refresh).catch(() => undefined);
      }),
      App.addListener('appStateChange', state => { if (state.isActive) void sync(); }),
    ];
    void sync();
    window.addEventListener('online', sync);
    return () => {
      disposed = true;
      window.removeEventListener('online', sync);
      for (const handle of handles) void handle.then(listener => listener.remove()).catch(() => undefined);
    };
    // Authentication identity, rather than profile updates, controls the listener lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return null;
}
