import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  BadgeCheck,
  BookOpenText,
  Mic,
  Users,
  UserRound,
  CreditCard,
  Monitor,
} from 'lucide-react';

export type PlatformTutorialVideo = {
  id: string;
  titleUz: string;
  Icon: LucideIcon;
  youtubeId: string | null;
};

function parseYoutubeIdsFromEnv(): (string | null)[] {
  const raw = import.meta.env.VITE_PLATFORM_TUTORIAL_YOUTUBE_IDS;
  if (!raw || typeof raw !== 'string') {
    return Array.from({ length: 11 }, () => null);
  }
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return Array.from({ length: 11 }, (_, i) => parts[i] ?? null);
}

const YT_IDS = parseYoutubeIdsFromEnv();

const TUTORIAL_DEFS: readonly Omit<PlatformTutorialVideo, 'youtubeId'>[] = [
  {
    id: 'falarus-haqida',
    titleUz: 'FalaRus haqida',
    Icon: LayoutDashboard,
  },
  {
    id: 'rus-tili-kursi',
    titleUz: 'Rus tili kursi',
    Icon: GraduationCap,
  },
  {
    id: 'patent',
    titleUz: 'Patent',
    Icon: FileText,
  },
  {
    id: 'vnzh',
    titleUz: 'ВНЖ',
    Icon: BadgeCheck,
  },
  {
    id: 'grammatika',
    titleUz: 'Grammatika',
    Icon: BookOpenText,
  },
  {
    id: 'soz-boyligi',
    titleUz: "So'z boyligi",
    Icon: BookOpenText,
  },
  {
    id: 'praktika',
    titleUz: 'Praktika',
    Icon: Mic,
  },
  {
    id: 'sherik',
    titleUz: 'Sherik',
    Icon: Users,
  },
  {
    id: 'profile',
    titleUz: 'Profil',
    Icon: UserRound,
  },
  {
    id: 'tolov-qilish-tartibi',
    titleUz: "To'lov qilish tartibi",
    Icon: CreditCard,
  },
  {
    id: 'ekranga-chiqarish-tartibi',
    titleUz: 'Ekranga chiqarish tartibi',
    Icon: Monitor,
  },
] as const;

export const PLATFORM_TUTORIAL_VIDEOS: PlatformTutorialVideo[] = TUTORIAL_DEFS.map((item, i) => ({
  ...item,
  youtubeId: YT_IDS[i] ?? null,
}));
