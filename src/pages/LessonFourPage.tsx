import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

export default function LessonFourPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>

          <h1 className="text-xl font-bold text-slate-900 mb-4">4-dars — OTlarning rodi</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-sm leading-relaxed text-slate-800">
            <p className="font-semibold">Rod turlari</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                <p className="font-bold text-sky-900">Мужской род</p>
                <p className="mt-1">Tugashi: undosh</p>
                <p className="mt-1">Misollar: дом, студент, врач, город, телефон</p>
                <p className="mt-1 font-semibold">Olmosh: он</p>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="font-bold text-rose-900">Женский род</p>
                <p className="mt-1">Tugashi: -а, -я</p>
                <p className="mt-1">Misollar: мама, школа, машина, книга, работа</p>
                <p className="mt-1 font-semibold">Olmosh: она</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="font-bold text-emerald-900">Средний род</p>
                <p className="mt-1">Tugashi: -о, -е</p>
                <p className="mt-1">Misollar: окно, море, письмо, здание, поле</p>
                <p className="mt-1 font-semibold">Olmosh: оно</p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="font-semibold">Istisnolar</p>
              <p>1) -а / -я bilan tugasa ham мужской rod: дедушка, папа, юноша, дядя, мужчина (он).</p>
              <p>2) кофе — мужской род (он).</p>
              <p>3) -мя bilan tugaydigan so‘zlar — средний rod: время, имя, пламя, семя, знамя (оно).</p>
            </div>

            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
              <p className="font-semibold">-ь bilan tugaydigan so‘zlar</p>
              <p className="font-semibold">Мужской:</p>
              <p>словарь, учитель, водитель, день, январь, февраль, апрель, июль, рубль, камень</p>
              <p className="font-semibold">Женский:</p>
              <p>дверь, ночь, тетрадь, кровать, любовь, жизнь, площадь, вещь, помощь, соль</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-4/mustahkamlash')}
            className={getTaskButtonClassName('/lesson-4', 1, true)}
          >
            Topshiriq
          </button>
        </div>
      </main>
    </div>
  );
}
