import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  getLessonReport,
  saveLessonReport,
  type LessonReport as ReportData,
  type LessonReportResponse,
} from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { LEVEL_OPTIONS, tpl } from '../lang';
import {
  Card,
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  PrimaryButton,
  Skeleton,
  fmtDate,
  inputClass,
  textareaClass,
} from '../ui';

const BLANK: ReportData = {
  topic: '',
  positives: '',
  negatives: '',
  difficulties: '',
  next_steps: '',
  teacher_comment: '',
  lesson_rating: null,
  determined_level: null,
  lesson_went_well: null,
  student_enrolled_monthly_course: null,
};

/**
 * Dars yakuni — prototipdagi "Урок завершён" ekrani.
 *
 * Hisobot ikki marta saqlanadi: qoralama (dars holati o'zgarmaydi) va
 * yakunlash (dars "o'tkazilgan" bo'ladi, o'quvchiga sharh so'rovi boradi).
 */
export default function LessonReport({ trialId }: { trialId: number }) {
  const { token, t, lang, go, toast, refresh } = usePanel();
  const [data, setData] = useState<LessonReportResponse | null>(null);
  const [form, setForm] = useState<ReportData>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getLessonReport(token, trialId);
      setData(r);
      setForm(r.report ?? BLANK);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [token, trialId, t.errorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton rows={4} />;
  if (!data) return <Empty text={err || t.nothingFound} />;

  const l = data.lesson;
  const already = ['completed', 'completed_by_teacher'].includes(l.status);

  const set = <K extends keyof ReportData>(key: K, value: ReportData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async (complete: boolean) => {
    setSaving(true);
    setErr('');
    try {
      await saveLessonReport(token, trialId, { ...form, complete });
      toast(complete ? t.reportFinished : t.reportSaved);
      refresh();
      if (complete) go('lessons');
      else await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[760px]">
      <button
        type="button"
        onClick={() => go('lessons')}
        className="mb-4 text-[13px] font-medium text-[#6E7191] hover:text-[#4B3BE4]"
      >
        {t.reportBack}
      </button>

      <div className="mb-4 flex flex-col items-center text-center">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#E7F4EC]">
          <Check className="h-6 w-6 text-[#17A34A]" strokeWidth={2.4} />
        </span>
        <p className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-[#171A3D]">
          {t.reportTitle}
        </p>
        <p className="mt-1 text-[13.5px] text-[#6E7191]">
          {tpl(t.reportSubtitle, {
            student: l.student_name,
            kind: t.trialTag,
            minutes: l.duration_minutes,
          })}
          {l.starts_at ? ` · ${fmtDate(l.starts_at, lang)}` : ''}
        </p>
      </div>

      {err ? <ErrorNote text={err} /> : null}

      <Card className="flex flex-col gap-5 p-5 lg:p-6">
        <Field label={t.reportWhatStudied}>
          <textarea
            rows={3}
            value={form.topic}
            onChange={(e) => set('topic', e.target.value)}
            placeholder={t.reportWhatStudiedPh}
            className={textareaClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.reportPositives}>
            <textarea
              rows={3}
              value={form.positives}
              onChange={(e) => set('positives', e.target.value)}
              placeholder={t.reportPositivesPh}
              className={textareaClass}
            />
          </Field>
          <Field label={t.reportNegatives}>
            <textarea
              rows={3}
              value={form.negatives}
              onChange={(e) => set('negatives', e.target.value)}
              placeholder={t.reportNegativesPh}
              className={textareaClass}
            />
          </Field>
        </div>

        <Field label={t.reportHomework}>
          <textarea
            rows={2}
            value={form.next_steps}
            onChange={(e) => set('next_steps', e.target.value)}
            placeholder={t.reportHomeworkPh}
            className={textareaClass}
          />
        </Field>

        <Field label={t.reportComment} hint={t.privatePartHint}>
          <textarea
            rows={2}
            value={form.teacher_comment}
            onChange={(e) => set('teacher_comment', e.target.value)}
            placeholder={t.reportCommentPh}
            className={textareaClass}
          />
        </Field>

        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-[#3E4166]">{t.reportRating}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = (form.lesson_rating ?? 0) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      lesson_rating: n,
                      // Baho 3 dan past bo'lsa dars "yaxshi o'tdi" deb belgilanmaydi.
                      lesson_went_well: n >= 4,
                    }))
                  }
                  className={`h-[44px] w-[44px] rounded-[12px] text-[18px] transition ${
                    on ? 'bg-[#FFF4DA] text-[#E6B33E]' : 'bg-[#F5F5FB] text-[#C9CADD]'
                  }`}
                  aria-label={`${n}`}
                >
                  ★
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[16px] border border-[#F5E3B8] bg-[#FFFBF0] p-4">
          <p className="mb-3 text-[13px] font-semibold text-[#7A5B10]">{t.reportTrialResult}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.reportLevel}>
              <select
                value={form.determined_level ?? ''}
                onChange={(e) => set('determined_level', e.target.value || null)}
                className={inputClass}
              >
                <option value="">{t.chooseOption}</option>
                {LEVEL_OPTIONS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-[#3E4166]">{t.reportReady}</span>
              <div className="flex gap-2">
                <ChoiceButton
                  active={form.student_enrolled_monthly_course === true}
                  tone="green"
                  onClick={() => set('student_enrolled_monthly_course', true)}
                >
                  {t.reportReadyYes}
                </ChoiceButton>
                <ChoiceButton
                  active={form.student_enrolled_monthly_course === false}
                  tone="red"
                  onClick={() => set('student_enrolled_monthly_course', false)}
                >
                  {t.reportReadyNo}
                </ChoiceButton>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          <GhostButton onClick={() => void save(false)} disabled={saving}>
            {saving ? t.saving : t.reportSaveDraft}
          </GhostButton>
          {!already ? (
            <PrimaryButton onClick={() => void save(true)} disabled={saving} className="px-6">
              {t.reportFinish}
            </PrimaryButton>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function ChoiceButton({
  children,
  active,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone: 'green' | 'red';
}) {
  const on =
    tone === 'green'
      ? 'border-[#17A34A] bg-[#17A34A] text-white'
      : 'border-[#E9474D] bg-[#E9474D] text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] flex-1 rounded-[11px] border px-3 text-[12.5px] font-semibold transition ${
        active ? on : 'border-[#E9D9AE] bg-white text-[#5B5E86]'
      }`}
    >
      {children}
    </button>
  );
}
