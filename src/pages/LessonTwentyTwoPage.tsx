import { useNavigate } from 'react-router-dom';

export default function LessonTwentyTwoPage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">22-dars — Predlojniy padej</h1>
          <p className="mb-4 text-sm text-slate-500">Предложный падеж (основные значения)</p>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>Предложный падеж в русском языке употребляется только с предлогами.</p>
            <p>
              <strong>С предлогами в, на:</strong>
            </p>
            <p>
              а) место действия (где? в чем? на чем?): Сестра учится в школе. Брат работает на заводе.
            </p>
            <p>
              б) время (когда? в каком году? в каком месяце? на какой неделе?): Он приехал в этом году в сентябре. Мы ходили на
              экскурсию на прошлой неделе.
            </p>
            <p>в) средство передвижения: Он приехал в Петербург на поезде.</p>
            <p>
              <strong>С предлогом о:</strong> объект мысли/речи (о ком? о чем?): Мы читали о Юрии Гагарине. Мы говорили о космосе.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-1')}
            className="mt-5 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 1 — Где? (Предложный падеж)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-2')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 2 — Найдите правильную пару
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-3')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 3 — Выберите правильный вариант
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-4')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 4 — Составьте предложение
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-5')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 5 — Место (в + предложный падеж)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-6')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 6 — Найдите правильную пару
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-7')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 7 — Страны (где живёт?)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-8')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 8 — Предложный падеж (тест)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-9')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 9 — Сочетания (в/на)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-10')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 10 — Составьте предложение
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-11')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 11 — Составьте предложение (расширенный)
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-22/topshiriq-12')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 active:scale-[0.99]"
          >
            Topshiriq 12 — Формы слова + предложения
          </button>
        </div>
      </main>
    </div>
  );
}
