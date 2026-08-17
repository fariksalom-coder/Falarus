import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, CreditCard, MapPin, Star, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { resolveAssetUrl } from '../api';
import {
  bookFreeLessons,
  createTeacherTrialLesson,
  getMyTeacherTrialLesson,
  getTeacherConversations,
  getTeacherPublicDetail,
  type MyTeacherTrialLessonResponse,
  type TeacherAvailabilitySlot,
  type TeacherProfile,
  type TeacherStudentReview,
} from '../api/teachers';
import TeacherChatModal from '../components/teacher/TeacherChatModal';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { openRahmatCheckout } from '../api/rahmat';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { invalidatePaymentsCache } from '../api/payment';
import {
  formatTeacherExperience,
  formatTeacherPrice,
  formatTeachingFormat,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';
import {
  getTeacherTrialPriceRub,
  getTeacherTrialPriceUzs,
  TEACHER_TRIAL_PRODUCT_CODE,
} from '../../shared/paymentProducts';
import { useLocale } from '../context/LocaleContext';
import {
  RecommendedBadge,
  TeacherAchievementsSection,
  TeacherCertificatesSection,
  TeacherEducationSection,
  TeacherResults,
  TeacherSchedule,
} from '../components/teacher/TeacherProfileSections';
import { DEMO_TEACHER_PROFILE, DEMO_TEACHER_REVIEWS } from '../components/teacher/teacherDemoProfile';
import TeacherReviewForm from '../components/teacher/TeacherReviewForm';

const WEEKDAY_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTH_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

type MeetingDay = { dateLabel: string; times: { iso: string; label: string }[] };

/** Haftalik jadvaldan kelgusi 14 kun ichidagi aniq dars boshlanish vaqtlarini yasaydi. */
function buildMeetingDays(availability: TeacherAvailabilitySlot[] | undefined): MeetingDay[] {
  if (!availability || availability.length === 0) return [];
  const now = new Date();
  const days: MeetingDay[] = [];
  for (let i = 0; i < 14 && days.length < 6; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const wd = d.getDay();
    const slots = availability.filter((s) => Number(s.day) === wd);
    if (slots.length === 0) continue;
    const times: { iso: string; label: string }[] = [];
    for (const s of slots) {
      const fh = Number(String(s.from).split(':')[0]);
      const th = Number(String(s.to).split(':')[0]);
      if (!Number.isFinite(fh) || !Number.isFinite(th)) continue;
      for (let h = fh; h < th; h++) {
        const dt = new Date(d);
        dt.setHours(h, 0, 0, 0);
        if (dt.getTime() <= now.getTime()) continue;
        times.push({ iso: dt.toISOString(), label: `${String(h).padStart(2, '0')}:00` });
      }
    }
    if (times.length > 0) {
      days.push({ dateLabel: `${WEEKDAY_UZ[wd]}, ${d.getDate()}-${MONTH_UZ[d.getMonth()]}`, times });
    }
  }
  return days;
}

/** ISO vaqtni "Dushanba, 28-iyul · 10:00" ko'rinishida chiqaradi. */
function formatMeetingTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAY_UZ[d.getDay()]}, ${d.getDate()}-${MONTH_UZ[d.getMonth()]} · ${hh}:${mm}`;
}

function ProfileAvatar({ profile }: { profile: TeacherProfile }) {
  const url = resolveAssetUrl(profile.avatar_url);
  if (url) {
    return (
      <img
        src={url}
        alt={teacherDisplayName(profile)}
        className="h-full w-full object-cover object-[center_35%]"
        decoding="async"
      />
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center text-3xl font-black text-white"
      style={{ background: 'var(--app-brand-gradient)' }}
    >
      {teacherInitials(profile)}
    </div>
  );
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="inline-flex" aria-label={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i < full ? 'fill-app-accent text-app-accent' : 'text-app-border-strong'}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: TeacherStudentReview }) {
  const { t } = useLocale();
  const text = review.opinion?.trim() || review.what_liked?.trim() || t('teachers.reviewPlaceholder');
  return (
    <article className="w-[min(88vw,380px)] shrink-0 rounded-[18px] bg-app-surface px-5 py-4 shadow-app-soft ring-1 ring-app-border">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold text-app-text">{t('teachers.student')}</h3>
        <Stars rating={Number(review.rating)} size={18} />
      </div>
      <p className="mt-3 text-sm font-medium leading-relaxed text-app-text-muted">{text}</p>
    </article>
  );
}

export default function TeacherProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { teacherId } = useParams();
  const { token, user } = useAuth();
  const { t } = useLocale();
  const { payments, refreshPayments } = usePaymentStatus();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [myTrial, setMyTrial] = useState<MyTeacherTrialLessonResponse | null>(null);
  const [reviews, setReviews] = useState<TeacherStudentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [studentMessage, setStudentMessage] = useState('');
  const [trialId, setTrialId] = useState<number | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [reviewDone, setReviewDone] = useState(false);
  const [chatConvoId, setChatConvoId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const trialPriceRub = getTeacherTrialPriceRub();
  const trialPriceUzs = getTeacherTrialPriceUzs();
  const pendingTrialPayment = payments.find(
    (payment) => payment.product_code === TEACHER_TRIAL_PRODUCT_CODE && payment.status === 'pending',
  );
  const awaitingPaymentConfirmation =
    myTrial?.trial?.status === 'pending_payment' &&
    (pendingTrialPayment != null || myTrial.payment?.status === 'pending');
  // Bepul davr: o'qituvchining birinchi 3 darsi o'quvchi uchun ham bepul (to'lovsiz).
  const inFreePeriod = Number(profile?.free_lessons_used ?? 0) < 3;
  // O'quvchi allaqachon bu ustozga yozilganmi (faol dars — to'lov kutmayapti).
  const trialBooked =
    myTrial?.trial != null &&
    myTrial.trial.status !== 'pending_payment' &&
    !String(myTrial.trial.status).includes('completed') &&
    !String(myTrial.trial.status).includes('cancel');
  const meetingDays = buildMeetingDays(profile?.weekly_availability);
  const bookedTime = formatMeetingTime(
    myTrial?.trial?.scheduled_starts_at ?? myTrial?.trial?.requested_starts_at ?? null,
  );

  async function loadMyTrial() {
    // `teacherId` "namuna" ham bo'lishi mumkin (demo profil) — u holda
    // `Number(...)` NaN beradi va serverga /api/teachers/NaN/... ketadi.
    const id = Number(teacherId);
    if (!token || !Number.isFinite(id) || id <= 0) return;
    try {
      const data = await getMyTeacherTrialLesson(token, id);
      setMyTrial(data);
      if (data.trial?.id) setTrialId(data.trial.id);
    } catch {
      setMyTrial(null);
    }
  }

  const isDemo = teacherId === 'namuna';

  useEffect(() => {
    if (isDemo) {
      setProfile(DEMO_TEACHER_PROFILE);
      setReviews(DEMO_TEACHER_REVIEWS);
      setLoading(false);
      return;
    }
    const id = Number(teacherId);
    if (!Number.isFinite(id)) {
      setError(t('teachers.notFound'));
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getTeacherPublicDetail(id)
      .then((data) => {
        if (!mounted) return;
        setProfile(data.profile);
        setReviews(data.reviews);
      })
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [teacherId]);

  useEffect(() => {
    void loadMyTrial();
    void refreshPayments();
  }, [token, teacherId]);

  // Bu o'qituvchi bilan ochilgan chat bormi (to'lovdan keyin avtomat ochiladi).
  useEffect(() => {
    if (!token || !profile || isDemo) return;
    getTeacherConversations(token)
      .then((rows) => {
        const c = rows.find((x) => x.teacher_user_id === profile.user_id);
        setChatConvoId(c ? c.id : null);
      })
      .catch(() => {});
  }, [token, profile?.user_id, isDemo]);

  async function ensureTrialLesson(): Promise<number> {
    if (trialId != null) return trialId;
    if (!token || !profile) throw new Error('Tizimga kirish kerak');
    const trial = await createTeacherTrialLesson(token, profile.user_id, {
      student_message: studentMessage.trim(),
    });
    setTrialId(trial.id);
    return trial.id;
  }

  function handleStartBooking() {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setBookingError('');
    setBookingOpen(true);
  }

  async function handlePayRahmat() {
    if (!token || !profile) return;
    setBookingLoading(true);
    setBookingError('');
    try {
      const id = await ensureTrialLesson();
      await openRahmatCheckout({
        token,
        productCode: TEACHER_TRIAL_PRODUCT_CODE,
        trialId: id,
        afterCreate: async () => {
          if (token) invalidatePaymentsCache(token);
          await refreshPayments();
          await loadMyTrial();
        },
      });
    } catch (e) {
      const err = e as Error & { code?: string };
      setBookingError(
        err.code === 'PENDING_PAYMENT'
          ? t('teachers.trialPaymentPending')
          : err.message || t('teachers.trialRahmatStartError'),
      );
    } finally {
      setBookingLoading(false);
    }
  }

  async function handlePayRub() {
    if (!token || !profile) return;
    setBookingLoading(true);
    setBookingError('');
    try {
      const id = await ensureTrialLesson();
      navigate('/payment', {
        state: {
          productCode: TEACHER_TRIAL_PRODUCT_CODE,
          productLabel: 'Sinov darsi',
          trialId: id,
          currency: 'RUB',
          returnTo: `/teachers/${profile.user_id}`,
        },
      });
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : t('teachers.trialPaymentNavError'));
      setBookingLoading(false);
    }
  }

  // Bepul davr — to'lovsiz yozilish: tanlangan vaqtda uchrashuv ochiladi, chat boshlanadi.
  async function handleBookFree(slots: string[]) {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (!profile) return;
    setBookingLoading(true);
    setBookingError('');
    try {
      await bookFreeLessons(token, profile.user_id, slots);
      setSlotOpen(false);
      setSelectedSlot(null);
      await loadMyTrial();
      try {
        const rows = await getTeacherConversations(token);
        const c = rows.find((x) => x.teacher_user_id === profile.user_id);
        setChatConvoId(c ? c.id : null);
      } catch {
        /* chat keyin ochiladi */
      }
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : "Yozilishda xatolik yuz berdi");
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-app-bg-subtle">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-primary-deep border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-full bg-app-bg-subtle px-4 py-8">
        <button
          type="button"
          onClick={() => navigate('/teachers')}
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </button>
        <p className="rounded-2xl border border-app-danger/30 bg-app-danger-bg px-4 py-6 text-center text-sm font-semibold text-app-danger">
          {error || t('teachers.notFound')}
        </p>
      </div>
    );
  }

  const name = teacherDisplayName(profile);
  const locationLabel = [profile.city, profile.region].filter(Boolean).join(', ') || t('teachers.notSpecified');
  const monthlyPrice = formatTeacherPrice(profile.monthly_course_price_amount, profile.monthly_course_price_currency);
  const ratingCount = Number(profile.rating_count ?? 0);
  const ratingAvg = Number(profile.rating_avg ?? 0);

  return (
    <div className="min-h-full bg-app-bg-subtle pb-8">
      <main className="mx-auto w-full max-w-[820px]">
        <header className="px-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/teachers')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text transition hover:bg-app-row-hover"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-6 w-6" aria-hidden />
          </button>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
          className="mt-4 flex flex-col gap-5 px-4 sm:flex-row sm:items-start"
        >
          <div className="mx-auto w-[140px] shrink-0 overflow-hidden rounded-[20px] bg-app-surface shadow-app-soft ring-1 ring-app-border sm:mx-0">
            <div className="aspect-square">
              <ProfileAvatar profile={profile} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            {profile.is_recommended ? (
              <div className="mb-2">
                <RecommendedBadge />
              </div>
            ) : null}
            <h1 className="text-[26px] font-black leading-tight text-app-text sm:text-[30px]">{name}</h1>
            <div className="mt-2 flex items-center gap-2">
              {ratingCount > 0 ? (
                <>
                  <Stars rating={ratingAvg} size={18} />
                  <span className="text-sm font-black text-app-text">{ratingAvg.toFixed(1)}</span>
                  <span className="text-sm font-semibold text-app-text-secondary">
                    ({t('teachers.reviewsCount', { count: ratingCount })})
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-app-accent-bg px-2.5 py-0.5 text-xs font-black text-app-accent-text">
                  {t('teachers.ratingNew')}
                </span>
              )}
            </div>
            {profile.headline ? (
              <p className="mt-2 text-base font-semibold text-app-text-muted">{profile.headline}</p>
            ) : null}
            <div className="mt-4 space-y-2.5 text-[15px] font-bold text-app-text">
              <p className="flex items-center gap-3">
                <Users className="h-5 w-5 shrink-0 text-app-primary-deep" aria-hidden />
                {t('teachers.experience')} {formatTeacherExperience(profile.experience_years, profile.experience_months)}
              </p>
              <p className="flex items-center gap-3">
                <Clock className="h-5 w-5 shrink-0 text-app-primary-deep" aria-hidden />
                {t('teachers.age')}: {profile.age}
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-app-primary-deep" aria-hidden />
                {t('teachers.region')}: {locationLabel}
              </p>
              <p className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 shrink-0 text-app-primary-deep" aria-hidden />
                {t('teachers.lessonFormat')}: {formatTeachingFormat(profile.teaching_format)}
              </p>
              <p className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 shrink-0 text-app-primary-deep" aria-hidden />
                {t('teachers.price')} {monthlyPrice}
              </p>
            </div>
          </div>
        </motion.section>

        <div className="px-4">
          {awaitingPaymentConfirmation ? (
            <section className="mt-6 rounded-[20px] border-2 border-app-warning/40 bg-app-warning-bg p-5">
              <h2 className="text-lg font-extrabold text-app-warning">{t('teachers.trialPending')}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-app-text">
                {t('teachers.trialPendingBody')}
              </p>
              <Link to="/payment-history" className="mt-4 inline-flex text-sm font-bold text-app-primary-deep hover:underline">
                {t('payment.historyTitle')}
              </Link>
            </section>
          ) : trialBooked ? (
            <section className="mt-6 rounded-[20px] border-2 border-app-success/40 bg-app-success-bg p-5 text-center">
              <h2 className="text-lg font-extrabold text-app-success">Siz darsga yozildingiz!</h2>
              {bookedTime ? (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-app-surface px-4 py-1.5 text-sm font-bold text-app-text shadow-app-soft">
                  <Clock className="h-4 w-4 text-app-primary-deep" aria-hidden />
                  {bookedTime}
                </p>
              ) : null}
              <p className="mt-3 text-sm font-medium leading-relaxed text-app-text">
                Darsingiz profilingizdagi «O‘qituvchi bilan uchrashuv» bo‘limida ko‘rinadi. Ustoz bilan yozishuvni quyidagi tugma orqali oching.
              </p>
            </section>
          ) : inFreePeriod && !slotOpen ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  if (!token) {
                    navigate('/login', { state: { from: location.pathname } });
                    return;
                  }
                  setBookingError('');
                  setSelectedSlot(null);
                  if (meetingDays.length > 0) setSlotOpen(true);
                  else void handleBookFree([]);
                }}
                disabled={bookingLoading}
                className="flex h-14 w-full items-center justify-center rounded-full bg-app-success text-lg font-extrabold text-white transition active:scale-[0.99] disabled:opacity-60"
              >
                {bookingLoading ? t('common.loading') : 'Sinov darsiga yozilish'}
              </button>
              {/* Vaqt tanlash oynasi ochilmasdan yozilganda ham (masalan, ustozda
                  jadval yo'q) xato ko'rinishi shart — aks holda 3 ta ustoz
                  cheklovi jimgina ishlab, tugma "hech narsa qilmayotgandek"
                  tuyulardi. */}
              {bookingError ? (
                <p className="mt-3 rounded-2xl bg-app-danger-bg px-3 py-2 text-center text-sm font-semibold text-app-danger">
                  {bookingError}
                </p>
              ) : null}
            </div>
          ) : inFreePeriod && slotOpen ? (
            <section className="mt-6 rounded-[20px] border-2 border-app-success/40 bg-app-success-bg p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-app-success px-3 py-1 text-xs font-extrabold text-white">
                Bepul dars
              </span>
              <h2 className="mt-3 text-lg font-extrabold text-app-text">Dars vaqtini tanlang</h2>
              <p className="mt-1 text-sm font-medium text-app-text-muted">
                Sizga qulay kun va soatni belgilang.
              </p>

              <div className="mt-4 space-y-3">
                {meetingDays.map((day) => (
                  <div key={day.dateLabel}>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-app-text-secondary">
                      {day.dateLabel}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {day.times.map((tm) => {
                        const picked = selectedSlot === tm.iso;
                        return (
                          <button
                            key={tm.iso}
                            type="button"
                            onClick={() => setSelectedSlot(picked ? null : tm.iso)}
                            disabled={bookingLoading}
                            className={`flex min-w-[64px] items-center justify-center rounded-xl border-2 px-3 py-2 text-sm font-bold transition active:scale-[0.97] disabled:opacity-40 ${
                              picked
                                ? 'border-app-success bg-app-success text-white'
                                : 'border-app-success/40 bg-app-surface text-app-text hover:border-app-success hover:bg-app-success/10'
                            }`}
                          >
                            {tm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {bookingError ? (
                <p className="mt-3 rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">
                  {bookingError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleBookFree(selectedSlot ? [selectedSlot] : [])}
                disabled={bookingLoading || !selectedSlot}
                className="mt-4 flex h-13 w-full items-center justify-center rounded-full bg-app-success py-3.5 text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {bookingLoading ? t('common.loading') : 'Darsga yozilish'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSlotOpen(false);
                  setSelectedSlot(null);
                }}
                disabled={bookingLoading}
                className="mt-3 w-full text-center text-sm font-bold text-app-text-muted hover:underline disabled:opacity-50"
              >
                Bekor qilish
              </button>
            </section>
          ) : !bookingOpen ? (
            <button
              type="button"
              onClick={handleStartBooking}
              className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-app-primary-deep text-lg font-extrabold text-white transition active:scale-[0.99]"
            >
              {t('teachers.trialBook')} — {trialPriceRub} ₽
            </button>
          ) : (
            <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface p-4 shadow-app-soft">
              <h2 className="text-lg font-extrabold text-app-text">
                {t('teachers.trialBook')} — {trialPriceRub} ₽
              </h2>
              <p className="mt-2 text-sm font-medium text-app-text-muted">{t('teachers.trialMessageHint')}</p>
              <textarea
                value={studentMessage}
                onChange={(e) => setStudentMessage(e.target.value)}
                rows={3}
                placeholder={t('teachers.trialMessagePlaceholder')}
                className="mt-3 w-full rounded-2xl border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text outline-none transition placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15"
              />
              {bookingError ? (
                <p className="mt-3 rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">
                  {bookingError}
                </p>
              ) : null}
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => void handlePayRahmat()}
                  disabled={bookingLoading}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-app-primary-deep text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-60"
                >
                  {bookingLoading ? t('common.loading') : t('teachers.trialPayUzs')}
                </button>
                <p className="text-center text-xs font-medium text-app-text-secondary">
                  {trialPriceUzs.toLocaleString('uz-UZ')} so'm · Rahmat orqali (Click, Payme, Uzum va boshqalar)
                </p>
                <button
                  type="button"
                  onClick={() => void handlePayRub()}
                  disabled={bookingLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-app-primary bg-app-surface text-base font-bold text-app-primary-deep transition active:scale-[0.98] disabled:opacity-60"
                >
                  <CreditCard className="h-5 w-5" />
                  {t('teachers.trialPayRub')} — {trialPriceRub} ₽
                </button>
                <p className="text-center text-xs font-medium text-app-text-secondary">{t('teachers.trialRubHint')}</p>
              </div>
            </section>
          )}
        </div>

        {chatConvoId != null && user ? (
          <div className="mt-4 px-4">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-app-primary bg-app-surface px-5 py-3 text-base font-bold text-app-primary-deep transition active:scale-[0.98]"
            >
              <MessageSquare className="h-5 w-5" />
              Ustoz bilan yozishuv
            </button>
          </div>
        ) : null}

        {!isDemo && token && myTrial?.trial && String(myTrial.trial.status).includes('completed') && !reviewDone ? (
          <div className="mt-6 px-4">
            <TeacherReviewForm
              token={token}
              trialId={myTrial.trial.id}
              onSubmitted={async () => {
                setReviewDone(true);
                try {
                  const d = await getTeacherPublicDetail(Number(teacherId));
                  setProfile(d.profile);
                  setReviews(d.reviews);
                } catch {
                  /* refresh ixtiyoriy */
                }
              }}
            />
          </div>
        ) : null}

        {profile.video_url ? (
          <section className="mt-6 px-4">
            <h2 className="mb-3 text-2xl font-black text-app-text">
              {t('teachers.videoTitle')}
            </h2>
            {/* Videoni admin tekshirib tasdiqlagan bo'lsagina shu yerga tushadi. */}
            <video
              src={profile.video_url}
              controls
              playsInline
              preload="metadata"
              className="max-h-[420px] w-full rounded-[20px] bg-black"
            />
          </section>
        ) : null}

        <div className="mt-6 space-y-4 px-4">
          <TeacherResults profile={profile} />
          <TeacherSchedule slots={profile.weekly_availability ?? []} />
          <TeacherEducationSection items={profile.education ?? []} />
          <TeacherCertificatesSection items={profile.certificates ?? []} />
          <TeacherAchievementsSection text={profile.achievements ?? ''} />
        </div>

        {reviews.length > 0 ? (
          <section className="mt-8 px-4">
            <h2 className="text-2xl font-black text-app-text">{t('teachers.reviews')}</h2>
            <div className="-mx-1 mt-4 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        ) : null}

        {profile.about ? (
          <article className="mx-4 mt-6 rounded-[18px] bg-app-surface px-5 py-5 shadow-app-soft ring-1 ring-app-border">
            <h2 className="text-2xl font-black text-app-text">{t('teachers.about')}</h2>
            <p className="mt-4 whitespace-pre-wrap text-base font-medium leading-relaxed text-app-text-muted">
              {profile.about}
            </p>
          </article>
        ) : null}
      </main>

      {chatOpen && chatConvoId != null && token && user ? (
        <TeacherChatModal
          token={token}
          conversationId={chatConvoId}
          currentUserId={user.id}
          title={`${name} bilan suhbat`}
          onClose={() => setChatOpen(false)}
        />
      ) : null}
    </div>
  );
}
