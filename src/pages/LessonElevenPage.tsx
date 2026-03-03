import { useNavigate } from 'react-router-dom';

export default function LessonElevenPage() {
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

          <h1 className="text-xl font-bold text-slate-900 mb-4">11-dars — Fe’l zamonlari: Hozirgi zamon</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-sm text-slate-800 leading-relaxed">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold text-sky-900">Fe&apos;l zamonlari</p>
              <p>Rus tilida fe&apos;lning 3 ta zamoni bor: o‘tgan, hozirgi, kelasi.</p>
              <p>Я работал/а (o‘tgan), Я работаю (hozirgi), Я буду работать (kelasi).</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <p className="font-semibold text-emerald-900">Настоящее время (hozirgi zamon)</p>
              <p>Hozir bo‘layotgan harakatni bildiradi.</p>
              <p>O‘zbekchadagi -япман/-япсан/-япти kabi, rus tilida ham har bir shaxs uchun alohida qo‘shimcha bor.</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3">
                  <p className="font-semibold">Работать (ishlamoq)</p>
                  <p className="mt-2">Я работаю</p>
                  <p>Ты работаешь</p>
                  <p>Он/она работает</p>
                  <p>Мы работаем</p>
                  <p>Вы работаете</p>
                  <p>Они работают</p>
                </div>
                <div className="p-3 bg-violet-50">
                  <p className="font-semibold text-violet-900">Xulosa (qo‘shimchalar)</p>
                  <p className="mt-2">Я: -у / -ю</p>
                  <p>Ты: -ешь / -ишь</p>
                  <p>Он/она: -ет / -ит</p>
                  <p>Мы: -ем / -им</p>
                  <p>Вы: -ете / -ите</p>
                  <p>Они: -ут/-ют / -ат/-ят</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="font-semibold text-amber-900">Misollar</p>
              <p>читать: читаю, читаешь, читает, читаем, читаете, читают</p>
              <p>говорить: говорю, говоришь, говорит, говорим, говорите, говорят</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-11/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Mustahkamlash
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/zadanie-1')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 1
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-2')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 2
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-3')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 3
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-4')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 4
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-5')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 5
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-6')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 6
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-7')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 7
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-8')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 8
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-9')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 9
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-10')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 10
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-11')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 11
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-12')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 12
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-13')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 13
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-14')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 14
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-11/topshiriq-15')}
            className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors active:scale-[0.99]"
          >
            Topshiriq 15
          </button>
        </div>
      </main>
    </div>
  );
}
