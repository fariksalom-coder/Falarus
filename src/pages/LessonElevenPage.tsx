import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

const LESSON_PATH = '/lesson-11';
const TASK_BUTTONS: { path: string; label: string; taskNum: number }[] = [
  { path: '/lesson-11/mustahkamlash', label: 'Topshiriq', taskNum: 1 },
  { path: '/lesson-11/zadanie-1', label: 'Topshiriq 1', taskNum: 2 },
  ...Array.from({ length: 14 }, (_, i) => ({
    path: `/lesson-11/topshiriq-${i + 2}`,
    label: `Topshiriq ${i + 2}`,
    taskNum: i + 3,
  })),
];

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

          {TASK_BUTTONS.map(({ path, label, taskNum }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={getTaskButtonClassName(LESSON_PATH, taskNum, taskNum === 1)}
            >
              {label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
