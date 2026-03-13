import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

const LESSON_PATH = '/lesson-19';
const TASK_LABELS = [
  'Topshiriq 1 — идти / ходить',
  'Topshiriq 2 — ехать / ездить',
  'Topshiriq 3 — лететь / летать',
  'Topshiriq 4 — нести / носить',
  'Topshiriq 5 — вести / водить',
  'Topshiriq 6 — идти/ходить, ехать/ездить',
  'Topshiriq 7 — выбрать правильный вариант',
  'Topshiriq 8 — составьте предложение',
  'Topshiriq 9 — ходить/ездить (прошедшее)',
  'Topshiriq 10 — составьте предложение (ходить/ездить)',
  'Topshiriq 11 — последовательность диалога',
  'Topshiriq 12 — пойти / поехать',
  'Topshiriq 13 — будущее время (пойти/поехать)',
  'Topshiriq 14 — итоговый тест (вариант 1)',
  'Topshiriq 15 — итоговый тест (вариант 2)',
  'Topshiriq 16 — итоговый тест (вариант 3)',
];

export default function LessonNineteenPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">19-dars — Fe'llar harakati</h1>
          <p className="mb-4 text-sm text-slate-500">Глаголы движения</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>Bu darsda rus tilidagi fe'llar harakati mavzusini o'rganamiz.</p>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-900">Asosiy juftliklar</p>
              <p className="mt-1">идти / ходить, ехать / ездить, бежать / бегать</p>
              <p>нести / носить, везти / возить</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">Qoida (qisqacha)</p>
              <p className="mt-1">Bir yo'nalish, hozir yoki ayni vaqtda: идти, ехать</p>
              <p>Takroriy yoki turli yo'nalish: ходить, ездить</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">Nazariya rasmlari</p>
              <div className="mt-3 space-y-3">
                <img src="/lesson-19/theory-1.png" alt="Fe'llar harakati nazariya rasmi 1" className="w-full rounded-lg border border-amber-200 bg-white" />
                <img src="/lesson-19/theory-2.png" alt="Fe'llar harakati nazariya rasmi 2" className="w-full rounded-lg border border-amber-200 bg-white" />
                <img src="/lesson-19/theory-3.png" alt="Fe'llar harakati nazariya rasmi 3" className="w-full rounded-lg border border-amber-200 bg-white" />
              </div>
            </div>
          </div>

          {TASK_LABELS.map((label, i) => {
            const taskNum = i + 1;
            return (
              <button
                key={taskNum}
                type="button"
                onClick={() => navigate(`/lesson-19/topshiriq-${taskNum}`)}
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
