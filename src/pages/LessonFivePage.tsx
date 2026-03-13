import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

export default function LessonFivePage() {
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

          <h1 className="text-xl font-bold text-slate-900 mb-4">5-dars — -Ь bilan tugaydigan otlarning rodi</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-sm text-slate-800 leading-relaxed">
            <p>
              Rus tilida ba&apos;zi otlar <span className="font-semibold">-ь</span> (yumshatish belgisi) bilan tugaydi. Bunday so&apos;zlar faqat ikki xil
              rodga kiradi: <span className="font-semibold">Мужской род</span> va <span className="font-semibold">Женский род</span>.{' '}
              <span className="font-semibold">Средний род</span> hech qachon <span className="font-semibold">-ь</span> bilan tugamaydi.
            </p>

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold">Мужской род</p>
              <p className="font-semibold">1) Erkak odam yoki kasb bo‘lsa → Мужской род</p>
              <p>учитель — он, водитель — он, покупатель — он</p>
              <p className="text-sky-800">
                Ko&apos;pincha <span className="font-semibold">-тель</span> bilan tugasa → мужской
              </p>
              <p className="font-semibold">2) Oy nomlari → Мужской род</p>
              <p>январь, февраль, апрель, июль, сентябрь</p>
              <p className="text-sky-800">
                Har doim: <span className="font-semibold">он</span>
              </p>
              <p className="font-semibold">3) «день» → Мужской род</p>
              <p>день — он</p>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2">
              <p className="font-semibold">Женский род</p>
              <p>
                <span className="font-semibold">1) -ость</span> bilan tugasa → возможность, необходимость, новость, скорость
              </p>
              <p>
                <span className="font-semibold">2)</span> Quyidagi tovushlardan oldin <span className="font-semibold">-ь</span> bo&apos;lsa ko&apos;pincha
                женский:
                <span className="font-semibold"> -чь, -жь, -шь, -щь, -дь, -вь, -нь</span>
              </p>
              <p>Misollar: ночь, дочь, тетрадь, любовь, жизнь, площадь, кровать</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-5/mustahkamlash')}
            className={getTaskButtonClassName('/lesson-5', 1, true)}
          >
            Topshiriq
          </button>
        </div>
      </main>
    </div>
  );
}
