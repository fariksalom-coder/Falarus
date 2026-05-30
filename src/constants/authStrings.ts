/** O‘zbekcha matnlar (auth oqimi) — mobile `auth_strings_uz.dart` bilan mos. */
export const authStrings = {
  welcomeTitle: 'Biz bilan rus tilini oson o‘rganing',
  welcomeBenefits: [
    'O‘yinlar orqali o‘rganing',
    'Birinchi darsdan gapiring',
    'Qisqa va tushunarli darslar',
    'Har kuni yangi mashqlar',
  ],
  register: "Ro'yxatdan o'tish",
  logIn: 'Kirish',

  logInTitle: 'Kirish',
  createAccountTitle: "Ro'yxatdan o'tish",

  phone: 'Telefon',
  email: 'Email',
  password: 'Parol',
  createPassword: "Parol o'ylab toping",
  rewritePassword: 'Parolni qayta kiriting',
  name: 'Ism',
  surname: 'Familiya',
  emailHint: 'username@gmail.com',
  forgotPassword: 'Parolni unutdingizmi?',
  or: 'YOKI',
  continueWithGoogle: 'Google orqali davom etish',
  continueWithApple: 'Apple orqali davom etish',
  noAccount: 'Hisobingiz yo‘qmi? ',
  signUp: "Ro'yxatdan o'tish",
  haveAccount: 'Hisobingiz bormi? ',

  emailRequired: 'Email kiritilishi shart',
  emailInvalid: 'Email noto‘g‘ri',
  phoneInvalid: 'Telefon raqami noto‘g‘ri',
  passwordRequired: 'Parol kiritilishi shart',
  passwordMinLength: 'Parol kamida 6 belgidan iborat bo‘lishi kerak',
  passwordsMismatch: 'Parollar mos kelmaydi',
  nameRequired: 'Ism kiritilishi shart',
  surnameRequired: 'Familiya kiritilishi shart',

  termsPrefix: 'Hisob ochish orqali men ',
  termsOfUse: 'Foydalanish shartlari',
  termsAnd: ' va ',
  privacyPolicy: 'Maxfiylik siyosati',
  termsSuffix: 'ga roziman.',

  resetTitle: 'Parolni tiklash',
  resetSubtitle: 'Email yoki telefon raqamingizga tasdiqlash kodi yuboramiz',
  sendCode: 'Kod yuborish',
  enterCodeTitle: 'Kodni kiriting',
  enterCodeSubtitle: '6 xonali kodni kiriting',
  resendCode: 'Kodni qayta yuborish',
  newPasswordTitle: 'Yangi parol',
  savePassword: 'Parolni saqlash',
  comingSoon: 'Tez orada mavjud bo‘ladi',
  continueBtn: 'Davom etish',

  networkError: 'Internet bilan aloqa yo‘q. Iltimos, qayta urinib ko‘ring.',
  genericError: 'Xatolik yuz berdi',
} as const;

export const EMAIL_REGEX = /^[^@]+@[^@]+\.[^@]+$/;
