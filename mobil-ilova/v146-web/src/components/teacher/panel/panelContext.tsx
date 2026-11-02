import { createContext, useContext } from 'react';
import type { PanelDict, PanelLang } from './lang';
import type { PanelNotification, PanelSummary } from '../../../api/teacherPanel';
import type { TeacherCabinet } from '../../../api/teachers';

/** Panel bo'limlari. `student` va `report` — ichki (id bilan ochiladi). */
export type SectionKey =
  | 'dashboard'
  | 'schedule'
  | 'students'
  | 'student'
  | 'lessons'
  | 'report'
  | 'class'
  | 'income'
  | 'subscription'
  | 'messages'
  | 'reviews'
  | 'profile'
  | 'public'
  | 'anketa'
  | 'documents'
  | 'settings'
  | 'help';

export type PanelCtxValue = {
  token: string;
  lang: PanelLang;
  setLang: (lang: PanelLang) => void;
  t: PanelDict;
  /** Bo'limga o'tish. `id` — o'quvchi yoki dars raqami. */
  go: (section: SectionKey, id?: number) => void;
  toast: (text: string) => void;
  /** Bosh sahifa raqamlari (shell yuklaydi). */
  summary: PanelSummary | null;
  cabinet: TeacherCabinet | null;
  notifications: PanelNotification[];
  unread: number;
  /** Umumiy ma'lumotni qayta yuklash (jadval yoki hisobot o'zgargach). */
  refresh: () => void;
};

const PanelContext = createContext<PanelCtxValue | null>(null);

export const PanelProvider = PanelContext.Provider;

export function usePanel(): PanelCtxValue {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('usePanel: PanelProvider ichida chaqirilsin');
  return ctx;
}
