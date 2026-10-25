import { ChevronLeft, ChevronRight, FileAudio, FileText, FileVideo, Image as ImageIcon } from 'lucide-react';
import type { MaterialKind } from '../../../shared/teacherMaterials';
import { formatBytes, type TeacherMaterial } from '../../api/teacherMaterials';

/** Material kartochkasi, doska va tanlash ro'yxati uchun umumiy bezaklar. */

/** Fayl turi — kartochka rangi va belgisi. */
export const KIND_STYLE: Record<MaterialKind, { icon: typeof FileText; bg: string; fg: string }> = {
  pdf: { icon: FileText, bg: 'bg-gradient-to-br from-[#FEE2E2] to-[#FECACA]', fg: 'text-[#B91C1C]' },
  image: { icon: ImageIcon, bg: 'bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE]', fg: 'text-[#1D4ED8]' },
  audio: { icon: FileAudio, bg: 'bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]', fg: 'text-[#B45309]' },
  video: { icon: FileVideo, bg: 'bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE]', fg: 'text-[#6D28D9]' },
};


export function PageNav({ page, pages, setPage, label, dark = false }: {
  page: number; pages: number; setPage: (p: number) => void; label: string; dark?: boolean;
}) {
  const btn = `flex h-11 w-11 items-center justify-center rounded-[12px] transition active:scale-95 disabled:opacity-35 ${
    dark ? 'bg-white/10 text-white hover:bg-white/20' : 'border border-app-border bg-app-surface text-app-text hover:bg-[var(--app-row-hover)]'
  }`;
  return (
    <div className="flex items-center justify-center gap-3">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="‹">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className={`min-w-[72px] text-center text-[14px] font-extrabold tabular-nums ${dark ? 'text-white' : 'text-app-text'}`}>{label}</span>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="›">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

const KIND_SHORT: Record<MaterialKind, string> = { pdf: 'PDF', image: 'Rasm', audio: 'Audio', video: 'Video' };

/** «PPTX · 12 bet · 2.4 MB» — kartochka va ro'yxat ostidagi qisqa ma'lumot. */
export function materialMeta(m: Pick<TeacherMaterial, 'kind' | 'source_kind' | 'page_count' | 'size_bytes'>): string {
  const kind = m.source_kind ? m.source_kind.toUpperCase() : KIND_SHORT[m.kind];
  const pages = m.kind === 'pdf' && m.page_count ? `${m.page_count} bet` : null;
  return [kind, pages, formatBytes(m.size_bytes)].filter(Boolean).join(' · ');
}
