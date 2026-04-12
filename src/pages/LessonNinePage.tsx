import { useNavigate } from 'react-router-dom';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { VazifaHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';
import { LESSON_9_VAZIFALARI } from '../data/lessonNineTasks';

const LESSON_PATH = '/lesson-9';

export default function LessonNinePage() {
  const navigate = useNavigate();

  return (
    <LessonHubLayout onBack={() => navigate(LESSONS_LIST_PATH)}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>

            <p>
              Sifatlar rus tilida <span className="font-semibold">Какой? Какая? Какое? Какие?</span> savollariga javob beradi.
              Sifat otning sifati va belgisini bildiradi, va otning rodi hamda soniga moslashadi.
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-4">
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-sky-50">
                  <p className="font-bold text-sky-900">Мужской род</p>
                  <p className="font-semibold">Какой?</p>
                  <p className="mt-1">-ый, -ий, -ой</p>
                  <p className="mt-2">старый, новый, большой, лёгкий</p>
                </div>
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-emerald-50">
                  <p className="font-bold text-emerald-900">Средний род</p>
                  <p className="font-semibold">Какое?</p>
                  <p className="mt-1">-ое, -ее</p>
                  <p className="mt-2">старое, новое, большое, лёгкое</p>
                </div>
                <div className="border-b md:border-b-0 md:border-r border-slate-300 p-3 bg-rose-50">
                  <p className="font-bold text-rose-900">Женский род</p>
                  <p className="font-semibold">Какая?</p>
                  <p className="mt-1">-ая, -яя</p>
                  <p className="mt-2">старая, новая, большая, лёгкая</p>
                </div>
                <div className="p-3 bg-violet-50">
                  <p className="font-bold text-violet-900">Ko‘plik</p>
                  <p className="font-semibold">Какие?</p>
                  <p className="mt-1">-ые, -ие</p>
                  <p className="mt-2">старые, новые, большие, лёгкие</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
                <p className="font-semibold text-amber-900">Misollar</p>
                <p>большой дом</p>
                <p>вкусное молоко</p>
                <p>интересная книга</p>
                <p>маленькая проблема</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-1">
                <p className="font-semibold text-indigo-900">Antonimlar (антонимы)</p>
                <p>новый — старый</p>
                <p>дорогой — дешёвый</p>
                <p>светлый — тёмный</p>
                <p>интересный — скучный</p>
              </div>
            </div>
          
        </LessonTheoryCollapsible>

        <VazifaHubTaskGrid lessonPath={LESSON_PATH} vazifalari={LESSON_9_VAZIFALARI} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
