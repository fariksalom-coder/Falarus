/**
 * O'qituvchi balansi: platforma orqali o'tgan darslardan tushum (narx − komissiya),
 * pul yechish arizasi (admin qo'lda o'tkazadi), pullik darslar ro'yxati.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, CheckCircle2, Loader2, Video, Wallet } from 'lucide-react';
import { usePanel } from '../panelContext';
import { Card, ErrorNote, Field, PageHead, PrimaryButton, Skeleton, inputClass } from '../ui';
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

  return (
    <div className="space-y-4">
      <PageHead title={t.title} subtitle={t.subtitle} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-app-text-muted"><Wallet className="h-4 w-4" />{t.balance}</p>
          <p className="mt-1 text-[26px] font-bold tabular-nums text-[#17803D]">{fmtSum(bal.balance)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-semibold text-app-text-muted">{t.earned}</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-app-text">{fmtSum(bal.earned)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-semibold text-app-text-muted">{t.upcoming(bal.upcoming.lessons)}</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-app-text">{fmtSum(bal.upcoming.gross_uzs)}</p>
        </Card>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-app-text"><ArrowDownToLine className="h-5 w-5" />{t.withdraw}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t.amount} hint={t.min(fmtSum(bal.min_withdrawal_uzs))}>
            <input inputMode="numeric" className={inputClass} value={form.amount} placeholder={String(bal.balance)}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '').slice(0, 9) })} />
          </Field>
          <Field label={t.card}>
            <input inputMode="numeric" autoComplete="cc-number" className={inputClass} value={form.card} placeholder="8600 0000 0000 0000"
              onChange={(e) => setForm({ ...form, card: e.target.value.replace(/[^\d ]/g, '').slice(0, 19) })} />
          </Field>
          <Field label={t.holder}>
            <input autoComplete="cc-name" className={inputClass} value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value.slice(0, 80) })} />
          </Field>
        </div>
        {formError && <ErrorNote text={formError} />}
        <PrimaryButton onClick={() => void withdraw()} disabled={busy === 'w' || bal.balance < bal.min_withdrawal_uzs} className="w-full sm:w-auto">
          {busy === 'w' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.send}
        </PrimaryButton>
      </Card>

      <Card className="p-5">
        <h2 className="text-[16px] font-bold text-app-text">{t.lessons}</h2>
        <p className="mt-1 text-[12px] text-app-text-muted">{t.auto}</p>
        {!lessons.length ? <p className="mt-3 text-[13px] text-app-text-muted">{t.none}</p> : (
          <ul className="mt-3 divide-y divide-app-border">
            {lessons.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-app-text">{l.student_first_name} {l.student_last_name}</p>
                  <p className="text-[12.5px] text-app-text-muted">
                    {when(l.starts_at, lang)} · {fmtSum(l.price_uzs)} · {LESSON_STATUS_LABEL[l.status][lang]}
                    {l.status === 'completed' && l.teacher_amount_uzs != null ? ` · +${fmtSum(l.teacher_amount_uzs)} (${Number(l.commission_percent)}%)` : ''}
                  </p>
                  {l.student_message ? <p className="mt-0.5 truncate text-[12px] text-app-text-muted">«{l.student_message}»</p> : null}
                </div>
                {(l.status === 'paid' || l.status === 'disputed') && roomOpen(l) && (
                  <button type="button" onClick={() => navigate(`/dars/l/${l.id}`)} className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] bg-app-primary px-4 text-[13px] font-semibold text-white active:scale-[0.98]">
                    <Video className="h-4 w-4" />{t.join}
                  </button>
                )}
                {canComplete(l.status, l.starts_at) && (
                  <button type="button" disabled={busy === `c${l.id}`} onClick={() => void complete(l.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] border border-[#17A34A] px-4 text-[13px] font-semibold text-[#17803D] active:scale-[0.98]">
                    {busy === `c${l.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{t.done}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {bal.withdrawals.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[16px] font-bold text-app-text">{t.withdrawals}</h2>
          <ul className="mt-3 divide-y divide-app-border">
            {bal.withdrawals.map((w) => (
              <li key={w.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-[13px]">
                <span className="text-app-text">{when(w.requested_at, lang)} · {w.card_number}</span>
                <span className="font-semibold tabular-nums text-app-text">{fmtSum(w.amount_uzs)} · {t.wStatus[w.status]}{w.admin_note ? ` — ${w.admin_note}` : ''}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {bal.entries.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[16px] font-bold text-app-text">{t.history}</h2>
          <ul className="mt-3 divide-y divide-app-border">
            {bal.entries.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 py-2.5 text-[13px]">
                <span className="min-w-0 truncate text-app-text">{when(e.created_at, lang)} · {t.kind[e.kind]} {e.note ? `· ${e.note}` : ''}</span>
                <span className={`shrink-0 font-semibold tabular-nums ${e.amount_uzs > 0 ? 'text-[#17803D]' : 'text-app-text'}`}>{e.amount_uzs > 0 ? '+' : '−'}{fmtSum(Math.abs(e.amount_uzs))}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
