import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarCheck, CheckCircle2, CreditCard, GraduationCap, Save, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  completeTeacherTrial,
  createTeacherListingPayment,
  getTeacherCabinet,
  saveTeacherProfile,
  type TeacherCabinet,
  type TeacherProfilePayload,
} from '../api/teachers';

const emptyForm: TeacherProfilePayload = {
  first_name: '',
  last_name: '',
  age: 25,
  avatar_url: '',
  region: '',
  city: '',
  experience_years: 0,
  experience_months: 0,
  teaching_format: 'online',
  headline: '',
  about: '',
  subjects: ['Rus tili'],
  teaching_levels: ['Boshlangich', "O'rta"],
  languages: ['uz', 'ru'],
  monthly_course_price_amount: 0,
  monthly_course_price_currency: 'RUB',
  telegram_username: '',
  telegram_url: '',
  whatsapp_phone_e164: '',
  max_contact: '',
  public_phone_e164: '',
  public_email: '',
  preferred_contact_method: 'telegram',
};

function csvToArray(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function arrayToCsv(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : '';
}

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
  const { token, user } = useAuth();
  const isTeacherAccount = user?.accountType === 'teacher';
  const [cabinet, setCabinet] = useState<TeacherCabinet | null>(null);
  const [form, setForm] = useState<TeacherProfilePayload>(emptyForm);
  const [subjectsText, setSubjectsText] = useState(arrayToCsv(emptyForm.subjects));
  const [levelsText, setLevelsText] = useState(arrayToCsv(emptyForm.teaching_levels));
  const [languagesText, setLanguagesText] = useState(arrayToCsv(emptyForm.languages));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const profile = cabinet?.profile ?? null;
  const listingActive = isActiveUntil(profile?.listing_paid_until);

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
          ...p,
          first_name: p.first_name ?? '',
          last_name: p.last_name ?? '',
          age: Number(p.age ?? 25),
          monthly_course_price_amount: Number(p.monthly_course_price_amount ?? 0),
        });
        setSubjectsText(arrayToCsv(p.subjects));
        setLevelsText(arrayToCsv(p.teaching_levels));
        setLanguagesText(arrayToCsv(p.languages));
      } else {
        setForm({
          ...emptyForm,
          first_name: user?.firstName ?? '',
          last_name: user?.lastName ?? '',
          public_email: user?.email ?? '',
          public_phone_e164: user?.phone ?? '',
        });
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
        subjects: csvToArray(subjectsText),
        teaching_levels: csvToArray(levelsText),
        languages: csvToArray(languagesText),
      });
      setCabinet((prev) => ({ ...(prev ?? { trial_lessons: [], notifications: [], listing_subscriptions: [] }), profile: saved }));
      setMessage("Anketa saqlandi. Admin tekshirgandan keyin ro'yxatda ko'rinadi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Anketa saqlanmadi');
    } finally {
      setSaving(false);
    }
  }

  async function handleListingPayment() {
    if (!token) return;
    setPaymentLoading(true);
    setError('');
    setMessage('');
    try {
      const out = await createTeacherListingPayment(
        token,
        profile?.first_listing_discount_used ? 'teacher_listing_month_uzs' : 'teacher_listing_first_month_uzs',
      );
      setMessage(`To'lov yaratildi: #${out.payment.id}. Admin tasdiqlagandan keyin profil faollashadi.`);
      await loadCabinet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "To'lov yaratilmadi");
    } finally {
      setPaymentLoading(false);
    }
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
      <div className="min-h-screen bg-slate-50 p-5">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-white" />
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <main className="mx-auto max-w-4xl space-y-5 p-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">O'qituvchi kabineti</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Anketa va darslar</h1>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-bold ${listingActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {listingActive ? `Faol: ${formatDate(profile?.listing_paid_until)}` : "Ro'yxatda faol emas"}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <UserRound className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-xs font-bold uppercase text-slate-500">Holat</p>
              <p className="font-bold text-slate-950">{formatProfileStatus(profile?.profile_status)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <CalendarCheck className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-xs font-bold uppercase text-slate-500">Sinov darslari</p>
              <p className="font-bold text-slate-950">{cabinet?.trial_lessons.length ?? 0} ta</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-xs font-bold uppercase text-slate-500">Yakunlangan</p>
              <p className="font-bold text-slate-950">{completedLessons} ta</p>
            </div>
          </div>
        </section>

        {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
        {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-950">O'quvchilar uchun anketa</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ism" value={form.first_name} onChange={(v) => update('first_name', v)} />
            <Field label="Familiya" value={form.last_name} onChange={(v) => update('last_name', v)} />
            <Field label="Yosh" type="number" value={String(form.age)} onChange={(v) => update('age', Number(v))} />
            <Field label="Rasm URL" value={String(form.avatar_url ?? '')} onChange={(v) => update('avatar_url', v)} />
            <Field label="Viloyat" value={String(form.region ?? '')} onChange={(v) => update('region', v)} />
            <Field label="Shahar" value={String(form.city ?? '')} onChange={(v) => update('city', v)} />
            <Field label="Tajriba yili" type="number" value={String(form.experience_years ?? 0)} onChange={(v) => update('experience_years', Number(v))} />
            <Field label="Tajriba oyi" type="number" value={String(form.experience_months ?? 0)} onChange={(v) => update('experience_months', Number(v))} />
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Dars formati
              <select
                value={form.teaching_format}
                onChange={(e) => update('teaching_format', e.target.value as TeacherProfilePayload['teaching_format'])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="online_offline">Online/Offline</option>
              </select>
            </label>
            <Field label="Oylik kurs narxi" type="number" value={String(form.monthly_course_price_amount ?? 0)} onChange={(v) => update('monthly_course_price_amount', Number(v))} />
            <Field label="Sarlavha" value={String(form.headline ?? '')} onChange={(v) => update('headline', v)} className="sm:col-span-2" />
            <Field label="Fanlar (vergul bilan)" value={subjectsText} onChange={setSubjectsText} />
            <Field label="Darajalar (vergul bilan)" value={levelsText} onChange={setLevelsText} />
            <Field label="Tillar (vergul bilan)" value={languagesText} onChange={setLanguagesText} />
            <Field label="Telegram username" value={String(form.telegram_username ?? '')} onChange={(v) => update('telegram_username', v)} />
            <Field label="Telegram URL" value={String(form.telegram_url ?? '')} onChange={(v) => update('telegram_url', v)} />
            <Field label="WhatsApp raqam" value={String(form.whatsapp_phone_e164 ?? '')} onChange={(v) => update('whatsapp_phone_e164', v)} />
            <Field label="MAX kontakt" value={String(form.max_contact ?? '')} onChange={(v) => update('max_contact', v)} />
            <Field label="Ochiq telefon" value={String(form.public_phone_e164 ?? '')} onChange={(v) => update('public_phone_e164', v)} />
            <Field label="Ochiq email" value={String(form.public_email ?? '')} onChange={(v) => update('public_email', v)} />
            <label className="space-y-1 text-sm font-semibold text-slate-700 sm:col-span-2">
              Men haqimda
              <textarea
                value={String(form.about ?? '')}
                onChange={(e) => update('about', e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saqlanmoqda...' : 'Anketani saqlash'}
            </button>
            <button
              type="button"
              onClick={handleListingPayment}
              disabled={paymentLoading || !profile}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              <CreditCard className="h-5 w-5" />
              {profile?.first_listing_discount_used ? "299 000 so'm to'lov yaratish" : "69 000 so'm to'lov yaratish"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-950">Sinov darslari</h2>
          </div>
          <div className="space-y-3">
            {(cabinet?.trial_lessons ?? []).length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Hozircha yozilgan o'quvchilar yo'q.</p>
            ) : (
              cabinet!.trial_lessons.map((lesson) => (
                <div key={lesson.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">Sinov darsi #{lesson.id}</p>
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

function TeacherAccessPrompt({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-700 text-white">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{text}</p>
        <div className="mt-5 grid gap-3">
          <Link to="/teacher-login" className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
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
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none focus:border-blue-500"
      />
    </label>
  );
}
