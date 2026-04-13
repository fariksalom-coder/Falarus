import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { VazifaHubTaskGrid } from '../components/lesson/LessonHubTaskGrids';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSON_5_VAZIFALARI } from '../data/lessonFiveTasks';

const LESSON_PATH = '/lesson-5';

export default function LessonFivePage() {
  return (
    <LessonHubLayout>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>

            <p>
              Rus tilida ba&apos;zi otlar <span className="font-semibold">-ь</span> (yumshatish belgisi) bilan tugaydi. Bunday so&apos;zlar faqat ikki xil
              rodga kiradi: <span className="font-semibold">Мужской род</span> va <span className="font-semibold">Женский род</span>.{' '}
              <span className="font-semibold">Средний род</span> hech qachon <span className="font-semibold">-ь</span> bilan tugamaydi.
            </p>

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="font-semibold">Мужской род</p>
              <p className="font-semibold">1) Erkak odam yoki kasb bo‘lsa → Мужской род</p>
              <p>учитель — он, водитель — он, покупатель — он</p>
              <p className="text-sky-800">
                Ko&apos;pincha <span className="font-semibold">-тель</span> bilan tugasa → мужской
              </p>
              <p className="font-semibold">2) Oy nomlari → Мужской род</p>
              <p>январь, февраль, апрель, июль, сентябрь</p>
              <p className="text-sky-800">
                Har doim: <span className="font-semibold">он</span>
              </p>
              <p className="font-semibold">3) «день» → Мужской род</p>
              <p>день — он</p>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2">
              <p className="font-semibold">Женский род</p>
              <p>
                <span className="font-semibold">1) -ость</span> bilan tugasa → возможность, необходимость, новость, скорость
              </p>
              <p>
                <span className="font-semibold">2)</span> Quyidagi tovushlardan oldin <span className="font-semibold">-ь</span> bo&apos;lsa ko&apos;pincha
                женский:
                <span className="font-semibold"> -чь, -жь, -шь, -щь, -дь, -вь, -нь</span>
              </p>
              <p>Misollar: ночь, дочь, тетрадь, любовь, жизнь, площадь, кровать</p>
            </div>
          
        </LessonTheoryCollapsible>

        <VazifaHubTaskGrid lessonPath={LESSON_PATH} vazifalari={LESSON_5_VAZIFALARI} sequentialLock />
      </div>
    </LessonHubLayout>
  );
}
