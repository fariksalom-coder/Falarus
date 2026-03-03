import { useNavigate } from 'react-router-dom';

export default function LessonTwelvePage() {
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

          <h1 className="text-xl font-bold text-slate-900 mb-4">12-dars — -ова-, -ева- fe’llari (hozirgi zamon)</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-sm text-slate-800 leading-relaxed">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold text-sky-900">Qoida</p>
              <p>
                -ова-, -ева- suffixli fe&apos;llarda hozirgi zamonda bu qism o&apos;rniga <span className="font-semibold">-у / -ю</span>{' '}
                keladi.
              </p>
              <p>Masalan: планировать → планирую, рисовать → рисую.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3">
                  <p className="font-semibold">Планировать (rejalashtirmoq)</p>
                  <p className="mt-2">Я планирую</p>
                  <p>Ты планируешь</p>
                  <p>Он/она планирует</p>
                  <p>Мы планируем</p>
                  <p>Вы планируете</p>
                  <p>Они планируют</p>
                </div>
                <div className="p-3 bg-emerald-50">
                  <p className="font-semibold text-emerald-900">Рисовать (rasm chizmoq)</p>
                  <p className="mt-2">Я рисую</p>
                  <p>Ты рисуешь</p>
                  <p>Он/она рисует</p>
                  <p>Мы рисуем</p>
                  <p>Вы рисуете</p>
                  <p>Они рисуют</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
              <p className="font-semibold text-violet-900">Shaxs qo‘shimchalari</p>
              <p>Я: -ю / -у</p>
              <p>Ты: -ешь</p>
              <p>Он/она: -ет</p>
              <p>Мы: -ем</p>
              <p>Вы: -ете</p>
              <p>Они: -ют / -ут</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-12/topshiriq-1')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Topshiriq 1
          </button>
        </div>
      </main>
    </div>
  );
}
