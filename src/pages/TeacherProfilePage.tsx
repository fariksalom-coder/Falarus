import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, MapPin, Users } from 'lucide-react';
import { getTeacherPublicDetail, type TeacherProfile, type TeacherStudentReview } from '../api/teachers';
import {
  formatTeacherExperience,
  formatTeachingFormat,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';

function ProfileAvatar({ profile }: { profile: TeacherProfile }) {
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="h-full w-full object-cover object-[center_35%]"
        decoding="async"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-5xl font-black text-white">
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
  const { teacherId } = useParams();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [reviews, setReviews] = useState<TeacherStudentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const location = [profile.city, profile.region].filter(Boolean).join(', ') || "Ko'rsatilmagan";

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

        <section className="mt-6 grid grid-cols-1 gap-6 px-4 sm:grid-cols-[1fr_1.1fr] sm:items-start">
          <div className="overflow-hidden rounded-[15px] bg-white shadow-[0_6px_10px_rgba(15,23,42,0.15)]">
            <div className="aspect-[3/4] sm:aspect-auto sm:h-[296px]">
              <ProfileAvatar profile={profile} />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-[28px] font-black leading-tight text-[#0F172A] sm:text-[34px]">{name}</h1>
            {profile.headline ? (
              <p className="mt-2 text-base font-semibold text-[#64748B]">{profile.headline}</p>
            ) : null}
            <div className="mt-5 space-y-3 text-[16px] font-bold text-[#4B4B4B]">
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
                Hudud: {location}
              </p>
              <p className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 shrink-0 text-[#24459A]" aria-hidden />
                Dars formati: {formatTeachingFormat(profile.teaching_format)}
              </p>
            </div>
          </div>
        </section>

        <div className="px-4">
          <button
            type="button"
            disabled
            className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-[#24459A]/60 text-lg font-extrabold text-white"
          >
            Sinov darsiga yozilish (tez orada)
          </button>
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
