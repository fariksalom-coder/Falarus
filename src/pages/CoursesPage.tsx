import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { courseAssetUrl } from '../utils/courseAssetUrl';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const COURSES = [
  {
    id: 'patent',
    href: '/kurslar/patent',
    title: 'Экзамен на патент',
    subtitle: 'Подготовительный курс к экзамену на патент',
    accent: 'linear-gradient(135deg, #EEF2FF 0%, #E0EAFF 100%)',
    imageSrc: '/courses/course-patent-badge.svg',
  },
  {
    id: 'vnzh',
    href: '/kurslar/vnzh',
    title: 'Экзамен на ВНЖ',
    subtitle: 'Подготовительный курс к экзамену на ВНЖ',
    accent: 'linear-gradient(135deg, #E8F3FF 0%, #DCEEFF 100%)',
    imageSrc: '/courses/course-vnzh-badge.svg',
  },
] as const;

export default function CoursesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <h1 className="mb-5 text-[24px] font-bold sm:text-[28px]" style={{ color: TEXT }}>
          Kurslar
        </h1>

        <div className="space-y-4">
          {COURSES.map(({ id, href, title, subtitle, accent, imageSrc }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(href)}
              className="w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left shadow-[0_14px_34px_rgba(148,163,184,0.12)] sm:px-5 sm:py-5"
              style={{
                borderColor: BORDER,
                background: accent,
              }}
            >
              <div className="flex items-center gap-4">
                <img
                  src={courseAssetUrl(imageSrc)}
                  alt={title}
                  className="h-16 w-16 shrink-0 rounded-full object-contain shadow-[0_12px_24px_rgba(37,99,235,0.18)] sm:h-[72px] sm:w-[72px]"
                />

                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold leading-tight sm:text-[22px]" style={{ color: TEXT }}>
                    {title}
                  </h2>
                  <p className="mt-1 text-sm sm:text-[15px]" style={{ color: TEXT_SECONDARY }}>
                    {subtitle}
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/85 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
