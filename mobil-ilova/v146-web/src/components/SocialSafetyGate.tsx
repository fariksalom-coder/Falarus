import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';

const copy = {
  uz: {
    title: 'Xavfsiz muloqot', age: 'Tug‘ilgan sanangiz', next: 'Davom etish',
    intro: 'Muloqot funksiyalarini sozlash uchun tug‘ilgan sanangizni kiriting. Bu ma’lumot boshqa foydalanuvchilarga ko‘rsatilmaydi.',
    blocked: 'Bu hisobda ochiq chat, sherik qidirish, video muloqot va boshqa foydalanuvchilarga media yuborish yopiq. Darslar va o‘yinlardan foydalanishingiz mumkin.',
    warning: 'Internetdagi xavfsizlik',
    rules: ['Telefon raqami, uy yoki maktab manzili, parol va bank ma’lumotlarini yubormang.',
      'Internetdagi odam o‘zini boshqa kishi qilib ko‘rsatishi mumkin. Muloqot aldov, tahdid yoki real hayotdagi xavfli uchrashuvga olib kelishi mumkin.',
      'Begona bilan uchrashmang. Shubhali xabar bo‘lsa, suhbatni to‘xtating va ishonchli kattaga yoki yordam xizmatiga ayting.',
      'Rasm, ovoz va videoni boshqalar saqlashi yoki tarqatishi mumkin. Yuborishdan oldin o‘ylang.'],
    accept: 'Eslatmani o‘qidim', home: 'Darslarga qaytish', login: 'Kirish', retry: 'Qayta urinish', error: 'Tekshiruv bajarilmadi. Qayta urinib ko‘ring.', loading: 'Tekshirilmoqda…',
  },
  ru: {
    title: 'Безопасное общение', age: 'Дата рождения', next: 'Продолжить',
    intro: 'Укажите дату рождения для настройки общения. Другие пользователи не увидят эту информацию.',
    blocked: 'В этом аккаунте отключены открытые чаты, поиск собеседников, видеосвязь и отправка медиа другим пользователям. Уроки и игры доступны.',
    warning: 'Безопасность в интернете',
    rules: ['Не отправляйте телефон, домашний или школьный адрес, пароли и банковские данные.',
      'Человек в интернете может выдавать себя за другого. Общение может привести к обману, угрозам и опасным встречам в реальной жизни.',
      'Не встречайтесь с незнакомцами. При подозрительных сообщениях прекратите общение и обратитесь к взрослому, которому доверяете, или в поддержку.',
      'Фото, голос и видео могут сохранить или распространить. Подумайте перед отправкой.'],
    accept: 'Я прочитал(а) напоминание', home: 'Вернуться к урокам', login: 'Войти', retry: 'Повторить', error: 'Не удалось выполнить проверку. Попробуйте ещё раз.', loading: 'Проверка…',
  },
  en: {
    title: 'Safe communication', age: 'Date of birth', next: 'Continue',
    intro: 'Enter your date of birth to configure communication. Other users will not see this information.',
    blocked: 'Open chats, partner discovery, video calls and sharing media with other users are disabled for this account. Lessons and games remain available.',
    warning: 'Stay safe online',
    rules: ['Do not share phone numbers, home or school addresses, passwords or bank details.',
      'People online may pretend to be someone else. Online interaction can lead to scams, threats and unsafe meetings in the real world.',
      'Do not meet strangers. Stop suspicious conversations and tell a trusted adult or support.',
      'Others may save or share your photos, voice and videos. Think before sending.'],
    accept: 'I have read this reminder', home: 'Back to lessons', login: 'Sign in', retry: 'Try again', error: 'Unable to verify access. Please try again.', loading: 'Checking…',
  },
};

/** Android release: social/media sharing is unavailable for every account.
 * No age override, network endpoint or parental unlock can enable it. */
export default function SocialSafetyGate({ compact = false }: { children: ReactNode; compact?: boolean }) {
  const { locale } = useLocale();
  const text = locale === 'ru' ? copy.ru : locale === 'uz' || locale === 'uzc' ? copy.uz : copy.en;
  return <section className={`${compact ? 'py-3' : 'min-h-screen px-5 py-10'} bg-app-bg text-app-text`}>
    <div className="mx-auto max-w-lg rounded-2xl border border-app-border bg-app-surface p-6">
      <h1 className="text-xl font-bold">{text.title}</h1>
      <p className="mt-5">{text.blocked}</p>
      <h2 className="mt-5 font-bold">{text.warning}</h2>
      <ul className="mt-3 list-disc space-y-3 pl-5">{text.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      <Link className="mt-6 block underline" to="/">{text.home}</Link>
    </div>
  </section>;
}
