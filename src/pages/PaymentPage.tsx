import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitPayment, type TariffType, type Currency } from '../api/payment';
import { getPaymentMethodByCurrency, getTariffPricesByCurrency } from '../api/publicPricing';
import { Copy, Upload, FileImage, X } from 'lucide-react';

const FALLBACK_CARD = 'XXXX XXXX XXXX XXXX';
const FALLBACK_PHONE = '+7 XXX XXX XX XX';
const FALLBACK_HOLDER = 'Ibragimova Aziza Azamatovna';

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
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      <Copy className="h-4 w-4" />
      {copied ? "Nusxalandi" : "Nusxalash"}
    </button>
  );
}

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf';
const MAX_SIZE = 10 * 1024 * 1024;

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
  }>({ card_number: FALLBACK_CARD, phone_number: FALLBACK_PHONE, card_holder_name: FALLBACK_HOLDER });
  const [price, setPrice] = useState<number | null>(null);

  const tariffType = state?.tariffType ?? 'month';
  const currency = state?.currency ?? 'UZS';
  const tariffLabel = state?.tariffLabel ?? '1 OY';

  useEffect(() => {
    getPaymentMethodByCurrency(currency).then((m) => {
      if (m) setPaymentMethod(m);
      else setPaymentMethod({ card_number: FALLBACK_CARD, phone_number: FALLBACK_PHONE, card_holder_name: FALLBACK_HOLDER });
    });
  }, [currency]);

  useEffect(() => {
    getTariffPricesByCurrency(currency).then((prices) => {
      const key = tariffType === 'year' ? 'year' : tariffType === '3months' ? 'three_months' : 'month';
      setPrice((prices as Record<string, number>)[key] ?? null);
    }).catch(() => setPrice(null));
  }, [currency, tariffType]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (ACCEPT.split(',').some(m => f.type === m.trim()) || f.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) && f.size <= MAX_SIZE) {
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
        setError('Fayl 10 MB dan oshmasin');
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
      setError(file ? 'Tizimga kirish kerak' : 'Chek yoki skrinshotni yuklang');
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

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 text-green-600 text-3xl">✓</div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">To'lovingiz qabul qilindi.</h1>
          <p className="text-slate-600 whitespace-pre-line mb-8">
            Administrator tez orada to'lovni tekshiradi.{'\n'}
            Tasdiqlangandan so'ng sizga kursga kirish ochiladi.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-xl py-3.5 bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            Bosh sahifaga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-xl px-4 pt-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8 text-center">
          Siz {tariffLabel} tarifini sotib olmoqdasiz
        </h1>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">To'lov ma'lumotlari</h2>
          <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Karta raqami</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-slate-800">{paymentMethod.card_number}</span>
                  <CopyButton text={paymentMethod.card_number} label="Karta" />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Telefon raqami</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-slate-800">{paymentMethod.phone_number || '—'}</span>
                  {paymentMethod.phone_number && (
                    <CopyButton text={paymentMethod.phone_number} label="Telefon" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Karta egasi</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-800">{paymentMethod.card_holder_name}</span>
                  <CopyButton text={paymentMethod.card_holder_name} label="Ism" />
                </div>
              </div>
              {price != null && (
                <p className="text-sm font-semibold text-slate-700 pt-2">
                  Summa: {currency === 'UZS' ? `${Number(price).toLocaleString()} so'm` : currency === 'RUB' ? `${price} ₽` : `$${price}`}
                </p>
              )}
            </div>
        </section>

        <p className="text-slate-600 mb-6 text-center">
          To'lovni yuqoridagi karta yoki telefon raqamiga o'tkazing.{' '}
          To'lovdan so'ng chek yoki skrinshotni yuklang.
        </p>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Chek yoki skrinshotni yuklang</h2>
          <p className="text-sm text-slate-500 mb-4">JPG, PNG, WEBP yoki PDF (max 10 MB)</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              className="hidden"
              id="payment-file"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <FileImage className="h-10 w-10 text-slate-400" />
                <span className="font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                <button type="button" onClick={removeFile} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <label htmlFor="payment-file" className="cursor-pointer block">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <span className="text-slate-600 font-medium">Faylni tanlang yoki shu yerga tashlang</span>
              </label>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="w-full rounded-xl py-4 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Yuborilmoqda...' : "To'lovni yuborish"}
        </button>

        <button
          type="button"
          onClick={() => navigate('/tariflar')}
          className="w-full mt-3 text-slate-600 hover:text-slate-800"
        >
          ← Tariflar sahifasiga
        </button>
      </div>
    </div>
  );
}
