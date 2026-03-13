import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

const LESSON_PATH = '/lesson-18';

export default function LessonEighteenPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">18-dars — Fe'llarning buyruq shakli</h1>
          <p className="mb-4 text-sm text-slate-500">Повелительный вид глаголов</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>Rus tilida "buyruq" gaplarni gapirish uchun quyidagi qoidani bilishimiz kerak.</p>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-900">Qoida 1</p>
              <p className="mt-1">Я читаю → читай</p>
              <p>Я рисую → рисуй</p>
              <p>Я мечтаю → мечтай</p>
              <p>Я умываюсь → умывайся</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">Qoida 2</p>
              <p className="mt-1">Я смотрю → смотри</p>
              <p>Я говорю → говори</p>
              <p>Я пишу → пиши</p>
              <p>Я готовлюсь → готовься</p>
            </div>

            <div className="rounded-xl border border-slate-300 bg-white p-3">
              <p className="font-semibold">Buyruq fe'llarga misollar</p>
              <p className="mt-2">Ты: читай, говори, пиши, скажи, объясни, готовься, старайся, обращайся</p>
              <p>Вы: читайте, говорите, пишите, скажите, объясните, готовьтесь, старайтесь, обращайтесь</p>
            </div>
          </div>

          {Array.from({ length: 5 }, (_, i) => i + 1).map((taskNum) => (
            <button
              key={taskNum}
              type="button"
              onClick={() => navigate(`/lesson-18/topshiriq-${taskNum}`)}
              className={getTaskButtonClassName(LESSON_PATH, taskNum, taskNum === 1)}
            >
              Topshiriq {taskNum}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
