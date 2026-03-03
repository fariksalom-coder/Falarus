import { useNavigate } from 'react-router-dom';

export default function LessonTenPage() {
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

          <h1 className="text-xl font-bold text-slate-900 mb-4">10-dars — Инфинитив</h1>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 text-sm text-slate-800 leading-relaxed">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold text-sky-900">1) Nazariya</p>
              <p>
                Infinitiv — fe&apos;lning boshlang&apos;ich shakli. U faqat harakatni bildiradi, vaqtni, shaxsni va sonni
                ko&apos;rsatmaydi.
              </p>
              <p>Masalan: читать, писать, говорить, работать.</p>
              <p>
                Savollari: <span className="font-semibold">Что делать?</span>, <span className="font-semibold">Что сделать?</span>
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <p className="font-semibold text-emerald-900">2) Qanday tugaydi?</p>
              <p>-ть: читать, писать, работать</p>
              <p>-ться: учиться, общаться</p>
              <p>-ти: нести, везти</p>
              <p>-чь: мочь, беречь</p>
              <p className="text-emerald-900">Lug‘atda fe&apos;llar infinitiv shaklda yoziladi.</p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-1">
              <p className="font-semibold text-violet-900">3) Ko‘p ishlatiladigan infinitivlar</p>
              <p>делать, работать, гулять, учить, учиться, писать, говорить, знать</p>
              <p>слушать, отдыхать, помочь, нести, везти</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
              <p className="font-semibold text-amber-900">4) Qachon ishlatiladi?</p>
              <p>хочу: Я хочу пить.</p>
              <p>могу: Я могу помочь.</p>
              <p>надо: Мне надо работать.</p>
              <p>должен: Он должен прийти.</p>
              <p>люблю: Я люблю читать.</p>
              <p>начал: Я начал учить.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-10/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Mustahkamlash
          </button>
        </div>
      </main>
    </div>
  );
}
