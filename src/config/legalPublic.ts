/** Client-visible legal URLs (no secrets). */

export const LEGAL_PATHS = {
  offer: '/huquqiy/ommaviy-oferta',
  privacy: '/huquqiy/maxfiylik',
  refund: '/huquqiy/qaytarish',
} as const;

export type LegalEntityMeta = {
  proprietorLabel: string;
  innLabel: string;
  email: string;
  phone: string;
};

export function getLegalEntityMeta(): LegalEntityMeta {
  const proprietor =
    import.meta.env.VITE_LEGAL_OWNER_NAME?.trim() ||
    'Yakka tartibdagi tadbirkor: [ism va familya — .env da VITE_LEGAL_OWNER_NAME]';
  const inn =
    import.meta.env.VITE_LEGAL_INN?.trim() ||
    '[STIR / INN — .env da VITE_LEGAL_INN]';
  const email = import.meta.env.VITE_LEGAL_SUPPORT_EMAIL?.trim() || 'farmonomonov1@gmail.com';
  const phone =
    import.meta.env.VITE_LEGAL_SUPPORT_PHONE?.trim() || '+998 77 133 24 74';
  return {
    proprietorLabel: proprietor,
    innLabel: inn,
    email,
    phone,
  };
}
