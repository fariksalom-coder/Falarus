/**
 * Admin contact links for "Administrator bilan bog'lanish".
 * Override via env: VITE_ADMIN_TELEGRAM, VITE_ADMIN_WHATSAPP, VITE_ADMIN_EMAIL
 */
export const adminContact = {
  telegram: import.meta.env.VITE_ADMIN_TELEGRAM || 'https://t.me/falarus_admin',
  whatsapp: import.meta.env.VITE_ADMIN_WHATSAPP || '+9989770512474',
  email: import.meta.env.VITE_ADMIN_EMAIL || 'farmonomonov1@gmail.com',
};
