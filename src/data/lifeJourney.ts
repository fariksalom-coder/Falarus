/**
 * lifeJourney.ts — "Hayot yo'li" sahnalari (1-10 kun).
 *
 * G'oya: kurs xaritasi quruq raqamlar emas, INSON HAYOTI kabi kechadi.
 * 1-kun — ona qornidan yorug' olamga chiqish, 10-kun — o'z oyog'ida ilk qadam.
 * Har kun ochilganda shu kunning sahnasi to'liq ekranda "video kabi" o'ynaydi.
 *
 * Metafora atayin til o'rganish bilan bog'langan: chaqaloq ham avval eshitadi,
 * keyin tovush chiqaradi, keyin so'z aytadi — o'quvchi ham xuddi shunday.
 *
 * Sahnalar SVG bilan chizilgan (`components/journey/LifeScenes.tsx`) — tashqi
 * rasm yuklanmaydi, shuning uchun animatsiya darhol boshlanadi va har qanday
 * ekranda tiniq ko'rinadi.
 */

export type LifeSceneId =
  | 'birth'
  | 'firstBreath'
  | 'motherEmbrace'
  | 'firstSmile'
  | 'hearing'
  | 'colors'
  | 'firstSounds'
  | 'sitting'
  | 'crawling'
  | 'firstSteps';

export type LifeScene = {
  day: number;
  id: LifeSceneId;
  /** Sahnaning nomi — ekran markazida katta chiqadi. */
  title: string;
  /** Bir jumlalik hayotiy izoh. */
  subtitle: string;
  /** Til o'rganish bilan bog'lovchi yakuniy gap. */
  lesson: string;
  /** Fon gradienti (yuqoridan pastga). */
  bg: [string, string, string];
  /** Urg'u rangi — sarlavha osti chizig'i, zarrachalar. */
  accent: string;
  /** Sahna necha millisekund davom etadi. */
  durationMs: number;
};

export const LIFE_SCENES: LifeScene[] = [
  {
    day: 1,
    id: 'birth',
    title: 'Dunyoga keldingiz',
    subtitle: "Ona qornidagi issiq qorong'ulikdan yorug' olamga ilk chiqish.",
    lesson: "Bugun sizning tilingiz ham shu yerdan boshlanadi — noldan.",
    bg: ['#2A1259', '#5B2E8F', '#C86FA8'],
    accent: '#FFD59E',
    durationMs: 7200,
  },
  {
    day: 2,
    id: 'firstBreath',
    title: 'Ilk nafas',
    subtitle: "Birinchi yig'i — bu qo'rquv emas, bu hayotning ovozi.",
    lesson: "Birinchi so'zni aytish ham xuddi shunday: qiyin, lekin zarur.",
    bg: ['#0F2C63', '#1E5AA8', '#7FC2E8'],
    accent: '#FFE08A',
    durationMs: 6400,
  },
  {
    day: 3,
    id: 'motherEmbrace',
    title: 'Ona quchog\'i',
    subtitle: 'Dunyodagi eng issiq joy — onaning yuragi yonida.',
    lesson: "Til ham shu yerda boshlanadi: ona allasi — birinchi dars.",
    bg: ['#4A1B3D', '#8E3B62', '#E3899B'],
    accent: '#FFD1DC',
    durationMs: 6400,
  },
  {
    day: 4,
    id: 'firstSmile',
    title: 'Ilk tabassum',
    subtitle: 'Hech kim o\'rgatmadi — o\'zi kulib yubordi.',
    lesson: 'Ba\'zi narsalar yodlamasdan, his qilib o\'rganiladi.',
    bg: ['#4A2F0A', '#96631A', '#D9A045'],
    accent: '#FFF0C2',
    durationMs: 6000,
  },
  {
    day: 5,
    id: 'hearing',
    title: 'Ovozlarni tanidi',
    subtitle: 'Onaning ovozini mingta ovoz orasidan ajratadi.',
    lesson: "Yangi tilni ham avval QULOQ o'rganadi, keyin til.",
    bg: ['#10303C', '#1C6B7A', '#6FD0D9'],
    accent: '#CFF6FA',
    durationMs: 6400,
  },
  {
    day: 6,
    id: 'colors',
    title: 'Dunyo rangga to\'ldi',
    subtitle: "Ko'zlar endi ranglarni ajratadi: qizil, ko'k, sariq.",
    lesson: "So'zlar ham shunday — avval bulut, keyin aniq ma'no.",
    bg: ['#231B4D', '#4A3A9E', '#8E7BE8'],
    accent: '#FFD6F2',
    durationMs: 6400,
  },
  {
    day: 7,
    id: 'firstSounds',
    title: 'Birinchi tovushlar',
    subtitle: '"A-gu... ba-ba..." — hali so\'z emas, lekin allaqachon nutq.',
    lesson: "Xato qilishdan qo'rqmang: chaqaloq ham noto'g'ri gapiradi.",
    bg: ['#0E2E22', '#256848', '#59A97C'],
    accent: '#E4FFD9',
    durationMs: 6400,
  },
  {
    day: 8,
    id: 'sitting',
    title: 'O\'tirib oldi',
    subtitle: 'Endi dunyoga yotib emas, tik qarab turibdi.',
    lesson: 'Kichik g\'alaba ham g\'alaba — birinchi mustaqillik.',
    bg: ['#3A2410', '#8A5322', '#E0A063'],
    accent: '#FFE3BE',
    durationMs: 6000,
  },
  {
    day: 9,
    id: 'crawling',
    title: 'Emaklab ketdi',
    subtitle: "Yiqilib, turib, yana emaklab — lekin to'xtamay.",
    lesson: "Har kuni oz-ozdan — mana shu til o'rganishning siri.",
    bg: ['#132C4A', '#2F6FA8', '#88C8E8'],
    accent: '#FFF3C4',
    durationMs: 6400,
  },
  {
    day: 10,
    id: 'firstSteps',
    title: 'Ilk qadam!',
    subtitle: "Birinchi marta O'Z OYOG'IDA tik turdi va qadam tashladi.",
    lesson: "Siz ham 10 kunni bosib o'tdingiz — endi o'z oyog'ingizdasiz.",
    bg: ['#3A2205', '#8F5F12', '#D9A03A'],
    accent: '#FFFFFF',
    durationMs: 8000,
  },
];

export function getLifeScene(day: number): LifeScene | null {
  return LIFE_SCENES.find((s) => s.day === day) ?? null;
}

