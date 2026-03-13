import { useNavigate } from 'react-router-dom';
import { getTaskButtonClassName } from '../utils/lessonTaskResults';

export default function LessonTwentyOnePage() {
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

          <h1 className="mb-1 text-xl font-bold text-slate-900">21-dars — Kelishiklar</h1>
          <p className="mb-4 text-sm text-slate-500">Падежи русского языка</p>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            <p>
              <strong>Именительный</strong> — кто? что?
            </p>
            <p>
              <strong>Родительный</strong> — кого? чего?
            </p>
            <p>
              <strong>Дательный</strong> — кому? чему?
            </p>
            <p>
              <strong>Винительный</strong> — кого? что?
            </p>
            <p>
              <strong>Творительный</strong> — кем? чем?
            </p>
            <p>
              <strong>Предложный</strong> — о ком? о чем?
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-21/topshiriq-1')}
            className={getTaskButtonClassName('/lesson-21', 1, true)}
          >
            Topshiriq 1 — Падежи русского языка
          </button>
        </div>
      </main>
    </div>
  );
}
