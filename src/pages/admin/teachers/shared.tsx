/** O'qituvchilar admin bo'limi tablari uchun umumiy yordamchilar. */
import { MessageCircle, Phone, Send } from 'lucide-react';

export const fmtNum = (n: number) => Math.round(Number(n)).toLocaleString('ru-RU').replace(/ /g, ' ');
export const fmtSum = (n: number) => `${fmtNum(n)} soʻm`;
export const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

/** Toshkent sanasi YYYY-MM-DD; `shift` — necha kun keyin. */
export function tashkentDay(shift = 0, from = Date.now()) {
  return new Date(from + 5 * 3600_000 + shift * 86_400_000).toISOString().slice(0, 10);
}

export const EVENT_LABEL: Record<string, { text: string; tone: string }> = {
  submitted: { text: 'Yuborildi', tone: 'bg-blue-50 text-blue-800' },
  approved: { text: 'Tasdiqlandi', tone: 'bg-emerald-50 text-emerald-800' },
  rejected: { text: 'Rad etildi', tone: 'bg-red-50 text-red-800' },
  needs_revision: { text: 'Tuzatishga qaytarildi', tone: 'bg-amber-50 text-amber-800' },
  catalog_on: { text: 'Katalogga chiqarildi', tone: 'bg-emerald-50 text-emerald-800' },
  catalog_off: { text: 'Katalogdan olindi', tone: 'bg-slate-100 text-slate-700' },
};

const digits = (v: string) => v.replace(/\D/g, '');

/** Telefon, Telegram va WhatsApp — bosib ochiladigan tugmachalar. */
export function ContactLinks({ phone, telegram, whatsapp, className = '' }: { phone: string | null; telegram: string | null; whatsapp: string | null; className?: string }) {
  const tg = telegram?.trim() || '';
  const tgHref = tg.startsWith('@') ? `https://t.me/${tg.slice(1)}` : tg ? `https://t.me/+${digits(tg)}` : '';
  const chip = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-2.5 text-xs font-semibold text-app-text transition hover:bg-app-bg-muted';
  if (!phone && !tg && !whatsapp) return <span className={`text-sm text-app-text-muted ${className}`}>Aloqa koʻrsatilmagan</span>;
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`}>
      {phone && <a href={`tel:+${digits(phone)}`} className={chip}><Phone className="h-3.5 w-3.5 text-slate-500" />{phone}</a>}
      {tg && <a href={tgHref} target="_blank" rel="noreferrer" className={chip}><Send className="h-3.5 w-3.5 text-sky-500" />{tg}</a>}
      {whatsapp && <a href={`https://wa.me/${digits(whatsapp)}`} target="_blank" rel="noreferrer" className={chip}><MessageCircle className="h-3.5 w-3.5 text-emerald-600" />{whatsapp}</a>}
    </span>
  );
}
