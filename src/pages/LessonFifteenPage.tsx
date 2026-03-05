import { useNavigate } from 'react-router-dom';

type VerbTask = {
  infinitive: string;
  translation: string;
};

const VERBS: VerbTask[] = [
  { infinitive: 'Называть', translation: 'номламоқ' },
  { infinitive: 'Гулять', translation: 'сайир қилмоқ' },
  { infinitive: 'Начинать', translation: 'бошламоқ' },
  { infinitive: 'Разговаривать', translation: 'гаплашмоқ' },
  { infinitive: 'Слушать', translation: 'тингламоқ' },
  { infinitive: 'Слышать', translation: 'эшитмоқ' },
  { infinitive: 'Завтракать', translation: 'нонушта қилмоқ' },
  { infinitive: 'Ужинать', translation: 'кечки овқат емоқ' },
  { infinitive: 'Изучать', translation: 'ўрганмоқ' },
  { infinitive: 'Спрашивать', translation: 'сўрамоқ' },
  { infinitive: 'Сравнивать', translation: 'солиштирмоқ' },
  { infinitive: 'Смотреть', translation: 'томоша қилмоқ' },
  { infinitive: 'Получать', translation: 'олмоқ' },
  { infinitive: 'Продолжать', translation: 'давом эттирмоқ' },
  { infinitive: 'Повторять', translation: 'такрорламоқ' },
  { infinitive: 'Отвечать', translation: 'жавоб бермоқ' },
  { infinitive: 'Работать', translation: 'ишламоқ' },
  { infinitive: 'Печатать', translation: 'чоп этмоқ' },
  { infinitive: 'Знать', translation: 'билмоқ' },
  { infinitive: 'Увеличивать', translation: 'катталаштирмоқ' },
  { infinitive: 'Уменьшать', translation: 'кичиклаштирмоқ' },
  { infinitive: 'Играть', translation: 'ўйнамоқ' },
  { infinitive: 'Объяснять', translation: 'тушунтирмоқ' },
  { infinitive: 'Скучать', translation: 'соғинмоқ, зерикмоқ' },
  { infinitive: 'Обещать', translation: 'ваъда бермоқ' },
  { infinitive: 'Обедать', translation: 'тушлик қилмоқ' },
  { infinitive: 'Спешить', translation: 'шошмоқ' },
  { infinitive: 'Решать', translation: 'ечмоқ (масала)' },
  { infinitive: 'Иметь', translation: 'эга бўлмоқ' },
  { infinitive: 'Мечтать', translation: 'орзу қилмоқ' },
  { infinitive: 'Помогать', translation: 'ёрдам бермоқ' },
  { infinitive: 'Обеспечивать', translation: 'таъминламоқ' },
  { infinitive: 'Звонить', translation: 'қўнғироқ қилмоқ' },
  { infinitive: 'Заставлять', translation: 'мажбурламоқ' },
  { infinitive: 'Уговаривать', translation: 'кўндирмоқ' },
  { infinitive: 'Зарабатывать', translation: 'ишлаб топмоқ (пул)' },
  { infinitive: 'Потерять', translation: 'йўқотмоқ' },
  { infinitive: 'Соединять', translation: 'бирлаштирмоқ' },
  { infinitive: 'Считать', translation: 'ҳисобламоқ' },
  { infinitive: 'Опоздать', translation: 'кечикмоқ' },
  { infinitive: 'Задержать', translation: 'ушлаб қолмоқ' },
  { infinitive: 'Стареть', translation: 'кексаймоқ' },
];

const FORMS = [
  'Я ______________________________',
  'Ты _____________________________',
  'Он/она _________________________',
  'Мы _____________________________',
  'Вы _____________________________',
  'Они ____________________________',
];

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

          <h1 className="mb-1 text-xl font-bold text-slate-900">15-дaрс — Ўтган замон</h1>
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

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-bold text-slate-900">Топшириқ 1</h2>
            <p className="mt-1 text-sm text-slate-600">
              Берилган феълларни ўтган замонда шахсларга нисбатан тўғри қўшимчалар билан ёзинг.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {VERBS.map((verb) => (
              <div key={verb.infinitive} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 font-semibold text-slate-900">
                  {verb.infinitive} — {verb.translation}
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {FORMS.map((line) => (
                    <p key={`${verb.infinitive}-${line}`} className="font-mono text-xs text-slate-700">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
