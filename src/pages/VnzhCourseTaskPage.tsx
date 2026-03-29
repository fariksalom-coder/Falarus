import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Circle, FileText, MonitorPlay, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVnzhSection, getVnzhTask, isVnzhFreeTask } from '../data/vnzhCourseData';
import { useAccess } from '../context/AccessContext';
import { VNZH_LISTENING_TASK_EIGHT_TO_TEN, VNZH_LISTENING_TASK_FIVE, VNZH_LISTENING_TASK_SEVEN, VNZH_LISTENING_TASK_SIX, type VnzhListeningChoiceItem, type VnzhListeningFillBlankItem, type VnzhListeningTripleChoiceItem } from '../data/vnzhListeningTasks';
import { VNZH_READING_TASK_ELEVEN, VNZH_READING_TASK_THIRTEEN_TO_SEVENTEEN, VNZH_READING_TASK_TWELVE, type VnzhNoticeChoiceItem, type VnzhReadingPassageItem } from '../data/vnzhReadingTasks';
import { VNZH_SPEAKING_TASK_FOUR, VNZH_SPEAKING_TASK_ONE, VNZH_SPEAKING_TASK_THREE, VNZH_SPEAKING_TASK_TWO } from '../data/vnzhSpeakingTasks';
import { VNZH_STATIC_CHOICE_TASKS, type VnzhStaticChoiceItem } from '../data/vnzhStaticChoiceTasks';
import { VNZH_WRITING_TASK_EIGHTEEN, VNZH_WRITING_TASK_NINETEEN, type VnzhWritingMediaItem, type VnzhWritingPromptAnswerItem } from '../data/vnzhWritingTasks';
import { courseAssetUrl } from '../utils/courseAssetUrl';

const BG = '#F8FBFF';
const BORDER = '#D9E7F7';
const TEXT = '#17324F';
const TEXT_SECONDARY = '#6B7F99';

function MediaLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
      {icon}
      {label}
    </div>
  );
}

function normalizeFillAnswer(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').replace(/[.!,;:]+$/g, '');
}

function matchesFillAnswer(value: string, expected: string) {
  const normalizedValue = normalizeFillAnswer(value);
  const normalizedExpected = normalizeFillAnswer(expected);
  if (!normalizedValue) return false;
  if (normalizedValue === normalizedExpected) return true;

  const strippedExpected = normalizedExpected.replace(/^(в|во|на|к|ко)\s+/, '');
  const strippedValue = normalizedValue.replace(/^(в|во|на|к|ко)\s+/, '');
  return strippedValue === strippedExpected;
}

function AudioCard({ src }: { src: string }) {
  return (
    <div className="rounded-[24px] border bg-white p-4 shadow-[0_14px_28px_rgba(148,163,184,0.12)]" style={{ borderColor: BORDER }}>
      <audio controls preload="none" className="w-full" src={courseAssetUrl(src)} />
    </div>
  );
}

function ChoiceOption({
  label,
  state,
  onClick,
  disabled,
}: {
  label: string;
  state: 'idle' | 'correct' | 'wrong' | 'correct-answer';
  onClick: () => void;
  disabled: boolean;
}) {
  let borderColor = '#C4D6EC';
  let backgroundColor = '#FFFFFF';
  let icon = <Circle className="h-5 w-5 text-[#A8BEDA]" />;

  if (state === 'correct' || state === 'correct-answer') {
    borderColor = '#16A34A';
    backgroundColor = '#ECFDF3';
    icon = (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16A34A] text-white">
        <Check className="h-4 w-4" />
      </span>
    );
  } else if (state === 'wrong') {
    borderColor = '#EF4444';
    backgroundColor = '#FEF2F2';
    icon = (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EF4444] text-white">
        <X className="h-4 w-4" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-[22px] border px-4 py-3 text-left transition"
      style={{ borderColor, backgroundColor }}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0 text-[16px] sm:text-[17px]" style={{ color: TEXT }}>
          {label}
        </div>
      </div>
    </button>
  );
}

function ListeningChoiceContent({
  items,
  currentIndex,
  answers,
  setAnswers,
}: {
  items: VnzhListeningChoiceItem[];
  currentIndex: number;
  answers: Record<string, number>;
  setAnswers: Dispatch<SetStateAction<Record<string, number>>>;
}) {
  const item = items[currentIndex - 1];
  const key = String(item.index);
  const selected = answers[key];
  const answered = typeof selected === 'number';

  return (
    <div className="space-y-4">
      <AudioCard src={item.audioUrl} />

      <article
        className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
        style={{ borderColor: BORDER }}
      >
        <h2 className="text-[18px] font-bold sm:text-[20px]" style={{ color: TEXT }}>
          {item.prompt}
        </h2>

        <div className="mt-4 space-y-3">
          {item.options.map((option, optionIndex) => {
            let state: 'idle' | 'correct' | 'wrong' | 'correct-answer' = 'idle';
            if (answered && optionIndex === item.correctIndex && selected === optionIndex) state = 'correct';
            else if (answered && optionIndex === item.correctIndex) state = 'correct-answer';
            else if (answered && selected === optionIndex) state = 'wrong';

            return (
              <ChoiceOption
                key={`${item.index}-${optionIndex}`}
                label={option}
                state={state}
                disabled={answered}
                onClick={() => setAnswers((prev) => ({ ...prev, [key]: optionIndex }))}
              />
            );
          })}
        </div>
      </article>
    </div>
  );
}

function ListeningFillBlankContent({
  items,
  currentIndex,
}: {
  items: VnzhListeningFillBlankItem[];
  currentIndex: number;
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const item = items[currentIndex - 1];
  const value = values[item.index] ?? '';
  const hasValue = value.trim().length > 0;
  const correct = hasValue ? matchesFillAnswer(value, item.answer) : false;

  return (
    <div className="space-y-4">
      <AudioCard src={item.audioUrl} />

      <article
        className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
        style={{ borderColor: BORDER }}
      >
        <p className="text-[18px] font-bold leading-8 sm:text-[20px]" style={{ color: TEXT }}>
          {item.prompt}
        </p>

        <input
          type="text"
          value={value}
          onChange={(event) => setValues((prev) => ({ ...prev, [item.index]: event.target.value }))}
          placeholder="Введите ответ"
          className="mt-4 w-full rounded-[20px] border bg-white px-4 py-3 text-[16px] outline-none transition focus:ring-4 focus:ring-[#DBEAFF]"
          style={{
            borderColor: !hasValue ? '#C4D6EC' : correct ? '#16A34A' : '#EF4444',
            backgroundColor: !hasValue ? '#FFFFFF' : correct ? '#ECFDF3' : '#FEF2F2',
            color: TEXT,
          }}
        />

        {hasValue ? (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold"
            style={{
              backgroundColor: correct ? '#ECFDF3' : '#FCE7E7',
              color: correct ? '#16A34A' : '#DC2626',
            }}
          >
            {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {correct ? 'Верно' : `Правильный ответ: ${item.answer}`}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function ListeningTripleChoiceContent({
  items,
  currentIndex,
  answers,
  setAnswers,
}: {
  items: VnzhListeningTripleChoiceItem[];
  currentIndex: number;
  answers: Record<string, number>;
  setAnswers: Dispatch<SetStateAction<Record<string, number>>>;
}) {
  const item = items[currentIndex - 1];

  return (
    <div className="space-y-4">
      <AudioCard src={item.audioUrl} />

      <div className="space-y-4">
        {item.questions.map((question, questionIndex) => {
          const answerKey = `${item.index}-${questionIndex}`;
          const selected = answers[answerKey];
          const answered = typeof selected === 'number';

          return (
            <article
              key={answerKey}
              className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
              style={{ borderColor: BORDER }}
            >
              <h2 className="text-[18px] font-bold sm:text-[20px]" style={{ color: TEXT }}>
                {question.prompt}
              </h2>

              <div className="mt-4 space-y-3">
                {question.options.map((option, optionIndex) => {
                  let state: 'idle' | 'correct' | 'wrong' | 'correct-answer' = 'idle';
                  if (answered && optionIndex === question.correctIndex && selected === optionIndex) state = 'correct';
                  else if (answered && optionIndex === question.correctIndex) state = 'correct-answer';
                  else if (answered && selected === optionIndex) state = 'wrong';

                  return (
                    <ChoiceOption
                      key={`${answerKey}-${optionIndex}`}
                      label={option}
                      state={state}
                      disabled={answered}
                      onClick={() => setAnswers((prev) => ({ ...prev, [answerKey]: optionIndex }))}
                    />
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StaticChoiceContent({
  items,
  currentIndex,
  answers,
  setAnswers,
}: {
  items: VnzhStaticChoiceItem[];
  currentIndex: number;
  answers: Record<string, number>;
  setAnswers: Dispatch<SetStateAction<Record<string, number>>>;
}) {
  const item = items[currentIndex - 1];
  const key = String(item.index);
  const selected = answers[key];
  const answered = typeof selected === 'number';

  return (
    <article
      className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
      style={{ borderColor: BORDER }}
    >
      <h2 className="text-[18px] font-bold whitespace-pre-line sm:text-[20px]" style={{ color: TEXT }}>
        {item.prompt}
      </h2>

      <div className="mt-4 space-y-3">
        {item.options.map((option, optionIndex) => {
          let state: 'idle' | 'correct' | 'wrong' | 'correct-answer' = 'idle';
          if (answered && optionIndex === item.correctIndex && selected === optionIndex) state = 'correct';
          else if (answered && optionIndex === item.correctIndex) state = 'correct-answer';
          else if (answered && selected === optionIndex) state = 'wrong';

          return (
            <ChoiceOption
              key={`${item.index}-${optionIndex}`}
              label={option}
              state={state}
              disabled={answered}
              onClick={() => setAnswers((prev) => ({ ...prev, [key]: optionIndex }))}
            />
          );
        })}
      </div>
    </article>
  );
}

function NoticeChoiceContent({
  items,
  currentIndex,
  answers,
  setAnswers,
}: {
  items: VnzhNoticeChoiceItem[];
  currentIndex: number;
  answers: Record<string, number>;
  setAnswers: Dispatch<SetStateAction<Record<string, number>>>;
}) {
  const item = items[currentIndex - 1];
  const key = String(item.index);
  const selected = answers[key];
  const answered = typeof selected === 'number';

  return (
    <article
      className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
      style={{ borderColor: BORDER }}
    >
      {item.noticeText ? (
        <section className="mb-5 rounded-[24px] border bg-[#FAFCFF] p-4" style={{ borderColor: BORDER }}>
          <p className="whitespace-pre-line text-[15px] leading-7" style={{ color: TEXT }}>
            {item.noticeText}
          </p>
        </section>
      ) : item.imageUrl ? (
        <div className="mb-5 overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
          <img src={courseAssetUrl(item.imageUrl)} alt={`Объявление ${item.index}`} className="w-full object-contain" />
        </div>
      ) : null}

      <h2 className="text-[18px] font-bold whitespace-pre-line sm:text-[20px]" style={{ color: TEXT }}>
        {item.prompt}
      </h2>

      <div className="mt-4 space-y-3">
        {item.options.map((option, optionIndex) => {
          let state: 'idle' | 'correct' | 'wrong' | 'correct-answer' = 'idle';
          if (answered && optionIndex === item.correctIndex && selected === optionIndex) state = 'correct';
          else if (answered && optionIndex === item.correctIndex) state = 'correct-answer';
          else if (answered && selected === optionIndex) state = 'wrong';

          return (
            <ChoiceOption
              key={`${item.index}-${optionIndex}`}
              label={option}
              state={state}
              disabled={answered}
              onClick={() => setAnswers((prev) => ({ ...prev, [key]: optionIndex }))}
            />
          );
        })}
      </div>
    </article>
  );
}

function ReadingPassageContent({
  items,
  currentIndex,
  answers,
  setAnswers,
}: {
  items: VnzhReadingPassageItem[];
  currentIndex: number;
  answers: Record<string, number>;
  setAnswers: Dispatch<SetStateAction<Record<string, number>>>;
}) {
  const item = items[currentIndex - 1];

  return (
    <article
      className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
      style={{ borderColor: BORDER }}
    >
      {item.title ? (
        <h2 className="mb-3 text-[18px] font-bold sm:text-[20px]" style={{ color: TEXT }}>
          {item.title}
        </h2>
      ) : null}

      <section className="rounded-[24px] border bg-[#FAFCFF] p-4" style={{ borderColor: BORDER }}>
        <p className="whitespace-pre-line text-[15px] leading-7" style={{ color: TEXT }}>
          {item.passage}
        </p>
      </section>

      <div className="mt-5 space-y-4">
        {item.questions.map((question, questionIndex) => {
          const answerKey = `${item.index}-${questionIndex}`;
          const selected = answers[answerKey];
          const answered = typeof selected === 'number';

          return (
            <section key={answerKey} className="rounded-[24px] border bg-[#FAFCFF] p-4" style={{ borderColor: BORDER }}>
              <h3 className="text-[17px] font-bold sm:text-[18px]" style={{ color: TEXT }}>
                {question.prompt}
              </h3>

              <div className="mt-4 space-y-3">
                {question.options.map((option, optionIndex) => {
                  let state: 'idle' | 'correct' | 'wrong' | 'correct-answer' = 'idle';
                  if (answered && optionIndex === question.correctIndex && selected === optionIndex) state = 'correct';
                  else if (answered && optionIndex === question.correctIndex) state = 'correct-answer';
                  else if (answered && selected === optionIndex) state = 'wrong';

                  return (
                    <ChoiceOption
                      key={`${answerKey}-${optionIndex}`}
                      label={option}
                      state={state}
                      disabled={answered}
                      onClick={() => setAnswers((prev) => ({ ...prev, [answerKey]: optionIndex }))}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function WritingVideoPhotoContent({
  items,
  currentIndex,
}: {
  items: VnzhWritingMediaItem[];
  currentIndex: number;
}) {
  const item = items[currentIndex - 1];

  return (
    <article
      className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
      style={{ borderColor: BORDER }}
    >
      <div className="space-y-5">
        <video controls preload="metadata" className="w-full rounded-[22px] bg-slate-950" src={courseAssetUrl(item.videoUrl)} />
        <div className="overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
          <img src={courseAssetUrl(item.imageUrl)} alt={`Задание 18 — фото ${item.index}`} className="w-full object-contain" />
        </div>
      </div>
    </article>
  );
}

function WritingPromptAnswerContent({
  items,
  currentIndex,
}: {
  items: VnzhWritingPromptAnswerItem[];
  currentIndex: number;
}) {
  const item = items[currentIndex - 1];

  return (
    <article
      className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
      style={{ borderColor: BORDER }}
    >
      <section className="rounded-[24px] border bg-[#FAFCFF] p-4" style={{ borderColor: BORDER }}>
        <h2 className="text-[17px] font-bold sm:text-[18px]" style={{ color: TEXT }}>
          Задание
        </h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-7" style={{ color: TEXT }}>
          {item.prompt}
        </p>
      </section>

      <section className="mt-5 rounded-[24px] border bg-[#F4F9FF] p-4" style={{ borderColor: '#CFE0F6' }}>
        <h2 className="text-[17px] font-bold sm:text-[18px]" style={{ color: TEXT }}>
          Пример ответа
        </h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-7" style={{ color: TEXT }}>
          {item.answer}
        </p>
      </section>
    </article>
  );
}

function BlockTabs({
  total,
  activeIndex,
  onSelect,
  tabOutcome,
}: {
  total: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  /** MCQ tests: green = верно, red = неверно, pending = ещё не отвечен или не все подвопросы */
  tabOutcome?: (tabNumber: number) => 'pending' | 'correct' | 'wrong';
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {Array.from({ length: total }, (_, index) => {
          const number = index + 1;
          const active = number === activeIndex;
          const outcome = tabOutcome?.(number);

          let background = '#B8C7D9';
          let color = '#FFFFFF';
          let boxShadow = 'none';
          let border = '2px solid transparent';

          if (outcome === 'correct') {
            background = '#16A34A';
            boxShadow = '0 10px 24px rgba(22,163,74,0.16)';
          } else if (outcome === 'wrong') {
            background = '#EF4444';
            boxShadow = '0 10px 24px rgba(239,68,68,0.16)';
          } else if (active) {
            background = '#DBEAFE';
            color = '#2563EB';
            border = '2px solid #93C5FD';
            boxShadow = '0 8px 20px rgba(147,197,253,0.28)';
          }

          return (
            <button
              key={number}
              type="button"
              onClick={() => onSelect(number)}
              className="flex h-12 w-12 items-center justify-center rounded-[16px] text-[18px] font-bold transition-all duration-200 sm:h-[52px] sm:w-[52px] sm:text-[20px]"
              style={{ background, color, boxShadow, border }}
            >
              {number}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function tabOutcomeStaticChoice(
  items: VnzhStaticChoiceItem[],
  answers: Record<string, number>,
  tabNum: number
): 'pending' | 'correct' | 'wrong' {
  const item = items[tabNum - 1];
  if (!item) return 'pending';
  const s = answers[String(item.index)];
  if (typeof s !== 'number') return 'pending';
  return s === item.correctIndex ? 'correct' : 'wrong';
}

function tabOutcomeListeningItem(
  items: VnzhListeningChoiceItem[],
  answers: Record<string, number>,
  tabNum: number
): 'pending' | 'correct' | 'wrong' {
  const item = items[tabNum - 1];
  if (!item) return 'pending';
  const s = answers[String(item.index)];
  if (typeof s !== 'number') return 'pending';
  return s === item.correctIndex ? 'correct' : 'wrong';
}

function tabOutcomeNotice(
  items: VnzhNoticeChoiceItem[],
  answers: Record<string, number>,
  tabNum: number
): 'pending' | 'correct' | 'wrong' {
  const item = items[tabNum - 1];
  if (!item) return 'pending';
  const s = answers[String(item.index)];
  if (typeof s !== 'number') return 'pending';
  return s === item.correctIndex ? 'correct' : 'wrong';
}

function tabOutcomeTripleBlock(
  items: VnzhListeningTripleChoiceItem[],
  answers: Record<string, number>,
  tabNum: number
): 'pending' | 'correct' | 'wrong' {
  const item = items[tabNum - 1];
  if (!item) return 'pending';
  for (let qi = 0; qi < item.questions.length; qi++) {
    const k = `${item.index}-${qi}`;
    if (typeof answers[k] !== 'number') return 'pending';
  }
  for (let qi = 0; qi < item.questions.length; qi++) {
    const k = `${item.index}-${qi}`;
    if (answers[k] !== item.questions[qi].correctIndex) return 'wrong';
  }
  return 'correct';
}

function tabOutcomeReadingPassage(
  items: VnzhReadingPassageItem[],
  answers: Record<string, number>,
  tabNum: number
): 'pending' | 'correct' | 'wrong' {
  const item = items[tabNum - 1];
  if (!item) return 'pending';
  for (let qi = 0; qi < item.questions.length; qi++) {
    const k = `${item.index}-${qi}`;
    if (typeof answers[k] !== 'number') return 'pending';
  }
  for (let qi = 0; qi < item.questions.length; qi++) {
    const k = `${item.index}-${qi}`;
    if (answers[k] !== item.questions[qi].correctIndex) return 'wrong';
  }
  return 'correct';
}

function TaskPager({
  currentIndex,
  total,
  onSelect,
}: {
  currentIndex: number;
  total: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onSelect(Math.max(1, currentIndex - 1))}
        disabled={currentIndex === 1}
        className="inline-flex items-center gap-2 rounded-[16px] border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.12)] disabled:opacity-50"
        style={{ borderColor: BORDER }}
      >
        <ChevronLeft className="h-4 w-4" />
        Oldingi
      </button>

      <button
        type="button"
        onClick={() => onSelect(Math.min(total, currentIndex + 1))}
        disabled={currentIndex === total}
        className="inline-flex items-center gap-2 rounded-[16px] bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] disabled:opacity-50"
      >
        Keyingi
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SpeakingTaskOneContent({ currentIndex }: { currentIndex: number }) {
  const item = VNZH_SPEAKING_TASK_ONE.items[currentIndex - 1];

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border bg-white p-5 shadow-[0_18px_44px_rgba(148,163,184,0.12)]" style={{ borderColor: BORDER }}>
        <MediaLabel icon={<MonitorPlay className="h-4 w-4" />} label="Видеоурок" />
        <video
          controls
          preload="metadata"
          className="w-full rounded-[22px] bg-slate-950"
          src={courseAssetUrl(VNZH_SPEAKING_TASK_ONE.tutorialVideoUrl)}
        />
      </section>

      <article
        className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
        style={{ borderColor: BORDER }}
      >
        <div className="overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
          <img src={courseAssetUrl(item.imageUrl)} alt={`Задание 1 — фото ${item.index}`} className="w-full object-contain" />
        </div>

        <div className="mt-5">
          <div className="rounded-[22px] border bg-[#FAFCFF] p-3" style={{ borderColor: BORDER }}>
            <audio controls preload="none" className="w-full" src={courseAssetUrl(item.audioUrl)} />
          </div>
        </div>
      </article>
    </div>
  );
}

function SpeakingTaskTwoContent({ currentIndex }: { currentIndex: number }) {
  const item = VNZH_SPEAKING_TASK_TWO.items[currentIndex - 1];

  return (
    <div className="space-y-4">
      <article
        className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
        style={{ borderColor: BORDER }}
      >
        <div className="space-y-5">
          <div>
            <div className="rounded-[22px] border bg-[#FAFCFF] p-3" style={{ borderColor: BORDER }}>
              <audio controls preload="none" className="w-full" src={courseAssetUrl(item.questionAudioUrl)} />
            </div>
          </div>

          <div>
            <MediaLabel icon={<MonitorPlay className="h-4 w-4" />} label="Видеоурок" />
            <video
              controls
              preload="metadata"
              className="w-full rounded-[22px] bg-slate-950"
              src={courseAssetUrl(item.lessonVideoUrl)}
            />
          </div>

          <div>
            <div className="overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
              <img src={courseAssetUrl(item.imageUrl)} alt={`Задание 2 — фото ${item.index}`} className="w-full object-contain" />
            </div>
          </div>

          <div>
            <div className="rounded-[22px] border bg-[#FAFCFF] p-3" style={{ borderColor: BORDER }}>
              <audio controls preload="none" className="w-full" src={courseAssetUrl(item.answerAudioUrl)} />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function SpeakingTaskThreeContent({ currentIndex }: { currentIndex: number }) {
  const item = VNZH_SPEAKING_TASK_THREE.items[currentIndex - 1];

  return (
    <div className="space-y-4">
      <article
        className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
        style={{ borderColor: BORDER }}
      >
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
            <img src={courseAssetUrl(item.imageUrl)} alt={`Задание 3 — фото ${item.index}`} className="w-full object-contain" />
          </div>

          <video
            controls
            preload="metadata"
            className="w-full rounded-[22px] bg-slate-950"
            src={courseAssetUrl(item.videoUrl)}
          />

          <div className="rounded-[22px] border bg-[#FAFCFF] p-3" style={{ borderColor: BORDER }}>
            <audio controls preload="none" className="w-full" src={courseAssetUrl(item.audioUrl)} />
          </div>
        </div>
      </article>
    </div>
  );
}

function SpeakingTaskFourContent({ currentIndex }: { currentIndex: number }) {
  const item = VNZH_SPEAKING_TASK_FOUR.items[currentIndex - 1];

  return (
    <div className="space-y-4">
      <article
        className="rounded-[28px] border bg-white p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]"
        style={{ borderColor: BORDER }}
      >
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[22px] border bg-slate-50" style={{ borderColor: BORDER }}>
            <img src={courseAssetUrl(item.imageUrl)} alt={`Задание 4 — фото ${item.index}`} className="w-full object-contain" />
          </div>

          <section className="rounded-[24px] border bg-[#FAFCFF] p-4" style={{ borderColor: BORDER }}>
            <div className="space-y-4">
              {item.textEntries.map((entry, index) => (
                <div key={`${item.index}-${index}`} className="rounded-[20px] bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <p className="text-sm font-semibold leading-6 text-[#2563EB]">
                    {entry.prompt}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-7" style={{ color: TEXT }}>
                    {entry.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-[22px] border bg-[#FAFCFF] p-3" style={{ borderColor: BORDER }}>
            <audio controls preload="none" className="w-full" src={courseAssetUrl(item.audioUrl)} />
          </div>
        </div>
      </article>
    </div>
  );
}

export default function VnzhCourseTaskPage() {
  const navigate = useNavigate();
  const { sectionSlug, taskSlug } = useParams();
  const section = getVnzhSection(sectionSlug);
  const task = getVnzhTask(sectionSlug, taskSlug);
  const { access } = useAccess();
  const staticChoiceItems = task ? VNZH_STATIC_CHOICE_TASKS[task.slug] ?? null : null;
  const [currentIndex, setCurrentIndex] = useState(1);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    setCurrentIndex(1);
    setMcqAnswers({});
  }, [sectionSlug, taskSlug]);

  const locked =
    section &&
    task &&
    access?.vnzh_course_active !== true &&
    !isVnzhFreeTask(section.slug, task.slug);

  useEffect(() => {
    if (locked && section) {
      navigate(`/kurslar/vnzh/${section.slug}`, { replace: true });
    }
  }, [locked, navigate, section]);

  if (!section || !task) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] px-4 py-6">
        <button
          type="button"
          onClick={() => navigate('/kurslar/vnzh')}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.12)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <p className="mt-6 text-lg font-semibold text-slate-800">Задание не найдено</p>
      </div>
    );
  }

  if (locked) {
    return null;
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <button
          type="button"
          onClick={() => navigate(`/kurslar/vnzh/${section.slug}`)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5"
          style={{ borderColor: BORDER }}
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>

        <section
          className="rounded-[28px] border px-5 py-6 shadow-[0_18px_44px_rgba(148,163,184,0.14)]"
          style={{
            borderColor: BORDER,
            background: 'linear-gradient(135deg, #EEF6FF 0%, #E7F1FF 100%)',
          }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: '#6C89AD' }}>
            {section.title}
          </p>
          <h1 className="mt-2 text-[24px] font-bold sm:text-[28px]" style={{ color: TEXT }}>
            {task.title}
          </h1>
        </section>

        <div className="mt-5">
          {section.slug === 'govorenie' && task.slug === '1' ? (
            <div>
              <BlockTabs total={VNZH_SPEAKING_TASK_ONE.items.length} activeIndex={currentIndex} onSelect={setCurrentIndex} />
              <div className="mt-4">
                <SpeakingTaskOneContent currentIndex={currentIndex} />
                <TaskPager currentIndex={currentIndex} total={VNZH_SPEAKING_TASK_ONE.items.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'govorenie' && task.slug === '2' ? (
            <div>
              <BlockTabs total={VNZH_SPEAKING_TASK_TWO.items.length} activeIndex={currentIndex} onSelect={setCurrentIndex} />
              <div className="mt-4">
                <SpeakingTaskTwoContent currentIndex={currentIndex} />
                <TaskPager currentIndex={currentIndex} total={VNZH_SPEAKING_TASK_TWO.items.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'govorenie' && task.slug === '3' ? (
            <div>
              <BlockTabs total={VNZH_SPEAKING_TASK_THREE.items.length} activeIndex={currentIndex} onSelect={setCurrentIndex} />
              <div className="mt-4">
                <SpeakingTaskThreeContent currentIndex={currentIndex} />
                <TaskPager currentIndex={currentIndex} total={VNZH_SPEAKING_TASK_THREE.items.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'govorenie' && task.slug === '4' ? (
            <div>
              <BlockTabs total={VNZH_SPEAKING_TASK_FOUR.items.length} activeIndex={currentIndex} onSelect={setCurrentIndex} />
              <div className="mt-4">
                <SpeakingTaskFourContent currentIndex={currentIndex} />
                <TaskPager currentIndex={currentIndex} total={VNZH_SPEAKING_TASK_FOUR.items.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'audirovanie' && task.slug === '5' ? (
            <div>
              <BlockTabs
                total={VNZH_LISTENING_TASK_FIVE.length}
                activeIndex={currentIndex}
                onSelect={setCurrentIndex}
                tabOutcome={(n) => tabOutcomeListeningItem(VNZH_LISTENING_TASK_FIVE, mcqAnswers, n)}
              />
              <div className="mt-4">
                <ListeningChoiceContent
                  items={VNZH_LISTENING_TASK_FIVE}
                  currentIndex={currentIndex}
                  answers={mcqAnswers}
                  setAnswers={setMcqAnswers}
                />
                <TaskPager currentIndex={currentIndex} total={VNZH_LISTENING_TASK_FIVE.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'audirovanie' && task.slug === '6' ? (
            <div>
              <BlockTabs total={VNZH_LISTENING_TASK_SIX.length} activeIndex={currentIndex} onSelect={setCurrentIndex} />
              <div className="mt-4">
                <ListeningFillBlankContent items={VNZH_LISTENING_TASK_SIX} currentIndex={currentIndex} />
                <TaskPager currentIndex={currentIndex} total={VNZH_LISTENING_TASK_SIX.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'audirovanie' && task.slug === '7' ? (
            <div>
              <BlockTabs
                total={VNZH_LISTENING_TASK_SEVEN.length}
                activeIndex={currentIndex}
                onSelect={setCurrentIndex}
                tabOutcome={(n) => tabOutcomeListeningItem(VNZH_LISTENING_TASK_SEVEN, mcqAnswers, n)}
              />
              <div className="mt-4">
                <ListeningChoiceContent
                  items={VNZH_LISTENING_TASK_SEVEN}
                  currentIndex={currentIndex}
                  answers={mcqAnswers}
                  setAnswers={setMcqAnswers}
                />
                <TaskPager currentIndex={currentIndex} total={VNZH_LISTENING_TASK_SEVEN.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'audirovanie' && task.slug === '8-10' ? (
            <div>
              <BlockTabs
                total={VNZH_LISTENING_TASK_EIGHT_TO_TEN.length}
                activeIndex={currentIndex}
                onSelect={setCurrentIndex}
                tabOutcome={(n) => tabOutcomeTripleBlock(VNZH_LISTENING_TASK_EIGHT_TO_TEN, mcqAnswers, n)}
              />
              <div className="mt-4">
                <ListeningTripleChoiceContent
                  items={VNZH_LISTENING_TASK_EIGHT_TO_TEN}
                  currentIndex={currentIndex}
                  answers={mcqAnswers}
                  setAnswers={setMcqAnswers}
                />
                <TaskPager currentIndex={currentIndex} total={VNZH_LISTENING_TASK_EIGHT_TO_TEN.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'chtenie' && task.slug === '11' ? (
            <div>
              <BlockTabs
                total={VNZH_READING_TASK_ELEVEN.length}
                activeIndex={currentIndex}
                onSelect={setCurrentIndex}
                tabOutcome={(n) => tabOutcomeNotice(VNZH_READING_TASK_ELEVEN, mcqAnswers, n)}
              />
              <div className="mt-4">
                <NoticeChoiceContent
                  items={VNZH_READING_TASK_ELEVEN}
                  currentIndex={currentIndex}
                  answers={mcqAnswers}
                  setAnswers={setMcqAnswers}
                />
                <TaskPager currentIndex={currentIndex} total={VNZH_READING_TASK_ELEVEN.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'chtenie' && task.slug === '12' ? (
            <div>
              <BlockTabs
                total={VNZH_READING_TASK_TWELVE.length}
                activeIndex={currentIndex}
                onSelect={setCurrentIndex}
                tabOutcome={(n) => tabOutcomeNotice(VNZH_READING_TASK_TWELVE, mcqAnswers, n)}
              />
              <div className="mt-4">
                <NoticeChoiceContent
                  items={VNZH_READING_TASK_TWELVE}
                  currentIndex={currentIndex}
                  answers={mcqAnswers}
                  setAnswers={setMcqAnswers}
                />
                <TaskPager currentIndex={currentIndex} total={VNZH_READING_TASK_TWELVE.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'chtenie' && task.slug === '13-17' ? (
            <div>
              <BlockTabs
                total={VNZH_READING_TASK_THIRTEEN_TO_SEVENTEEN.length}
                activeIndex={currentIndex}
                onSelect={setCurrentIndex}
                tabOutcome={(n) => tabOutcomeReadingPassage(VNZH_READING_TASK_THIRTEEN_TO_SEVENTEEN, mcqAnswers, n)}
              />
              <div className="mt-4">
                <ReadingPassageContent
                  items={VNZH_READING_TASK_THIRTEEN_TO_SEVENTEEN}
                  currentIndex={currentIndex}
                  answers={mcqAnswers}
                  setAnswers={setMcqAnswers}
                />
                <TaskPager currentIndex={currentIndex} total={VNZH_READING_TASK_THIRTEEN_TO_SEVENTEEN.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'pismo' && task.slug === '18' ? (
            <div>
              <BlockTabs total={VNZH_WRITING_TASK_EIGHTEEN.length} activeIndex={currentIndex} onSelect={setCurrentIndex} />
              <div className="mt-4">
                <WritingVideoPhotoContent items={VNZH_WRITING_TASK_EIGHTEEN} currentIndex={currentIndex} />
                <TaskPager currentIndex={currentIndex} total={VNZH_WRITING_TASK_EIGHTEEN.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : section.slug === 'pismo' && task.slug === '19' ? (
            <div>
              <BlockTabs total={VNZH_WRITING_TASK_NINETEEN.length} activeIndex={currentIndex} onSelect={setCurrentIndex} />
              <div className="mt-4">
                <WritingPromptAnswerContent items={VNZH_WRITING_TASK_NINETEEN} currentIndex={currentIndex} />
                <TaskPager currentIndex={currentIndex} total={VNZH_WRITING_TASK_NINETEEN.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : staticChoiceItems ? (
            <div>
              <BlockTabs
                total={staticChoiceItems.length}
                activeIndex={currentIndex}
                onSelect={setCurrentIndex}
                tabOutcome={(n) => tabOutcomeStaticChoice(staticChoiceItems, mcqAnswers, n)}
              />
              <div className="mt-4">
                <StaticChoiceContent
                  items={staticChoiceItems}
                  currentIndex={currentIndex}
                  answers={mcqAnswers}
                  setAnswers={setMcqAnswers}
                />
                <TaskPager currentIndex={currentIndex} total={staticChoiceItems.length} onSelect={setCurrentIndex} />
              </div>
            </div>
          ) : (
            <section
              className="rounded-[28px] border bg-white px-5 py-10 text-center shadow-[0_18px_44px_rgba(148,163,184,0.12)]"
              style={{ borderColor: BORDER }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF4FF] text-[#2563EB]">
                <FileText className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-[22px] font-bold" style={{ color: TEXT }}>
                Пустой экран
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm sm:text-[15px]" style={{ color: TEXT_SECONDARY }}>
                Здесь позже появится содержимое этого задания. Каркас уже готов, и мы можем постепенно
                заполнять каждый экран отдельно.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
