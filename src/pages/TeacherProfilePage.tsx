import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, CreditCard, MapPin, Users } from 'lucide-react';
import { resolveAssetUrl } from '../api';
import {
  createTeacherTrialLesson,
  getMyTeacherTrialLesson,
  getTeacherPublicDetail,
  type MyTeacherTrialLessonResponse,
  type TeacherProfile,
  type TeacherStudentReview,
} from '../api/teachers';
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

function ProfileAvatar({ profile }: { profile: TeacherProfile }) {
  const url = resolveAssetUrl(profile.avatar_url);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover object-[center_35%]"
        decoding="async"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-black text-white">
      {teacherInitials(profile)}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return <span className="text-[22px] leading-none text-[#F8B719]">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

function ReviewCard({ review }: { review: TeacherStudentReview }) {
  const text = review.opinion?.trim() || review.what_liked?.trim() || "Fikr qoldirilgan";
  return (
    <article className="w-[min(88vw,380px)] shrink-0 rounded-[14px] bg-white px-5 py-4 shadow-[0_6px_10px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold text-[#0F172A]">O'quvchi</h3>
        <Stars rating={Number(review.rating)} />
      </div>
      <p className="mt-3 text-sm font-medium leading-relaxed text-[#4B4B4B]">{text}</p>
    </article>
  );
}

export default function TeacherProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { teacherId } = useParams();
  const { token } = useAuth();
  const { payments, refreshPayments } = usePaymentStatus();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [myTrial, setMyTrial] = useState<MyTeacherTrialLessonResponse | null>(null);
  const [reviews, setReviews] = useState<TeacherStudentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [studentMessage, setStudentMessage] = useState('');
  const [trialId, setTrialId] = useState<number | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const trialPriceRub = getTeacherTrialPriceRub();
  const trialPriceUzs = getTeacherTrialPriceUzs();
  const pendingTrialPayment = payments.find(
    (payment) => payment.product_code === TEACHER_TRIAL_PRODUCT_CODE && payment.status === 'pending',
  );
  const awaitingPaymentConfirmation =
    myTrial?.trial?.status === 'pending_payment' &&
    (pendingTrialPayment != null || myTrial.payment?.status === 'pending');

  async function loadMyTrial() {
    if (!token || !teacherId) return;
    try {
      const data = await getMyTeacherTrialLesson(token, Number(teacherId));
      setMyTrial(data);
      if (data.trial?.id) setTrialId(data.trial.id);
    } catch {
      setMyTrial(null);
    }
  }

  useEffect(() => {
    const id = Number(teacherId);
    if (!Number.isFinite(id)) {
      setError("O'qituvchi topilmadi");
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
          ? "To'lovingiz allaqachon kutilmoqda."
          : err.message || "Rahmat to'lovi boshlanmadi",
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
      setBookingError(e instanceof Error ? e.message : "To'lovga o'tib bo'lmadi");
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#EEF4FA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#24459A] border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-full bg-[#EEF4FA] px-4 py-8">
        <button
          type="button"
          onClick={() => navigate('/teachers')}
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#C8DCF3] bg-white text-[#0F172A]"
          aria-label="Ortga"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </button>
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
          {error || "O'qituvchi topilmadi"}
        </p>
      </div>
    );
  }

  const name = teacherDisplayName(profile);
  const locationLabel = [profile.city, profile.region].filter(Boolean).join(', ') || "Ko'rsatilmagan";
  const monthlyPrice = formatTeacherPrice(
    profile.monthly_course_price_amount,
    profile.monthly_course_price_currency,
  );

  return (
    <div className="min-h-full bg-[#EEF4FA] pb-8">
      <main className="mx-auto w-full max-w-[820px]">
        <header className="px-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/teachers')}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#C8DCF3] bg-white text-[#0F172A]"
            aria-label="Ortga"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden />
          </button>
        </header>

        <section className="mt-4 flex flex-col gap-5 px-4 sm:flex-row sm:items-start">
          <div className="mx-auto w-[140px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_6px_10px_rgba(15,23,42,0.12)] sm:mx-0">
            <div className="aspect-square">
              <ProfileAvatar profile={profile} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] font-black leading-tight text-[#0F172A] sm:text-[30px]">{name}</h1>
            {profile.headline ? (
              <p className="mt-2 text-base font-semibold text-[#64748B]">{profile.headline}</p>
            ) : null}
            <div className="mt-4 space-y-2.5 text-[15px] font-bold text-[#4B4B4B]">
              <p className="flex items-center gap-3">
                <Users className="h-5 w-5 shrink-0 text-[#24459A]" aria-hidden />
                Tajriba: {formatTeacherExperience(profile.experience_years, profile.experience_months)}
              </p>
              <p className="flex items-center gap-3">
                <Clock className="h-5 w-5 shrink-0 text-[#24459A]" aria-hidden />
                Yosh: {profile.age}
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-[#24459A]" aria-hidden />
                Hudud: {locationLabel}
              </p>
              <p className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 shrink-0 text-[#24459A]" aria-hidden />
                Dars formati: {formatTeachingFormat(profile.teaching_format)}
              </p>
              <p className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 shrink-0 text-[#24459A]" aria-hidden />
                Oylik kurs: {monthlyPrice}
              </p>
            </div>
          </div>
        </section>

        <div className="px-4">
          {awaitingPaymentConfirmation ? (
            <section className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-lg font-extrabold text-amber-950">To'lovingiz tekshirilmoqda</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-amber-900/90">
                Administrator to'lovni tasdiqlagach o'qituvchi bilan chat ochiladi va dars vaqtini kelishasiz.
                Bu xabar to'lov tasdiqlanguncha shu yerda qoladi.
              </p>
              <Link
                to="/payment-history"
                className="mt-4 inline-flex text-sm font-bold text-[#24459A] hover:underline"
              >
                To'lovlar tarixi
              </Link>
            </section>
          ) : !bookingOpen ? (
            <button
              type="button"
              onClick={handleStartBooking}
              className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-[#24459A] text-lg font-extrabold text-white active:scale-[0.99]"
            >
              Sinov darsiga yozilish — {trialPriceRub} ₽
            </button>
          ) : (
            <section className="mt-6 rounded-2xl border border-[#C8DCF3] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-extrabold text-[#0F172A]">
                Sinov darsiga yozilish — {trialPriceRub} ₽
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Qisqa xabar qoldiring (ixtiyoriy). To'lovdan keyin o'qituvchi bilan chat ochiladi va vaqtni kelishasiz.
              </p>
              <textarea
                value={studentMessage}
                onChange={(e) => setStudentMessage(e.target.value)}
                rows={3}
                placeholder="Masalan: Kechki vaqtda dars olishni xohlayman..."
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
              {bookingError ? (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{bookingError}</p>
              ) : null}
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => void handlePayRahmat()}
                  disabled={bookingLoading}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-[#24459A] text-base font-extrabold text-white disabled:opacity-60"
                >
                  {bookingLoading ? 'Yuklanmoqda...' : "To'lash — Click / Payme / boshqa"}
                </button>
                <p className="text-center text-xs font-medium text-slate-500">
                  {trialPriceUzs.toLocaleString('uz-UZ')} so'm · Rahmat orqali (Click, Payme, Uzum va boshqalar)
                </p>
                <button
                  type="button"
                  onClick={() => void handlePayRub()}
                  disabled={bookingLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#24459A] bg-white text-base font-bold text-[#24459A] disabled:opacity-60"
                >
                  <CreditCard className="h-5 w-5" />
                  Rublda to'lash — {trialPriceRub} ₽
                </button>
                <p className="text-center text-xs font-medium text-slate-500">
                  Rossiya kartasiga o'tkazish va chek yuklash
                </p>
              </div>
            </section>
          )}
        </div>

        {reviews.length > 0 ? (
          <section className="mt-8 px-4">
            <h2 className="text-2xl font-black text-[#0F172A]">O'quvchilar fikri</h2>
            <div className="-mx-1 mt-4 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        ) : null}

        {profile.about ? (
          <article className="mx-4 mt-6 rounded-[14px] bg-white px-5 py-5 shadow-[0_6px_10px_rgba(15,23,42,0.12)]">
            <h2 className="text-2xl font-black text-[#0F172A]">Men haqimda</h2>
            <p className="mt-4 whitespace-pre-wrap text-base font-medium leading-relaxed text-[#4B4B4B]">
              {profile.about}
            </p>
          </article>
        ) : null}
      </main>
    </div>
  );
}
