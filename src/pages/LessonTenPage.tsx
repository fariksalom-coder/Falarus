import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { VazifaHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSON_10_VAZIFALARI } from '../data/lessonTenTasks';
import { buildVazifaHubTasks } from '../utils/lessonVazifaHub';

const LESSON_PATH = '/lesson-10';

export default function LessonTenPage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>

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
          
        </LessonTheoryCollapsible>

        <VazifaHubTaskGrid lessonPath={LESSON_PATH} vazifalari={LESSON_10_VAZIFALARI} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
