import { useState } from 'react';
import { addAvailability, addOpenTime, blockTime } from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { WEEKDAYS, tpl } from '../lang';
import {
  Field,
  GhostButton,
  Modal,
  PrimaryButton,
  inputClass,
  tashkentDate,
} from '../ui';

/** `YYYY-MM-DD` → hafta kuni (0 = yakshanba). */
function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * "Bo'sh vaqt qo'shish" oynasi.
 *
 * Ikki xil yozuv chiqadi: "har hafta takrorlansin" yoqilgan bo'lsa —
 * haftalik qoida, aks holda faqat shu kunga tegishli bir martalik oraliq.
 */
export function AddTimeModal({
  onClose,
  onSaved,
  initial,
}: {
  onClose: () => void;
  onSaved: () => void;
  /** Kalendardagi bo'sh katak bosilganda o'sha sana va soat oldindan qo'yiladi. */
  initial?: { date?: string; start?: string; end?: string };
}) {
  const { token, t, lang, toast } = usePanel();
  const [date, setDate] = useState(() => initial?.date ?? tashkentDate());
  const [start, setStart] = useState(initial?.start ?? '10:00');
  const [end, setEnd] = useState(initial?.end ?? '14:00');
  const [slot, setSlot] = useState(60);
  const [repeat, setRepeat] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      if (repeat) {
        await addAvailability(token, {
          weekday: weekdayOf(date),
          start_time: start,
          end_time: end,
          slot_minutes: slot,
        });
      } else {
        await addOpenTime(token, { date, start_time: start, end_time: end, slot_minutes: slot });
      }
      toast(t.scheduleSaved);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={t.addTimeTitle}
      subtitle={t.addTimeSubtitle}
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose} className="flex-1">
            {t.cancel}
          </GhostButton>
          <PrimaryButton onClick={save} disabled={saving} className="flex-[2]">
            {saving ? t.saving : t.saveTime}
          </PrimaryButton>
        </>
      }
    >
      {err ? <p className="text-[12.5px] font-medium text-[#C23A3F]">{err}</p> : null}
      <Field label={t.fieldDate}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.fieldStart}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.fieldEnd}>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label={t.fieldLessonLength}>
        <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} className={inputClass}>
          {[30, 45, 60, 90].map((m) => (
            <option key={m} value={m}>
              {m} {t.minutesShort}
            </option>
          ))}
        </select>
      </Field>

      <button
        type="button"
        onClick={() => setRepeat((v) => !v)}
        className="flex items-center justify-between gap-4 rounded-[14px] border border-app-border bg-app-bg-muted p-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-app-text">{t.repeatWeekly}</span>
          <span className="mt-0.5 block text-[11.5px] text-app-text-muted">
            {tpl(t.repeatWeeklyHint, {
              weekday: WEEKDAYS[lang][weekdayOf(date)] ?? '',
              from: start,
              to: end,
            })}
          </span>
        </span>
        <span
          className={`flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-[3px] transition ${
            repeat ? 'justify-end bg-app-primary' : 'justify-start bg-[#D9D8EC]'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-app-surface" />
        </span>
      </button>
    </Modal>
  );
}

/** "Vaqtni bloklash" oynasi — dam olish kuni yoki band soatlar. */
export function BlockTimeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { token, t, toast } = usePanel();
  const [date, setDate] = useState(() => tashkentDate());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      await blockTime(token, {
        date,
        start_time: start || undefined,
        end_time: end || undefined,
        note: note || undefined,
      });
      toast(t.scheduleSaved);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={t.blockTitle}
      subtitle={t.blockSubtitle}
      onClose={onClose}
      width={440}
      footer={
        <>
          <GhostButton onClick={onClose} className="flex-1">
            {t.cancel}
          </GhostButton>
          <button
            type="button"
            onClick={save}
            disabled={saving || !date}
            className="min-h-[44px] flex-[2] rounded-[12px] bg-[#E9474D] px-4 text-[13px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? t.saving : t.blockAction}
          </button>
        </>
      }
    >
      {err ? <p className="text-[12.5px] font-medium text-[#C23A3F]">{err}</p> : null}
      <Field label={t.fieldDate}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.fieldStart}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.fieldEnd}>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <p className="-mt-1 text-[11.5px] text-app-text-muted">{t.blockWholeDayHint}</p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.reasonOptional}
        className={inputClass}
      />
    </Modal>
  );
}
