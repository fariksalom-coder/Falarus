import { ArrowLeft, ArrowRight, GraduationCap, BookMarked, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const SECTIONS = [
  {
    id: 'grammar',
    href: '/russian/grammar',
    title: 'Grammatika',
    subtitle: 'Darslar 1 dan 24 gacha',
    accent: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    Icon: GraduationCap,
    iconColor: '#2563EB',
    iconBg: '#DBEAFE',
  },
  {
    id: 'vocabulary',
    href: '/vocabulary',
    title: "Lug'at",
    subtitle: "So'z boyligini oshirish",
    accent: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    Icon: BookMarked,
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
  },
  {
    id: 'speaking',
    href: '/russian/speaking',
    title: 'Gapir',
    subtitle: 'Rus tilida gapirish mashqi',
    accent: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
    Icon: Mic,
    iconColor: '#0D9488',
    iconBg: '#CCFBF1',
  },
] as const;

export default function RussianCoursePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <h1 className="mb-5 text-[24px] font-bold sm:text-[28px]" style={{ color: TEXT }}>
          Rus tili
        </h1>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {SECTIONS.map(({ id, href, title, subtitle, accent, Icon, iconColor, iconBg }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(href)}
              className="w-full overflow-hidden rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: BORDER,
                background: accent,
              }}
            >
              <div className="flex h-full flex-col items-start">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: iconBg }}
                >
                  <Icon className="h-5 w-5" style={{ color: iconColor }} />
                </div>

                <h2 className="mt-2 text-base font-bold leading-tight" style={{ color: TEXT }}>
                  {title}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs" style={{ color: TEXT_SECONDARY }}>
                  {subtitle}
                </p>

                <div className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/85 text-slate-500">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
