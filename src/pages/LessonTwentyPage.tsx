import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

const LESSON_PATH = '/lesson-20';
const TASK_LABELS = Array.from({ length: 7 }, (_, i) => `Topshiriq ${i + 1} — Повторение (${i + 1}-qism)`);

export default function LessonTwentyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border-2 border-slate-100 bg-white p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Orqaga
          </button>

          <h1 className="mb-1 text-xl font-bold text-slate-900">20-dars — Takrorlash</h1>
          <p className="mb-4 text-sm text-slate-500">Повторение</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>Bu darsda oldingi mavzular bo'yicha yakuniy takrorlash testlari bor.</p>
            <p>Testlar qulay bo'lishi uchun bir nechta bo'limlarga bo'lingan (har birida 20 ta).</p>
          </div>

          {TASK_LABELS.map((label, i) => {
            const taskNum = i + 1;
            return (
              <button
                key={taskNum}
                type="button"
                onClick={() => navigate(`/lesson-20/topshiriq-${taskNum}`)}
                className={getTaskButtonClassName(LESSON_PATH, taskNum, taskNum === 1)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
