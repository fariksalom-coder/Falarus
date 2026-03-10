export type VocabularySubtopic = {
  id: string;
  title: string;
};

export type VocabularyTopic = {
  id: string;
  title: string;
  subtopics: VocabularySubtopic[];
};

export const VOCABULARY_TOPICS: VocabularyTopic[] = [
  {
    id: 'kundalik-hayot',
    title: 'Kundalik hayot',
    subtopics: [
      { id: 'salomlashish-xayrlashish-odob', title: "salomlashish, xayrlashish, odob iboralari" },
      { id: 'oila', title: 'oila' },
      { id: 'uy-mebel-xonalar', title: 'uy, mebel, xonalar, maishiy buyumlar' },
      { id: 'oziq-ovqat-ichimliklar', title: "oziq-ovqat va ichimliklar" },
    ],
  },
  {
    id: 'odamlar-va-jamiyat',
    title: 'Odamlar va jamiyat',
    subtopics: [
      { id: 'tashqi-korinish', title: "tashqi ko'rinish" },
      { id: 'xarakter', title: 'xarakter' },
      { id: 'kasblar', title: 'kasblar' },
      { id: 'dostlar-tanishuv-muloqot', title: "do'stlar, tanishuv, muloqot" },
    ],
  },
  {
    id: 'shahar-va-transport',
    title: 'Shahar va transport',
    subtopics: [
      { id: 'binolar-va-joylar', title: 'binolar va joylar' },
      { id: 'transport', title: 'transport' },
      { id: 'yonalishlar', title: "yo'nalishlar" },
    ],
  },
  {
    id: 'oqish-va-ish',
    title: "O'qish va ish",
    subtopics: [
      { id: 'maktab-fanlari', title: 'maktab fanlari' },
      { id: 'universitet-imtihon-oqish', title: "universitet, imtihon, o'qish" },
      { id: 'ish-ofis', title: 'ish, ofis' },
    ],
  },
  {
    id: 'tabiat-va-atrof-muhit',
    title: 'Tabiat va atrof-muhit',
    subtopics: [
      { id: 'yil-fasli-ob-havo-iqlim', title: "yil fasli, ob-havo, iqlim" },
      { id: 'hayvonlar', title: 'hayvonlar' },
      { id: 'tabiat-hodisalari', title: 'tabiat hodisalari' },
    ],
  },
  {
    id: 'salomatlik-va-tana',
    title: 'Salomatlik va tana',
    subtopics: [
      { id: 'tana-azolari', title: "tana a'zolari" },
      { id: 'kasalliklar-va-alomatlar', title: 'kasalliklar va alomatlar' },
      { id: 'shifokorlar-dorilar-davolanish', title: 'shifokorlar, dorilar, davolanish' },
    ],
  },
  {
    id: 'xaridlar-va-pul',
    title: 'Xaridlar va pul',
    subtopics: [
      { id: 'pul-va-narxlar', title: 'pul va narxlar' },
      { id: 'dokkonlar', title: "do'konlar" },
      { id: 'kiyim-kechak-poyabzal', title: "kiyim-kechak, poyabzal, o'lchamlar, ranglar" },
    ],
  },
  {
    id: 'vaqt-va-sonlar',
    title: 'Vaqt va sonlar',
    subtopics: [
      { id: 'sonlar', title: 'sonlar' },
      { id: 'hafta-kunlari', title: 'hafta kunlari' },
      { id: 'oylar', title: 'oylar' },
      { id: 'kun-vaqtlari', title: 'kun vaqtlari' },
      { id: 'soat-va-taqvim', title: 'soat va taqvim' },
    ],
  },
  {
    id: 'hordiq-va-sayohatlar',
    title: 'Hordiq va sayohatlar',
    subtopics: [
      { id: 'xobbi', title: 'xobbi' },
      { id: 'turizm', title: 'turizm' },
      { id: 'kongilochar-mashgulotlar', title: "ko'ngilochar mashg'ulotlar" },
    ],
  },
  {
    id: 'mavhum-sozlar-va-iboralar',
    title: "Mavhum so'zlar va iboralar",
    subtopics: [
      { id: 'kop-qollanadigan-fellar', title: "ko'p qo'llanadigan fe'llar" },
      { id: 'sifatlar', title: 'sifatlar' },
      { id: 'ravishlar', title: 'ravishlar' },
      { id: 'boglovchilar', title: "bog'lovchilar" },
    ],
  },
];
