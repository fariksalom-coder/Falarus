import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

export default function LessonSixteenPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">16-dars — Kelasi zamon</h1>
          <p className="mb-4 text-sm text-slate-500">Будущее время (Future Tense)</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>Рус тилида келаси замонда гапиришнинг 2 хил усули бор. Бу дарсда 1-усулни ўрганамиз.</p>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-900">1-усул: быть феъли ёрдамида келаси замон</p>
              <p className="mt-1">Муҳим қоида: <span className="font-semibold">быть + инфинитив</span></p>
              <p>Инфинитив ўзгармайди.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b border-slate-300 p-3 md:border-b-0 md:border-r">
                  <p className="font-semibold">Быть феъли келаси замонда</p>
                  <p className="mt-2">Я — буду</p>
                  <p>Ты — будешь</p>
                  <p>Он / она — будет</p>
                  <p>Мы — будем</p>
                  <p>Вы — будете</p>
                  <p>Они — будут</p>
                </div>
                <div className="bg-violet-50 p-3">
                  <p className="font-semibold text-violet-900">Формула</p>
                  <p className="mt-2">Я буду + феъл</p>
                  <p>Ты будешь + феъл</p>
                  <p>Он/она будет + феъл</p>
                  <p>Мы будем + феъл</p>
                  <p>Вы будете + феъл</p>
                  <p>Они будут + феъл</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">Мисол: Читать</p>
              <p className="mt-1">Я буду читать, Ты будешь читать, Он будет читать.</p>
              <p>Мы будем читать, Вы будете читать, Они будут читать.</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">Мисол: Говорить</p>
              <p className="mt-1">Я буду говорить, Ты будешь говорить, Он будет говорить.</p>
              <p>Мы будем говорить, Вы будете говорить, Они будут говорить.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-16/topshiriq-1')}
            className={getTaskButtonClassName('/lesson-16', 1, true)}
          >
            Topshiriq
          </button>
        </div>
      </main>
    </div>
  );
}
