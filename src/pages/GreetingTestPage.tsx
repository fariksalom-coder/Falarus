import { useNavigate } from 'react-router-dom';

export default function GreetingTestPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
    navigate('/lesson-1');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6">
      <main className="max-w-4xl mx-auto">
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 sm:p-8">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Orqaga
          </button>

          <div className="mt-8 space-y-3 text-base leading-relaxed text-slate-800">
            <p>06:00-12:00 <span className="text-slate-400">{'->'}</span> Доброе утро!</p>
            <p>12:00-18:00 <span className="text-slate-400">{'->'}</span> Добрый день!</p>
            <p>18:00-23:00 <span className="text-slate-400">{'->'}</span> Добрый вечер!</p>
            <p>
              23:00-06:00 <span className="text-slate-400">{'->'}</span> Доброй ночи!
              <span className="text-slate-500 text-sm"> (odatda uyqudan oldin)</span>
            </p>
            <p className="pt-2">Universallar: Здравствуйте!, Привет!</p>
          </div>

          <div className="mt-8 border-t border-slate-300 pt-8 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/lesson-1/salomlashish-test/quiz')}
              className="w-full max-w-md rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-8 py-3 text-lg font-semibold hover:from-indigo-700 hover:to-indigo-600 transition-colors"
            >
              Boshlash
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
