import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

const LESSON_PATH = '/lesson-15';

export default function LessonFifteenPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">15-dars — O‘tgan zamon</h1>
          <p className="mb-4 text-sm text-slate-500">Прошедшее время</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>
              Ўтган замон рус тилида энг осон замон ҳисобланади: феъллардаги <span className="font-semibold">-ть</span>
              {' '}қўшимчаси олиб ташланиб, ўрнига ўтган замон қўшимчалари қўйилади.
            </p>
            <p>
              Бирликда (Я, Ты, Он/Она) ва кўпликда (Мы, Вы, Они) қўшимчалар умумий қоида асосида ишлатилади.
            </p>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-900">Мисол: Быть — бўлмоқ</p>
              <p>Быть → (ть олиб ташланади) + Л / ЛА / ЛИ</p>
              <p className="mt-2">Я был(а), Ты был(а), Он был, Она была, Мы были, Вы были, Они были.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">Хулоса шакли</p>
              <p>Я _________л(а)</p>
              <p>Ты ________л(а)</p>
              <p>Он _________л</p>
              <p>Она ________ла</p>
              <p>Мы _________ли</p>
              <p>Вы _________ли</p>
              <p>Они ________ли</p>
            </div>
          </div>

          {[
            { path: '/lesson-15/mustahkamlash', label: 'Topshiriq', taskNum: 1 },
            ...Array.from({ length: 7 }, (_, i) => ({
              path: `/lesson-15/topshiriq-${i + 1}`,
              label: `Topshiriq ${i + 1}`,
              taskNum: i + 2,
            })),
          ].map(({ path, label, taskNum }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={getTaskButtonClassName(LESSON_PATH, taskNum, taskNum === 1)}
            >
              {label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
