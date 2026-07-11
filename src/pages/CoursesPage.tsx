import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { courseAssetUrl } from '../utils/courseAssetUrl';
import { prefetchRoutePath } from '../routeModules';

const BG = 'var(--app-bg)';
const BORDER = 'var(--app-border)';
const TEXT = 'var(--app-text)';
const TEXT_SECONDARY = 'var(--app-text-muted)';

const COURSES = [
  {
    id: 'patent',
    href: '/kurslar/patent',
    titleKey: 'courses.patentTitle',
    subtitleKey: 'courses.patentSubtitle',
    accent: 'linear-gradient(135deg, #EEF2FF 0%, #E0EAFF 100%)',
    imageSrc: '/courses/course-patent-badge.svg',
  },
  {
    id: 'vnzh',
    href: '/kurslar/vnzh',
    titleKey: 'courses.vnzhTitle',
    subtitleKey: 'courses.vnzhSubtitle',
    accent: 'linear-gradient(135deg, #E8F3FF 0%, #DCEEFF 100%)',
    imageSrc: '/courses/course-vnzh-badge.svg',
  },
] as const;

export default function CoursesPage() {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <h1 className="mb-5 text-[24px] font-bold sm:text-[28px]" style={{ color: TEXT }}>
          {t('courses.title')}
        </h1>

        <div className="space-y-4">
          {COURSES.map(({ id, href, titleKey, subtitleKey, accent, imageSrc }) => {
            const title = t(titleKey);
            const subtitle = t(subtitleKey);
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(href)}
                onMouseEnter={() => prefetchRoutePath(href)}
                onTouchStart={() => prefetchRoutePath(href)}
                onFocus={() => prefetchRoutePath(href)}
                className="w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left shadow-app-card sm:px-5 sm:py-5 dark:!bg-app-surface"
                style={{
                  borderColor: BORDER,
                  background: accent,
                }}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={courseAssetUrl(imageSrc)}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-16 shrink-0 rounded-full object-contain shadow-[0_12px_24px_rgba(11,42,107,0.18)] sm:h-[72px] sm:w-[72px]"
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
            );
          })}
        </div>

        <nav
          className="mt-10 rounded-[24px] border px-4 py-4 text-center shadow-[0_14px_34px_rgba(148,163,184,0.08)] sm:px-6"
          style={{ borderColor: BORDER, backgroundColor: '#fff' }}
          aria-label="Rus tili yo‘nalishlari"
        >
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            <Link className="font-semibold text-[#0B2A6B] underline-offset-2 hover:underline" to="/russian">
              Rus tili kursi
            </Link>
            {' · '}
            <Link className="font-semibold text-[#0B2A6B] underline-offset-2 hover:underline" to="/kurslar/patent">
              rus tili patent uchun
            </Link>
            {' · '}
            <Link className="font-semibold text-[#0B2A6B] underline-offset-2 hover:underline" to="/kurslar/vnzh">
              ВНЖ uchun rus tili
            </Link>
            {' · '}
            <Link className="font-semibold text-[#0B2A6B] underline-offset-2 hover:underline" to="/tariflar">
              Tariflar
            </Link>
          </p>
        </nav>
      </main>
    </div>
  );
}
