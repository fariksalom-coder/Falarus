import { useState, type ReactNode } from 'react';
import { parseBirthDate, socialStage } from '../../shared/socialSafety';

const STORAGE_KEY = 'falarus:adult-access:v1';
type Record = { birthDate: string; acknowledged: boolean };
function load(): Record | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return value && typeof value.birthDate === 'string' && typeof value.acknowledged === 'boolean' ? value : null;
  } catch { return null; }
}
const copy = {
  uz: { title: 'Tug‘ilgan sanangiz', intro: 'Davom etish uchun tug‘ilgan kun, oy va yilingizni kiriting.', next: 'Davom etish', invalid: 'Tug‘ilgan sanani to‘g‘ri kiriting.', blocked: 'FalaRus faqat 18 yosh va undan kattalar uchun. Bu qurilmada ilovaga kirish yopiq.', rulesTitle: 'Internetdagi xavfsizlik', rules: ['Telefon raqami, uy manzili, parol va bank ma’lumotlarini ulashmang.', 'Boshqa odam yolg‘on ma’lumot berishi mumkin. Muloqot aldov, tahdid yoki real hayotdagi xavfli uchrashuvga olib kelishi mumkin.', 'Shubhali muloqotni to‘xtating. Rasm, ovoz va videoni boshqalar saqlashi yoki tarqatishi mumkin.'], accept: 'Eslatmani o‘qidim — davom etish', storage: 'Tekshiruvni saqlab bo‘lmadi. Qurilma xotirasini tekshirib qayta urinib ko‘ring.' },
  ru: { title: 'Дата рождения', intro: 'Введите день, месяц и год рождения для продолжения.', next: 'Продолжить', invalid: 'Введите корректную дату рождения.', blocked: 'FalaRus доступен только пользователям от 18 лет. Доступ на этом устройстве закрыт.', rulesTitle: 'Безопасность в интернете', rules: ['Не сообщайте телефон, домашний адрес, пароли и банковские данные.', 'Другой человек может выдавать себя за другого. Общение может привести к обману, угрозам и опасным встречам в реальной жизни.', 'Прекратите подозрительное общение. Другие могут сохранить или распространить ваши фото, голос и видео.'], accept: 'Я прочитал(а) напоминание — продолжить', storage: 'Не удалось сохранить проверку. Проверьте память устройства и повторите.' },
  en: { title: 'Date of birth', intro: 'Enter your day, month and year of birth to continue.', next: 'Continue', invalid: 'Enter a valid date of birth.', blocked: 'FalaRus is only available to people aged 18 and over. Access on this device is closed.', rulesTitle: 'Stay safe online', rules: ['Do not share phone numbers, home addresses, passwords or bank details.', 'People online may pretend to be someone else. Interaction can lead to scams, threats and unsafe meetings in real life.', 'Stop suspicious conversations. Other people may save or share your photos, voice and videos.'], accept: 'I have read the reminder — continue', storage: 'Unable to save the check. Check device storage and try again.' },
};

/** Self-declared installation age gate. Play Console must also restrict minor access. */
export default function AdultAccessGate({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<Record | null>(load);
  const [birthDate, setBirthDate] = useState('');
  const [locale, setLocale] = useState<'uz' | 'ru' | 'en'>('uz');
  const [error, setError] = useState('');
  const text = copy[locale];
  const stage = record ? socialStage(record.birthDate, record.acknowledged ? 1 : 0, false) : 'age';
  function save(value: Record) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      setRecord(value); setError('');
    } catch { setError(text.storage); }
  }
  if (stage === 'allowed') return <>{children}</>;
  return <main className="min-h-screen bg-app-bg px-5 py-10 text-app-text">
    <section className="mx-auto max-w-lg rounded-2xl border border-app-border bg-app-surface p-6">
      <nav aria-label="Language" className="mb-6 flex gap-4">{(['uz', 'ru', 'en'] as const).map(value => <button key={value} type="button" aria-pressed={locale === value} onClick={() => setLocale(value)}>{value.toUpperCase()}</button>)}</nav>
      {stage === 'age' ? <form onSubmit={event => { event.preventDefault(); if (!parseBirthDate(birthDate)) { setError(text.invalid); return; } save({ birthDate, acknowledged: false }); }}>
        <h1 className="text-xl font-bold">{text.title}</h1><p className="mt-4">{text.intro}</p>
        <label className="mt-4 block">{text.title}<input type="date" required value={birthDate} onChange={event => setBirthDate(event.target.value)} className="mt-2 block w-full rounded border border-app-border bg-app-bg p-3" /></label>
        <button className="ui-button ui-button--primary mt-5">{text.next}</button>
      </form> : stage === 'blocked' ? <p role="status">{text.blocked}</p> : <>
        <h1 className="text-xl font-bold">{text.rulesTitle}</h1>
        <ul className="mt-5 list-disc space-y-4 pl-5">{text.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
        <button className="ui-button ui-button--primary mt-6" onClick={() => record && save({ ...record, acknowledged: true })}>{text.accept}</button>
      </>}
      {error && <p className="mt-4" role="alert">{error}</p>}
    </section>
  </main>;
}
