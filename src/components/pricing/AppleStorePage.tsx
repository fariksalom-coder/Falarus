import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NativePurchases, PURCHASE_TYPE, type Product } from '@capgo/native-purchases';
import { APPLE_PRODUCTS, isAppleProductId } from '../../../shared/appleProducts';
import type { PaymentProductCode } from '../../../shared/paymentProducts';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { getMe } from '../../api/user';
import { purchaseAppleProduct, syncApplePurchases, isApplePurchaseCancelled } from '../../native/applePurchases';

export default function AppleStorePage({ productCode = 'russian' }: { productCode?: PaymentProductCode }) {
  const { token, updateUser } = useAuth();
  const { refreshAccess } = useAccess();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setProducts([]);
    const ids = Object.entries(APPLE_PRODUCTS).filter(([, item]) => item.productCode === productCode).map(([id]) => id);
    if (!ids.length) { setLoading(false); return; }
    void NativePurchases.getProducts({ productIdentifiers: ids,
      productType: productCode === 'russian' ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP })
      .then(result => {
        if (!active) return;
        const sorted = result.products.filter(product => ids.includes(product.identifier))
          .sort((a, b) => ids.indexOf(a.identifier) - ids.indexOf(b.identifier));
        setProducts(sorted);
        if (!sorted.length) setError('Hozir xaridlar mavjud emas. Keyinroq qayta urinib ko‘ring.');
      }).catch(() => { if (active) setError('App Store narxlarini yuklab bo‘lmadi. Internetni tekshiring.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productCode, attempt]);

  async function refreshProfile() {
    if (!token) return;
    updateUser(await getMe(token));
    await refreshAccess();
  }
  async function purchase(id: string) {
    if (!token) { navigate('/login'); return; }
    if (busy || !isAppleProductId(id)) return;
    setBusy(true); setError(''); setMessage('');
    try { await purchaseAppleProduct(token, id); await refreshProfile(); setMessage('Xarid tasdiqlandi. Kursdan foydalanishingiz mumkin.'); }
    catch (error) { if (!isApplePurchaseCancelled(error)) setError(error instanceof Error ? error.message : 'Xarid bajarilmadi.'); }
    finally { setBusy(false); }
  }
  async function restore() {
    if (!token) { navigate('/login'); return; }
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { const count = await syncApplePurchases(token, true); await refreshProfile();
      setMessage(count ? 'Xaridlaringiz tiklandi.' : 'Bu Apple hisobida faol xarid topilmadi.'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Xaridlarni tiklab bo‘lmadi.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-app-bg px-4 pb-28 pt-5 text-app-text">
    <div className="mx-auto max-w-lg">
      <button onClick={() => navigate('/profile')} className="mb-5 min-h-11 font-bold">← Orqaga</button>
      <h1 className="text-2xl font-extrabold">{productCode === 'russian' ? 'Rus tili kursi' : productCode === 'vnzh' ? 'VNJ imtihoni' : productCode === 'patent' ? 'Patent imtihoni' : 'Xaridlar'}</h1>
      <p className="mt-2 text-sm text-app-text-muted">To‘lov Apple hisobingiz orqali amalga oshiriladi.</p>
      {loading && <p role="status" className="my-6">Narxlar yuklanmoqda…</p>}
      {productCode === 'teacher_listing' && <p className="mt-5">Bu xizmatni ilova ichida sotib olish hozircha mavjud emas.</p>}
      <div className="mt-6 space-y-3">{products.map(product => <section key={product.identifier} className="rounded-2xl border border-app-border bg-app-surface p-5">
        <h2 className="text-lg font-bold">{isAppleProductId(product.identifier) ? APPLE_PRODUCTS[product.identifier].label : product.title}</h2>
        <p className="my-2 text-sm text-app-text-muted">{product.description}</p>
        <button disabled={busy} onClick={() => void purchase(product.identifier)} className="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-50">{product.priceString} · Sotib olish</button>
      </section>)}</div>
      {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button disabled={busy} onClick={() => setAttempt(value => value + 1)} className="mt-2 block min-h-11 underline">Qayta urinish</button></div>}
      {message && <p role="status" className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
      <button disabled={busy || loading} onClick={() => void restore()} className="mt-5 min-h-12 w-full rounded-xl border border-app-border bg-app-surface font-bold disabled:opacity-50">{busy ? 'Kutilmoqda…' : 'Xaridlarni tiklash'}</button>
      <button disabled={busy} onClick={() => void NativePurchases.manageSubscriptions().catch(() => setError('Obunalarni ochib bo‘lmadi.'))} className="mt-2 min-h-11 w-full underline">Apple obunalarini boshqarish</button>
      {productCode === 'russian' && <p className="mt-5 text-xs leading-relaxed text-app-text-muted">Obuna tanlangan muddatga avtomatik yangilanadi. To‘lov Apple hisobingizdan olinadi. Keyingi to‘lovni to‘xtatish uchun muddat tugashidan kamida 24 soat oldin Apple sozlamalarida obunani bekor qiling.</p>}
      <div className="mt-5 flex flex-wrap gap-4 text-xs underline"><Link className="min-h-11" to="/huquqiy/maxfiylik">Maxfiylik siyosati</Link><a className="min-h-11" href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Foydalanish shartlari (EULA)</a></div>
    </div>
  </main>;
}
