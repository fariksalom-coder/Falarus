import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSequentialLesson } from '../context/SequentialLessonContext';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

type VerbRow = {
  infinitive: string;
  uzbek: string;
  ya: string;
  ty: string;
  on: string;
  my: string;
  vy: string;
  oni: string;
};

const VERBS: VerbRow[] = [
  { infinitive: 'хотеть', uzbek: 'xohlamoq', ya: 'хочу', ty: 'хочешь', on: 'хочет', my: 'хотим', vy: 'хотите', oni: 'хотят' },
  { infinitive: 'мочь', uzbek: 'qila olmoq', ya: 'могу', ty: 'можешь', on: 'может', my: 'можем', vy: 'можете', oni: 'могут' },
  { infinitive: 'брать', uzbek: 'olmoq', ya: 'беру', ty: 'берёшь', on: 'берёт', my: 'берём', vy: 'берёте', oni: 'берут' },
  { infinitive: 'дать', uzbek: 'bermoq', ya: 'дам', ty: 'дашь', on: 'даст', my: 'дадим', vy: 'дадите', oni: 'дадут' },
  { infinitive: 'есть', uzbek: 'yemoq', ya: 'ем', ty: 'ешь', on: 'ест', my: 'едим', vy: 'едите', oni: 'едят' },
  { infinitive: 'пить', uzbek: 'ichmoq', ya: 'пью', ty: 'пьёшь', on: 'пьёт', my: 'пьём', vy: 'пьёте', oni: 'пьют' },
  { infinitive: 'жить', uzbek: 'yashamoq', ya: 'живу', ty: 'живёшь', on: 'живёт', my: 'живём', vy: 'живёте', oni: 'живут' },
  { infinitive: 'ждать', uzbek: 'kutmoq', ya: 'жду', ty: 'ждёшь', on: 'ждёт', my: 'ждём', vy: 'ждёте', oni: 'ждут' },
  { infinitive: 'звать', uzbek: 'chaqirmoq', ya: 'зову', ty: 'зовёшь', on: 'зовёт', my: 'зовём', vy: 'зовёте', oni: 'зовут' },
  { infinitive: 'петь', uzbek: 'kuylamoq', ya: 'пою', ty: 'поёшь', on: 'поёт', my: 'поём', vy: 'поёте', oni: 'поют' },
  { infinitive: 'смеяться', uzbek: 'kulmoq', ya: 'смеюсь', ty: 'смеёшься', on: 'смеётся', my: 'смеёмся', vy: 'смеётесь', oni: 'смеются' },
  { infinitive: 'беречь', uzbek: 'asramoq, ehtiyot qilmoq', ya: 'берегу', ty: 'бережёшь', on: 'бережёт', my: 'бережём', vy: 'бережёте', oni: 'берегут' },
  { infinitive: 'помочь', uzbek: 'yordam bermoq', ya: 'помогу', ty: 'поможешь', on: 'поможет', my: 'поможем', vy: 'поможете', oni: 'помогут' },
  { infinitive: 'платить', uzbek: 'to‘lamoq', ya: 'плачу', ty: 'платишь', on: 'платит', my: 'платим', vy: 'платите', oni: 'платят' },
  { infinitive: 'любить', uzbek: 'sevmoq', ya: 'люблю', ty: 'любишь', on: 'любит', my: 'любим', vy: 'любите', oni: 'любят' },
  { infinitive: 'ходить', uzbek: 'yurmoq (piyoda borib kelmoq)', ya: 'хожу', ty: 'ходишь', on: 'ходит', my: 'ходим', vy: 'ходите', oni: 'ходят' },
  { infinitive: 'купить', uzbek: 'sotib olmoq', ya: 'куплю', ty: 'купишь', on: 'купит', my: 'купим', vy: 'купите', oni: 'купят' },
];

export default function LessonFourteenPage() {
  const navigate = useNavigate();
  const { results } = useSequentialLesson();
  const taskResults = useMemo(
    () => results['/lesson-14'] ?? {},
    [results]
  );

  const getTaskButtonClass = (taskN: number, isFirst = false) =>
    getTaskButtonClassName('/lesson-14', taskN, isFirst, taskResults);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>

          <h1 className="text-xl font-bold text-slate-900 mb-4">14-dars — Noto‘g‘ri fe’llar</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 leading-relaxed space-y-3">
            <p>
              Rus tilida ba&apos;zi fe&apos;llar oddiy qoida bo&apos;yicha tuslanmaydi. Ular o&apos;zakda o&apos;zgaradi yoki
              harflar almashadi, shuning uchun alohida yodlab olinadi.
            </p>
            <p>
              Quyida har bir fe&apos;lning <span className="font-semibold">Я / Ты / Он-она / Мы / Вы / Они</span> bilan
              o&apos;zgarishi jadvalda berilgan.
            </p>
            <p className="text-xs text-slate-600">
              Eslatma: <span className="font-semibold">дать, помочь, купить</span> shakllari ko&apos;proq oddiy kelasi
              zamonda ishlatiladi.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-100">
                <tr className="text-left text-slate-700">
                  <th className="px-3 py-2 font-semibold">Fe&apos;l</th>
                  <th className="px-3 py-2 font-semibold">Tarjima</th>
                  <th className="px-3 py-2 font-semibold">Я</th>
                  <th className="px-3 py-2 font-semibold">Ты</th>
                  <th className="px-3 py-2 font-semibold">Он/она</th>
                  <th className="px-3 py-2 font-semibold">Мы</th>
                  <th className="px-3 py-2 font-semibold">Вы</th>
                  <th className="px-3 py-2 font-semibold">Они</th>
                </tr>
              </thead>
              <tbody>
                {VERBS.map((verb) => (
                  <tr key={verb.infinitive} className="border-t border-slate-100 text-slate-900">
                    <td className="px-3 py-2 font-semibold">{verb.infinitive}</td>
                    <td className="px-3 py-2">{verb.uzbek}</td>
                    <td className="px-3 py-2">{verb.ya}</td>
                    <td className="px-3 py-2">{verb.ty}</td>
                    <td className="px-3 py-2">{verb.on}</td>
                    <td className="px-3 py-2">{verb.my}</td>
                    <td className="px-3 py-2">{verb.vy}</td>
                    <td className="px-3 py-2">{verb.oni}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-14/topshiriq-1')}
            className={getTaskButtonClass(1, true)}
          >
            Topshiriq 1 — хотеть
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-14/topshiriq-2')}
            className={getTaskButtonClass(2)}
          >
            Topshiriq 2 — мочь
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-14/topshiriq-3')}
            className={getTaskButtonClass(3)}
          >
            Topshiriq 3 — брать
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-14/topshiriq-4')}
            className={getTaskButtonClass(4)}
          >
            Topshiriq 4 — дать
          </button>
          {[
            { n: 5, v: 'есть' },
            { n: 6, v: 'пить' },
            { n: 7, v: 'ждать' },
            { n: 8, v: 'звать' },
            { n: 9, v: 'петь' },
            { n: 10, v: 'смеяться' },
            { n: 11, v: 'беречь' },
            { n: 12, v: 'помочь' },
            { n: 13, v: 'платить' },
            { n: 14, v: 'любить' },
            { n: 15, v: 'ходить' },
            { n: 16, v: 'купить' },
          ].map(({ n, v }) => (
            <button
              key={n}
              type="button"
              onClick={() => navigate(`/lesson-14/topshiriq-${n}`)}
              className={getTaskButtonClass(n)}
            >
              Topshiriq {n} — {v}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
