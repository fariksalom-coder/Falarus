import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseAssetUrl } from '../utils/courseAssetUrl';
import { prefetchRoutePath } from '../routeModules';

const BG = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';

const COURSES = [
  {
    id: 'russian',
    href: '/russian',
    title: 'Rus tili',
    subtitle: "Grammatika va lug'at",
    accent: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    borderColor: '#BFDBFE',
    imageSrc: null,
    iconGradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
    iconLabel: 'РУ',
  },
  {
    id: 'patent',
    href: '/kurslar/patent',
    title: 'Patent imtihoni',
    subtitle: 'Patent imtihoniga tayyorlov kursi',
    accent: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    borderColor: '#DDD6FE',
    imageSrc: '/courses/course-patent-badge.svg',
    iconGradient: null,
    iconLabel: null,
  },
  {
    id: 'vnzh',
    href: '/kurslar/vnzh',
    title: 'ВНЖ imtihoni',
    subtitle: 'ВНЖ imtihoniga tayyorlov kursi',
    accent: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    borderColor: '#A7F3D0',
    imageSrc: '/courses/course-vnzh-badge.svg',
    iconGradient: null,
    iconLabel: null,
  },
] as const;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Xayrli tun";
  if (h < 12) return "Xayrli tong";
  if (h < 17) return "Xayrli kun";
  return "Xayrli kech";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const greeting = getGreeting();
  const firstName = user?.firstName ?? null;

  return (
    <div className="min-h-screen pb-24 sm:pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-2xl px-4 pt-6 sm:px-5 sm:pt-8">
        {/* Brend: faqat mobil (pastki nav bo‘lganida) */}
        <div className="mb-6 flex items-center gap-3 sm:hidden">
          <img
            src="/icons/icon-192.png"
            width={44}
            height={44}
            alt=""
            className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-[0_6px_20px_rgba(37,99,235,0.2)] ring-1 ring-slate-200/90"
            decoding="async"
          />
          <span
            className="text-[22px] font-bold tracking-tight"
            style={{ color: TEXT, letterSpacing: '-0.02em' }}
          >
            Falarus
          </span>
        </div>

        {/* Header greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="mb-7"
        >
          <p className="text-sm font-medium" style={{ color: TEXT_SECONDARY }}>
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold tracking-tight sm:text-[30px]" style={{ color: TEXT }}>
            Kurslar
          </h1>
        </motion.div>

        {/* Course cards */}
        <div className="flex flex-col gap-4">
          {COURSES.map(({ id, href, title, subtitle, accent, borderColor, imageSrc, iconGradient, iconLabel }, i) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => navigate(href)}
              onMouseEnter={() => prefetchRoutePath(href)}
              onTouchStart={() => prefetchRoutePath(href)}
              onFocus={() => prefetchRoutePath(href)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.08 + i * 0.07, ease: [0.32, 0.72, 0, 1] }}
              whileHover={{ y: -2, scale: 1.008 }}
              whileTap={{ scale: 0.986 }}
              className="group w-full overflow-hidden rounded-[24px] border px-5 py-5 text-left"
              style={{
                background: accent,
                borderColor,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                {imageSrc ? (
                  <img
                    src={courseAssetUrl(imageSrc)}
                    alt={title}
                    className="h-[60px] w-[60px] shrink-0 rounded-2xl object-contain sm:h-[68px] sm:w-[68px]"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(37,99,235,0.15))' }}
                  />
                ) : (
                  <div
                    className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl sm:h-[68px] sm:w-[68px]"
                    style={{
                      background: iconGradient ?? '#2563EB',
                      boxShadow: '0 8px 20px rgba(37,99,235,0.28)',
                    }}
                  >
                    <span className="text-[22px] font-black tracking-tight text-white sm:text-[24px]">
                      {iconLabel}
                    </span>
                  </div>
                )}

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <h2
                    className="text-[17px] font-bold leading-snug sm:text-[19px]"
                    style={{ color: TEXT }}
                  >
                    {title}
                  </h2>
                  <p
                    className="mt-0.5 text-[13px] leading-snug sm:text-sm"
                    style={{ color: TEXT_SECONDARY }}
                  >
                    {subtitle}
                  </p>
                </div>

                {/* Arrow */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 transition-all duration-200 group-hover:bg-white group-hover:shadow-md"
                  style={{ color: '#64748B' }}
                >
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
