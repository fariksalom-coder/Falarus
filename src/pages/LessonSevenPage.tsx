import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { VazifaHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';
import { LESSON_7_VAZIFALARI } from '../data/lessonSevenTasks';

const LESSON_PATH = '/lesson-7';

export default function LessonSevenPage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <p className="mb-4 text-center text-sm text-slate-600">Tushuntirish — o‘zbek tilida, misollar — rus tilida.</p>
      <div className="space-y-4">
        <LessonTheoryCollapsible>

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
          
        </LessonTheoryCollapsible>

        <VazifaHubTaskGrid lessonPath={LESSON_PATH} vazifalari={LESSON_7_VAZIFALARI} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
