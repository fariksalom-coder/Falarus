import { useNavigate } from 'react-router-dom';

export default function LessonThreePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>

          <h1 className="text-xl font-bold text-slate-900 mb-4">3-dars — So‘z turkumlari</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 space-y-4 text-sm leading-relaxed">
            <p>Rus tilida so‘zlar turkumlarga bo‘linadi. Bugun 5 ta asosiy turkumni o‘rganamiz.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-emerald-900">Ot (Имя существительное)</h3>
                <p className="text-[1.05rem] font-semibold text-emerald-900">Кто? Что?</p>
                <p>Odam yoki narsani bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> врач, учитель, дом, книга, машина</p>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-sky-900">Sifat (Имя прилагательное)</h3>
                <p className="text-[1.05rem] font-semibold text-sky-900">Какой?</p>
                <p>Otning belgisini bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> большой дом, красивая машина, новая книга</p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-violet-900">Fe’l (Глагол)</h3>
                <p className="text-[1.05rem] font-semibold text-violet-900">Что делать? Что сделать?</p>
                <p>Harakatni bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> работать, учиться, говорить, читать, писать</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-amber-900">Son (Числительное)</h3>
                <p className="text-[1.05rem] font-semibold text-amber-900">Сколько?</p>
                <p>Miqdorni bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> один, два, три, пять, десять</p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2 sm:col-span-2">
                <h3 className="text-lg font-bold text-rose-900">Ravish (Наречие)</h3>
                <p className="text-[1.05rem] font-semibold text-rose-900">Как?</p>
                <p>Fe’lni tasvirlaydi.</p>
                <p><span className="font-semibold">Misollar:</span> быстро, медленно, хорошо, громко, тихо</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-3/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Mustahkamlash
          </button>
        </div>
      </main>
    </div>
  );
}
