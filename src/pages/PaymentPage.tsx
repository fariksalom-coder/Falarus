import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitPayment, type TariffType, type Currency } from '../api/payment';
import { getPaymentMethodByCurrency, getTariffPricesByCurrency } from '../api/publicPricing';
import {
  Copy,
  Upload,
  X,
  ArrowLeft,
  CreditCard,
  Smartphone,
  User,
  Paperclip,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

const FALLBACK_CARD = 'XXXX XXXX XXXX XXXX';
const FALLBACK_PHONE = '+7 XXX XXX XX XX';
const FALLBACK_HOLDER = 'Ibragimova Aziza Azamatovna';

function formatCardDisplay(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (!digits.length) return card;
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
    >
      <Copy className="h-4 w-4 shrink-0" />
      {copied ? 'Nusxalandi' : 'Nusxalash'}
    </button>
  );
}

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf';
const MAX_SIZE = 10 * 1024 * 1024;

function formatAmount(price: number, currency: Currency): string {
  if (currency === 'UZS') return `${Number(price).toLocaleString('uz-UZ')} so'm`;
  if (currency === 'RUB') return `${price} ₽`;
  return `$${price}`;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const state = location.state as { tariffType?: TariffType; currency?: Currency; tariffLabel?: string } | null;

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<{
    card_number: string;
    phone_number: string | null;
    card_holder_name: string;
  } | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  const tariffType = state?.tariffType ?? 'month';
  const currency = state?.currency ?? 'UZS';
  const tariffLabel = state?.tariffLabel ?? '1 OY';

  useEffect(() => {
    setDetailsLoading(true);
    Promise.all([
      getPaymentMethodByCurrency(currency),
      getTariffPricesByCurrency(currency),
    ])
      .then(([m, prices]) => {
        setPaymentMethod(
          m
            ? m
            : {
                card_number: FALLBACK_CARD,
                phone_number: FALLBACK_PHONE,
                card_holder_name: FALLBACK_HOLDER,
              }
        );
        const key =
          tariffType === 'year' ? 'year' : tariffType === '3months' ? 'three_months' : 'month';
        setPrice((prices as Record<string, number>)[key] ?? null);
      })
      .catch(() => {
        setPaymentMethod({
          card_number: FALLBACK_CARD,
          phone_number: FALLBACK_PHONE,
          card_holder_name: FALLBACK_HOLDER,
        });
        setPrice(null);
      })
      .finally(() => setDetailsLoading(false));
  }, [currency, tariffType]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (
      f &&
      (ACCEPT.split(',').some((m) => f.type === m.trim()) ||
        f.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) &&
      f.size <= MAX_SIZE
    ) {
      setFile(f);
      setError('');
    } else {
      setError('Faqat JPG, PNG, WEBP yoki PDF (max 10 MB)');
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > MAX_SIZE) {
        setError("Fayl 10 MB dan oshmasin");
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!file || !token) {
      setError(file ? 'Tizimga kirish kerak' : "Chek yoki skrinshotni yuklang");
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitPayment(token, tariffType, currency, file);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  if (!state?.tariffType) {
    navigate('/tariflar', { replace: true });
    return null;
  }

  // ——— Success screen ———
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">To'lov qabul qilindi</h1>
          <p className="text-slate-600 mb-4">
            Administrator tez orada to'lovni tekshiradi.
            <br />
            Tasdiqlangandan so'ng sizga kursga kirish ochiladi.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-800 px-4 py-2 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Holat: Tekshiruvda
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-xl py-4 text-lg font-semibold border-2 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#EEF4FF', borderColor: '#4C6FFF', color: '#4C6FFF' }}
          >
            Bosh sahifaga
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full mt-3 rounded-xl py-3 text-slate-600 hover:text-slate-900 font-medium"
          >
            Profilga qaytish
          </button>
        </div>
      </div>
    );
  }

  // ——— Main payment form ———
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="mx-auto max-w-xl px-4 pt-6 sm:pt-8">
        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          Orqaga
        </button>

        {/* Payment amount — light blue block */}
        <section
          className="rounded-2xl border-2 shadow-sm p-6 mb-6"
          style={{ backgroundColor: '#EEF4FF', borderColor: '#4C6FFF' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">To'lov summasi</h2>
              <p className="text-slate-600 text-sm mb-1">Tarif: {tariffLabel}</p>
              <p className="text-slate-600 text-sm">Iltimos, aynan shu summani o'tkazing.</p>
            </div>
            <div className="sm:text-right">
              {detailsLoading ? (
                <div
                  className="h-12 w-28 rounded-lg animate-pulse"
                  style={{ backgroundColor: 'rgba(76, 111, 255, 0.2)' }}
                />
              ) : price != null ? (
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {formatAmount(price, currency)}
                </p>
              ) : (
                <p className="text-2xl font-bold text-slate-400">—</p>
              )}
            </div>
          </div>
        </section>

        {/* 3. Payment details card with icons */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">To'lov ma'lumotlari</h2>
          {detailsLoading ? (
            <div className="space-y-5 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-slate-200 rounded w-28 mb-2" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            paymentMethod && (
              <div className="space-y-5">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">Karta raqami</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-900 text-lg">
                      {formatCardDisplay(paymentMethod.card_number)}
                    </span>
                    <CopyButton
                      text={paymentMethod.card_number.replace(/\s/g, '')}
                      label="Karta"
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-sm font-medium">Telefon raqami</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-900">
                      {paymentMethod.phone_number || '—'}
                    </span>
                    {paymentMethod.phone_number && (
                      <CopyButton text={paymentMethod.phone_number} label="Telefon" />
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Karta egasi</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-900">{paymentMethod.card_holder_name}</span>
                    <CopyButton text={paymentMethod.card_holder_name} label="Ism" />
                  </div>
                </div>
              </div>
            )
          )}
        </section>

        {/* File upload */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 text-slate-800 mb-1">
            <Paperclip className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">Chek yoki to'lov skrinshotini yuklang</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Ruxsat etilgan formatlar: JPG, PNG, WEBP yoki PDF (Maks 10 MB)
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragOver ? 'bg-[#EEF4FF]/50' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
            style={dragOver ? { borderColor: '#4C6FFF' } : undefined}
          >
            <input
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              className="hidden"
              id="payment-file"
            />
            {file ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-emerald-800">
                      ✓ {file.name} yuklandi
                    </p>
                    <p className="text-xs text-emerald-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Boshqa fayl tanlash
                </button>
              </div>
            ) : (
              <label htmlFor="payment-file" className="cursor-pointer block">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">
                  Faylni tanlang yoki kengashni tortib tashlang
                </p>
              </label>
            )}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </section>

        {/* Submit button — light blue bg, blue border */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="w-full rounded-xl py-4 text-lg font-semibold border-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] hover:opacity-90"
          style={{ backgroundColor: '#EEF4FF', borderColor: '#4C6FFF', color: '#4C6FFF' }}
        >
          {submitting ? 'Yuborilmoqda...' : "To'lovni yuborish"}
        </button>

        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          className="w-full mt-4 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center justify-center gap-1"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Tariflar sahifasiga
        </button>
      </div>
    </div>
  );
}
