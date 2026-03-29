export type VnzhTask = {
  slug: string;
  title: string;
  shortLabel: string;
};

export type VnzhSection = {
  slug: string;
  title: string;
  icon: 'speaking' | 'listening' | 'reading' | 'writing' | 'lexis' | 'history' | 'law';
  accent: string;
  tasks: VnzhTask[];
};

export const VNZH_COURSE_SECTIONS: VnzhSection[] = [
  {
    slug: 'govorenie',
    title: 'Говорение',
    icon: 'speaking',
    accent: 'linear-gradient(135deg, #EEF4FF 0%, #E0EAFF 100%)',
    tasks: [
      { slug: '1', title: 'Задание 1', shortLabel: '1' },
      { slug: '2', title: 'Задание 2', shortLabel: '2' },
      { slug: '3', title: 'Задание 3', shortLabel: '3' },
      { slug: '4', title: 'Задание 4', shortLabel: '4' },
    ],
  },
  {
    slug: 'audirovanie',
    title: 'Аудирование',
    icon: 'listening',
    accent: 'linear-gradient(135deg, #EDF8FF 0%, #DFF1FF 100%)',
    tasks: [
      { slug: '5', title: 'Задание 5', shortLabel: '5' },
      { slug: '6', title: 'Задание 6', shortLabel: '6' },
      { slug: '7', title: 'Задание 7', shortLabel: '7' },
      { slug: '8-10', title: 'Задания 8-10', shortLabel: '8-10' },
    ],
  },
  {
    slug: 'chtenie',
    title: 'Чтение',
    icon: 'reading',
    accent: 'linear-gradient(135deg, #EEF7FF 0%, #E1F2FF 100%)',
    tasks: [
      { slug: '11', title: 'Задание 11', shortLabel: '11' },
      { slug: '12', title: 'Задание 12', shortLabel: '12' },
      { slug: '13-17', title: 'Задания 13-17', shortLabel: '13-17' },
    ],
  },
  {
    slug: 'pismo',
    title: 'Письмо',
    icon: 'writing',
    accent: 'linear-gradient(135deg, #F2F7FF 0%, #E9F0FF 100%)',
    tasks: [
      { slug: '18', title: 'Задание 18', shortLabel: '18' },
      { slug: '19', title: 'Задание 19', shortLabel: '19' },
    ],
  },
  {
    slug: 'leksika-i-grammatika',
    title: 'Лексика и грамматика',
    icon: 'lexis',
    accent: 'linear-gradient(135deg, #EFF6FF 0%, #E4EEFF 100%)',
    tasks: [
      { slug: '20', title: 'Задание 20', shortLabel: '20' },
      { slug: '21', title: 'Задание 21', shortLabel: '21' },
      { slug: '22', title: 'Задание 22', shortLabel: '22' },
      { slug: '23', title: 'Задание 23', shortLabel: '23' },
      { slug: '24', title: 'Задание 24', shortLabel: '24' },
      { slug: '25', title: 'Задание 25', shortLabel: '25' },
    ],
  },
  {
    slug: 'istoriya-rossii',
    title: 'ИСТОРИЯ РОССИИ',
    icon: 'history',
    accent: 'linear-gradient(135deg, #F2F8FF 0%, #E7F1FF 100%)',
    tasks: [
      { slug: '26', title: 'Задание 26', shortLabel: '26' },
      { slug: '27', title: 'Задание 27', shortLabel: '27' },
      { slug: '28', title: 'Задание 28', shortLabel: '28' },
      { slug: '29', title: 'Задание 29', shortLabel: '29' },
      { slug: '30', title: 'Задание 30', shortLabel: '30' },
      { slug: '31', title: 'Задание 31', shortLabel: '31' },
      { slug: '32', title: 'Задание 32', shortLabel: '32' },
    ],
  },
  {
    slug: 'osnovy-zakonodatelstva',
    title: 'ОСНОВЫ ЗАКОНОДАТЕЛЬСТВА РОССИЙСКОЙ ФЕДЕРАЦИИ',
    icon: 'law',
    accent: 'linear-gradient(135deg, #EEF6FF 0%, #E5F0FF 100%)',
    tasks: [
      { slug: '33', title: 'Задание 33', shortLabel: '33' },
      { slug: '34', title: 'Задание 34', shortLabel: '34' },
      { slug: '35', title: 'Задание 35', shortLabel: '35' },
      { slug: '36', title: 'Задание 36', shortLabel: '36' },
      { slug: '37', title: 'Задание 37', shortLabel: '37' },
      { slug: '38', title: 'Задание 38', shortLabel: '38' },
    ],
  },
];

export function getVnzhSection(sectionSlug?: string | null) {
  return VNZH_COURSE_SECTIONS.find((section) => section.slug === sectionSlug) ?? null;
}

export function getVnzhTask(sectionSlug?: string | null, taskSlug?: string | null) {
  const section = getVnzhSection(sectionSlug);
  if (!section) return null;
  return section.tasks.find((task) => task.slug === taskSlug) ?? null;
}

/** Бесплатно только задание 4 (раздел «Говорение»). */
export function isVnzhFreeTask(sectionSlug: string, taskSlug: string): boolean {
  return sectionSlug === 'govorenie' && taskSlug === '4';
}
