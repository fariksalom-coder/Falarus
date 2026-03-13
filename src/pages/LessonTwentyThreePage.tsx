import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

const LESSON_PATH = '/lesson-23';

export default function LessonTwentyThreePage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">23-dars — Predloglar В va НА + Predlojniy padej</h1>
          <p className="mb-4 text-sm text-slate-500">Где? (Предложный падеж)</p>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>
              Bu darsda biz rus tilida qayerda? (где?) degan savolga javob berishni o'rganamiz. Bunda ko'pincha
              <strong> в </strong>
              va
              <strong> на </strong>
              predloglari ishlatiladi.
            </p>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-900">Formula</p>
              <p className="mt-1">Где? → В / НА + предложный падеж</p>
              <p>Я учусь в университете. Студенты сидят на лекции.</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">1) Predlog В (ichida, ichkarida)</p>
              <p className="mt-1">Odatda binolar, yopiq joylar yoki hudud ichida bo'lganda ishlatiladi.</p>
              <p>в школе, в университете, в институте, в классе, в группе</p>
              <p>в банке, в больнице, в поликлинике, в театре, в цирке, в музее, в библиотеке</p>
              <p>в городе, в деревне, в доме, в здании</p>
              <p>в стране, в республике, в районе, в центре</p>
              <p>в Африке, в Азии, в России, в Сибири, в Крыму</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">2) Predlog НА (ustida, ochiq joylarda)</p>
              <p className="mt-1">Ko'pincha ochiq joylar, tadbirlar yoki ish joylari bilan ishlatiladi.</p>
              <p>на факультете, на уроке, на курсе, на лекции, на занятии, на экзамене</p>
              <p>на улице, на проспекте, на площади, на станции, на остановке, на вокзале</p>
              <p>на заводе, на фабрике, на почте</p>
              <p>на спектакле, на концерте, на балете, на выставке, на экскурсии</p>
              <p>на севере, на юге, на западе, на востоке, на родине</p>
              <p>на Украине, на Урале, на Кавказе, на Кубе</p>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="font-semibold text-sky-900">3) Transport bilan</p>
              <p className="mt-1">
                Где? → <strong>в + transport</strong>: в автобусе, в троллейбусе, в трамвае, в такси
              </p>
              <p>
                Как? → <strong>на + transport</strong>: на автобусе, на троллейбусе, на трамвае, на такси
              </p>
              <p>Где? Я в автобусе. Как? Я еду на автобусе.</p>
            </div>

            <div className="rounded-xl border border-slate-300 bg-white p-3">
              <p className="font-semibold text-slate-900">Xulosa</p>
              <p className="mt-1">В → ichkarida bo'lsa</p>
              <p>НА → ochiq joy, tadbir yoki ish joyi bo'lsa</p>
              <p>Transport: в автобусе (ichida), на автобусе (transport orqali)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-23/topshiriq-1')}
            className={getTaskButtonClassName(LESSON_PATH, 1, true)}
          >
            Topshiriq 1 — В / НА + предложный падеж
          </button>
          <button
            type="button"
            onClick={() => navigate('/lesson-23/topshiriq-2')}
            className={getTaskButtonClassName(LESSON_PATH, 2, false)}
          >
            Topshiriq 2 — Комната (составьте предложения)
          </button>
        </div>
      </main>
    </div>
  );
}
