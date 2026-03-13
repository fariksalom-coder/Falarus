import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

export default function LessonThirteenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>

          <h1 className="text-xl font-bold text-slate-900 mb-4">13-dars — -ться fe&apos;llari (hozirgi zamon)</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-sm text-slate-800 leading-relaxed">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold text-sky-900">Qoida</p>
              <p>-ться bilan tugagan fe&apos;llarda hozirgi zamonda:</p>
              <p>Я: -юсь, Вы: -етесь, qolgan shaxslarda shaxs qo‘shimchasi + ся.</p>
              <p>Misol: стараться → стараюсь, стараешься, старается, стараемся, стараетесь, стараются.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3">
                  <p className="font-semibold">Стараться</p>
                  <p className="mt-2">Я стараюсь</p>
                  <p>Ты стараешься</p>
                  <p>Он/она старается</p>
                  <p>Мы стараемся</p>
                  <p>Вы стараетесь</p>
                  <p>Они стараются</p>
                </div>
                <div className="p-3 bg-emerald-50">
                  <p className="font-semibold text-emerald-900">Ошибаться</p>
                  <p className="mt-2">Я ошибаюсь</p>
                  <p>Ты ошибаешься</p>
                  <p>Он/она ошибается</p>
                  <p>Мы ошибаемся</p>
                  <p>Вы ошибаетесь</p>
                  <p>Они ошибаются</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-13/topshiriq-1')}
            className={getTaskButtonClassName('/lesson-13', 1, true)}
          >
            Topshiriq 1
          </button>
        </div>
      </main>
    </div>
  );
}
