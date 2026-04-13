import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { VazifaHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSON_TWO_VAZIFALARI } from '../data/lessonTwoTasks';

const LESSON_PATH = '/lesson-2';

export default function LessonTwoPage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p className="font-bold">Kishilik olmoshlari</p>
          <p>Kishilik olmoshlari "Kim?" savoliga javob beradi. Ular odam ismini almashtiradi.</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold">Birlik:</p>
              <p className="mt-1">
                Я — men
                <br />
                Ты — sen
                <br />
                Он — u (erkak)
                <br />
                Она — u (ayol)
                <br />
                Оно — u (narsa)
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold">Ko‘plik:</p>
              <p className="mt-1">
                Мы — biz
                <br />
                Вы — siz
                <br />
                Они — ular
              </p>
            </div>
          </div>

          <p className="font-semibold">Misollar:</p>
          <p>
            Я студент.
            <br />
            Ты работаешь.
            <br />
            Он врач.
            <br />
            Она учительница.
            <br />
            Мы дома.
            <br />
            Вы из Самарканда.
            <br />
            Они работают.
          </p>
        </LessonTheoryCollapsible>

        <VazifaHubTaskGrid lessonPath={LESSON_PATH} vazifalari={LESSON_TWO_VAZIFALARI} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
