import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Share2, Users } from 'lucide-react';
import { getReferralPageData, type ReferralListItem, type ReferralPageData } from '../api/referral';
import { useAuth } from '../context/AuthContext';

function statusLabel(status: string): string {
  if (status === 'rewarded' || status === 'paid') return 'To‘lov qildi';
  if (status === 'registered') return "Ro'yxatdan o'tdi";
  return 'Taklif yuborildi';
}

function statusTone(status: string): string {
  if (status === 'rewarded' || status === 'paid') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (status === 'registered') return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
}

export default function InvitePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralPageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const payload = await getReferralPageData(token);
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Ma'lumotlar yuklanmadi";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const referralLink = data?.referral_link ?? '';
  const list: ReferralListItem[] = data?.list ?? [];

  const stats = useMemo(
    () => [
      { label: 'Takliflar', value: Number(data?.invited_users ?? 0) },
      { label: "Ro'yxatdan o'tgan", value: Number(data?.registered_users ?? 0) },
      { label: "To'lov qilgan", value: Number(data?.paid_users ?? 0) },
      { label: 'Bonus balans', value: `${Number(data?.balance ?? 0).toLocaleString()} so'm` },
    ],
    [data]
  );

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'FalaRus.uz',
          text: "FalaRus kursiga qo'shiling",
          url: referralLink,
        });
      } else {
        await handleCopy();
      }
    } catch {
      // user cancelled share sheet
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-24 pt-4">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-slate-700 ring-1 ring-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <section className="rounded-3xl bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)] ring-1 ring-slate-200">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Do'stlarni taklif qiling</h1>
          </div>
          <p className="text-sm text-slate-600">
            Havolangiz orqali do'stlaringiz ro'yxatdan o'tsa va to'lov qilsa siz bonus olasiz.
          </p>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">Yuklanmoqda...</div>
          ) : error ? (
            <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="break-all text-sm text-slate-700">{referralLink || 'Havola mavjud emas'}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Nusxalandi' : 'Nusxalash'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white"
                >
                  <Share2 className="h-4 w-4" />
                  Ulashish
                </button>
              </div>
            </>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Takliflar ro'yxati</h2>
          {list.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Hali takliflar yo'q.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {list.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusTone(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Bonus hisobingiz avtomatik yangilanadi.
          </div>
        </section>
      </div>
    </div>
  );
}
