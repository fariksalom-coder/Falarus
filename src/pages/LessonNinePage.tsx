import { useNavigate } from 'react-router-dom';

export default function LessonNinePage() {
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

          <h1 className="text-xl font-bold text-slate-900 mb-4">7-dars — Sifat so‘z turkumi (Имя прилагательное)</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-sm text-slate-800 leading-relaxed">
            <p>
              Sifatlar rus tilida <span className="font-semibold">Какой? Какая? Какое? Какие?</span> savollariga javob beradi.
              Sifat otning sifati va belgisini bildiradi, va otning rodi hamda soniga moslashadi.
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-4">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-sky-50">
                  <p className="font-bold text-sky-900">Мужской род</p>
                  <p className="font-semibold">Какой?</p>
                  <p className="mt-1">-ый, -ий, -ой</p>
                  <p className="mt-2">старый, новый, большой, лёгкий</p>
                </div>
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-emerald-50">
                  <p className="font-bold text-emerald-900">Средний род</p>
                  <p className="font-semibold">Какое?</p>
                  <p className="mt-1">-ое, -ее</p>
                  <p className="mt-2">старое, новое, большое, лёгкое</p>
                </div>
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-rose-50">
                  <p className="font-bold text-rose-900">Женский род</p>
                  <p className="font-semibold">Какая?</p>
                  <p className="mt-1">-ая, -яя</p>
                  <p className="mt-2">старая, новая, большая, лёгкая</p>
                </div>
                <div className="p-3 bg-violet-50">
                  <p className="font-bold text-violet-900">Ko‘plik</p>
                  <p className="font-semibold">Какие?</p>
                  <p className="mt-1">-ые, -ие</p>
                  <p className="mt-2">старые, новые, большие, лёгкие</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
                <p className="font-semibold text-amber-900">Misollar</p>
                <p>большой дом</p>
                <p>вкусное молоко</p>
                <p>интересная книга</p>
                <p>маленькая проблема</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-1">
                <p className="font-semibold text-indigo-900">Antonimlar (антонимы)</p>
                <p>новый — старый</p>
                <p>дорогой — дешёвый</p>
                <p>светлый — тёмный</p>
                <p>интересный — скучный</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-9/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Mustahkamlash
          </button>
        </div>
      </main>
    </div>
  );
}
