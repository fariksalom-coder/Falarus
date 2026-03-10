import { useNavigate } from 'react-router-dom';
import { 
  House,
  BookMarked,
  BarChart3,
  User
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const openLessonOneBlocks = () => navigate('/lesson-1');
  const openLessonTwoBlocks = () => navigate('/lesson-2');
  const openLessonThreeBlocks = () => navigate('/lesson-3');
  const openLessonFourBlocks = () => navigate('/lesson-4');
  const openLessonFiveBlocks = () => navigate('/lesson-5');
  const openLessonSixBlocks = () => navigate('/lesson-6');
  const openLessonSevenBlocks = () => navigate('/lesson-7');
  const openLessonEightBlocks = () => navigate('/lesson-8');
  const openLessonNineBlocks = () => navigate('/lesson-9');
  const openLessonTenBlocks = () => navigate('/lesson-10');
  const openLessonElevenBlocks = () => navigate('/lesson-11');
  const openLessonTwelveBlocks = () => navigate('/lesson-12');
  const openLessonThirteenBlocks = () => navigate('/lesson-13');
  const openLessonFourteenBlocks = () => navigate('/lesson-14');
  const openLessonFifteenBlocks = () => navigate('/lesson-15');
  const openLessonSixteenBlocks = () => navigate('/lesson-16');
  const openLessonSeventeenBlocks = () => navigate('/lesson-17');
  const openLessonEighteenBlocks = () => navigate('/lesson-18');
  const openLessonNineteenBlocks = () => navigate('/lesson-19');
  const openLessonTwentyBlocks = () => navigate('/lesson-20');
  const openLessonTwentyOneBlocks = () => navigate('/lesson-21');
  const openLessonTwentyTwoBlocks = () => navigate('/lesson-22');
  const openLessonTwentyThreeBlocks = () => navigate('/lesson-23');
  const openLessonTwentyFourBlocks = () => navigate('/lesson-24');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="w-full flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Главная"
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center"
          >
            <House className="w-5 h-5 text-white" />
          </button>
          <button
            type="button"
            aria-label="Словарь"
            onClick={() => navigate('/vocabulary')}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <BookMarked className="w-5 h-5 text-slate-600" />
          </button>
          <button
            type="button"
            aria-label="Статистика"
            onClick={() => navigate('/course-map')}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <BarChart3 className="w-5 h-5 text-slate-600" />
          </button>
          <button
            type="button"
            aria-label="Профиль"
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <User className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Kurs xaritasi - Modullar */}
        <section>
          <div className="relative">
            <div className="space-y-6">
              <button
                type="button"
                onClick={openLessonOneBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">1-dars — Tanishuv</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTwoBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">2-dars — Kishilik olmoshi</h3>
              </button>
              <button
                type="button"
                onClick={openLessonThreeBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">3-dars — So‘z turkumlari</h3>
              </button>
              <button
                type="button"
                onClick={openLessonFourBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">4-dars — OTlarning rodi</h3>
              </button>
              <button
                type="button"
                onClick={openLessonFiveBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">5-dars — -ь bilan tugaydigan so‘zlar</h3>
              </button>
              <button
                type="button"
                onClick={openLessonSixBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">6-dars — Чей? Чья? Чьё?</h3>
              </button>
              <button
                type="button"
                onClick={openLessonNineBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">7-dars — Sifat so‘z turkumi</h3>
              </button>
              <button
                type="button"
                onClick={openLessonSevenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">8-dars — Ko‘plik shakli</h3>
              </button>
              <button
                type="button"
                onClick={openLessonEightBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">9-dars — Takrorlash</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">10-dars — Infinitiv</h3>
              </button>
              <button
                type="button"
                onClick={openLessonElevenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">11-dars — Hozirgi zamon</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTwelveBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">12-dars — -ова-, -ева- fe’llari</h3>
              </button>
              <button
                type="button"
                onClick={openLessonThirteenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">13-dars — -ться fe’llari</h3>
              </button>
              <button
                type="button"
                onClick={openLessonFourteenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">14-dars — Noto‘g‘ri fe’llar</h3>
              </button>
              <button
                type="button"
                onClick={openLessonFifteenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">15-dars — O‘tgan zamon</h3>
              </button>
              <button
                type="button"
                onClick={openLessonSixteenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">16-dars — Kelasi zamon</h3>
              </button>
              <button
                type="button"
                onClick={openLessonSeventeenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">17-dars — Fe'lning tugallangan va tugallanmagan shakli</h3>
              </button>
              <button
                type="button"
                onClick={openLessonEighteenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">18-dars — Fe'llarning buyruq shakli</h3>
              </button>
              <button
                type="button"
                onClick={openLessonNineteenBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">19-dars — Fe'llar harakati</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTwentyBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">20-dars — Takrorlash</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTwentyOneBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">21-dars — Kelishiklar</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTwentyTwoBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">22-dars — Predlojniy padej</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTwentyThreeBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">23-dars — Predloglar В va НА + Predlojniy padej</h3>
              </button>
              <button
                type="button"
                onClick={openLessonTwentyFourBlocks}
                className="w-full text-left flex-1 bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900">24-dars — Sifatlar va tartib sonlar predlojniy padejda</h3>
              </button>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
