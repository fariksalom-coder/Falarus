import { useNavigate } from 'react-router-dom';

export default function LessonSevenPage() {
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

          <h1 className="text-xl font-bold text-slate-900 mb-2">8-dars — Ko‘plik shakli (Множественное число)</h1>
          <p className="text-sm text-slate-600 mb-4">Tushuntirish — o‘zbek tilida, misollar — rus tilida.</p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 space-y-4 leading-relaxed">
            <p>
              Rus tilida otlarning <span className="font-semibold">ko‘plik shakli</span> (множественное число) bor.
              Bir dona — единственное число, ko‘p dona — множественное число.
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-sky-50">
                  <h3 className="text-lg font-bold text-sky-900">Мужской род</h3>
                  <p className="font-semibold mt-1">-ы / -и</p>
                  <p className="mt-2">магазин — магазины</p>
                  <p>стол — столы</p>
                  <p>шкаф — шкафы</p>
                  <p>секретарь — секретари</p>
                  <p>парк — парки</p>
                  <p>музей — музеи</p>
                  <p className="mt-2 text-sky-900">k, g, x hamda ж, ч, ш, щ bo‘lsa → <span className="font-semibold">-и</span></p>
                </div>

                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-emerald-50">
                  <h3 className="text-lg font-bold text-emerald-900">Средний род</h3>
                  <p className="font-semibold mt-1">-о → -а, -е → -я</p>
                  <p className="mt-2">слово — слова</p>
                  <p>окно — окна</p>
                  <p>яйцо — яйца</p>
                  <p>кольцо — кольца</p>
                  <p>море — моря</p>
                  <p>крыло — крылья</p>
                </div>

                <div className="p-3 bg-rose-50">
                  <h3 className="text-lg font-bold text-rose-900">Женский род</h3>
                  <p className="font-semibold mt-1">-а → -ы / -и, -я → -и, -ь → -и</p>
                  <p className="mt-2">сестра — сёстры</p>
                  <p>акула — акулы</p>
                  <p>улица — улицы</p>
                  <p>книга — книги</p>
                  <p>семья — семьи</p>
                  <p>тетрадь — тетради</p>
                  <p className="mt-2 text-rose-900">k, g, x hamda ж, ч, ш, щ bo‘lsa → <span className="font-semibold">-и</span></p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
              <p className="font-semibold text-amber-900">Istisnolar</p>
              <p>дом — дома</p>
              <p>профессор — профессора</p>
              <p>город — города</p>
              <p>лес — леса</p>
              <p>поезд — поезда</p>
              <p>учитель — учителя</p>
              <p>брат — братья</p>
              <p>друг — друзья</p>
              <p>сын — сыновья</p>
              <p>муж — мужья</p>
              <p>дерево — деревья</p>
              <p>лист — листья</p>
              <p>стул — стулья</p>
            </div>

            <div className="rounded-xl border border-slate-300 bg-white p-3">
              <p className="font-semibold">Faqat ko‘plikda ishlatiladigan so‘zlar:</p>
              <p className="mt-1">родители, часы, очки, деньги, брюки, джинсы</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lesson-7/mustahkamlash')}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            Topshiriq
          </button>
        </div>
      </main>
    </div>
  );
}
