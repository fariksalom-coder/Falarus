import { isNativeIOS } from '../native/platform';

const KEY = 'falarus:ai-consent:v1';
let pending: Promise<void> | null = null;

export function revokeAIConsent(): void { localStorage.removeItem(KEY); }

export async function requireAIConsent(): Promise<void> {
  if (!isNativeIOS() || localStorage.getItem(KEY) === 'yes') return;
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'ai-consent-title');
    dialog.className = 'm-auto w-[calc(100%_-_32px)] max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-xl';
    const title = document.createElement('h2');
    title.id = 'ai-consent-title'; title.className = 'text-lg font-bold'; title.textContent = 'AI yordamchiga ruxsat';
    const text = document.createElement('p');
    text.className = 'my-4 text-sm leading-relaxed';
    text.textContent = 'Javoblaringizni tekshirish va suhbat uchun mashq matnlari, yozilgan ovoz yoki jonli mikrofon ovozi Google Gemini va/yoki OpenAI xizmatlariga yuboriladi. Ruxsat bermasangiz, AI mashqlari ishlamaydi; boshqa darslardan foydalanishingiz mumkin. Maxfiy ma’lumotlarni aytmang yoki yozmang. Ruxsatni Profil sozlamalarida bekor qilishingiz mumkin.';
    const privacy = document.createElement('a'); privacy.href = '/huquqiy/maxfiylik';
    privacy.textContent = 'Maxfiylik siyosati'; privacy.className = 'block min-h-11 underline';
    const controls = document.createElement('div'); controls.className = 'mt-4 grid grid-cols-2 gap-3';
    const finish = (accepted: boolean) => {
      dialog.close(); dialog.remove();
      if (accepted) { localStorage.setItem(KEY, 'yes'); resolve(); }
      else reject(new Error('AI ma’lumot yuborishga ruxsat berilmadi.'));
    };
    for (const [label, accept] of [['Hozir emas', false], ['Ruxsat beraman', true]] as const) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.className = 'min-h-12 rounded-xl border border-slate-300 px-3 font-bold';
      if (accept) button.className += ' bg-blue-600 text-white';
      button.onclick = () => finish(accept); controls.append(button);
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
    dialog.append(title, text, privacy, controls); document.body.append(dialog); dialog.showModal();
  });
  try { await pending; } finally { pending = null; }
}
