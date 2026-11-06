import { isNativeIOS } from '../native/platform';

// Keep consent across logout, but never share it with another account.
function consentKey(): string {
  const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
  if (!user?.id) throw new Error('AI uchun avval hisobingizga kiring.');
  return `falarus:ai-consent:v2:${user.id}`;
}
let pending: Promise<void> | null = null;
let pendingKey: string | null = null;

export function revokeAIConsent(): void { localStorage.setItem(consentKey(), 'no'); }

export async function requireAIConsent(promptAgain = false): Promise<void> {
  if (!isNativeIOS()) return;
  const key = consentKey();
  const choice = localStorage.getItem(key);
  if (!promptAgain && choice === 'yes') return;
  if (!promptAgain && choice === 'no') throw new Error('AI ruxsati o‘chirilgan. Profil sozlamalaridan yoqishingiz mumkin.');
  if (pending) {
    if (pendingKey === key) return pending;
    throw new Error('AI ruxsatini tekshirish uchun qayta urining.');
  }
  pendingKey = key;
  pending = new Promise<void>((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'ai-consent-title');
    dialog.className = 'm-auto w-[calc(100%_-_40px)] max-w-[340px] rounded-3xl border-0 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/35';
    dialog.setAttribute('aria-describedby', 'ai-consent-description');
    const badge = document.createElement('div');
    badge.className = 'mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/></svg>';
    const title = document.createElement('h2');
    title.id = 'ai-consent-title'; title.className = 'text-base font-bold tracking-tight'; title.textContent = 'AI bilan mashq qilish';
    const text = document.createElement('p');
    text.id = 'ai-consent-description';
    text.className = 'mt-2 text-[13px] leading-5 text-slate-600';
    text.textContent = 'Javoblaringizni tekshirish va suhbat uchun mashq matni, yozilgan yoki jonli ovozingiz Google Gemini va/yoki OpenAI xizmatlariga yuboriladi. Ruxsatsiz ham boshqa darslardan foydalanishingiz mumkin.';
    const note = document.createElement('p');
    note.className = 'mt-2 text-xs leading-[18px] text-slate-500';
    note.textContent = 'Maxfiy ma’lumot yubormang. Ruxsatni Profil sozlamalarida bekor qilishingiz mumkin.';
    const privacy = document.createElement('a'); privacy.href = '/huquqiy/maxfiylik';
    privacy.textContent = 'Maxfiylik siyosati'; privacy.className = 'mt-1 inline-flex min-h-11 items-center text-xs font-medium text-blue-700 underline underline-offset-4';
    const controls = document.createElement('div'); controls.className = 'mt-2 grid grid-cols-2 gap-2';
    const finish = (accepted: boolean) => {
      dialog.close(); dialog.remove();
      localStorage.setItem(key, accepted ? 'yes' : 'no');
      if (accepted) resolve();
      else reject(new Error('AI ma’lumot yuborishga ruxsat berilmadi.'));
    };
    for (const [label, accept] of [['Hozir emas', false], ['Ruxsat beraman', true]] as const) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.className = 'min-h-11 rounded-xl px-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
      button.className += accept ? ' bg-blue-600 text-white active:bg-blue-700' : ' bg-slate-100 text-slate-600 active:bg-slate-200';
      button.onclick = () => finish(accept); controls.append(button);
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
    dialog.append(badge, title, text, note, privacy, controls); document.body.append(dialog); dialog.showModal();
  });
  try { await pending; } finally { pending = null; pendingKey = null; }
}
