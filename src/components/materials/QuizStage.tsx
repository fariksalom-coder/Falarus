import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import QuestionCard from '../tests/QuestionCard';
import { getTest } from '../../api/teacherTests';
import type { RoomOp, RoomQuiz } from '../../../shared/lessonRoom';
import type { TestQuestion } from '../../../shared/teacherTests';

/**
 * Dars doskasidagi test. O'qituvchi savollarni almashtiradi va kerak bo'lsa savolni qayta ochadi;
 * o'quvchi variantni bosadi — server tekshiradi, natija ikkala ekranda darhol ko'rinadi.
 * O'qituvchi to'g'ri javobni oldindan ko'radi (o'z testini serverdan oladi), o'quvchi — yo'q.
 */
export function QuizStage({ quiz, teacher, token, send, syncing }: {
  quiz: RoomQuiz; teacher: boolean; token: string | null; send: (op: RoomOp) => void; syncing: boolean;
}) {
  const [full, setFull] = useState<TestQuestion[] | null>(null);
  useEffect(() => {
    if (!teacher || !token) return;
    let alive = true;
    getTest(token, quiz.testId).then((t) => { if (alive) setFull(t.questions); }).catch(() => undefined);
    return () => { alive = false; };
  }, [teacher, token, quiz.testId]);

  if (!quiz.questions.length) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[14px] font-bold text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" /> Test ochilmoqda…
      </div>
    );
  }
  const q = Math.min(quiz.q, quiz.questions.length - 1);
  const question = quiz.questions[q];
  const answer = quiz.answers[q] ?? null;
  const answeredCount = Object.keys(quiz.answers).length;
  const rightCount = Object.values(quiz.answers).filter((a) => a.correct).length;
  const go = (n: number) => send({ type: 'quizGo', q: n });

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto overscroll-contain px-3 py-3 sm:items-center">
        <QuestionCard
          index={q}
          total={quiz.questions.length}
          text={question.text}
          options={question.options}
          answer={answer}
          tone="dark"
          busy={syncing}
          disabled={teacher}
          teacherRight={teacher ? full?.[q]?.correct ?? null : null}
          onChoose={teacher ? undefined : (choice) => send({ type: 'quizAnswer', q, choice })}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2">
        {/* Savollar bo'yicha holat: yashil — to'g'ri, qizil — noto'g'ri, oq — hozirgi. */}
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
          {quiz.questions.map((_, i) => {
            const a = quiz.answers[i];
            const tone = a?.correct === true ? 'bg-[#16A34A] text-white' : a?.correct === false ? 'bg-[#EF4444] text-white' : 'bg-white/10 text-white/80';
            return (
              <button
                key={i}
                type="button"
                disabled={!teacher}
                onClick={() => go(i)}
                aria-label={`${i + 1}-savol`}
                aria-current={i === q}
                className={`flex h-9 min-w-[36px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-black ${tone} ${i === q ? 'ring-2 ring-white' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold tabular-nums text-white/85">
          {rightCount}/{answeredCount}
        </span>
        {teacher ? (
          <>
            {answer ? (
              <button type="button" onClick={() => send({ type: 'quizReset', q })} aria-label="Savolni qayta ochish" title="Qayta ochish"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white active:scale-95">
                <RotateCcw className="h-5 w-5" />
              </button>
            ) : null}
            <button type="button" onClick={() => go(q - 1)} disabled={q === 0} aria-label="Oldingi savol"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white active:scale-95 disabled:opacity-35">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(q + 1)} disabled={q >= quiz.questions.length - 1} aria-label="Keyingi savol"
              className="flex h-11 shrink-0 items-center gap-1 rounded-[12px] bg-[#2563EB] px-3 text-[13px] font-bold text-white active:scale-95 disabled:opacity-35">
              Keyingi <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
