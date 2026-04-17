import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpenText, ChevronRight } from 'lucide-react';
import { VOCABULARY_TEXTS } from '../data/vocabularyTexts';

const LEVEL_STYLE: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-sky-100 text-sky-700',
  B1: 'bg-violet-100 text-violet-700',
};

export default function VocabularyTextsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-4xl px-4 py-6 md:px-5 md:py-8">
        <button
          type="button"
          onClick={() => navigate('/vocabulary')}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <h1 className="text-2xl font-bold text-slate-900">Matnlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Matnni o&apos;qing, so&apos;z ustiga bosing va tarjima hamda talaffuzni ko&apos;ring.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {VOCABULARY_TEXTS.map((text) => (
            <button
              key={text.id}
              type="button"
              onClick={() => navigate(`/vocabulary/matnlar/${text.id}`)}
              className="group flex w-full flex-col items-start rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpenText className="h-5 w-5" />
              </div>

              <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{text.title}</p>
              <span
                className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_STYLE[text.level] ?? 'bg-slate-100 text-slate-700'}`}
              >
                {text.level}
              </span>
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{text.description}</p>
              <ChevronRight className="mt-1 h-4 w-4 text-slate-400 transition group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
