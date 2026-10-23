/**
 * Ustozlar katalogining kichik bo'laklari: surat, yulduzlar, daraja va sertifikat
 * belgisi, sana-vaqt yozuvlari. Kartochka ham, profil sahifasi ham shularni ishlatadi.
 */
import { useState } from 'react';
import { Award, BadgeCheck, Briefcase, Crown, Gem, Sparkles, Star, TrendingUp } from 'lucide-react';
import { resolveAssetUrl } from '../../../api';
import { TEACHER_LEVELS, type TeacherLevelKey } from '../../../../shared/teacherLessons';
import { LANGUAGES, LANGUAGE_LEVELS, SPECIALIZATIONS, type LanguageRow } from '../../../../shared/teacherOnboarding';

export const WD_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
export const WD_LONG = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
export const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

export const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
/** Qurilma vaqti bo'yicha kun kaliti (YYYY-MM-DD). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** «Bugun, 15:00» / «Ertaga, 09:00» / «Du, 27-oktabr, 18:00». */
export function slotLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const day = dayKey(d) === dayKey(now) ? 'Bugun' : dayKey(d) === dayKey(tomorrow) ? 'Ertaga' : `${WD_SHORT[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`;
  return `${day}, ${hm(d)}`;
}

export const fullDate = (iso: string) => {
  const d = new Date(iso);
  return `${WD_LONG[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`;
};

export const specLabel = (code: string) => SPECIALIZATIONS.find((s) => s.code === code)?.uz ?? code;
export const langLabel = (row: LanguageRow) => {
  const name = LANGUAGES.find((l) => l.code === row.code)?.uz ?? row.code;
  const level = LANGUAGE_LEVELS.find((l) => l.code === row.level)?.uz.split(' — ')[0] ?? row.level;
  return `${name} — ${level}`;
};

export function experienceText(years: number | null): string | null {
  if (years == null) return null;
  return years < 1 ? '1 yildan kam tajriba' : `${years} yil tajriba`;
}

export function TeacherPhoto({ url, name, className = '' }: { url: string | null; name: string; className?: string }) {
  const src = resolveAssetUrl(url);
  const [failed, setFailed] = useState<string | null>(null);
  const initials = name.split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase();
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-app-bg-subtle ${className}`}>
      {src && failed !== src ? (
        <img src={src} alt={name} onError={() => setFailed(src)} className="h-full w-full object-cover" decoding="async" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xl font-black text-white" style={{ background: 'var(--app-brand-gradient)' }}>{initials}</span>
      )}
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }}
          className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} aria-hidden />
      ))}
    </span>
  );
}

/** Yulduzlar va o'rtacha baho, ostida sharhlar soni. Sharh bo'lmasa — «Hali sharh yoʻq». */
export function RatingLine({ avg, count }: { avg: number | null; count: number }) {
  if (!count || avg == null) return <p className="text-[12.5px] font-semibold text-app-text-muted">Hali sharh yoʻq</p>;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[14px] font-black tabular-nums text-app-text"><Stars value={avg} />{avg.toFixed(1).replace('.', ',')}</p>
      <p className="text-[12.5px] font-semibold text-app-text-muted">{count} ta sharh</p>
    </div>
  );
}

const LEVEL_STYLE: Record<TeacherLevelKey, { cls: string; Icon: typeof Award }> = {
  new: { cls: 'bg-slate-100 text-slate-700', Icon: Sparkles },
  tutor: { cls: 'bg-sky-50 text-sky-800', Icon: Briefcase },
  experienced: { cls: 'bg-violet-50 text-violet-800', Icon: TrendingUp },
  pro: { cls: 'bg-amber-50 text-amber-800', Icon: Award },
  super: { cls: 'bg-gradient-to-r from-amber-400 to-rose-500 text-white', Icon: Crown },
};

export function LevelBadge({ level }: { level: TeacherLevelKey }) {
  const meta = TEACHER_LEVELS.find((l) => l.key === level) ?? TEACHER_LEVELS[0];
  const { cls, Icon } = LEVEL_STYLE[meta.key];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${cls}`}><Icon className="h-3 w-3" />{meta.uz}</span>;
}

/** Ikki yo'l: sertifikati tekshirilgan ustoz yoki tajriba asosida qabul qilingan. */
export function PathBadge({ certified }: { certified: boolean }) {
  return certified
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-800"><BadgeCheck className="h-3 w-3" />Sertifikatli</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-700"><Gem className="h-3 w-3" />Tajriba asosida</span>;
}
