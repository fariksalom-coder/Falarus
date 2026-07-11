import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';
import {
  Bell,
  CalendarCheck,
  Camera,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  History,
  Pencil,
  Save,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveAssetUrl } from '../api';
import { bustAvatarUrl, uploadUserAvatar } from '../api/user';
import UserAvatar from '../components/UserAvatar';
import { RahmatCoursePayButton } from '../components/pricing/RahmatCoursePayButton';
import { useAuth } from '../context/AuthContext';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import {
  completeTeacherTrial,
  getTeacherCabinet,
  saveTeacherProfile,
  type TeacherCabinet,
  type TeacherProfile,
  type TeacherProfilePayload,
} from '../api/teachers';
import {
  getTeacherListingPlanLabel,
  resolveTeacherListingPlanCode,
  TEACHER_LISTING_PLAN_MONTH,
  TEACHER_LISTING_PRICES_UZS,
  TEACHER_LISTING_PRODUCT_CODE,
} from '../../shared/paymentProducts';
import type { PaymentStatus } from '../api/payment';
import { invalidatePaymentsCache } from '../api/payment';
import { formatTeacherPrice } from '../utils/teacherDisplay';

const LISTING_BENEFITS = [
  "FalaRus'dagi «O'qituvchilar» ro'yxatida ko'rinish",
  "O'quvchilar sizning anketangiz, tajribangiz va narxni ko'radi",
  'Sinov darsi yozilganda bildirishnoma va ichki chat',
  "To'lovdan keyin profil 1 oy davomida faol bo'ladi",
  "Keyingi oylar uchun ro'yxatni uzaytirish mumkin",
];

const TRIAL_LESSON_INFO = [
  "O'quvchi sinov darsi uchun to'lovni amalga oshiradi",
  "To'lov tasdiqlangach (Rahmat yoki admin) siz bilan chat ochiladi",
  "Chatda dars vaqtini kelishasiz",
  "Darsdan keyin ikkalangiz ham bir-biringiz haqida fikr qoldira olasiz",
];

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: 'Tekshirilmoqda', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Tasdiqlandi', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rad etildi', className: 'bg-red-100 text-red-800' },
};

const emptyForm: TeacherProfilePayload = {
  first_name: '',
  last_name: '',
  age: 25,
  region: '',
  city: '',
  experience_years: 0,
  experience_months: 0,
  teaching_format: 'online',
  about: '',
  monthly_course_price_amount: 0,
  monthly_course_price_currency: 'UZS',
  telegram_username: '',
  public_phone_e164: '',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isActiveUntil(value: string | null | undefined): boolean {
  return !!value && new Date(value) > new Date();
}

function formatProfileStatus(value: string | null | undefined): string {
  const statuses: Record<string, string> = {
    active: 'Faol',
    pending_review: 'Tekshiruvda',
    rejected: 'Rad etilgan',
    hidden: 'Yashirilgan',
  };
  return value ? statuses[value] ?? value : "Anketa yo'q";
}

function formatLessonStatus(value: string | null | undefined): string {
  const statuses: Record<string, string> = {
    pending_payment: "To'lov kutilmoqda",
    paid: "To'langan",
    scheduled: 'Rejalashtirilgan',
    completed_by_teacher: "O'qituvchi yakunladi",
    completed: 'Yakunlangan',
    cancelled: 'Bekor qilingan',
  };
  return value ? statuses[value] ?? value : '-';
}

export default function TeacherCabinetPage() {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  const { payments, refreshPayments } = usePaymentStatus();
  const isTeacherAccount = user?.accountType === 'teacher';
  const avatarInputId = useId();
  const [cabinet, setCabinet] = useState<TeacherCabinet | null>(null);
  const [form, setForm] = useState<TeacherProfilePayload>(emptyForm);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const profile = cabinet?.profile ?? null;
  const listingActive = isActiveUntil(profile?.listing_paid_until);
  const listingPlanCode = resolveTeacherListingPlanCode(Boolean(profile?.first_listing_discount_used));
  const listingPrice = TEACHER_LISTING_PRICES_UZS[listingPlanCode];
  const listingPayments = useMemo(
    () =>
      payments
        .filter((p) => p.product_code === TEACHER_LISTING_PRODUCT_CODE)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [payments],
  );
  const hasPendingListingPayment = listingPayments.some((p) => p.status === 'pending');
  const listingTariffLabel = getTeacherListingPlanLabel(listingPlanCode);

  const completedLessons = useMemo(
    () => (cabinet?.trial_lessons ?? []).filter((lesson) => String(lesson.status).includes('completed')).length,
    [cabinet?.trial_lessons],
  );

  async function loadCabinet() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const next = await getTeacherCabinet(token);
      setCabinet(next);
      if (next.profile) {
        const p = next.profile;
        setForm({
          ...emptyForm,
          first_name: p.first_name ?? '',
          last_name: p.last_name ?? '',
          age: Number(p.age ?? 25),
          region: p.region ?? '',
          city: p.city ?? '',
          experience_years: Number(p.experience_years ?? 0),
          experience_months: Number(p.experience_months ?? 0),
          about: p.about ?? '',
          monthly_course_price_amount: Number(p.monthly_course_price_amount ?? 0),
          monthly_course_price_currency: 'UZS',
          telegram_username: p.telegram_username ?? '',
          public_phone_e164: p.public_phone_e164 ?? '',
        });
        setAvatarUrl(p.avatar_url ?? user?.avatarUrl ?? null);
        setEditingProfile(false);
      } else {
        setForm({
          ...emptyForm,
          first_name: user?.firstName ?? '',
          last_name: user?.lastName ?? '',
          public_phone_e164: user?.phone ?? '',
        });
        setAvatarUrl(user?.avatarUrl ?? null);
        setEditingProfile(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kabinet yuklanmadi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !isTeacherAccount) {
      setLoading(false);
      return;
    }
    void loadCabinet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isTeacherAccount]);

  function update<K extends keyof TeacherProfilePayload>(key: K, value: TeacherProfilePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function avatarDisplayUrl(url: string | null | undefined): string | null {
    const resolved = resolveAssetUrl(url);
    if (!resolved) return null;
    return `${resolved.split('?')[0]}?v=${avatarRevision}`;
  }

  async function handlePickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;
    setError('');
    const preview = URL.createObjectURL(file);
    setLocalPreviewUrl(preview);
    setUploadingAvatar(true);
    try {
      const me = await uploadUserAvatar(token, file);
      const nextUrl = me.avatarUrl ? bustAvatarUrl(me.avatarUrl) : null;
      setAvatarUrl(nextUrl);
      setAvatarRevision((v) => v + 1);
      updateUser({
        firstName: me.firstName,
        lastName: me.lastName,
        avatarUrl: nextUrl,
      });
      setCabinet((prev) =>
        prev?.profile
          ? { ...prev, profile: { ...prev.profile, avatar_url: nextUrl } }
          : prev,
      );
      setMessage('Profil rasmi yangilandi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rasm yuklanmadi');
    } finally {
      URL.revokeObjectURL(preview);
      setLocalPreviewUrl(null);
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveTeacherProfile(token, {
        ...form,
        age: Number(form.age),
        experience_years: Number(form.experience_years ?? 0),
        experience_months: Number(form.experience_months ?? 0),
        monthly_course_price_amount: Number(form.monthly_course_price_amount ?? 0),
        monthly_course_price_currency: 'UZS',
        teaching_format: 'online',
      });
      setAvatarUrl(saved.avatar_url ?? avatarUrl);
      setCabinet((prev) => ({ ...(prev ?? { trial_lessons: [], notifications: [], listing_subscriptions: [] }), profile: saved }));
      setEditingProfile(false);
      setMessage("Anketa saqlandi. Endi ro'yxat uchun to'lovni amalga oshiring.");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Anketa saqlanmadi');
    } finally {
      setSaving(false);
    }
  }

  function goToCardTransfer() {
    navigate('/payment', {
      state: {
        productCode: TEACHER_LISTING_PRODUCT_CODE,
        productLabel: "O'qituvchi ro'yxati · 1 oy",
        listingPlanCode,
        currency: 'UZS',
        returnTo: '/teacher-cabinet',
      },
    });
  }

  async function handleCompleteTrial(id: number) {
    if (!token) return;
    try {
      await completeTeacherTrial(token, id);
      setMessage('Dars yakunlandi. Endi oquvchi review qoldirishi mumkin.');
      await loadCabinet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dars yakunlanmadi');
    }
  }

  if (!token || !user) {
    return (
      <TeacherAccessPrompt
        title="O'qituvchi kabineti"
        text="Kabinetga kirish uchun o'qituvchi hisobi bilan kiring yoki yangi hisob yarating."
      />
    );
  }

  if (!isTeacherAccount) {
    return (
      <TeacherAccessPrompt
        title="Bu kabinet faqat o'qituvchilar uchun"
        text="Siz hozir o'quvchi hisobi bilan kirdingiz. O'qituvchi kabinetiga alohida hisob orqali kiring."
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg p-5">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-white" />
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg pb-24">
      <main className="mx-auto max-w-4xl space-y-5 p-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#071B5E]">O'qituvchi kabineti</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Anketa va darslar</h1>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-bold ${listingActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {listingActive ? `Faol: ${formatDate(profile?.listing_paid_until)}` : "Ro'yxatda faol emas"}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <UserRound className="h-5 w-5 text-[#071B5E]" />
              <p className="mt-2 text-xs font-bold uppercase text-slate-500">Holat</p>
              <p className="font-bold text-slate-950">{formatProfileStatus(profile?.profile_status)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <CalendarCheck className="h-5 w-5 text-[#071B5E]" />
              <p className="mt-2 text-xs font-bold uppercase text-slate-500">Sinov darslari</p>
              <p className="font-bold text-slate-950">{cabinet?.trial_lessons.length ?? 0} ta</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-[#071B5E]" />
              <p className="mt-2 text-xs font-bold uppercase text-slate-500">Yakunlangan</p>
              <p className="font-bold text-slate-950">{completedLessons} ta</p>
            </div>
          </div>
        </section>

        {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
        {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#071B5E]" />
              <h2 className="text-lg font-bold text-slate-950">O'quvchilar uchun anketa</h2>
            </div>
            {profile && !editingProfile ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(true);
                  setMessage('');
                  setError('');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Tahrirlash
              </button>
            ) : null}
          </div>

          {profile && !editingProfile ? (
            <ProfileSummary
              profile={profile}
              avatarUrl={avatarDisplayUrl(avatarUrl)}
              form={form}
            />
          ) : (
            <>
          <div className="mb-5 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <label
              htmlFor={avatarInputId}
              className={`relative shrink-0 cursor-pointer ${uploadingAvatar ? 'pointer-events-none opacity-60' : ''}`}
            >
              <UserAvatar
                avatarUrl={localPreviewUrl ?? avatarDisplayUrl(avatarUrl)}
                name={`${form.first_name} ${form.last_name}`.trim()}
                className="h-24 w-24 ring-4 ring-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              />
              <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#071B5E] text-white shadow-md">
                {uploadingAvatar ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden />
                )}
              </span>
              <input
                id={avatarInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="sr-only"
                disabled={uploadingAvatar}
                onChange={(e) => void handlePickAvatar(e)}
              />
            </label>
            <div className="text-center sm:text-left">
              <p className="text-sm font-bold text-slate-950">Profil rasmi</p>
              <p className="mt-1 max-w-xs text-xs font-medium leading-relaxed text-slate-500">
                Rasmni yuklash uchun ustiga bosing. O'quvchilar ro'yxatda shu rasmni ko'radi.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ism" value={form.first_name} onChange={(v) => update('first_name', v)} />
            <Field label="Familiya" value={form.last_name} onChange={(v) => update('last_name', v)} />
            <Field label="Yosh" type="number" value={String(form.age)} onChange={(v) => update('age', Number(v))} />
            <Field label="Viloyat" value={String(form.region ?? '')} onChange={(v) => update('region', v)} />
            <Field label="Shahar" value={String(form.city ?? '')} onChange={(v) => update('city', v)} />
            <Field label="Tajriba yili" type="number" value={String(form.experience_years ?? 0)} onChange={(v) => update('experience_years', Number(v))} />
            <Field label="Tajriba oyi" type="number" value={String(form.experience_months ?? 0)} onChange={(v) => update('experience_months', Number(v))} />
            <Field
              label="Oylik kurs narxi (so'm)"
              type="number"
              value={String(form.monthly_course_price_amount ?? 0)}
              onChange={(v) => update('monthly_course_price_amount', Number(v))}
            />
            <Field
              label="Telegram (@username)"
              value={String(form.telegram_username ?? '')}
              onChange={(v) => update('telegram_username', v)}
              placeholder="@username"
            />
            <Field
              label="Telefon raqami"
              value={String(form.public_phone_e164 ?? '')}
              onChange={(v) => update('public_phone_e164', v)}
              placeholder="+998901234567"
            />
            <label className="space-y-1 text-sm font-semibold text-slate-700 sm:col-span-2">
              O'zingiz haqingizda
              <span className="block text-xs font-medium text-slate-500">
                Tajribangiz, kimlar uchun dars berishingiz va dars uslubingizni yozing. O'quvchilar buni ko'radi.
              </span>
              <textarea
                value={String(form.about ?? '')}
                onChange={(e) => update('about', e.target.value)}
                rows={5}
                placeholder="Masalan: 5 yillik tajribaga ega rus tili o'qituvchisiman. Boshlang'ich va o'rta darajadagi o'quvchilar bilan ishlayman..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-500">
            Bog'lanish uchun Telegram yoki telefon raqamidan kamida bittasini kiriting.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071B5E] px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saqlanmoqda...' : 'Anketani saqlash'}
            </button>
            {profile && editingProfile ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(false);
                  setError('');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700"
              >
                Bekor qilish
              </button>
            ) : null}
          </div>
            </>
          )}
        </section>

        {profile ? (
          <>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#071B5E]" />
              <h2 className="text-lg font-bold text-slate-950">Ro'yxat tarifi</h2>
            </div>

            <div className="rounded-2xl border-2 border-[#0B2A6B] bg-gradient-to-br from-[#EEF3FF] to-[#EDF1F8] px-5 py-5 shadow-[0_14px_34px_rgba(11,42,107,0.12)]">
              <p className="text-xs font-bold uppercase tracking-wide text-[#071B5E]">Sizning tarif</p>
              <p className="mt-2 text-xl font-black text-slate-950">{listingTariffLabel}</p>
              <p className="mt-3 text-3xl font-black text-[#071B5E]">
                {listingPrice.toLocaleString('uz-UZ')}{' '}
                <span className="text-lg font-bold text-slate-600">so'm / oy</span>
              </p>
              {listingActive ? (
                <p className="mt-3 text-sm font-semibold text-emerald-800">
                  Faol muddati: {formatDate(profile.listing_paid_until)}
                </p>
              ) : (
                <p className="mt-3 text-sm font-medium text-slate-600">
                  To'lovdan keyin profil 1 oy davomida o'quvchilar ro'yxatida ko'rinadi.
                </p>
              )}
              {!profile?.first_listing_discount_used && !listingActive ? (
                <p className="mt-2 text-xs font-semibold text-blue-800">
                  Keyingi uzaytirish: {TEACHER_LISTING_PRICES_UZS[TEACHER_LISTING_PLAN_MONTH].toLocaleString('uz-UZ')} so'm / oy
                </p>
              ) : null}
            </div>

            {listingActive ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="font-bold text-emerald-800">Profil faol</p>
                <p className="mt-1 text-sm text-emerald-900/80">
                  Ro'yxat muddati: {formatDate(profile.listing_paid_until)}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-4">
                  <p className="text-sm font-bold text-slate-900">To'lov qilgandan keyin nima olasiz:</p>
                  <ul className="mt-3 space-y-2">
                    {LISTING_BENEFITS.map((item) => (
                      <li key={item} className="flex gap-2 text-sm font-medium text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0B2A6B]" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {hasPendingListingPayment ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    To'lovingiz tekshirilmoqda. Admin tasdiqlagach profil faollashadi.
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <RahmatCoursePayButton
                      token={token}
                      productCode={TEACHER_LISTING_PRODUCT_CODE}
                      listingPlanCode={listingPlanCode}
                      disabled={!profile}
                      onSuccess={() => {
                        if (token) invalidatePaymentsCache(token);
                        void refreshPayments();
                        setMessage("Rahmat to'lovi yaratildi. To'lovni yakunlang.");
                      }}
                      onError={(text) => setError(text)}
                      label="Rahmat orqali to'lash"
                    />
                    <button
                      type="button"
                      onClick={goToCardTransfer}
                      disabled={!profile}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#0B2A6B] bg-white px-5 py-3 text-base font-semibold text-[#071B5E] disabled:opacity-40"
                    >
                      <CreditCard className="h-5 w-5" />
                      Karta orqali o'tkazish
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#071B5E]" />
                <h2 className="text-lg font-bold text-slate-950">To'lovlar tarixi</h2>
              </div>
              {listingPayments.length > 3 ? (
                <Link
                  to="/payment-history"
                  className="text-sm font-bold text-[#071B5E] hover:text-blue-800"
                >
                  Barchasi
                </Link>
              ) : null}
            </div>
            {listingPayments.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Hozircha ro'yxat to'lovlari yo'q.
              </p>
            ) : (
              <div className="space-y-3">
                {listingPayments.slice(0, 5).map((payment) => {
                  const statusMeta = PAYMENT_STATUS_LABELS[payment.status] ?? {
                    label: payment.status,
                    className: 'bg-slate-100 text-slate-700',
                  };
                  return (
                    <div key={payment.id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{listingTariffLabel}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {Number(payment.amount).toLocaleString('uz-UZ')} {payment.currency}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(payment.created_at)}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          </>
        ) : null}

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#071B5E]" />
            <h2 className="text-lg font-bold text-slate-950">Sinov darslari</h2>
          </div>
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
            <p className="text-sm font-bold text-slate-900">Sinov darsi qanday ishlaydi</p>
            <ul className="mt-3 space-y-2">
              {TRIAL_LESSON_INFO.map((item) => (
                <li key={item} className="flex gap-2 text-sm font-medium text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            {(cabinet?.trial_lessons ?? []).length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                To'lov tasdiqlangan sinov darslari shu yerda ko'rinadi.
              </p>
            ) : (
              cabinet!.trial_lessons.map((lesson) => (
                <div key={lesson.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">Sinov darsi #{lesson.id}</p>
                      {lesson.student_message ? (
                        <p className="mt-1 text-sm text-slate-700">{lesson.student_message}</p>
                      ) : null}
                      <p className="text-sm text-slate-500">Holat: {formatLessonStatus(lesson.status)}</p>
                      <p className="text-sm text-slate-500">Vaqt: {formatDate(lesson.requested_starts_at || lesson.scheduled_starts_at)}</p>
                      <p className="text-sm text-slate-500">Kontakt: {lesson.student_phone_e164 || lesson.student_email || '-'}</p>
                    </div>
                    {!String(lesson.status).includes('completed') ? (
                      <button
                        type="button"
                        onClick={() => void handleCompleteTrial(lesson.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        Dars yakunlandi
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ProfileSummary({
  profile,
  avatarUrl,
  form,
}: {
  profile: TeacherProfile;
  avatarUrl: string | null;
  form: TeacherProfilePayload;
}) {
  const contact = profile.telegram_username
    ? `@${String(profile.telegram_username).replace(/^@+/, '')}`
    : profile.public_phone_e164 || '—';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <UserAvatar
        avatarUrl={avatarUrl}
        name={`${form.first_name} ${form.last_name}`.trim()}
        className="h-20 w-20 shrink-0 ring-4 ring-white shadow-md"
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="text-xl font-bold text-slate-950">
            {form.first_name} {form.last_name}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {form.age} yosh · {form.experience_years} yil {form.experience_months} oy tajriba
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {[form.region, form.city].filter(Boolean).join(', ') || 'Joylashuv kiritilmagan'}
          </p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-bold uppercase text-slate-500">Oylik kurs</p>
            <p className="mt-0.5 font-semibold text-slate-900">
              {formatTeacherPrice(
                Number(form.monthly_course_price_amount ?? 0),
                form.monthly_course_price_currency ?? 'UZS',
              )}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-bold uppercase text-slate-500">Bog'lanish</p>
            <p className="mt-0.5 font-semibold text-slate-900">{contact}</p>
          </div>
        </div>
        {form.about ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">{form.about}</p>
        ) : null}
      </div>
    </div>
  );
}

function TeacherAccessPrompt({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#071B5E] text-white">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{text}</p>
        <div className="mt-5 grid gap-3">
          <Link to="/teacher-login" className="rounded-xl bg-[#071B5E] px-5 py-3 font-black text-white">
            O'qituvchi sifatida kirish
          </Link>
          <Link to="/teacher-register" className="rounded-xl bg-slate-100 px-5 py-3 font-black text-slate-950">
            O'qituvchi ro'yxatdan o'tishi
          </Link>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500"
      />
    </label>
  );
}
