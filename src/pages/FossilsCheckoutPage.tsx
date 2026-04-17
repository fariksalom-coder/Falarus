import { useState } from 'react';
import { apiUrl } from '../api';

type Tariff = {
  id: '1_oy' | '3_oy' | '12_oy';
  label: string;
  price: string;
  oldPrice: string;
};

type Step = 'tariff' | 'payment' | 'success';
type CountryOption = {
  id: 'uz' | 'ru' | 'kg' | 'kz' | 'tj' | 'other';
  flag: string;
  label: string;
  dialCode: string;
  digitsCount: number;
  placeholder: string;
  format: (digits: string) => string;
};

const TARIFS: Tariff[] = [
  { id: '1_oy', label: "1 oy", price: "99 000 so'm", oldPrice: "250 000 so'm" },
  { id: '3_oy', label: "3 oy", price: "199 000 so'm", oldPrice: "750 000 so'm" },
  { id: '12_oy', label: "12 oy", price: "299 000 so'm", oldPrice: "3 000 000 so'm" },
];
const RECOMMENDED_TARIFF_ID: Tariff['id'] = '12_oy';

const REGISTRATION_URL = 'https://www.falarus.uz/register';
const ADMIN_TELEGRAM_URL = 'https://t.me/farmon_creator';
const PAYMENT_CARD_NUMBER = '5614 6868 0541 4235';
const PAYMENT_CARD_HOLDER = 'OmonovFarmon';
const DISCOUNT_LABEL_BY_TARIFF: Record<Tariff['id'], string> = {
  '1_oy': '-60%',
  '3_oy': '-73%',
  '12_oy': '-90%',
};
const formatByGroups = (digits: string, groups: number[]): string => {
  let index = 0;
  const parts: string[] = [];
  for (const group of groups) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + group));
    index += group;
  }
  return parts.join(' ');
};
const COUNTRY_OPTIONS: CountryOption[] = [
  {
    id: 'uz',
    flag: '🇺🇿',
    label: "O'zbekiston",
    dialCode: '+998',
    digitsCount: 9,
    placeholder: '90 123 45 67',
    format: (digits) => formatByGroups(digits, [2, 3, 2, 2]),
  },
  {
    id: 'ru',
    flag: '🇷🇺',
    label: 'Rossiya',
    dialCode: '+7',
    digitsCount: 10,
    placeholder: '901 171 24 74',
    format: (digits) => formatByGroups(digits, [3, 3, 2, 2]),
  },
  {
    id: 'kg',
    flag: '🇰🇬',
    label: 'Qirg‘iziston',
    dialCode: '+996',
    digitsCount: 9,
    placeholder: '700 123 456',
    format: (digits) => formatByGroups(digits, [3, 3, 3]),
  },
  {
    id: 'kz',
    flag: '🇰🇿',
    label: 'Qozog‘iston',
    dialCode: '+7',
    digitsCount: 10,
    placeholder: '701 123 45 67',
    format: (digits) => formatByGroups(digits, [3, 3, 2, 2]),
  },
  {
    id: 'tj',
    flag: '🇹🇯',
    label: 'Tojikiston',
    dialCode: '+992',
    digitsCount: 9,
    placeholder: '901 12 34 56',
    format: (digits) => formatByGroups(digits, [3, 2, 2, 2]),
  },
  {
    id: 'other',
    flag: '🌍',
    label: 'Boshqa davlat',
    dialCode: '',
    digitsCount: 15,
    placeholder: '+44 7700 900123',
    format: (digits) => digits,
  },
];

export default function FossilsCheckoutPage() {
  const [step, setStep] = useState<Step>('tariff');
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(
    TARIFS.find((tariff) => tariff.id === RECOMMENDED_TARIFF_ID) ?? TARIFS[0]
  );
  const [selectedCountryId, setSelectedCountryId] = useState<CountryOption['id']>('uz');
  const [phone, setPhone] = useState('');
  const [otherPhone, setOtherPhone] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const selectedCountry =
    COUNTRY_OPTIONS.find((country) => country.id === selectedCountryId) ?? COUNTRY_OPTIONS[0];
  const rawPhoneDigits = phone.replace(/\D/g, '');
  const normalizedOtherPhone = otherPhone.replace(/[^\d+]/g, '');

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_CARD_NUMBER.replace(/\s+/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedTariff) return setError('Tarif tanlanmagan');
    if (selectedCountry.id === 'other') {
      if (!normalizedOtherPhone || !normalizedOtherPhone.startsWith('+')) {
        return setError("Boshqa davlat uchun raqamni + bilan to'liq kiriting");
      }
      const digitsOnly = normalizedOtherPhone.replace(/\D/g, '');
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        return setError("Telefon raqami 8 dan 15 gacha raqam bo'lishi kerak");
      }
    } else {
      if (!rawPhoneDigits) return setError('Telefon raqamini kiriting');
      if (rawPhoneDigits.length !== selectedCountry.digitsCount) {
        return setError(`Telefon raqami ${selectedCountry.digitsCount} ta raqamdan iborat bo'lishi kerak`);
      }
    }
    if (!receipt) return setError('Chek rasmini yuklang');

    setError('');
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const fullPhone =
        selectedCountry.id === 'other'
          ? normalizedOtherPhone
          : `${selectedCountry.dialCode}${rawPhoneDigits}`;
      formData.append('phone', fullPhone);
      formData.append('tariff', selectedTariff.label);
      formData.append('receipt', receipt);

      const response = await fetch(apiUrl('/api/payment'), { method: 'POST', body: formData });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'To‘lov yuborishda xatolik');
      }
      setStep('success');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-slate-700 bg-white p-6 shadow-2xl">
        {step === 'tariff' && (
          <>
            <h2 className="text-2xl font-extrabold">Tarifni tanlang</h2>
            <p className="mt-1 text-sm text-slate-500">O‘zingizga mos rejani tanlab davom eting</p>
            <div className="mt-5 space-y-3">
              {TARIFS.map((tariff) => (
                <button
                  key={tariff.id}
                  type="button"
                  onClick={() => setSelectedTariff(tariff)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    selectedTariff?.id === tariff.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 font-semibold">
                    {tariff.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        tariff.id === RECOMMENDED_TARIFF_ID
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {DISCOUNT_LABEL_BY_TARIFF[tariff.id]}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-400 line-through">{tariff.oldPrice}</span>
                    <span className="font-bold text-blue-700">{tariff.price}</span>
                  </span>
                </button>
              ))}
            </div>
            {selectedTariff && (
              <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm">
                Tanlangan tarif: <strong>{selectedTariff.label}</strong> — <strong>{selectedTariff.price}</strong>
              </p>
            )}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => selectedTariff && setStep('payment')}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!selectedTariff}
              >
                Sotib olish
              </button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <h2 className="text-2xl font-extrabold">To‘lov ma’lumotlari</h2>
            <p className="mt-2 text-sm text-slate-500">Tarif summasini o‘tkazing, so‘ng chekning rasmini yuklang.</p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Karta raqami</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-2xl font-extrabold tracking-wide text-slate-900">{PAYMENT_CARD_NUMBER}</p>
                <button
                  type="button"
                  onClick={handleCopyCard}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {copied ? 'Nusxalandi' : 'Nusxalash'}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Karta egasi: <span className="font-bold text-slate-900">{PAYMENT_CARD_HOLDER}</span>
              </p>
            </div>
            <div className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm">
              Tanlangan: <strong>{selectedTariff?.label}</strong> — <strong>{selectedTariff?.price}</strong>
            </div>

            <label className="mt-4 block text-sm font-semibold">Telefon raqami</label>
            <div className="mt-1 flex gap-2">
              <select
                value={selectedCountryId}
                onChange={(event) => {
                  const nextCountry = event.target.value as CountryOption['id'];
                  setSelectedCountryId(nextCountry);
                  setError('');
                }}
                className="w-48 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-blue-500"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.flag} {country.label} ({country.dialCode})
                  </option>
                ))}
              </select>
              {selectedCountry.id === 'other' ? (
                <input
                  value={otherPhone}
                  onChange={(event) => setOtherPhone(event.target.value)}
                  placeholder={selectedCountry.placeholder}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                />
              ) : (
                <div className="flex w-full items-center rounded-xl border border-slate-300 px-3 py-2.5 focus-within:border-blue-500">
                  <span className="mr-2 text-sm font-semibold text-slate-600">{selectedCountry.dialCode}</span>
                  <input
                    value={selectedCountry.format(rawPhoneDigits)}
                    onChange={(event) => {
                      const nextDigits = event.target.value.replace(/\D/g, '').slice(0, selectedCountry.digitsCount);
                      setPhone(nextDigits);
                    }}
                    placeholder={selectedCountry.placeholder}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              )}
            </div>

            <label className="mt-4 block text-sm font-semibold">Chek (rasm)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setStep('tariff')}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold"
              >
                Orqaga
              </button>
              <button
                type="button"
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center">
            <h2 className="text-2xl font-extrabold">To‘lovingiz tekshirilmoqda</h2>
            <p className="mt-2 text-sm text-slate-500">Tez orada siz bilan bog‘lanamiz</p>
            <a
              href={REGISTRATION_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
            >
              Platformaga kirish
            </a>
            <a
              href={ADMIN_TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Administrator bilan bog'lanish
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
