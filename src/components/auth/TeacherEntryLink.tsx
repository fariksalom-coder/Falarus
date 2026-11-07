import { ChevronRight, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEACHER_LOGIN_PATH } from '../../constants/teacherPaths';

/**
 * O'qituvchi uchun kirish yo'li (ilovada ham). Kabinet ilovaning ichida bor — o'qituvchi uni
 * topa olishi uchun kirish va ro'yxatdan o'tish ekranlarida ko'rinib turadi.
 *  - `pill` — birinchi (ko'k) ekranning tepasida, til tugmasi yonida;
 *  - `card` — ro'yxatdan o'tish formasining tepasida.
 */
export default function TeacherEntryLink({ variant }: { variant: 'pill' | 'card' }) {
  if (variant === 'pill') {
    return (
      <Link
        to={TEACHER_LOGIN_PATH}
        className="flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 text-[14px] font-semibold text-white transition active:scale-95"
      >
        <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" />
        Oʻqituvchilar uchun
      </Link>
    );
  }
  return (
    <Link
      to={TEACHER_LOGIN_PATH}
      className="mb-4 flex min-h-[56px] items-center gap-3 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-4 py-2.5 text-left transition active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white">
        <GraduationCap className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-extrabold text-[#134E4A]">Oʻqituvchimisiz?</span>
        <span className="block text-[13px] font-semibold text-[#0F766E]">Ustoz kabinetiga kirish yoki roʻyxatdan oʻtish</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#0F766E]" aria-hidden="true" />
    </Link>
  );
}
