import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Share2, Users } from 'lucide-react';
import { getReferralPageData, type ReferralListItem, type ReferralPageData } from '../api/referral';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

function statusLabel(
  status: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (status === 'rewarded' || status === 'paid') return t('invite.statusPaid');
  if (status === 'registered') return t('invite.statusRegistered');
  return t('invite.statusInvited');
}

function statusTone(status: string): string {
  if (status === 'rewarded' || status === 'paid') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (status === 'registered') return 'bg-blue-50 text-[#071B5E] ring-1 ring-blue-200';
  return 'bg-app-bg-muted text-app-text-muted ring-1 ring-slate-200';
}

export default function InvitePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
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
          const message = e instanceof Error ? e.message : t('common.loadError');
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
      { label: t('invite.statInvites'), value: Number(data?.invited_users ?? 0) },
      { label: t('invite.statRegistered'), value: Number(data?.registered_users ?? 0) },
      { label: t('invite.statPaid'), value: Number(data?.paid_users ?? 0) },
      {
        label: t('invite.statBalance'),
        value: `${Number(data?.balance ?? 0).toLocaleString()} ${t('payment.currency')}`,
      },
    ],
    [data, t]
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
          text: t('invite.shareText'),
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
    <div className="min-h-screen bg-app-bg px-4 pb-24 pt-4">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-app-surface px-4 text-app-text ring-1 ring-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <section
          className="overflow-hidden rounded-[24px] p-5 text-white shadow-[0_20px_44px_-16px_rgba(11,42,107,0.55)]"
          style={{ background: 'linear-gradient(150deg, #123A8F 0%, #0B2A6B 55%, #071B5E 100%)' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
              <Users className="h-5 w-5 text-[#E7C578]" />
            </div>
            <h1 className="text-xl font-extrabold">{t('invite.title')}</h1>
          </div>
          <p className="text-sm font-semibold text-white/85">{t('invite.subtitle')}</p>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm font-semibold text-white/80">{t('common.loading')}</div>
          ) : error ? (
            <div className="mt-4 rounded-2xl bg-[#FDE5E5] p-4 text-sm font-semibold text-[#8A1F1F]">{error}</div>
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-white/12 p-3 ring-1 ring-white/15 backdrop-blur">
                <p className="break-all text-sm font-semibold text-white">{referralLink || t('invite.linkMissing')}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C08A2D] px-4 text-sm font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(169,121,28,0.55)] hover:bg-[#A9791C]"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-app-surface px-4 text-sm font-extrabold text-app-primary"
                >
                  <Share2 className="h-4 w-4" />
                  {t('common.share')}
                </button>
              </div>
            </>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl bg-app-surface p-4 ring-1 ring-slate-200">
              <p className="text-xs text-app-text-muted">{item.label}</p>
              <p className="mt-1 text-lg font-bold text-app-text">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-app-surface p-5 ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-app-text">{t('invite.listTitle')}</h2>
          {list.length === 0 ? (
            <p className="mt-3 text-sm text-app-text-muted">{t('invite.listEmpty')}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {list.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex items-center justify-between rounded-xl bg-app-bg-subtle px-3 py-2">
                  <p className="text-sm font-medium text-app-text">{item.name}</p>
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusTone(item.status)}`}>
                    {statusLabel(item.status, t)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-app-text-muted">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t('invite.bonusNote')}
          </div>
        </section>
      </div>
    </div>
  );
}
