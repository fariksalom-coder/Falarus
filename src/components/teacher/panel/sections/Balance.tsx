/**
 * O'qituvchi balansi: platforma orqali o'tgan darslardan tushum (narx − komissiya),
 * pul yechish arizasi (admin qo'lda o'tkazadi), pullik darslar ro'yxati.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, CheckCircle2, Loader2, Video, Wallet } from 'lucide-react';
import { usePanel } from '../panelContext';
import { Card, ErrorNote, Field, PrimaryButton, Skeleton, Tag, inputClass } from '../ui';
import { LESSON_STATUS_LABEL, canComplete } from '../../../../../shared/teacherLessons';
import {
  completeTeacherLesson, fmtSum, getTeacherBalance, getTeacherLessons, requestWithdrawal, roomOpen,
  type TeacherBalance, type TeacherLesson,
} from '../../../../api/teacherLessons';

const TEXT = {
  uz: {
    title: 'Balans va darslar', subtitle: 'Platforma orqali toʻlangan darslar. Dars yakunlanganda balansga narx − komissiya yoziladi.',
    balance: 'Yechish mumkin', earned: 'Jami ishlangan', upcoming: (n: number) => `Kutilayotgan: ${n} dars`,
    withdraw: 'Pul yechish', amount: 'Summa (soʻm)', card: 'Karta raqami', holder: 'Karta egasi (ism, familiya)',
    send: 'Ariza yuborish', sent: 'Ariza yuborildi — maʼmuriyat 1–2 ish kunida oʻtkazadi', min: (n: string) => `Eng kam summa — ${n}`,
    lessons: 'Pullik darslar', none: 'Hali pullik dars yoʻq. Oʻquvchilar profilingizdan vaqt tanlab toʻlaydi.',
    join: 'Darsga kirish', done: 'Dars oʻtdi', history: 'Balans tarixi', withdrawals: 'Pul yechish arizalari',
    wStatus: { requested: 'Koʻrib chiqilmoqda', paid: 'Oʻtkazildi', rejected: 'Rad etildi' },
    kind: { lesson: 'Dars', withdrawal: 'Yechish', withdrawal_return: 'Qaytarildi', adjustment: 'Tuzatish' },
    auto: 'Belgilanmasa, dars tugagach 24 soatda avtomatik yakunlanadi.',
  },
  ru: {
    title: 'Баланс и уроки', subtitle: 'Уроки, оплаченные через платформу. После урока на баланс зачисляется цена − комиссия.',
    balance: 'Доступно к выводу', earned: 'Всего заработано', upcoming: (n: number) => `Ожидается: ${n} урок(ов)`,
    withdraw: 'Вывести деньги', amount: 'Сумма (сум)', card: 'Номер карты', holder: 'Владелец карты (имя, фамилия)',
    send: 'Отправить заявку', sent: 'Заявка отправлена — администрация переведёт за 1–2 рабочих дня', min: (n: string) => `Минимальная сумма — ${n}`,
    lessons: 'Платные уроки', none: 'Платных уроков пока нет. Ученики выбирают время в вашем профиле и оплачивают.',
    join: 'Войти в урок', done: 'Урок прошёл', history: 'История баланса', withdrawals: 'Заявки на вывод',
    wStatus: { requested: 'На рассмотрении', paid: 'Переведено', rejected: 'Отклонено' },
    kind: { lesson: 'Урок', withdrawal: 'Вывод', withdrawal_return: 'Возврат', adjustment: 'Корректировка' },
    auto: 'Если не отметить, урок закроется автоматически через 24 часа после окончания.',
  },
};

// ru-RU format (31.10, 14:00) — uz-UZ brauzerlarda «10-31» ko'rinishida chiqadi.
const when = (iso: string, _lang: 'uz' | 'ru') => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function Balance() {
  const { token, lang, toast } = usePanel();
  const t = TEXT[lang];
  const navigate = useNavigate();
  const [bal, setBal] = useState<TeacherBalance | null>(null);
  const [lessons, setLessons] = useState<TeacherLesson[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ amount: '', card: '', holder: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    Promise.all([getTeacherBalance(token), getTeacherLessons(token)])
      .then(([b, l]) => { setBal(b); setLessons(l); setError(''); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorNote text={error} />;
  if (!bal || !lessons) return <Skeleton rows={6} />;

  const withdraw = async () => {
    setFormError(''); setBusy('w');
    try {
      await requestWithdrawal(token, { amount_uzs: Number(form.amount.replace(/\D/g, '')), card_number: form.card, card_holder: form.holder });
      setForm({ amount: '', card: form.card, holder: form.holder });
      toast(t.sent); load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };
  const complete = async (id: number) => {
    setBusy(`c${id}`);
    try { await completeTeacherLesson(token, id); load(); } catch (e) { toast(e instanceof Error ? e.message : 'Xatolik'); } finally { setBusy(null); }
  };

  const wTone = { requested: 'amber', paid: 'green', rejected: 'red' } as const;
  const lTone = (st: TeacherLesson['status']) =>
    st === 'completed' ? 'green' : st === 'paid' ? 'blue' : st === 'disputed' ? 'amber' : 'grey';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        <div className="rounded-[20px] bg-[#134E4A] p-[18px] text-white">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#A7DCD3]"><Wallet className="h-4 w-4" />{t.balance}</p>
          <p className="mt-1.5 text-[26px] font-extrabold tabular-nums lg:text-[28px]">{fmtSum(bal.balance)}</p>
        </div>
        <Card className="p-[18px]">
          <p className="text-[13px] font-semibold text-app-text-muted">{t.earned}</p>
          <p className="mt-1.5 text-[26px] font-extrabold tabular-nums text-app-text lg:text-[28px]">{fmtSum(bal.earned)}</p>
        </Card>
        <Card className="p-[18px]">
          <p className="text-[13px] font-semibold text-app-text-muted">{t.upcoming(bal.upcoming.lessons)}</p>
          <p className="mt-1.5 text-[26px] font-extrabold tabular-nums text-app-text lg:text-[28px]">{fmtSum(bal.upcoming.gross_uzs)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Card as="section" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 px-5 py-[18px]">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-app-text"><ArrowDownToLine className="h-5 w-5" />{t.withdraw}</h2>
          <Field label={t.amount} hint={t.min(fmtSum(bal.min_withdrawal_uzs))}>
            <input inputMode="numeric" className={inputClass} value={form.amount} placeholder={String(bal.balance)}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '').slice(0, 9) })} />
          </Field>
          <Field label={t.card}>
            <input inputMode="numeric" autoComplete="cc-number" className={inputClass} value={form.card} placeholder="8600 •••• •••• ••••"
              onChange={(e) => setForm({ ...form, card: e.target.value.replace(/[^\d ]/g, '').slice(0, 19) })} />
          </Field>
          <Field label={t.holder}>
            <input autoComplete="cc-name" className={inputClass} value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value.slice(0, 80) })} />
          </Field>
          {formError && <ErrorNote text={formError} />}
          <PrimaryButton onClick={() => void withdraw()} disabled={busy === 'w' || bal.balance < bal.min_withdrawal_uzs} className="w-full">
            {busy === 'w' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.send}
          </PrimaryButton>

          {bal.withdrawals.length > 0 && (
            <>
              <h3 className="mt-2 text-[15px] font-extrabold text-app-text">{t.withdrawals}</h3>
              <ul>
                {bal.withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 border-t border-app-bg-subtle py-2 text-[14px]">
                    <span className="min-w-0">
                      <b className="tabular-nums text-app-text">{fmtSum(w.amount_uzs)}</b>
                      <span className="block text-[12px] text-app-text-muted">{when(w.requested_at, lang)} · {w.card_number}{w.admin_note ? ` — ${w.admin_note}` : ''}</span>
                    </span>
                    <Tag tone={wTone[w.status]}>{t.wStatus[w.status]}</Tag>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card as="section" className="min-w-0 flex-[1.5_1_400px] px-5 py-[18px]">
          <h2 className="text-[17px] font-extrabold text-app-text">{t.lessons}</h2>
          <p className="mt-0.5 mb-2 text-[12px] text-app-text-muted">{t.auto}</p>
          {!lessons.length ? <p className="border-t border-app-bg-subtle pt-3 text-[13.5px] text-app-text-muted">{t.none}</p> : (
            <ul>
              {lessons.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-2.5 border-t border-app-bg-subtle py-2.5">
                  <div className="min-w-0 flex-[1_1_160px]">
                    <b className="block truncate text-[14px] text-app-text">{l.student_first_name} {l.student_last_name}</b>
                    <span className="block text-[12px] text-app-text-muted">
                      {when(l.starts_at, lang)} · {fmtSum(l.price_uzs)}
                      {l.status === 'completed' && l.teacher_amount_uzs != null ? ` · +${fmtSum(l.teacher_amount_uzs)} (${Number(l.commission_percent)}%)` : ''}
                    </span>
                    {l.student_message ? <span className="mt-0.5 block truncate text-[12px] text-app-text-muted">«{l.student_message}»</span> : null}
                  </div>
                  <Tag tone={lTone(l.status)}>{LESSON_STATUS_LABEL[l.status][lang]}</Tag>
                  {(l.status === 'paid' || l.status === 'disputed') && roomOpen(l) && (
                    <button type="button" onClick={() => navigate(`/dars/l/${l.id}`)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-app-primary px-3 text-[13px] font-bold text-white active:scale-[0.98]">
                      <Video className="h-4 w-4" />{t.join}
                    </button>
                  )}
                  {canComplete(l.status, l.starts_at) && (
                    <button type="button" disabled={busy === `c${l.id}`} onClick={() => void complete(l.id)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] border border-app-border bg-app-surface px-3 text-[13px] font-bold text-app-text active:scale-[0.98]">
                      {busy === `c${l.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />}{t.done}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {bal.entries.length > 0 && (
            <>
              <h3 className="mt-4 mb-1 text-[15px] font-extrabold text-app-text">{t.history}</h3>
              <ul>
                {bal.entries.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2 border-t border-app-bg-subtle py-2 text-[14px]">
                    <span className="min-w-0">
                      <b className="text-app-text">{t.kind[e.kind]}</b>
                      {e.note ? <span className="text-app-text-muted"> · {e.note}</span> : null}
                      <span className="block text-[12px] text-app-text-muted">{when(e.created_at, lang)}</span>
                    </span>
                    <span className={`shrink-0 whitespace-nowrap font-extrabold tabular-nums ${e.amount_uzs > 0 ? 'text-[#166534]' : 'text-app-text'}`}>
                      {e.amount_uzs > 0 ? '+' : '−'}{fmtSum(Math.abs(e.amount_uzs))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
