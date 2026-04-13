import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { VazifaHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSON_THREE_VAZIFALARI } from '../data/lessonThreeTasks';

const LESSON_PATH = '/lesson-3';

export default function LessonThreePage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>

            <p>Rus tilida so‘zlar turkumlarga bo‘linadi. Bugun 5 ta asosiy turkumni o‘rganamiz.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-emerald-900">Ot (Имя существительное)</h3>
                <p className="text-[1.05rem] font-semibold text-emerald-900">Кто? Что?</p>
                <p>Odam yoki narsani bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> врач, учитель, дом, книга, машина</p>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-sky-900">Sifat (Имя прилагательное)</h3>
                <p className="text-[1.05rem] font-semibold text-sky-900">Какой?</p>
                <p>Otning belgisini bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> большой дом, красивая машина, новая книга</p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-violet-900">Fe’l (Глагол)</h3>
                <p className="text-[1.05rem] font-semibold text-violet-900">Что делать? Что сделать?</p>
                <p>Harakatni bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> работать, учиться, говорить, читать, писать</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <h3 className="text-lg font-bold text-amber-900">Son (Числительное)</h3>
                <p className="text-[1.05rem] font-semibold text-amber-900">Сколько?</p>
                <p>Miqdorni bildiradi.</p>
                <p><span className="font-semibold">Misollar:</span> один, два, три, пять, десять</p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2 sm:col-span-2">
                <h3 className="text-lg font-bold text-rose-900">Ravish (Наречие)</h3>
                <p className="text-[1.05rem] font-semibold text-rose-900">Как?</p>
                <p>Fe’lni tasvirlaydi.</p>
                <p><span className="font-semibold">Misollar:</span> быстро, медленно, хорошо, громко, тихо</p>
              </div>
            </div>
          
        </LessonTheoryCollapsible>

        <VazifaHubTaskGrid lessonPath={LESSON_PATH} vazifalari={LESSON_THREE_VAZIFALARI} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
