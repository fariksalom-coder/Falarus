/**
 * nutqBolaklari.ts — doskaga yoziladigan satrlar va ularning ovozi.
 *
 * IKKI ISH BITTA MANBADAN CHIQADI:
 *   1. doskada NIMA yozilishi va qaysi TARTIBDA (`doskaSatrlari`);
 *   2. ustoz NIMANI o'qishi (`darsNutqRejasi`) — har qadam o'z satrini
 *      ko'rsatadi, klient o'sha satrni ochib ajratib turadi.
 *
 * NIMA UCHUN BIRGA: ilgari doska o'z tartibini, ovoz esa o'zinikini tuzardi.
 * Natijada ustoz aytayotgan gap doskada boshqa joyda (yoki umuman) turardi.
 * Endi satrlar ro'yxati bitta funksiyadan keladi va ovoz o'sha ro'yxat
 * bo'yicha o'qiladi — mos kelmasligi imkonsiz.
 *
 * NIMA UCHUN UMUMIY (shared): bo'laklar ovoz keshining KALITI hisoblanadi.
 * Server darsni tayyorlagach ovozni AYNAN shu bo'laklar bo'yicha oldindan
 * qizdiradi, klient esa aynan o'shalarni so'raydi va keshdan darhol oladi.
 */

export const MAX_OVOZ_BELGI = 190;

/**
 * BIRINCHI bo'lak ataylab qisqa.
 *
 * 190 belgilik bo'lak ~8 soniya generatsiya qilinadi. Qolganlari oldingisi
 * chalinayotganda oldindan yuklanadi, shuning uchun sezilmaydi — lekin
 * BIRINCHISI shuncha kutdirsa, o'quvchi jim ekranga qarab qoladi.
 */
export const BIRINCHI_BOLAK_BELGI = 80;

export function nutqBolaklari(matn: string): string[] {
  const t = String(matn ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const gaplar = t.match(/[^.!?]+[.!?]*/g) ?? [t];
  const out: string[] = [];
  let joriy = '';

  for (const raw of gaplar) {
    const gap = raw.trim();
    if (!gap) continue;
    if (gap.length > MAX_OVOZ_BELGI) {
      if (joriy) { out.push(joriy); joriy = ''; }
      let qism = '';
      for (const soz of gap.split(' ')) {
        if ((qism + ' ' + soz).trim().length > MAX_OVOZ_BELGI) { out.push(qism.trim()); qism = soz; }
        else qism = (qism + ' ' + soz).trim();
      }
      if (qism) out.push(qism);
      continue;
    }
    if ((joriy + ' ' + gap).trim().length > MAX_OVOZ_BELGI) { out.push(joriy); joriy = gap; }
    else joriy = (joriy + ' ' + gap).trim();
  }
  if (joriy) out.push(joriy);

  // Birinchi bo'lak uzun bo'lsa — uni VERGUL yoki tire joyidan bo'lamiz.
  // So'z o'rtasidan emas, gap o'rtasidan ham emas: ikki bo'lak alohida
  // o'qilgani uchun orada pauza bo'ladi va u tabiiy joyga tushishi kerak.
  // Mos chegara topilmasa bo'lmaymiz — sun'iy uzilishdan ko'ra bir necha
  // soniya kutish yaxshiroq.
  if (out.length && out[0].length > BIRINCHI_BOLAK_BELGI) {
    const bosh = out[0];
    let kesim = -1;
    for (const belgi of [',', ';', ' —', ' -', ':']) {
      const joy = bosh.lastIndexOf(belgi, BIRINCHI_BOLAK_BELGI + 40);
      if (joy > 25 && joy > kesim) kesim = joy + belgi.length;
    }
    if (kesim > 0 && kesim < bosh.length - 10) {
      out.splice(0, 1, bosh.slice(0, kesim).trim(), bosh.slice(kesim).trim());
    }
  }

  return out;
}

/**
 * TAQQOSLASH JADVALI — doskaning eng "darslik" qismi.
 *
 * Rus tilida ko'p mavzu ikki-uch shaklni YONMA-YON qo'yganda tushunarli
 * bo'ladi: erkak/ayol rodi, birlik/ko'plik, kelishiklar. Uzluksiz matnda bu
 * farq ko'rinmaydi, ustunlarda esa bir qarashda ko'rinadi:
 *
 *   КТО ЭТО? — Bu kim?
 *   ┌──────────────────────┬──────────────────────┐
 *   │ Это друг.            │ Это Азиз.            │
 *   │ ОН — u (erkak)       │ ОНА — u (ayol)       │
 *   │ Он строитель.        │ Она студентка.       │
 *   └──────────────────────┴──────────────────────┘
 */
export type DoskaUstuni = {
  /** Ustun boshidagi belgi (taqdimotdagi katta figura). */
  ikonka?: DoskaIkonka;
  /** Ustun boshi: «ОН — u (erkak)». */
  bosh: string;
  /** Ustundagi qatorlar: «Это друг.», «Он строитель.». */
  satrlar: string[];
};

export type DoskaTaqqoslash = {
  /** Jadval ustidagi savol/sarlavha: «КТО ЭТО? — Bu kim?». */
  savol?: string;
  ustunlar: DoskaUstuni[];
};

/**
 * Tipik xato — doskada ❌/✅ juftligi.
 *
 * Bu doskaning eng ko'p eslab qolinadigan qismi: o'quvchi o'z xatosini
 * OLDINDAN ko'radi va nega paydo bo'lishini biladi.
 */
export type DoskaXatosi = { notogri: string; togri: string; izoh?: string };

/**
 * DOSKA IKONKALARI — `dars-1-vizual.html` taqdimotidagi belgilar.
 *
 * Har kartochka yonida odam figurasi turadi: o'quvchi so'zni emas, RASMNI
 * eslab qoladi («ОН» yonida erkak, «ОНА» yonida ayol). Ro'yxat yopiq —
 * ixtiyoriy nom yozib bo'lmaydi, chunki har biri komponentda chizilgan.
 */
export type DoskaIkonka =
  | 'odam' | 'ozim' | 'erkak' | 'ayol' | 'juft' | 'guruh' | 'korsat'
  | 'quruvchi' | 'talaba' | 'boshliq' | 'politsiya' | 'dostlar'
  | 'hujjat' | 'gap' | 'savol' | 'joy';

/**
 * AYRILISH — bitta so'z ikkiga bo'linadi («U» -> ОН / ОНА).
 *
 * Taqdimotning 3-slaydi. Buni ustunlar bilan ko'rsatib bo'lmaydi: bu yerda
 * MANBA bitta va u ikkiga ajraladi; o'quvchi aynan shu ajralishni ko'rishi
 * kerak, chunki asosiy xato shu joyda tug'iladi.
 */
export type DoskaAyrilish = {
  soz: string;
  tarmoqlar: Array<{ soz: string; izoh?: string; ikonka?: DoskaIkonka }>;
};

/**
 * BLOKLI TENGLAMA — gap qismlarini yonma-yon qo'yib solishtirish.
 *
 * Taqdimotning 5-slaydi: o'zbekcha «Men | quruvchi | MAN» va ruscha
 * «Я | (bo'sh) | строитель». Farq faqat SHU KO'RINISHDA ko'rinadi: bir
 * tomonda qo'shimcha bor, ikkinchisida o'rni bo'sh qoladi.
 */
export type DoskaTenglama = {
  qatorlar: Array<{
    nom: string;
    bloklar: Array<{
      matn: string;
      /** `bosh` — bo'sh o'rin, `ochirilgan` — ustidan chizilgan (масалан «есть»). */
      tur?: 'oddiy' | 'urgu' | 'bosh' | 'ochirilgan';
    }>;
  }>;
};

/**
 * NISHONLI QATORLAR — kimga qaysi shakl («Boshliq: ВЫ ✓ / ТЫ ✕»).
 *
 * Taqdimotning 8-slaydi. Ro'yxat emas, TANLOV: har qatorda ikkita shakl
 * turadi va biri belgilanadi — o'quvchi vaziyatni ko'rib, javobni darhol
 * ko'radi.
 */
export type DoskaNishonlar = Array<{
  kim: string;
  izoh?: string;
  togri: string;
  notogri?: string;
  ikonka?: DoskaIkonka;
}>;

export type DoskaBosqichMatni = {
  tushuntirish?: string;
  qoida?: string;
  taqqoslash?: DoskaTaqqoslash | null;
  xato?: DoskaXatosi | null;
  /**
   * BIR NECHTA XATO JUFTLIGI — qo'lda yozilgan darslar uchun.
   *
   * AI bitta bosqichga bitta xato qaytaradi (`xato`), qo'lda tuzilgan darsda
   * esa «To'g'ri / Xato» mashqi bir necha juftlikdan iborat bo'ladi: bir xil
   * xato uch xil gapda takrorlansa, qoida yaxshiroq o'rnashadi. Ikkalasi
   * birga kelsa, avval `xato`, keyin `xatolar` chiziladi.
   */
  xatolar?: DoskaXatosi[];
  /** «U» -> ОН / ОНА ko'rinishidagi ayrilish (taqdimotning 3-slaydi). */
  ayrilish?: DoskaAyrilish | null;
  /** Blokli tenglama — gap qismlarini solishtirish (5-slayd). */
  tenglama?: DoskaTenglama | null;
  /** Nishonli qatorlar — kimga qaysi shakl (8-slayd). */
  nishonlar?: DoskaNishonlar;
  misollar?: Array<{ ru?: string; uz?: string; ikonka?: DoskaIkonka }>;
};

/**
 * DOSKADAGI BITTA SATR.
 *
 * `tur` — qanday chizilishi, `ovoz` — ustoz o'qiydigan matn. Ovozi bo'sh satr
 * bo'lmaydi: doskada faqat aytiladigan narsa turadi.
 */
export type DoskaSatri =
  | { tur: 'tushuntirish'; matn: string; ovoz: string }
  | { tur: 'qoida'; matn: string; ovoz: string }
  | { tur: 'savol'; matn: string; ovoz: string }
  | { tur: 'ustun'; ustun: DoskaUstuni; ovoz: string }
  | { tur: 'xato'; xato: DoskaXatosi; ovoz: string }
  | { tur: 'misol'; ru: string; uz: string; ikonka?: DoskaIkonka; ovoz: string }
  | { tur: 'ayrilish'; ayrilish: DoskaAyrilish; ovoz: string }
  | { tur: 'tenglama'; tenglama: DoskaTenglama; ovoz: string }
  | { tur: 'nishon'; nishon: DoskaNishonlar[number]; ovoz: string };

/**
 * Bo'laklarni ovoz uchun birlashtiradi.
 *
 * Oddiy `join('. ')` yaramaydi: doskadagi gaplar allaqachon nuqta bilan
 * tugaydi va natijada «Это друг.. Он строитель.» kabi ikki nuqta chiqardi —
 * ovoz sintezatori bunday joyda g'alati pauza qiladi.
 */
function ovozgaBirlashtir(qismlar: Array<string | undefined>): string {
  return qismlar
    .map((q) => String(q ?? '').trim())
    .filter(Boolean)
    .reduce((acc, q) => (acc ? `${acc}${/[.!?:,]$/.test(acc) ? '' : '.'} ${q}` : q), '');
}

/**
 * Bosqichning doskadagi SATRLARI — yozilish tartibida.
 *
 * Satr raqami shu massivdagi indeks: doska ham, ovoz ham shundan foydalanadi.
 */
export function doskaSatrlari(bosqich: DoskaBosqichMatni): DoskaSatri[] {
  const satrlar: DoskaSatri[] = [];

  const tushuntirish = String(bosqich?.tushuntirish ?? '').trim();
  if (tushuntirish) satrlar.push({ tur: 'tushuntirish', matn: tushuntirish, ovoz: tushuntirish });

  const qoida = String(bosqich?.qoida ?? '').trim();
  if (qoida) satrlar.push({ tur: 'qoida', matn: qoida, ovoz: qoida });

  /*
   * AYRILISH — «U» ikkiga bo'linadi. Qoidadan keyin, ustunlardan oldin
   * turadi: avval AJRALISH ko'rsatiladi, keyin har tarmoq misollari.
   */
  const ayrilish = bosqich?.ayrilish;
  if (ayrilish?.soz && ayrilish.tarmoqlar?.length) {
    satrlar.push({
      tur: 'ayrilish',
      ayrilish,
      ovoz: ovozgaBirlashtir([
        `${ayrilish.soz} — ikkiga bo'linadi`,
        ...ayrilish.tarmoqlar.map((t) => (t.izoh ? `${t.soz} — ${t.izoh}` : t.soz)),
      ]),
    });
  }

  /* TENGLAMA — qatorlar birin-ketin o'qiladi. */
  const tenglama = bosqich?.tenglama;
  if (tenglama?.qatorlar?.length) {
    satrlar.push({
      tur: 'tenglama',
      tenglama,
      ovoz: ovozgaBirlashtir(
        tenglama.qatorlar.map((q) =>
          [
            q.nom,
            q.bloklar
              .filter((b) => b.tur !== 'bosh')
              .map((b) => b.matn)
              .join(' '),
          ]
            .filter(Boolean)
            .join(': '),
        ),
      ),
    });
  }

  const taqqoslash = bosqich?.taqqoslash;
  if (taqqoslash?.ustunlar?.length) {
    const savol = String(taqqoslash.savol ?? '').trim();
    if (savol) satrlar.push({ tur: 'savol', matn: savol, ovoz: savol });
    for (const ustun of taqqoslash.ustunlar) {
      const bosh = String(ustun?.bosh ?? '').trim();
      const qatorlar = (ustun?.satrlar ?? []).map((x) => String(x ?? '').trim()).filter(Boolean);
      if (!bosh && !qatorlar.length) continue;
      satrlar.push({
        tur: 'ustun',
        ustun: { bosh, satrlar: qatorlar, ikonka: ustun.ikonka },
        // Ustun bir butun o'qiladi: avval boshi, keyin qatorlari.
        ovoz: ovozgaBirlashtir([bosh, ...qatorlar]),
      });
    }
  }

  for (const xato of [bosqich?.xato, ...(bosqich?.xatolar ?? [])]) {
    if (!xato?.notogri || !xato?.togri) continue;
    satrlar.push({
      tur: 'xato',
      xato: { notogri: xato.notogri, togri: xato.togri, izoh: xato.izoh },
      // Ustoz avval xato gapni, keyin to'g'risini va sababini aytadi.
      ovoz: ovozgaBirlashtir([
        `Ko'p uchraydigan xato: ${xato.notogri}`,
        `To'g'risi: ${xato.togri}`,
        xato.izoh,
      ]),
    });
  }

  /* NISHONLI QATORLAR — har biri alohida satr, alohida o'qiladi. */
  for (const n of bosqich?.nishonlar ?? []) {
    const kim = String(n?.kim ?? '').trim();
    const togri = String(n?.togri ?? '').trim();
    if (!kim || !togri) continue;
    satrlar.push({
      tur: 'nishon',
      nishon: n,
      ovoz: ovozgaBirlashtir([`${kim} — ${togri}`, n.izoh]),
    });
  }

  for (const m of bosqich?.misollar ?? []) {
    const ru = String(m?.ru ?? '').trim();
    const uz = String(m?.uz ?? '').trim();
    if (!ru) continue;
    // Misol ikki tilda o'qiladi: avval ruscha gap, keyin o'zbekcha ma'nosi —
    // o'quvchi eshitgan gapini tushunishi kerak.
    satrlar.push({ tur: 'misol', ru, uz, ikonka: m.ikonka, ovoz: ovozgaBirlashtir([ru, uz]) });
  }

  return satrlar;
}

/** Bitta ovoz qadami: nima o'qiladi va doskadagi qaysi satrga tegishli. */
export type NutqQadam = { matn: string; satr: number };

/**
 * BOSQICHNING OVOZ REJASI — doskaga yozilgan hamma narsa, YOZILISH TARTIBIDA.
 *
 * Reja `doskaSatrlari` dan quriladi, ya'ni ustoz doskadagi satrlarni tartib
 * bilan o'qib chiqadi va boshqa hech narsa aytmaydi.
 */
export function darsNutqRejasi(bosqich: DoskaBosqichMatni): NutqQadam[] {
  const reja: NutqQadam[] = [];
  doskaSatrlari(bosqich).forEach((satr, i) => {
    for (const bolak of nutqBolaklari(satr.ovoz)) reja.push({ matn: bolak, satr: i });
  });
  return reja;
}
